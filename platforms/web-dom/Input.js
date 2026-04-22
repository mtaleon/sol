import { IInput } from '../../platform/IInput.js';

export class WebInput extends IInput {
  constructor() {
    super();
    this.cellClickCallback = null;
    this.numberInputCallback = null;
    this.numberSelectCallback = null;
    this.longPressCallback = null;
    this.longPressTimer = null;
    this.longPressTarget = null;

    this.cursorRow = 0;
    this.cursorCol = 0;
    this.cursorMoveCallback = null;

    this.newGameCallback = null;
    this.saveGameCallback = null;
    this.restartCallback = null;
    this.undoCallback = null;
    this.redoCallback = null;
    this.solveCallback = null;
    this.hintCallback = null;
    this.clearCallback = null;
    this.clearNotesCallback = null;
    this.notesToggleCallback = null;
  }

  initialize() {
    const grid = document.getElementById('sudoku-grid');

    // Cell long-press detection (notes mode toggle)
    const handlePressStart = (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;

      this.longPressTarget = cell;
      this.longPressTimer = setTimeout(() => {
        if (this.longPressCallback && this.longPressTarget) {
          this.longPressCallback();
          cell.classList.add('long-press-feedback');
          setTimeout(() => cell.classList.remove('long-press-feedback'), 200);
        }
      }, 300);
    };

    const handlePressEnd = (e) => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      const cell = e.target.closest('.cell');
      if (cell && cell === this.longPressTarget && this.cellClickCallback) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.cursorRow = row;
        this.cursorCol = col;
        this.cellClickCallback(row, col);
      }

      this.longPressTarget = null;
    };

    const handlePressCancel = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.longPressTarget = null;
    };

    grid.addEventListener('touchstart', handlePressStart, { passive: true });
    grid.addEventListener('touchend', handlePressEnd);
    grid.addEventListener('touchcancel', handlePressCancel);
    grid.addEventListener('touchmove', handlePressCancel);
    grid.addEventListener('mousedown', handlePressStart);
    grid.addEventListener('mouseup', handlePressEnd);
    grid.addEventListener('mouseleave', handlePressCancel);

    // Number pad — place number if cell selected, otherwise highlight
    document.getElementById('number-pad').addEventListener('click', (e) => {
      if (e.target.dataset.number && this.numberSelectCallback) {
        const number = parseInt(e.target.dataset.number);
        this.numberSelectCallback(number);
      }
    });

    // Undo button — short press=undo, long press=redo
    this._setupLongPress('undo-btn', {
      onShort: () => this.undoCallback?.(),
      onLong: () => this.redoCallback?.()
    });

    // Clear button — short press=clear value, long press=clear notes
    this._setupLongPress('clear-btn', {
      onShort: () => this.clearCallback?.(),
      onLong: () => this.clearNotesCallback?.()
    });

    // Notes toggle button
    document.getElementById('notes-btn').addEventListener('click', () => {
      this.notesToggleCallback?.();
    });

    // Hint button
    document.getElementById('hint-btn').addEventListener('click', () => {
      this.hintCallback?.();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '9' && this.numberInputCallback) {
        this.numberInputCallback(parseInt(e.key));
        return;
      } else if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') && this.numberInputCallback) {
        this.numberInputCallback(0);
        return;
      }

      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); this.moveCursor(-1, 0); return;
        case 'ArrowDown': e.preventDefault(); this.moveCursor(1, 0); return;
        case 'ArrowLeft': e.preventDefault(); this.moveCursor(0, -1); return;
        case 'ArrowRight': e.preventDefault(); this.moveCursor(0, 1); return;
      }

      switch (e.key) {
        case 'h': this.moveCursor(0, -1); return;
        case 'j': this.moveCursor(1, 0); return;
        case 'k': this.moveCursor(-1, 0); return;
        case 'l': this.moveCursor(0, 1); return;
      }

      switch (e.key) {
        case 'n':
          if (e.ctrlKey || e.metaKey) return;
          this.notesToggleCallback?.();
          return;
        case 'u':
          this.undoCallback?.();
          return;
        case 'U':
          this.redoCallback?.();
          return;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              this.redoCallback?.();
            } else {
              this.undoCallback?.();
            }
          }
          return;
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.redoCallback?.();
          }
          return;
        case 's':
          if (this.saveGameCallback) {
            e.preventDefault();
            this.saveGameCallback();
          }
          return;
        case 'r':
          if (this.restartCallback) this.restartCallback();
          return;
        case 'v':
          if (this.solveCallback) this.solveCallback();
          return;
        case '?':
          this.hintCallback?.();
          return;
      }
    });
  }

  _setupLongPress(elementId, { onShort, onLong }) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let timer = null;
    let longPressed = false;

    const startPress = (e) => {
      e.preventDefault();
      longPressed = false;
      timer = setTimeout(() => {
        longPressed = true;
        onLong();
        el.classList.add('long-press-feedback');
        setTimeout(() => el.classList.remove('long-press-feedback'), 200);
      }, 300);
    };

    const endPress = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (!longPressed) {
        onShort();
      }
      longPressed = false;
    };

    const cancelPress = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      longPressed = false;
    };

    el.addEventListener('touchstart', startPress, { passive: false });
    el.addEventListener('touchend', endPress);
    el.addEventListener('touchcancel', cancelPress);
    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', endPress);
    el.addEventListener('mouseleave', cancelPress);
  }

  onCellClick(callback) { this.cellClickCallback = callback; }
  onNumberInput(callback) { this.numberInputCallback = callback; }
  onNumberSelect(callback) { this.numberSelectCallback = callback; }
  onLongPress(callback) { this.longPressCallback = callback; }
  onCursorMove(callback) { this.cursorMoveCallback = callback; }
  onNewGame(callback) { this.newGameCallback = callback; }
  onSaveGame(callback) { this.saveGameCallback = callback; }
  onRestart(callback) { this.restartCallback = callback; }
  onUndo(callback) { this.undoCallback = callback; }
  onRedo(callback) { this.redoCallback = callback; }
  onSolve(callback) { this.solveCallback = callback; }
  onHint(callback) { this.hintCallback = callback; }
  onClear(callback) { this.clearCallback = callback; }
  onClearNotes(callback) { this.clearNotesCallback = callback; }
  onNotesToggle(callback) { this.notesToggleCallback = callback; }

  moveCursor(rowDelta, colDelta) {
    this.cursorRow = Math.max(0, Math.min(8, this.cursorRow + rowDelta));
    this.cursorCol = Math.max(0, Math.min(8, this.cursorCol + colDelta));
    this.cursorMoveCallback?.(this.cursorRow, this.cursorCol);
  }

  cleanup() {
    this.cellClickCallback = null;
    this.numberInputCallback = null;
    this.numberSelectCallback = null;
    this.longPressCallback = null;
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
