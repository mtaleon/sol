import { EVENTS } from './constants.js';
import { Board } from './Board.js';
import { Solver } from './Solver.js';

const MAX_UNDO_STACK = 200;

export class Game {
  constructor(eventBus, storage, settings) {
    this.eventBus = eventBus;
    this.storage = storage;
    this.settings = settings;
    this.board = null;
    this.selectedCell = null;
    this.selectedNumber = null;
    this.notesMode = false;
    this.undoStack = [];
    this.redoStack = [];
    this.moves = 0;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.startTime = null;
    this.elapsed = 0;
    this.timerInterval = null;
    this.paused = false;
    this.pausedDuration = 0;
    this.pauseStartTime = null;
    this.difficulty = null;
    this.solution = null;
    this.puzzleHash = null;
    this.originalPuzzle = null;
    this.isDaily = false;
    this.isPractice = false;
  }

  startGame(puzzleArray, difficulty = 'MEDIUM') {
    this.clearSave();

    this.originalPuzzle = [...puzzleArray];
    this.difficulty = difficulty;
    this.solution = Solver.solve([...puzzleArray]);
    this.puzzleHash = puzzleArray.join(',');

    this.board = new Board(puzzleArray);
    this.selectedCell = null;
    this.selectedNumber = null;
    this.notesMode = false;
    this.undoStack = [];
    this.redoStack = [];
    this.moves = 0;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.startTime = Date.now();
    this.elapsed = 0;
    this.paused = false;
    this.pausedDuration = 0;
    this.pauseStartTime = null;
    this._startTimer();

    this.eventBus.emit(EVENTS.GAME_STARTED, {
      cells: this.board.cells,
      difficulty: this.difficulty
    });

    this.save();
  }

