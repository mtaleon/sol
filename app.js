import { EventBus } from './core/events.js';
import { Game } from './core/Game.js';
import { EVENTS } from './core/constants.js';
import { Settings } from './core/Settings.js';
import { Platform } from './platform/Platform.js';
import { WebRenderer } from './platforms/web-dom/Renderer.js';
import { WebInput } from './platforms/web-dom/Input.js';
import { WebStorage } from './platforms/web-dom/Storage.js';
import { Generator } from './core/Generator.js';
import { t, setLanguage } from './core/i18n.js';
import { AdMobManager } from './core/AdMobManager.js';

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// One-time tips tracker
const TIPS_KEY = 'sudoku-tips';
function showTipOnce(tipId, message) {
  const storage = new WebStorage();
  const tips = storage.get(TIPS_KEY) || {};
  if (tips[tipId]) return;
  tips[tipId] = true;
  storage.set(TIPS_KEY, tips);
  showToast(message, 'info');
}

// Initialize platform
const eventBus = new EventBus();
const renderer = new WebRenderer(eventBus);
const input = new WebInput();
const storage = new WebStorage();
const settings = new Settings(storage);
const platform = new Platform(renderer, input);

// Initialize game with settings
const game = new Game(eventBus, storage, settings);

// Initialize i18n from saved setting
setLanguage(settings.get('language') || 'en');

// Difficulty modal helpers
const difficultyModal = document.getElementById('difficulty-modal');
function showDifficultyModal() {
  renderer.applyLanguage();
  difficultyModal.classList.add('visible');
}
function hideDifficultyModal() {
  difficultyModal.classList.remove('visible');
}

// New game handler (used by modals)
renderer.setNewGameHandler(showDifficultyModal);
renderer.setRestartHandler(() => {
  game.restart();
  showToast(t('toast.gameRestarted'));
});

// Compute digit counts for number pad exhaustion
function computeDigitCounts() {
  if (!game.board) return {};
  const counts = {};
  for (let i = 1; i <= 9; i++) counts[i] = 0;
  game.board.cells.forEach(cell => {
    if (cell.value !== 0) counts[cell.value]++;
  });
  return counts;
}

// Apply settings-dependent UI state
function applySettingsToUI() {
  const limit = settings.get('mistakeLimit');
  renderer.updateMistakes(game.mistakes, limit);
  renderer.setTimerVisible(settings.get('showTimer'));
}

// ===== EVENT WIRING =====

eventBus.on(EVENTS.GAME_STARTED, ({ cells, difficulty }) => {
  renderer.renderBoard(cells);
  renderer.updateDifficulty(difficulty || game.difficulty);
  renderer.updateMistakes(game.mistakes, settings.get('mistakeLimit'));
  renderer.updateNumberPadExhaustion(computeDigitCounts());
  renderer.setTimerVisible(settings.get('showTimer'));
});

eventBus.on(EVENTS.SELECTION_CHANGED, () => {});

eventBus.on(EVENTS.BOARD_CHANGED, ({ cellId }) => {
  if (cellId !== null) {
    const cell = game.board.getCell(Math.floor(cellId / 9), cellId % 9);
    renderer.updateCell(cellId, cell);
  } else {
    game.board.cells.forEach((cell, id) => renderer.updateCell(id, cell));
  }
  renderer.updateNumberPadExhaustion(computeDigitCounts());
});

eventBus.on(EVENTS.HIGHLIGHT_CHANGED, (highlightState) => {
  renderer.applyHighlights(highlightState);
});

eventBus.on(EVENTS.VALIDATION_CHANGED, () => {});

eventBus.on(EVENTS.MISTAKE_MADE, ({ mistakes }) => {
  renderer.updateMistakes(mistakes, settings.get('mistakeLimit'));
});

eventBus.on(EVENTS.GAME_COMPLETED, async (data) => {
  // Wait for interstitial check (max 5 seconds, usually 2-3s)
  // This MUST complete before showing completion modal to prevent overlap
  if (window.adMobManager) {
    await window.adMobManager.onGameCompleted();
  }

  // Now show completion modal (no overlap)
  renderer.showCompletionModal(data);
});

eventBus.on(EVENTS.GAME_OVER, (data) => {
  renderer.showGameOverModal(data);
});

eventBus.on(EVENTS.GAME_PAUSED, () => {
  renderer.showPauseOverlay();
});

eventBus.on(EVENTS.GAME_RESUMED, () => {
  renderer.hidePauseOverlay();
});

eventBus.on('solve:success', () => {
  showToast(t('toast.puzzleSolved'), 'success');
});

eventBus.on('solve:failed', () => {
  showToast(t('toast.solveFailed'), 'error');
});

eventBus.on('input:invalid', () => {});

eventBus.on('notes:mode-changed', ({ notesMode }) => {
  const notesBtn = document.getElementById('notes-btn');
  notesBtn.classList.toggle('active', notesMode);
  document.body.classList.toggle('notes-mode', notesMode);
});

// ===== INPUT WIRING =====

input.initialize();

input.onCellClick((row, col) => {
  game.selectCell(row, col);
});

input.onCursorMove((row, col) => {
  game.selectCell(row, col);
});

