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
      if (e.key >= '1' && e.key <= '9' && this.numberInputCallback) {
        this.numberInputCallback(parseInt(e.key));
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && this.numberInputCallback) {
        this.numberInputCallback(0);
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
