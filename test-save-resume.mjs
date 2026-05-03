#!/usr/bin/env node

/**
 * Test script for save/resume functionality
 *
 * This simulates:
 * 1. Starting a game
 * 2. Making moves
 * 3. Saving to storage
 * 4. Clearing game state
 * 5. Loading from storage
 * 6. Verifying state restored correctly
 */

// Mock localStorage for Node.js
global.localStorage = {
  storage: {},
  getItem(key) {
    return this.storage[key] || null;
  },
  setItem(key, value) {
    this.storage[key] = value;
  },
  removeItem(key) {
    delete this.storage[key];
  },
  clear() {
    this.storage = {};
  }
};

// Mock DOM
global.document = {
  getElementById: () => ({ textContent: '' }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    dataset: {},
    appendChild: () => {},
    addEventListener: () => {}
  })
};

import { EventBus } from './core/events.js';
import { Game } from './core/Game.js';
import { DEMO_PUZZLE } from './core/constants.js';
import { WebStorage } from './platforms/web-dom/Storage.js';

console.log('🧪 Testing Save/Resume Functionality\n');

const eventBus = new EventBus();
const storage = new WebStorage();
const game = new Game(eventBus, storage);

// Test 1: Start game and make moves
console.log('1️⃣  Starting new game...');
game.startGame(DEMO_PUZZLE);
console.log(`   ✓ Game started - moves: ${game.moves}, elapsed: ${game.elapsed}s`);

// Make some test moves
console.log('\n2️⃣  Making test moves...');
game.selectCell(0, 2);  // Select cell (0, 2)
game.setCell(0, 2, 4);  // Set value 4
console.log(`   ✓ Move 1: Cell (0,2) = 4`);

game.selectCell(1, 1);
game.setCell(1, 1, 7);
console.log(`   ✓ Move 2: Cell (1,1) = 7`);

game.selectCell(2, 0);
game.setCell(2, 0, 1);
console.log(`   ✓ Move 3: Cell (2,0) = 1`);

console.log(`   Total moves: ${game.moves}`);

// Test 2: Verify save exists
console.log('\n3️⃣  Verifying localStorage save...');
const savedData = storage.get('sudoku-save');
if (savedData) {
  console.log(`   ✓ Save exists in localStorage`);
  console.log(`   - Version: ${savedData.version}`);
  console.log(`   - Moves: ${savedData.moves}`);
  console.log(`   - Elapsed: ${savedData.elapsed}s`);
  console.log(`   - Notes mode: ${savedData.notesMode}`);
  console.log(`   - Puzzle cells: ${savedData.puzzle.length}`);
  console.log(`   - Grid cells: ${savedData.grid.length}`);
} else {
  console.error('   ❌ No save found in localStorage!');
  process.exit(1);
}

// Test 3: Simulate page reload by creating new game and loading
console.log('\n4️⃣  Simulating page reload...');
const eventBus2 = new EventBus();
const game2 = new Game(eventBus2, storage);
console.log('   ✓ New Game instance created');

// Test 4: Load saved game
console.log('\n5️⃣  Loading saved game...');
const loaded = game2.loadSavedGame();
if (loaded) {
  console.log('   ✓ Game loaded successfully');
  console.log(`   - Moves: ${game2.moves}`);
  console.log(`   - Elapsed: ${game2.elapsed}s`);
  console.log(`   - Notes mode: ${game2.notesMode}`);

  // Verify specific cells
  const cell1 = game2.board.getCell(0, 2);
  const cell2 = game2.board.getCell(1, 1);
  const cell3 = game2.board.getCell(2, 0);

  console.log(`\n   Verifying restored cells:`);
  console.log(`   - Cell (0,2): ${cell1.value} (expected: 4) ${cell1.value === 4 ? '✓' : '❌'}`);
  console.log(`   - Cell (1,1): ${cell2.value} (expected: 7) ${cell2.value === 7 ? '✓' : '❌'}`);
  console.log(`   - Cell (2,0): ${cell3.value} (expected: 1) ${cell3.value === 1 ? '✓' : '❌'}`);

  // Verify given cells are marked correctly
  const givenCell = game2.board.getCell(0, 0);
  console.log(`   - Cell (0,0) is given: ${givenCell.given} (expected: true) ${givenCell.given ? '✓' : '❌'}`);

} else {
  console.error('   ❌ Failed to load saved game!');
  process.exit(1);
}

// Test 5: Test notes persistence
console.log('\n6️⃣  Testing notes persistence...');
game2.toggleNotesMode();
game2.selectCell(3, 1);

// Check cell before adding notes
const cellBefore = game2.board.getCell(3, 1);
console.log(`   Cell (3,1) before: value=${cellBefore.value}, given=${cellBefore.given}, notes=${Array.from(cellBefore.notes)}`);

game2.toggleNote(3, 1, 5);
game2.toggleNote(3, 1, 9);

// Check cell after adding notes
const cellAfter = game2.board.getCell(3, 1);
console.log(`   Cell (3,1) after: notes=${Array.from(cellAfter.notes)}`);
console.log('   ✓ Added notes 5 and 9 to cell (3,1)');

// Check what was saved
const savedWithNotes = storage.get('sudoku-save');
if (savedWithNotes) {
  const savedCell = savedWithNotes.grid[3 * 9 + 1];
  console.log(`   Saved cell (3,1): value=${savedCell.value}, notes=${savedCell.notes}`);
}

// Create new game instance and reload
console.log('   Creating new game instance to test reload...');
const eventBus3 = new EventBus();
const game3 = new Game(eventBus3, storage);
const loadSuccess = game3.loadSavedGame();
console.log(`   Load success: ${loadSuccess}`);

const cellWithNotes = game3.board.getCell(3, 1);
const notesArray = Array.from(cellWithNotes.notes);
console.log(`   - Notes restored: ${notesArray.join(', ')} (expected: 5, 9)`);
const notesCorrect = cellWithNotes.notes.has(5) && cellWithNotes.notes.has(9) && cellWithNotes.notes.size === 2;
console.log(`   ${notesCorrect ? '✓' : '❌'} Notes persisted correctly`);

// Test 6: Test clearSave
console.log('\n7️⃣  Testing clearSave...');
game3.clearSave();
const savedAfterClear = storage.get('sudoku-save');
const clearSuccess = savedAfterClear === null;
console.log(`   ${clearSuccess ? '✓' : '❌'} Save cleared successfully`);

if (notesCorrect && clearSuccess) {
  console.log('\n✅ All tests passed!\n');
} else {
  console.log('\n❌ Some tests failed!\n');
  process.exit(1);
}
