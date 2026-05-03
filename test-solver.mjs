import { Solver } from './core/Solver.js';
import { DEMO_PUZZLE, DEMO_SOLUTION } from './core/constants.js';

console.log('Testing Solver...\n');

// Test 1: Count solutions for DEMO_PUZZLE (should be 1)
console.log('=== Test 1: DEMO_PUZZLE Solution Count ===');
const count1 = Solver.countSolutions(DEMO_PUZZLE, 2);
console.log(`Solution count: ${count1}`);
console.log(`Expected: 1`);
console.log(`Result: ${count1 === 1 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Solve DEMO_PUZZLE
console.log('=== Test 2: Solve DEMO_PUZZLE ===');
const solution = Solver.solve(DEMO_PUZZLE);
if (solution) {
  const matches = solution.every((val, idx) => val === DEMO_SOLUTION[idx]);
  console.log(`Solved: ✅`);
  console.log(`Matches expected solution: ${matches ? '✅ PASS' : '❌ FAIL'}\n`);
} else {
  console.log(`Failed to solve ❌\n`);
}

// Test 3: Count solutions for solved puzzle (should be 1)
console.log('=== Test 3: Solved Puzzle Solution Count ===');
const count2 = Solver.countSolutions(DEMO_SOLUTION, 2);
console.log(`Solution count: ${count2}`);
console.log(`Expected: 1`);
console.log(`Result: ${count2 === 1 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: Remove one cell from solved puzzle and count
console.log('=== Test 4: Solved Puzzle - 1 Cell ===');
const testPuzzle = [...DEMO_SOLUTION];
testPuzzle[0] = 0;  // Remove first cell (was 5)
console.log(`Removed cell [0,0], was: 5`);
const count3 = Solver.countSolutions(testPuzzle, 2);
console.log(`Solution count: ${count3}`);
console.log(`Expected: 1`);
console.log(`Result: ${count3 === 1 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: Check what the solver thinks for cell [0,0]
console.log('=== Test 5: Valid Numbers for Cell [0,0] ===');
const testGrid = [...DEMO_SOLUTION];
testGrid[0] = 0;
const solved = Solver.solve(testGrid);
if (solved) {
  console.log(`Solver filled cell [0,0] with: ${solved[0]}`);
  console.log(`Expected: 5`);
  console.log(`Result: ${solved[0] === 5 ? '✅ PASS' : '❌ FAIL'}\n`);
}
