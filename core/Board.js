import { SIZE, BOX_SIZE } from './constants.js';

export class Board {
  constructor(puzzleArray) {
    // Initialize 9x9 grid with enhanced cell model
    this.cells = puzzleArray.map((value, index) => ({
      value,
      given: value !== 0,
      notes: new Set(),
      conflict: false,
      source: value !== 0 ? 'given' : null
    }));
  }

  getCell(row, col) {
    return this.cells[row * 9 + col];
  }

  setCell(row, col, value, source = 'user') {
    const cell = this.getCell(row, col);
    if (cell.given) return false;  // Reject edits to fixed cells

    cell.value = value;
    cell.source = value !== 0 ? source : null;
    return true;
  }

  // Incremental validation: check single cell (O(9))
  validateCell(row, col) {
    const conflicts = new Set();
    const cell = this.getCell(row, col);
    if (cell.value === 0) return conflicts;

    // Check row
    for (let c = 0; c < SIZE; c++) {
      if (c !== col) {
        const other = this.getCell(row, c);
        if (other.value === cell.value) {
          conflicts.add(row * 9 + c);
          conflicts.add(row * 9 + col);
        }
      }
    }

    // Check column
    for (let r = 0; r < SIZE; r++) {
      if (r !== row) {
        const other = this.getCell(r, col);
        if (other.value === cell.value) {
          conflicts.add(r * 9 + col);
          conflicts.add(row * 9 + col);
        }
      }
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
      for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
        if (r !== row || c !== col) {
          const other = this.getCell(r, c);
          if (other.value === cell.value) {
            conflicts.add(r * 9 + c);
            conflicts.add(row * 9 + col);
          }
        }
      }
    }

    return conflicts;
  }

  // Full board validation (O(81))
  validateAll() {
    const conflicts = new Set();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cellConflicts = this.validateCell(r, c);
        cellConflicts.forEach(id => conflicts.add(id));
      }
    }
    return conflicts;
  }

  isComplete() {
    return this.cells.every(cell => cell.value !== 0) &&
           this.validateAll().size === 0;
  }

  getCellsWithValue(value) {
    const cells = new Set();
    this.cells.forEach((cell, index) => {
      if (cell.value === value && value !== 0) {
        cells.add(index);
      }
    });
    return cells;
  }

  getRegionCells(row, col) {
    const cells = new Set();

    // Row
    for (let c = 0; c < SIZE; c++) {
      cells.add(row * 9 + c);
    }

    // Column
    for (let r = 0; r < SIZE; r++) {
      cells.add(r * 9 + col);
    }

    // Box
    const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
      for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
        cells.add(r * 9 + c);
      }
    }

    return cells;
  }

  getPeerCells(row, col) {
    const peers = new Set();
    const self = row * 9 + col;

    for (let c = 0; c < SIZE; c++) {
      const id = row * 9 + c;
      if (id !== self) peers.add(id);
    }

    for (let r = 0; r < SIZE; r++) {
      const id = r * 9 + col;
      if (id !== self) peers.add(id);
    }

    const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
      for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
        const id = r * 9 + c;
        if (id !== self) peers.add(id);
      }
    }

    return peers;
  }
}
