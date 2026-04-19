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
    this.board = new Board(puzzleArray);
    this.selectedCell = null;
    this.selectedNumber = null;
    this.undoStack = [];
    this.redoStack = [];
    this.moves = 0;
    this.startTime = Date.now();
    this.elapsed = 0;
    this._startTimer();

    this.eventBus.emit(EVENTS.GAME_STARTED, {
      cells: this.board.cells
    });
  }

  selectCell(row, col) {
    const cellId = row * 9 + col;
    this.selectedCell = cellId;

    // Compute highlight state (data-driven)
    const highlightState = this._computeHighlightState();

    this.eventBus.emit(EVENTS.SELECTION_CHANGED, { cellId });
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);
  }

  selectNumber(number) {
    this.selectedNumber = number;

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
  }

  _computeHighlightState() {
    const state = {
      selected: this.selectedCell,
      sameNumber: new Set(),
      region: new Set(),
      conflicts: new Set()
    };

    if (this.selectedCell !== null) {
      const row = Math.floor(this.selectedCell / 9);
      const col = this.selectedCell % 9;
      state.region = this.board.getRegionCells(row, col);

      const cell = this.board.getCell(row, col);
      if (cell.value !== 0) {
        state.sameNumber = this.board.getCellsWithValue(cell.value);
      }
    }

    if (this.selectedNumber !== null) {
      state.sameNumber = this.board.getCellsWithValue(this.selectedNumber);
    }

    state.conflicts = this.board.validateAll();

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
}
