import { IRenderer } from '../../platform/IRenderer.js';
import { SIZE } from '../../core/constants.js';

export class WebRenderer extends IRenderer {
  constructor() {
    super();
    this.gridElement = document.getElementById('sudoku-grid');
    this.timerElement = document.getElementById('timer');
    this.movesElement = document.getElementById('moves');
    this.lastHighlightState = null;
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
    const modal = document.getElementById('completion-modal');
    modal.querySelector('.time').textContent = this._formatTime(data.elapsed);
    modal.querySelector('.moves').textContent = data.moves;
    modal.classList.add('visible');
  }

  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
}
