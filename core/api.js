import { getBrowserUUID, captureCookieUUID } from './uuid.js';

let API_URL = 'https://api.octile.eu.cc';
let SCORE_URL = API_URL + '/scores';  // Unified endpoint
let _scoreEnabled = true;

const QUEUE_KEY = 'sudoku_score_queue_v1';
const MAX_QUEUE = 200;
const FETCH_TIMEOUT_MS = 8000;

export function applyConfig(config) {
  if (config.workerUrl) {
    API_URL = config.workerUrl;
    SCORE_URL = API_URL + '/scores';  // Unified endpoint
  }
  if (config.features?.score_submission === false) {
    _scoreEnabled = false;
  }
}

export async function submitScore(entry) {
  if (!_scoreEnabled) return;

  // Transform to unified format
  const payload = {
    game_id: 'sudoku',
    browser_uuid: entry.browser_uuid || getBrowserUUID(),
    submission_id: entry.submission_id || _generateUUID(),
    score_value: entry.resolve_time,  // Primary metric (solve time in seconds)
    time_seconds: entry.resolve_time,
    platform: entry.platform || 'web',
    ota_version: entry.ota_version_code || null,
    game_data: {
      difficulty: entry.difficulty,
      clues: entry.clues,
      mistakes: entry.mistakes || 0,
      hints_used: entry.hints_used || 0,
      moves: entry.moves || 0,
      puzzle_hash: entry.puzzle_hash || null,
    },
    client_timestamp: entry.timestamp_utc || new Date().toISOString(),
  };

  if (!navigator.onLine) {
    _queueScore(payload);
    return;
  }
  try {
    await _sendScore(payload);
  } catch (e) {
    _queueScore(payload);
  }
}

async function _sendScore(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(SCORE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Player-UUID': payload.browser_uuid,
      },
      credentials: 'include',  // CRITICAL: Send cookies to worker for UUID
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    captureCookieUUID(res);

    if (res.status === 400 || res.status === 422) {
      return null;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function _queueScore(payload) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push(payload);
  while (queue.length > MAX_QUEUE) queue.shift();
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue() {
  if (!_scoreEnabled) return;

  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  const queue = JSON.parse(raw);
  if (queue.length === 0) return;

  let delay = 1000;
  const maxDelay = 300000;

  while (queue.length > 0) {
    try {
      await _sendScore(queue[0]);
      queue.shift();
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      delay = 1000;
    } catch (e) {
      delay = Math.min(delay * 2, maxDelay) + Math.random() * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function _generateUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