input.onNumberSelect((number) => {
  if (game.selectedCell !== null) {
    const row = Math.floor(game.selectedCell / 9);
    const col = game.selectedCell % 9;
    game.setCell(row, col, number);
  } else {
    game.selectNumber(number);
  }
});

input.onNumberInput((number) => {
  if (game.selectedCell !== null) {
    const row = Math.floor(game.selectedCell / 9);
    const col = game.selectedCell % 9;
    game.setCell(row, col, number);
  }
});

input.onLongPress(() => {
  game.toggleNotesMode();
});

input.onNotesToggle(() => {
  game.toggleNotesMode();
});

input.onUndo(() => {
  if (game.undoStack.length === 0) {
    showToast(t('toast.nothingToUndo'), 'warning');
  } else {
    game.undo();
    showTipOnce('undoRedo', t('toast.undoRedoTip'));
  }
});

input.onRedo(() => {
  if (game.redoStack.length === 0) {
    showToast(t('toast.nothingToRedo'), 'warning');
  } else {
    game.redo();
  }
});

input.onClear(() => {
  if (game.selectedCell === null) return;
  const row = Math.floor(game.selectedCell / 9);
  const col = game.selectedCell % 9;
  game.setCell(row, col, 0);
});

input.onClearNotes(() => {
  if (game.selectedCell === null) return;
  const row = Math.floor(game.selectedCell / 9);
  const col = game.selectedCell % 9;
  game.clearNotes(row, col);
});

input.onHint(() => {
  game.getHint();
});

input.onSaveGame(() => {
  game.save();
  showToast(t('toast.gameSaved'), 'success');
});

input.onRestart(() => {
  game.restart();
  showToast(t('toast.gameRestarted'));
});

input.onSolve(() => {
  game.solve();
});

input.onNewGame(showDifficultyModal);

// ===== PAUSE CONTROLS =====

document.getElementById('pause-btn').addEventListener('click', () => {
  game.pause();
});

document.getElementById('resume-btn').addEventListener('click', () => {
  game.resume();
});

document.getElementById('pause-restart-btn').addEventListener('click', () => {
  renderer.hidePauseOverlay();
  game.restart();
  showToast(t('toast.gameRestarted'));
});

document.getElementById('pause-new-game-btn').addEventListener('click', () => {
  renderer.hidePauseOverlay();
  game.resume();
  showDifficultyModal();
});

document.getElementById('pause-settings-btn').addEventListener('click', () => {
  renderer.showSettings(settings, (key, value) => {
    settings.set(key, value);

    if (key === 'language') {
      setLanguage(value);
      renderer.applyLanguage();
      renderer.updateDifficulty(game.difficulty);
      renderer.updateMistakes(game.mistakes, settings.get('mistakeLimit'));
    }

    applySettingsToUI();
    eventBus.emit(EVENTS.SETTINGS_CHANGED, { key, value });

    if (['highlightRegion', 'highlightSameNumber', 'showConflicts'].includes(key)) {
      if (game.selectedCell !== null || game.selectedNumber !== null) {
        const highlightState = game._computeHighlightState();
        eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);
      }
    }
  });
});

document.getElementById('settings-done').addEventListener('click', () => {
  renderer.hideSettings();
});

// ===== HELP MODAL =====

const helpModal = document.getElementById('help-modal');

document.getElementById('pause-help-btn').addEventListener('click', () => {
  renderer.applyLanguage();
  helpModal.classList.add('visible');
});

document.getElementById('help-done').addEventListener('click', () => {
  helpModal.classList.remove('visible');
});

// ===== ABOUT MODAL =====

const aboutModal = document.getElementById('about-modal');

document.getElementById('pause-about-btn').addEventListener('click', () => {
  renderer.applyLanguage();
  aboutModal.classList.add('visible');
});

document.getElementById('about-done').addEventListener('click', () => {
  aboutModal.classList.remove('visible');
});

// ===== DIFFICULTY MODAL =====

document.getElementById('close-difficulty-modal').addEventListener('click', hideDifficultyModal);

document.querySelectorAll('.difficulty-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const difficulty = btn.dataset.difficulty;
    hideDifficultyModal();
    const puzzle = Generator.generate(difficulty);
    game.startGame(puzzle, difficulty);
  });
});

document.getElementById('difficulty-label').addEventListener('click', showDifficultyModal);

// ===== TIMER UPDATE =====

setInterval(() => {
  if (game.startTime && !game.paused) {
    renderer.updateTimer(game.elapsed);
  }
}, 1000);

// ===== INITIAL GAME =====

if (!game.loadSavedGame()) {
  const initialPuzzle = Generator.generate('MEDIUM');
  game.startGame(initialPuzzle, 'MEDIUM');
}

// Apply settings + language on startup
applySettingsToUI();
renderer.applyLanguage();
renderer.updateDifficulty(game.difficulty);

// ===== AdMob Initialization (Background) =====
const adMobManager = new AdMobManager(eventBus, storage);

async function initializeAdMob() {
  try {
    const enabled = await adMobManager.initialize();
    if (enabled) {
      console.log('AdMob initialized');
    }
  } catch (err) {
    console.warn('AdMob initialization error (non-critical)', err);
  }
}

// Call after game loads and UI is rendered (background, non-blocking)
initializeAdMob();

// Expose for GAME_COMPLETED handler access
window.adMobManager = adMobManager;

// Debug access
window.game = game;
window.settings = settings;
