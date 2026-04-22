export const SIZE = 9;
export const BOX_SIZE = 3;

export const DIFFICULTY = {
  EASY: { clues: 45, name: 'Easy' },
  MEDIUM: { clues: 38, name: 'Medium' },
  HARD: { clues: 32, name: 'Hard' },
  CUSTOM: { clues: null, name: 'Custom' }
};

export const EVENTS = {
  GAME_STARTED: 'game:started',
  SELECTION_CHANGED: 'selection:changed',
  BOARD_CHANGED: 'board:changed',
  HIGHLIGHT_CHANGED: 'highlight:changed',
  VALIDATION_CHANGED: 'validation:changed',
  GAME_COMPLETED: 'game:completed',
  MISTAKE_MADE: 'game:mistake',
  GAME_OVER: 'game:over',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  SETTINGS_CHANGED: 'settings:changed'
};

// Hardcoded puzzle for Sprint 1 (valid Sudoku)
export const DEMO_PUZZLE = [
  5,3,0, 0,7,0, 0,0,0,
  6,0,0, 1,9,5, 0,0,0,
  0,9,8, 0,0,0, 0,6,0,

  8,0,0, 0,6,0, 0,0,3,
  4,0,0, 8,0,3, 0,0,1,
  7,0,0, 0,2,0, 0,0,6,

  0,6,0, 0,0,0, 2,8,0,
  0,0,0, 4,1,9, 0,0,5,
  0,0,0, 0,8,0, 0,7,9
];

export const DEMO_SOLUTION = [
  5,3,4, 6,7,8, 9,1,2,
  6,7,2, 1,9,5, 3,4,8,
  1,9,8, 3,4,2, 5,6,7,

  8,5,9, 7,6,1, 4,2,3,
  4,2,6, 8,5,3, 7,9,1,
  7,1,3, 9,2,4, 8,5,6,

  9,6,1, 5,3,7, 2,8,4,
  2,8,7, 4,1,9, 6,3,5,
  3,4,5, 2,8,6, 1,7,9
];
