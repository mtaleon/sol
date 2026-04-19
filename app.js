import { EventBus } from './core/events.js';
import { Game } from './core/Game.js';
import { DEMO_PUZZLE, EVENTS } from './core/constants.js';
import { Platform } from './platform/Platform.js';
import { WebRenderer } from './platforms/web-dom/Renderer.js';
import { WebInput } from './platforms/web-dom/Input.js';
import { Generator } from './core/Generator.js';

// Initialize platform
const eventBus = new EventBus();
const renderer = new WebRenderer();
const input = new WebInput();
const platform = new Platform(renderer, input);

// Initialize game
const game = new Game(eventBus, null);

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

eventBus.on('input:invalid', () => {
  // Play error sound (Sprint 2)
  console.log('Invalid input: cannot modify fixed cell');
});

// Wire input
input.initialize();

input.onCellClick((row, col) => {
  game.selectCell(row, col);
});

input.onNumberInput((number) => {
  if (game.selectedCell !== null) {
    const row = Math.floor(game.selectedCell / 9);
    const col = game.selectedCell % 9;
    game.setCell(row, col, number);
  } else {
    game.selectNumber(number);
  }
});

// Long-press to toggle notes mode
input.onLongPress(() => {
  game.toggleNotesMode();
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

// Start initial game with demo puzzle
game.startGame(DEMO_PUZZLE);

// Debug access
window.game = game;
