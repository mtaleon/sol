import { SIZE, DIFFICULTY } from './constants.js';
import { Solver } from './Solver.js';

export class Generator {
  static generate(difficulty = 'MEDIUM') {
    console.log(`Generating ${difficulty} puzzle...`);
    const startTime = Date.now();

    // 1. Create filled grid
    const grid = this._createFilledGrid();

    // 2. Remove cells to target clue count
    const targetClues = DIFFICULTY[difficulty].clues;
    const puzzle = this._removeClues(grid, 81 - targetClues);

    const elapsed = Date.now() - startTime;
    console.log(`Generated in ${elapsed}ms with ${puzzle.filter(v => v !== 0).length} clues`);

    return puzzle;
  }

  static _createFilledGrid() {
    const grid = new Array(81).fill(0);

    // Fill diagonal 3x3 boxes (independent, no conflicts)
    for (let box = 0; box < 3; box++) {
      this._fillBox(grid, box * 3, box * 3);
    }

    // Solve the rest using backtracking
    const solvedGrid = Solver.solve(grid);

    return solvedGrid || grid;  // Return solved grid or original if solving failed
  }

  static _fillBox(grid, row, col) {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    this._shuffle(numbers);

    let idx = 0;
    for (let r = row; r < row + 3; r++) {
      for (let c = col; c < col + 3; c++) {
        grid[r * SIZE + c] = numbers[idx++];
      }
    }
  }

  static _removeClues(grid, targetRemovals) {
    const puzzle = [...grid];
    const positions = Array.from({ length: 81 }, (_, i) => i);
    this._shuffle(positions);

    let removedCount = 0;
    let attempts = 0;
    const maxAttempts = 81;  // Prevent infinite loops

    for (const pos of positions) {
      if (removedCount >= targetRemovals) break;
      if (attempts >= maxAttempts) break;

      attempts++;
      const backup = puzzle[pos];

      // Skip if already empty
      if (backup === 0) continue;

      puzzle[pos] = 0;

      // Check uniqueness (critical: early exit at 2 solutions)
      const solutionCount = Solver.countSolutions(puzzle, 2);

      if (solutionCount === 1) {
        // Unique solution - keep it removed
        removedCount++;
      } else {
        // Multiple solutions or no solution - restore
        puzzle[pos] = backup;
        if (removedCount < 5) {
          console.log(`Position ${pos} creates ${solutionCount} solutions, restoring`);
        }
      }
    }

    console.log(`Removed ${removedCount}/${targetRemovals} clues (${attempts} attempts)`);
    return puzzle;
  }

  static _shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