  selectCell(row, col) {
    if (this.paused) return;

    const cellId = row * 9 + col;
    this.selectedCell = cellId;
    this.selectedNumber = null;

    const highlightState = this._computeHighlightState();
    this.eventBus.emit(EVENTS.SELECTION_CHANGED, { cellId });
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);
  }

  selectNumber(number) {
    this.selectedNumber = number;
    this.selectedCell = null;

    const highlightState = this._computeHighlightState();
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);
  }

  setCell(row, col, value) {
    if (this.paused) return;

    const cellId = row * 9 + col;
    const cell = this.board.getCell(row, col);

    if (cell.given) {
      this.eventBus.emit('input:invalid', { cellId });
      return;
    }

    if (this.notesMode && value !== 0) {
      this.toggleNote(row, col, value);
      return;
    }

    const prevValue = cell.value;
    const prevNotes = Array.from(cell.notes);

    if (!this.board.setCell(row, col, value)) {
      this.eventBus.emit('input:invalid', { cellId });
      return;
    }

    if (value !== 0) {
      cell.notes.clear();
    }

    // Build undo action (may become compound if auto-remove notes)
    const valueAction = {
      type: 'value',
      cellId,
      prevValue,
      nextValue: value,
      prevNotes
    };

    const autoRemoved = [];
    if (value !== 0 && this.settings && this.settings.get('autoRemoveNotes')) {
      const peers = this.board.getPeerCells(row, col);
      for (const peerId of peers) {
        const peer = this.board.cells[peerId];
        if (peer.notes.has(value)) {
          peer.notes.delete(value);
          autoRemoved.push({ type: 'note', cellId: peerId, number: value, wasPresent: true });
        }
      }
    }

    if (autoRemoved.length > 0) {
      this._pushUndo({ type: 'compound', actions: [valueAction, ...autoRemoved] });
    } else {
      this._pushUndo(valueAction);
    }

    this.redoStack = [];
    this.moves++;

    // Mistake check
    if (value !== 0 && this.solution && value !== this.solution[cellId]) {
      this.mistakes++;
      this.eventBus.emit(EVENTS.MISTAKE_MADE, { cellId, value, mistakes: this.mistakes });

      const limit = this.settings ? this.settings.get('mistakeLimit') : 3;
      if (limit > 0 && this.mistakes >= limit) {
        this._stopTimer();
        this.eventBus.emit(EVENTS.GAME_OVER, {
          elapsed: this.elapsed,
          moves: this.moves,
          mistakes: this.mistakes,
          hintsUsed: this.hintsUsed,
          difficulty: this.difficulty
        });
        this.clearSave();
        return;
      }
    }

    // Validate
    const conflicts = this.board.validateCell(row, col);
    this.board.cells.forEach((c, id) => {
      c.conflict = conflicts.has(id);
    });

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId, value });
    this.eventBus.emit(EVENTS.VALIDATION_CHANGED, {
      conflicts,
      isComplete: this.board.isComplete()
    });

    const highlightState = this._computeHighlightState();
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);

    if (this.board.isComplete()) {
      this._stopTimer();
      this.eventBus.emit(EVENTS.GAME_COMPLETED, {
        elapsed: this.elapsed,
        moves: this.moves,
        mistakes: this.mistakes,
        hintsUsed: this.hintsUsed,
        difficulty: this.difficulty,
        isDaily: this.isDaily
      });
      this.clearSave();
    } else {
      this.save();
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;

    const action = this.undoStack.pop();
    this._applyUndo(action);
    this.redoStack.push(action);

    this._revalidateAndEmit();
    this.save();
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const action = this.redoStack.pop();
    this._applyRedo(action);
    this.undoStack.push(action);

    this._revalidateAndEmit();
    this.save();
  }

  _applyUndo(action) {
    switch (action.type) {
      case 'value': {
        const row = Math.floor(action.cellId / 9);
        const col = action.cellId % 9;
        this.board.setCell(row, col, action.prevValue);
        const cell = this.board.getCell(row, col);
        cell.notes = new Set(action.prevNotes);
        break;
      }
      case 'note': {
        const cell = this.board.cells[action.cellId];
        if (action.wasPresent) {
          cell.notes.add(action.number);
        } else {
          cell.notes.delete(action.number);
        }
        break;
      }
      case 'compound': {
        for (let i = action.actions.length - 1; i >= 0; i--) {
          this._applyUndo(action.actions[i]);
        }
        break;
      }
    }
  }

  _applyRedo(action) {
    switch (action.type) {
      case 'value': {
        const row = Math.floor(action.cellId / 9);
        const col = action.cellId % 9;
        this.board.setCell(row, col, action.nextValue);
        const cell = this.board.getCell(row, col);
        if (action.nextValue !== 0) {
          cell.notes.clear();
        }
        break;
      }
      case 'note': {
        const cell = this.board.cells[action.cellId];
        if (action.wasPresent) {
          cell.notes.delete(action.number);
        } else {
          cell.notes.add(action.number);
        }
        break;
      }
      case 'compound': {
        for (const sub of action.actions) {
          this._applyRedo(sub);
        }
        break;
      }
    }
  }

  _revalidateAndEmit() {
    const conflicts = this.board.validateAll();
    this.board.cells.forEach((cell, id) => {
      cell.conflict = conflicts.has(id);
    });

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId: null, value: null });
    this.eventBus.emit(EVENTS.VALIDATION_CHANGED, { conflicts });

    const highlightState = this._computeHighlightState();
    this.eventBus.emit(EVENTS.HIGHLIGHT_CHANGED, highlightState);
  }

  _pushUndo(action) {
    this.undoStack.push(action);
    if (this.undoStack.length > MAX_UNDO_STACK) {
      this.undoStack.shift();
    }
  }

  toggleNotesMode() {
    this.notesMode = !this.notesMode;
    this.eventBus.emit('notes:mode-changed', { notesMode: this.notesMode });
  }

  toggleNote(row, col, number) {
    if (this.paused) return;

    const cell = this.board.getCell(row, col);

    if (cell.given || cell.value !== 0) return;

    const wasPresent = cell.notes.has(number);
    if (wasPresent) {
      cell.notes.delete(number);
    } else {
      cell.notes.add(number);
    }

    const cellId = row * 9 + col;
    this._pushUndo({ type: 'note', cellId, number, wasPresent });
    this.redoStack = [];

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId, value: cell.value });
    this.save();
  }

  clearNotes(row, col) {
    if (this.paused) return;

    const cell = this.board.getCell(row, col);
    if (cell.notes.size === 0) return;

    const cellId = row * 9 + col;
    const subActions = [];
    for (const num of cell.notes) {
      subActions.push({ type: 'note', cellId, number: num, wasPresent: true });
    }
    cell.notes.clear();

    this._pushUndo({ type: 'compound', actions: subActions });
    this.redoStack = [];

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId, value: cell.value });
    this.save();
  }

  _computeHighlightState() {
    const state = {
      selected: this.selectedCell,
      sameNumber: new Set(),
      region: new Set(),
      conflicts: new Set(),
      primaryConflict: null
    };

    if (this.selectedCell !== null) {
      const row = Math.floor(this.selectedCell / 9);
      const col = this.selectedCell % 9;

      const showConflicts = this.settings ? this.settings.get('showConflicts') : true;
      if (showConflicts) {
        state.conflicts = this.board.validateAll();
      }

      // If conflicts exist, suppress non-essential highlights
      if (state.conflicts.size > 0) {
        // Mark the selected cell as primary error if it's in the conflict set
        if (state.conflicts.has(this.selectedCell)) {
          state.primaryConflict = this.selectedCell;
        }
      } else {
        state.region = this.board.getRegionCells(row, col);
        const cell = this.board.getCell(row, col);
        if (cell.value !== 0) {
          state.sameNumber = this.board.getCellsWithValue(cell.value);
        }
      }
    }

    if (this.selectedNumber !== null) {
      state.sameNumber = this.board.getCellsWithValue(this.selectedNumber);
    }

    return state;
  }

  getHint() {
    if (this.paused) return;
    if (!this.solution) return;

    let targetCellId = null;

    // Prefer selected cell if empty
    if (this.selectedCell !== null) {
      const cell = this.board.cells[this.selectedCell];
      if (!cell.given && cell.value === 0) {
        targetCellId = this.selectedCell;
      }
    }

    // Fallback: first empty cell
    if (targetCellId === null) {
      for (let i = 0; i < 81; i++) {
        const cell = this.board.cells[i];
        if (!cell.given && cell.value === 0) {
          targetCellId = i;
          break;
        }
      }
    }

    if (targetCellId === null) return;

    const row = Math.floor(targetCellId / 9);
    const col = targetCellId % 9;
    const hintValue = this.solution[targetCellId];

    this.hintsUsed++;
    this.setCell(row, col, hintValue);

    const cell = this.board.getCell(row, col);
    cell.source = 'hint';

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId: targetCellId, value: hintValue });
  }

  // Pause / Resume
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.pauseStartTime = Date.now();
    this._stopTimer();
    this.eventBus.emit(EVENTS.GAME_PAUSED);
    this.save();
  }

  resume() {
    if (!this.paused) return;
    this.pausedDuration += Date.now() - this.pauseStartTime;
    this.pauseStartTime = null;
    this.paused = false;
    this._startTimer();
    this.eventBus.emit(EVENTS.GAME_RESUMED);
    this.save();
  }

  _startTimer() {
    this._stopTimer();
    this.timerInterval = setInterval(() => {
      this.elapsed = Math.floor((Date.now() - this.startTime - this.pausedDuration) / 1000);
    }, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Serialization — save format v2
  serialize() {
    if (!this.board) return null;

    return {
      version: 2,
      timestamp: Date.now(),
      difficulty: this.difficulty,
      puzzle: this.board.cells
        .map((cell, idx) => cell.given ? { idx, value: cell.value } : null)
        .filter(item => item !== null),
      grid: this.board.cells.map(cell => ({
        value: cell.value,
        notes: Array.from(cell.notes),
        source: cell.source
      })),
      solution: this.solution,
      puzzleHash: this.puzzleHash,
      elapsed: this.elapsed,
      moves: this.moves,
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
      startTime: this.startTime,
      pausedDuration: this.pausedDuration,
      notesMode: this.notesMode,
      isDaily: this.isDaily,
      isPractice: this.isPractice,
      undoStack: this.undoStack,
      redoStack: this.redoStack
    };
  }

  hydrate(data) {
    if (!data) return false;

    if (data.version === 1) {
      data = this._migrateV1toV2(data);
    }
    if (data.version !== 2) return false;

    try {
      const puzzleArray = new Array(81).fill(0);
      data.puzzle.forEach(({ idx, value }) => {
        puzzleArray[idx] = value;
      });

      this.board = new Board(puzzleArray);

      data.grid.forEach((cellData, idx) => {
        const cell = this.board.cells[idx];
        cell.value = cellData.value;
        cell.notes = new Set(cellData.notes);
        cell.source = cellData.source;
        cell.given = puzzleArray[idx] !== 0;
      });

      this.difficulty = data.difficulty || 'MEDIUM';
      this.moves = data.moves;
      this.elapsed = data.elapsed;
      this.startTime = data.startTime;
      this.pausedDuration = data.pausedDuration || 0;
      this.mistakes = data.mistakes || 0;
      this.hintsUsed = data.hintsUsed || 0;
      this.notesMode = data.notesMode;
      this.isDaily = data.isDaily || false;
      this.isPractice = data.isPractice || false;
      this.selectedCell = null;
      this.selectedNumber = null;
      this.paused = false;
      this.pauseStartTime = null;

      this.originalPuzzle = puzzleArray;
      this.puzzleHash = data.puzzleHash || puzzleArray.join(',');

      // Restore or recompute solution
      if (data.solution && data.puzzleHash === puzzleArray.join(',')) {
        this.solution = data.solution;
      } else {
        this.solution = Solver.solve([...puzzleArray]);
      }

      // Restore undo/redo stacks (bounded)
      this.undoStack = Array.isArray(data.undoStack) ? data.undoStack.slice(-MAX_UNDO_STACK) : [];
      this.redoStack = Array.isArray(data.redoStack) ? data.redoStack.slice(-MAX_UNDO_STACK) : [];

      if (this.startTime && !this.board.isComplete()) {
        this._startTimer();
      }

      const conflicts = this.board.validateAll();
      this.board.cells.forEach((cell, id) => {
        cell.conflict = conflicts.has(id);
      });

      this.eventBus.emit(EVENTS.GAME_STARTED, {
        cells: this.board.cells,
        difficulty: this.difficulty
      });

      return true;
    } catch (error) {
      console.error('Hydrate error:', error);
      return false;
    }
  }

  _migrateV1toV2(data) {
    const puzzleArray = new Array(81).fill(0);
    data.puzzle.forEach(({ idx, value }) => {
      puzzleArray[idx] = value;
    });

    return {
      ...data,
      version: 2,
      difficulty: 'MEDIUM',
      mistakes: 0,
      hintsUsed: 0,
      solution: Solver.solve([...puzzleArray]),
      puzzleHash: puzzleArray.join(','),
      pausedDuration: 0,
      isDaily: false,
      isPractice: false,
      undoStack: [],
      redoStack: []
    };
  }

  save() {
    if (!this.storage) return;

    const data = this.serialize();
    if (data) {
      this.storage.set('sudoku-save', data);
    }
  }

  loadSavedGame() {
    if (!this.storage) return false;

    const data = this.storage.get('sudoku-save');
    if (data) {
      return this.hydrate(data);
    }

    return false;
  }

  clearSave() {
    if (this.storage) {
      this.storage.remove('sudoku-save');
    }
  }

  restart() {
    if (!this.originalPuzzle) return;
    this.clearSave();
    this.startGame(this.originalPuzzle, this.difficulty);
  }

  solve() {
    if (!this.board) return;

    const currentPuzzle = this.board.cells.map(cell => cell.value);
    const solution = Solver.solve(currentPuzzle);

    if (!solution) {
      this.eventBus.emit('solve:failed');
      return;
    }

    this.board.cells.forEach((cell, idx) => {
      if (!cell.given && cell.value !== solution[idx]) {
        cell.value = solution[idx];
        cell.source = 'solver';
        cell.notes.clear();
      }
    });

    if (this.board.isComplete()) {
      this._stopTimer();
      // Assisted — not emitting GAME_COMPLETED (per R1)
    }

    this.undoStack = [];
    this.redoStack = [];

    this.eventBus.emit(EVENTS.BOARD_CHANGED, { cellId: null, value: null });
    this.eventBus.emit('solve:success');
    this.clearSave();
  }
}
