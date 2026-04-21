import { IRenderer } from '../../platform/IRenderer.js';
import { SIZE } from '../../core/constants.js';

/**
 * UI Text Constants - Octile Universe Tone
 * All modal copy centralized for easy management
 */
const UI_TEXT = {
  WIN_TITLE: 'Completed',
  WIN_TIME: (time) => `Time: ${time}`,
  WIN_MOVES: (moves) => `Moves: ${moves}`,
  BUTTON_PLAY_AGAIN: 'Play again',
  PROMO_PREFIX: 'Explore further: ',
  PROMO_LABEL: 'Octile',
  PROMO_URL: 'https://octile.app'
};

export class WebRenderer extends IRenderer {
  constructor() {
    super();
    this.gridElement = document.getElementById('sudoku-grid');
    this.timerElement = document.getElementById('timer');
    this.movesElement = document.getElementById('moves');
    this.lastHighlightState = null;
    this.modalElement = null;
    this.onNewGame = null; // Callback for new game button
  }

  renderBoard(cells) {
    this.gridElement.innerHTML = '';

    cells.forEach((cell, index) => {
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;

      const cellElement = document.createElement('div');
      cellElement.className = 'cell';
      cellElement.dataset.row = row;
      cellElement.dataset.col = col;
      cellElement.dataset.cellId = index;

      if (cell.given) {
        cellElement.classList.add('fixed');
      }

      this._renderCellContent(cellElement, cell);

      this.gridElement.appendChild(cellElement);
    });
  }

  updateCell(cellId, cell) {
    const cellElement = this.gridElement.querySelector(`[data-cell-id="${cellId}"]`);
    if (!cellElement) return;

    cellElement.classList.toggle('fixed', cell.given);
    this._renderCellContent(cellElement, cell);
  }

  _renderCellContent(cellElement, cell) {
    cellElement.innerHTML = '';

    if (cell.value !== 0) {
      // Show value
      const valueSpan = document.createElement('span');
      valueSpan.className = 'cell-value';
      valueSpan.textContent = cell.value;
      cellElement.appendChild(valueSpan);
    } else if (cell.notes.size > 0) {
      // Show notes in 3x3 grid
      const notesGrid = document.createElement('div');
      notesGrid.className = 'notes-grid';

      for (let num = 1; num <= 9; num++) {
        const noteCell = document.createElement('div');
        noteCell.className = 'note-cell';
        if (cell.notes.has(num)) {
          noteCell.textContent = num;
          noteCell.classList.add('active');
        }
        notesGrid.appendChild(noteCell);
      }

      cellElement.appendChild(notesGrid);
    }
  }

  applyHighlights(highlightState, prevState = null) {
    // Remove old highlights (diff optimization)
    if (prevState) {
      this._removeHighlights(prevState);
    } else if (this.lastHighlightState) {
      this._removeHighlights(this.lastHighlightState);
    }

    // Apply new highlights
    if (highlightState.selected !== null) {
      const el = this.gridElement.querySelector(`[data-cell-id="${highlightState.selected}"]`);
      if (el) el.classList.add('selected');
    }

    highlightState.region.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.add('region');
    });

    highlightState.sameNumber.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.add('same-number');
    });

    highlightState.conflicts.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.add('conflict');
    });

    this.lastHighlightState = highlightState;
  }

  _removeHighlights(state) {
    if (state.selected !== null) {
      const el = this.gridElement.querySelector(`[data-cell-id="${state.selected}"]`);
      if (el) el.classList.remove('selected');
    }

    state.region.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.remove('region');
    });

    state.sameNumber.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.remove('same-number');
    });

    state.conflicts.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.remove('conflict');
    });
  }

  updateTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerElement.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  updateMoves(moves) {
    this.movesElement.textContent = `Moves: ${moves}`;
  }

  showCompletionModal(data) {
    // Remove existing modal if any
    this._hideModal();

    const modal = document.createElement('div');
    modal.className = 'modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Create title
    const titleEl = document.createElement('h2');
    titleEl.textContent = UI_TEXT.WIN_TITLE;  // "Completed"
    modalContent.appendChild(titleEl);

    // Create time line
    const timeLine = document.createElement('p');
    timeLine.className = 'modal-line';
    timeLine.textContent = UI_TEXT.WIN_TIME(this._formatTime(data.elapsed));
    modalContent.appendChild(timeLine);

    // Create moves line
    const movesLine = document.createElement('p');
    movesLine.className = 'modal-line';
    movesLine.textContent = UI_TEXT.WIN_MOVES(data.moves);
    modalContent.appendChild(movesLine);

    // Add Octile promo
    const promo = document.createElement('p');
    promo.className = 'octile-promo';

    const prefix = document.createElement('span');
    prefix.textContent = UI_TEXT.PROMO_PREFIX;  // "Explore further: "
    promo.appendChild(prefix);

    const link = document.createElement('a');
    link.href = UI_TEXT.PROMO_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';  // Security
    link.textContent = UI_TEXT.PROMO_LABEL;  // "Octile"
    promo.appendChild(link);

    modalContent.appendChild(promo);

    // Create button
    const button = document.createElement('button');
    button.id = 'modal-new-game';
    button.type = 'button';
    button.textContent = UI_TEXT.BUTTON_PLAY_AGAIN;

    // Bind click handler
    button.addEventListener('click', () => {
      modal.classList.remove('show');
      // Wait for animation to complete before removing
      setTimeout(() => {
        this._hideModal();
        this.onNewGame?.();  // Callback pattern
      }, 300);
    });

    modalContent.appendChild(button);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
    this.modalElement = modal;

    // Fade in
    setTimeout(() => modal.classList.add('show'), 10);
  }

  _hideModal() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
  }

  setNewGameHandler(callback) {
    this.onNewGame = callback;
  }

  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
