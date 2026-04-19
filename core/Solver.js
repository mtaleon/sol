import { SIZE, BOX_SIZE } from './constants.js';

export class Solver {
  // Backtracking solver with solution counting (CRITICAL: early exit at limit)
  static countSolutions(grid, limit = 2) {
    let count = 0;
    const workingGrid = [...grid];

    function solve(arr) {
      if (count >= limit) return;  // Early exit!

      // Find empty cell
      let emptyCellIndex = -1;
      for (let i = 0; i < 81; i++) {
        if (arr[i] === 0) {
          emptyCellIndex = i;
          break;
        }
      }

      if (emptyCellIndex === -1) {
        // Complete solution found
        count++;
        return;
      }

      const row = Math.floor(emptyCellIndex / SIZE);
      const col = emptyCellIndex % SIZE;

      // Try each number
      for (let num = 1; num <= SIZE; num++) {
        if (isValid(arr, row, col, num)) {
          arr[emptyCellIndex] = num;
          solve(arr);
          arr[emptyCellIndex] = 0;  // Backtrack

          if (count >= limit) return;  // Early exit
        }
      }
    }

    function isValid(arr, row, col, num) {
      // Check row
      for (let c = 0; c < SIZE; c++) {
        if (arr[row * SIZE + c] === num) return false;
      }

      // Check column
      for (let r = 0; r < SIZE; r++) {
        if (arr[r * SIZE + col] === num) return false;
      }

      // Check 3x3 box
      const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
      const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
      for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
        for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
          if (arr[r * SIZE + c] === num) return false;
        }
      }

      return true;
    }

    solve(workingGrid);
    return count;
  }

  // Solve puzzle and return solution (or null if unsolvable)
  static solve(grid) {
    const workingGrid = [...grid];

    function solveHelper(arr, index = 0) {
      if (index >= 81) return true;  // Solved

      if (arr[index] !== 0) {
        return solveHelper(arr, index + 1);
      }

      const row = Math.floor(index / SIZE);
      const col = index % SIZE;

      for (let num = 1; num <= SIZE; num++) {
        if (isValid(arr, row, col, num)) {
          arr[index] = num;
          if (solveHelper(arr, index + 1)) return true;
          arr[index] = 0;
        }
      }

      return false;
    }

    function isValid(arr, row, col, num) {
      // Check row
      for (let c = 0; c < SIZE; c++) {
        if (arr[row * SIZE + c] === num) return false;
      }

      // Check column
      for (let r = 0; r < SIZE; r++) {
        if (arr[r * SIZE + col] === num) return false;
      }

      // Check 3x3 box
      const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
      const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
      for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
        for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
          if (arr[r * SIZE + c] === num) return false;
        }
      }

      return true;
    }

    if (solveHelper(workingGrid)) {
      return workingGrid;
    }
    return null;
  }

  // Get hint: return {cellId, value} for first empty cell
  static getHint(grid) {
    const solution = this.solve(grid);
    if (!solution) return null;

    // Find first empty cell
    for (let i = 0; i < 81; i++) {
      if (grid[i] === 0) {
        return {
          cellId: i,
          value: solution[i]
        };
      }
    }
    return null;
  }
}
