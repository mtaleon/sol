import { EventBus } from './core/events.js';
import { Game } from './core/Game.js';
import { DEMO_PUZZLE, EVENTS } from './core/constants.js';
import { Platform } from './platform/Platform.js';
import { WebRenderer } from './platforms/web-dom/Renderer.js';
import { WebInput } from './platforms/web-dom/Input.js';
import { WebStorage } from './platforms/web-dom/Storage.js';
import { Generator } from './core/Generator.js';

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Remove after animation completes
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Initialize platform
const eventBus = new EventBus();
const renderer = new WebRenderer();
const input = new WebInput();
const storage = new WebStorage();
const platform = new Platform(renderer, input);

// Initialize game
const game = new Game(eventBus, storage);

// Wire events
eventBus.on(EVENTS.GAME_STARTED, ({ cells }) => {
  renderer.renderBoard(cells);
});

eventBus.on(EVENTS.SELECTION_CHANGED, ({ cellId }) => {
  // Handled by HIGHLIGHT_CHANGED
});

eventBus.on(EVENTS.BOARD_CHANGED, ({ cellId, value }) => {
  const cell = game.board.getCell(Math.floor(cellId / 9), cellId % 9);
  renderer.updateCell(cellId, cell);
  renderer.updateMoves(game.moves);
});

eventBus.on(EVENTS.HIGHLIGHT_CHANGED, (highlightState) => {
  renderer.applyHighlights(highlightState);
});

eventBus.on(EVENTS.VALIDATION_CHANGED, ({ conflicts, isComplete }) => {
  // Highlights already updated via HIGHLIGHT_CHANGED
});

eventBus.on(EVENTS.GAME_COMPLETED, (data) => {
  renderer.showCompletionModal(data);
});

// Solve events
eventBus.on('solve:success', () => {
  showToast('Puzzle solved!', 'success');
});

eventBus.on('solve:failed', () => {
  showToast('Could not solve puzzle', 'error');
});

eventBus.on('input:invalid', () => {
  // Play error sound (Sprint 2)
  console.log('Invalid input: cannot modify fixed cell');
});

// Wire input
input.initialize();

input.onCellClick((row, col) => {
  game.selectCell(row, col);
});

// Cursor movement
input.onCursorMove((row, col) => {
  game.selectCell(row, col);
});

// Number pad buttons - only highlight, don't place
input.onNumberSelect((number) => {
  game.selectNumber(number);
});

// Keyboard input - place numbers in selected cell
input.onNumberInput((number) => {
  if (game.selectedCell !== null) {
    const row = Math.floor(game.selectedCell / 9);
    const col = game.selectedCell % 9;
    game.setCell(row, col, number);
  }
});

// Long-press to toggle notes mode
input.onLongPress(() => {
  game.toggleNotesMode();
});

// Keyboard shortcuts
input.onNewGame(() => {
  difficultyModal.classList.add('visible');
});

input.onSaveGame(() => {
  game.save();
  showToast('Game saved!', 'success');
});

input.onRestart(() => {
  game.restart();
  showToast('Game restarted', 'info');
});

input.onUndo(() => {
  if (game.undoStack.length === 0) {
    showToast('Nothing to undo', 'warning');
  } else {
    game.undo();
  }
});

input.onSolve(() => {
  game.solve();
});

input.onHint(() => {
  if (game.selectedCell === null) {
    showToast('Select a cell first', 'warning');
    return;
  }

  const row = Math.floor(game.selectedCell / 9);
  const col = game.selectedCell % 9;
  const cell = game.board.getCell(row, col);

  if (cell.given || cell.value !== 0) {
    showToast('Cell already filled', 'warning');
  } else {
    game.getHint();
    showToast('Hint applied!', 'info');
  }
});

// Difficulty modal
const difficultyModal = document.getElementById('difficulty-modal');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

document.getElementById('new-game-btn').addEventListener('click', () => {
  difficultyModal.classList.add('visible');
});

document.getElementById('close-difficulty-modal').addEventListener('click', () => {
  difficultyModal.classList.remove('visible');
});

difficultyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const difficulty = btn.dataset.difficulty;
    difficultyModal.classList.remove('visible');

    console.log(`Starting new ${difficulty} game...`);
    const puzzle = Generator.generate(difficulty);
    game.startGame(puzzle);
  });
});

// Controls
document.getElementById('undo-btn').addEventListener('click', () => {
  game.undo();
});

document.getElementById('redo-btn').addEventListener('click', () => {
  game.redo();
});

document.getElementById('hint-btn').addEventListener('click', () => {
  game.getHint();
});

const notesBtn = document.getElementById('notes-btn');
notesBtn.addEventListener('click', () => {
  game.toggleNotesMode();
});

// Notes mode visual feedback
eventBus.on('notes:mode-changed', ({ notesMode }) => {
  notesBtn.classList.toggle('active', notesMode);
  document.body.classList.toggle('notes-mode', notesMode);
});

// Timer update
setInterval(() => {
  if (game.startTime) {
    renderer.updateTimer(game.elapsed);
  }
}, 1000);

// Start initial game - load saved game or start demo puzzle
if (!game.loadSavedGame()) {
  game.startGame(DEMO_PUZZLE);
}

// Debug access
window.game = game;
