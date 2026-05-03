import { Generator } from './core/Generator.js';
import { Solver } from './core/Solver.js';

console.log('Testing Filled Grid Generation...\n');

// Generate a filled grid
const grid = Generator._createFilledGrid();

console.log('Generated Grid:');
for (let r = 0; r < 9; r++) {
  const row = grid.slice(r * 9, (r + 1) * 9);
  console.log(row.join(' '));
}
console.log();

// Check if it's valid (no duplicates)
let isValid = true;
const hasZeros = grid.some(v => v === 0);

if (hasZeros) {
  console.log('❌ Grid has zeros (incomplete)');
  isValid = false;
}

// Check for duplicates in rows
for (let r = 0; r < 9; r++) {
  const row = grid.slice(r * 9, (r + 1) * 9);
  const unique = new Set(row);
  if (unique.size !== 9) {
    console.log(`❌ Row ${r} has duplicates`);
    isValid = false;
  }
}

// Check for duplicates in columns
for (let c = 0; c < 9; c++) {
  const col = [];
  for (let r = 0; r < 9; r++) {
    col.push(grid[r * 9 + c]);
  }
  const unique = new Set(col);
  if (unique.size !== 9) {
    console.log(`❌ Column ${c} has duplicates`);
    isValid = false;
  }
}

// Check for duplicates in boxes
for (let boxRow = 0; boxRow < 3; boxRow++) {
  for (let boxCol = 0; boxCol < 3; boxCol++) {
    const box = [];
    for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
      for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
        box.push(grid[r * 9 + c]);
      }
    }
    const unique = new Set(box);
    if (unique.size !== 9) {
      console.log(`❌ Box [${boxRow},${boxCol}] has duplicates`);
      isValid = false;
    }
  }
}

if (isValid) {
  console.log('✅ Grid is a valid complete Sudoku\n');
} else {
  console.log('❌ Grid is invalid\n');
}

// Now test removing one cell
console.log('Testing cell removal...');
const testGrid = [...grid];
testGrid[40] = 0;  // Remove center cell
console.log(`Removed cell [4,4], was: ${grid[40]}`);

const solutionCount = Solver.countSolutions(testGrid, 2);
console.log(`Solution count: ${solutionCount}`);
console.log(`Expected: 1`);
console.log(`Result: ${solutionCount === 1 ? '✅ PASS' : '❌ FAIL'}`);
