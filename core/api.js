import { getBrowserUUID, captureCookieUUID } from './uuid.js';

let API_URL = 'https://api.octile.eu.cc';
let SCORE_URL = API_URL + '/sudoku/score';
let _scoreEnabled = true;

const QUEUE_KEY = 'sudoku_score_queue_v1';
const MAX_QUEUE = 200;
const FETCH_TIMEOUT_MS = 8000;

export function applyConfig(config) {
  if (config.workerUrl) {
    API_URL = config.workerUrl;
    SCORE_URL = API_URL + '/sudoku/score';
  }
  if (config.features?.score_submission === false) {
    _scoreEnabled = false;
  }
}

export async function submitScore(entry) {
  if (!_scoreEnabled) return;

  entry.submission_id = _generateUUID();

  if (!navigator.onLine) {
    _queueScore(entry);
    return;
  }
  try {
    await _sendScore(entry);
  } catch (e) {
    _queueScore(entry);
  }
}

async function _sendScore(entry) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(SCORE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Player-UUID': getBrowserUUID(),
      },
      body: JSON.stringify(entry),
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

function _queueScore(entry) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push(entry);
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
