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

    // Cursor position tracking
    this.cursorRow = 0;
    this.cursorCol = 0;
    this.cursorMoveCallback = null;

    // Command shortcuts
    this.newGameCallback = null;
    this.saveGameCallback = null;
    this.restartCallback = null;
    this.undoCallback = null;
    this.solveCallback = null;
    this.hintCallback = null;
  }

  initialize() {
    const grid = document.getElementById('sudoku-grid');

    // Long-press detection for notes mode toggle
    const handlePressStart = (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;

      this.longPressTarget = cell;
      this.longPressTimer = setTimeout(() => {
        if (this.longPressCallback && this.longPressTarget) {
          this.longPressCallback();
          // Visual feedback
          cell.classList.add('long-press-feedback');
          setTimeout(() => cell.classList.remove('long-press-feedback'), 200);
        }
      }, 300); // 300ms for long press
    };

    const handlePressEnd = (e) => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // Normal click if not long-pressed
      const cell = e.target.closest('.cell');
      if (cell && cell === this.longPressTarget && this.cellClickCallback) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        // Sync cursor position with mouse click
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

    // Touch events
    grid.addEventListener('touchstart', handlePressStart, { passive: true });
    grid.addEventListener('touchend', handlePressEnd);
    grid.addEventListener('touchcancel', handlePressCancel);
    grid.addEventListener('touchmove', handlePressCancel);

    // Mouse events
    grid.addEventListener('mousedown', handlePressStart);
    grid.addEventListener('mouseup', handlePressEnd);
    grid.addEventListener('mouseleave', handlePressCancel);

    // Number pad - for highlighting only
    document.getElementById('number-pad').addEventListener('click', (e) => {
      if (e.target.dataset.number && this.numberSelectCallback) {
        const number = parseInt(e.target.dataset.number);
        this.numberSelectCallback(number);
      }
    });

    // Clear button - for placing 0 via keyboard
    document.getElementById('clear-btn').addEventListener('click', () => {
      if (this.numberInputCallback) {
        this.numberInputCallback(0);
      }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      // Number input
      if (e.key >= '1' && e.key <= '9' && this.numberInputCallback) {
        this.numberInputCallback(parseInt(e.key));
        return;
      } else if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') && this.numberInputCallback) {
        this.numberInputCallback(0);
        return;
      }

      // Cursor movement - Arrow keys
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.moveCursor(-1, 0);
          return;
        case 'ArrowDown':
          e.preventDefault();
          this.moveCursor(1, 0);
          return;
        case 'ArrowLeft':
          e.preventDefault();
          this.moveCursor(0, -1);
          return;
        case 'ArrowRight':
          e.preventDefault();
          this.moveCursor(0, 1);
          return;
      }

      // Cursor movement - vim-style (hjkl)
      switch (e.key) {
        case 'h':
          this.moveCursor(0, -1);
          return;
        case 'j':
          this.moveCursor(1, 0);
          return;
        case 'k':
          this.moveCursor(-1, 0);
          return;
        case 'l':
          this.moveCursor(0, 1);
          return;
      }

      // Command shortcuts
      switch (e.key) {
        case 'n':
          if (this.newGameCallback) this.newGameCallback();
          return;
        case 's':
          if (this.saveGameCallback) {
            e.preventDefault(); // Prevent browser save dialog
            this.saveGameCallback();
          }
          return;
        case 'r':
          if (this.restartCallback) this.restartCallback();
          return;
        case 'u':
          if (this.undoCallback) this.undoCallback();
          return;
        case 'v':
          if (this.solveCallback) this.solveCallback();
          return;
        case '?':
          if (this.hintCallback) this.hintCallback();
          return;
      }
    });
  }

  onCellClick(callback) {
    this.cellClickCallback = callback;
  }

  onNumberInput(callback) {
    this.numberInputCallback = callback;
  }

  onNumberSelect(callback) {
    this.numberSelectCallback = callback;
  }

  onLongPress(callback) {
    this.longPressCallback = callback;
  }

  onCursorMove(callback) {
    this.cursorMoveCallback = callback;
  }

  onNewGame(callback) {
    this.newGameCallback = callback;
  }

  onSaveGame(callback) {
    this.saveGameCallback = callback;
  }

  onRestart(callback) {
    this.restartCallback = callback;
  }

  onUndo(callback) {
    this.undoCallback = callback;
  }

  onSolve(callback) {
    this.solveCallback = callback;
  }

  onHint(callback) {
    this.hintCallback = callback;
  }

  moveCursor(rowDelta, colDelta) {
    this.cursorRow = Math.max(0, Math.min(8, this.cursorRow + rowDelta));
    this.cursorCol = Math.max(0, Math.min(8, this.cursorCol + colDelta));
    if (this.cursorMoveCallback) {
      this.cursorMoveCallback(this.cursorRow, this.cursorCol);
    }
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
