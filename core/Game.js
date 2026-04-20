import { EVENTS } from './constants.js';
import { Board } from './Board.js';
import { Solver } from './Solver.js';

export class Game {
  constructor(eventBus, storage) {
    this.eventBus = eventBus;
    this.storage = storage;
    this.board = null;
    this.selectedCell = null;
    this.selectedNumber = null;
    this.notesMode = false;
    this.undoStack = [];
    this.redoStack = [];
    this.moves = 0;
    this.startTime = null;
    this.elapsed = 0;
    this.timerInterval = null;
  }

  startGame(puzzleArray) {
    // Clear any previous saved game
    this.clearSave();

    // Store original puzzle for restart capability
    this.originalPuzzle = [...puzzleArray];

    this.board = new Board(puzzleArray);
    this.selectedCell = null;
    this.selectedNumber = null;
    this.notesMode = false;
    this.undoStack = [];
    this.redoStack = [];
    this.moves = 0;
    this.startTime = Date.now();
    this.elapsed = 0;
    this._startTimer();

    this.eventBus.emit(EVENTS.GAME_STARTED, {
      cells: this.board.cells
    });

    // Save initial state
    this.save();
  }

  selectCell(row, col) {
    const cellId = row * 9 + col;
    this.selectedCell = cellId;
    this.selectedNumber = null;  // Clear number selection when selecting cell

    // Compute highlight state (data-driven)
    const highlightState = this._computeHighlightState();

    this.eventBus.emit(EVENTS.SELECTION_CHANGED, { cellId });
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);
  }

  selectNumber(number) {
    this.selectedNumber = number;
    this.selectedCell = null;  // Clear cell selection when selecting number

    const highlightState = this._computeHighlightState();
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);
  }

  setCell(row, col, value) {
    const cellId = row * 9 + col;
    const cell = this.board.getCell(row, col);

    // Check if this is a fixed cell
    if (cell.given) {
      this.eventBus.emit('input:invalid', { cellId });
      return;
    }

    // Notes mode: toggle note instead of setting value
    if (this.notesMode && value !== 0) {
      this.toggleNote(row, col, value);
      return;
    }

    // Regular mode: set value
    const prevValue = cell.value;

    if (!this.board.setCell(row, col, value)) {
      // Fixed cell - play error sound
      this.eventBus.emit('input:invalid', { cellId });
      return;
    }

    // Clear notes when setting a value
    if (value !== 0) {
      cell.notes.clear();
    }

    // Undo/redo tracking
    this.undoStack.push({ cellId, prevValue, nextValue: value, timestamp: Date.now() });
    this.redoStack = [];
    this.moves++;

    // Validate
    const conflicts = this.board.validateCell(row, col);
    this.board.cells.forEach((cell, id) => {
      cell.conflict = conflicts.has(id);
    });

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId, value });
    this.eventBus.emit(EVENTS.VALIDATION_CHANGED, {
      conflicts,
      isComplete: this.board.isComplete()
    });

    // Recompute highlights after board change
    const highlightState = this._computeHighlightState();
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);

    if (this.board.isComplete()) {
      this._stopTimer();
      this.eventBus.emit(EVENTS.GAME_COMPLETED, {
        elapsed: this.elapsed,
        moves: this.moves
      });
      this.clearSave();  // Clear save when puzzle completed
    } else {
      this.save();  // Auto-save after each move
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;

    const action = this.undoStack.pop();
    const { cellId, prevValue } = action;
    const row = Math.floor(cellId / 9);
    const col = cellId % 9;

    this.board.setCell(row, col, prevValue);
    this.redoStack.push(action);

    const conflicts = this.board.validateAll();
    this.board.cells.forEach((cell, id) => {
      cell.conflict = conflicts.has(id);
    });

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId, value: prevValue });
    this.eventBus.emit(EVENTS.VALIDATION_CHANGED, { conflicts });

    // Recompute highlights after undo
    const highlightState = this._computeHighlightState();
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);

    // Auto-save after undo
    this.save();
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const action = this.redoStack.pop();
    const { cellId, nextValue } = action;
    const row = Math.floor(cellId / 9);
    const col = cellId % 9;

    this.board.setCell(row, col, nextValue);
    this.undoStack.push(action);

    const conflicts = this.board.validateAll();
    this.board.cells.forEach((cell, id) => {
      cell.conflict = conflicts.has(id);
    });

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId, value: nextValue });
    this.eventBus.emit(EVENTS.VALIDATION_CHANGED, { conflicts });

    // Recompute highlights after redo
    const highlightState = this._computeHighlightState();
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);

    // Auto-save after redo
    this.save();
  }

  toggleNotesMode() {
    this.notesMode = !this.notesMode;
    this.eventBus.emit('notes:mode-changed', { notesMode: this.notesMode });
  }

  toggleNote(row, col, number) {
    const cell = this.board.getCell(row, col);

    // Can't add notes to fixed cells or cells with values
    if (cell.given || cell.value !== 0) {
      return;
    }

    if (cell.notes.has(number)) {
      cell.notes.delete(number);
    } else {
      cell.notes.add(number);
    }

    const cellId = row * 9 + col;
    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId, value: cell.value });

    // Auto-save after notes change
    this.save();
  }

  _computeHighlightState() {
    const state = {
      selected: this.selectedCell,
      sameNumber: new Set(),
      region: new Set(),
      conflicts: new Set()
    };

    if (this.selectedCell !== null) {
      // Selecting a cell = analysis mode (show region + conflicts)
      const row = Math.floor(this.selectedCell / 9);
      const col = this.selectedCell % 9;
      state.region = this.board.getRegionCells(row, col);

      const cell = this.board.getCell(row, col);
      if (cell.value !== 0) {
        state.sameNumber = this.board.getCellsWithValue(cell.value);
      }

      // Show conflicts only when analyzing a specific cell
      state.conflicts = this.board.validateAll();
    }

    if (this.selectedNumber !== null) {
      // Selecting a number = exploration mode (only show same numbers, no conflicts)
      state.sameNumber = this.board.getCellsWithValue(this.selectedNumber);
    }

    return state;
  }

  getHint() {
    const gridArray = this.board.cells.map(c => c.value);
    const hint = Solver.getHint(gridArray);

    if (hint) {
      const row = Math.floor(hint.cellId / 9);
      const col = hint.cellId % 9;
      this.setCell(row, col, hint.value);

      // Mark as hint source
      const cell = this.board.getCell(row, col);
      cell.source = 'hint';

      this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId: hint.cellId, value: hint.value });
    }
  }

  _startTimer() {
    this.timerInterval = setInterval(() => {
      this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Serialize game state to JSON-friendly object (Level A: no undo/redo)
  serialize() {
    if (!this.board) return null;

    return {
      version: 1,
      timestamp: Date.now(),
      puzzle: this.board.cells
        .map((cell, idx) => cell.given ? { idx, value: cell.value } : null)
        .filter(item => item !== null),
      grid: this.board.cells.map(cell => ({
        value: cell.value,
        notes: Array.from(cell.notes),
        source: cell.source
      })),
      elapsed: this.elapsed,
      moves: this.moves,
      startTime: this.startTime,
      notesMode: this.notesMode
    };
  }

  // Restore game state from serialized data
  hydrate(data) {
    if (!data || data.version !== 1) return false;

    try {
      // Reconstruct puzzle array (81 cells, 0 for empty)
      const puzzleArray = new Array(81).fill(0);
      data.puzzle.forEach(({ idx, value }) => {
        puzzleArray[idx] = value;
      });

      // Create new board
      this.board = new Board(puzzleArray);

      // Restore cell states
      data.grid.forEach((cellData, idx) => {
        const cell = this.board.cells[idx];
        cell.value = cellData.value;
        cell.notes = new Set(cellData.notes);
        cell.source = cellData.source;

        // Recalculate given status (puzzle cells are given)
        cell.given = puzzleArray[idx] !== 0;
      });

      // Restore game state
      this.moves = data.moves;
      this.elapsed = data.elapsed;
      this.startTime = data.startTime;
      this.notesMode = data.notesMode;
      this.selectedCell = null;
      this.selectedNumber = null;
      this.undoStack = [];
      this.redoStack = [];

      // Restore original puzzle for restart capability
      this.originalPuzzle = puzzleArray;

      // Restart timer if game was in progress
      if (this.startTime && !this.board.isComplete()) {
        this._startTimer();
      }

      // Validate and set conflicts
      const conflicts = this.board.validateAll();
      this.board.cells.forEach((cell, id) => {
        cell.conflict = conflicts.has(id);
      });

      // Emit events to update UI
      this.eventBus.emit(EVENTS.GAME_STARTED, {
        cells: this.board.cells
      });

      return true;
    } catch (error) {
      console.error('Hydrate error:', error);
      return false;
    }
  }

  // Auto-save current game state
  save() {
    if (!this.storage) return;

    const data = this.serialize();
    if (data) {
      this.storage.set('sudoku-save', data);
    }
  }

  // Load saved game if exists
  loadSavedGame() {
    if (!this.storage) return false;

    const data = this.storage.get('sudoku-save');
    if (data) {
      return this.hydrate(data);
    }

    return false;
  }

  // Clear saved game
  clearSave() {
    if (this.storage) {
      this.storage.remove('sudoku-save');
    }
  }

  // Restart current puzzle from original state
  restart() {
    if (!this.originalPuzzle) return;

    // Clear save before restarting
    this.clearSave();

    // Restart with original puzzle
    this.startGame(this.originalPuzzle);
  }

  // Auto-solve the puzzle using the solver
  solve() {
    if (!this.board) return;

    const currentPuzzle = this.board.cells.map(cell => cell.value);
    const solution = Solver.solve(currentPuzzle);

    if (!solution) {
      this.eventBus.emit('solve:failed');
      return;
    }

    // Apply solution to all non-given cells
    this.board.cells.forEach((cell, idx) => {
      if (!cell.given && cell.value !== solution[idx]) {
        cell.value = solution[idx];
        cell.source = 'solver';
        cell.notes.clear();
      }
    });

    // Check completion
    if (this.board.isComplete()) {
      this._stopTimer();
      this.eventBus.emit(EVENTS.GAME_COMPLETED, {
        elapsed: this.elapsed,
        moves: this.moves
      });
    }

    // Clear undo/redo since we're applying multiple changes
    this.undoStack = [];
    this.redoStack = [];

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId: null, value: null });
    this.eventBus.emit('solve:success');
    this.clearSave(); // Don't save auto-solved games
  }
}
