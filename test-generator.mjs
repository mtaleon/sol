import { Generator } from './core/Generator.js';
import { Solver } from './core/Solver.js';

console.log('Testing Sudoku Generator...\n');

// Test EASY generation
console.log('=== EASY Puzzle ===');
const startEasy = Date.now();
const easyPuzzle = Generator.generate('EASY');
const easyTime = Date.now() - startEasy;
const easyClues = easyPuzzle.filter(v => v !== 0).length;
const easySolutionCount = Solver.countSolutions(easyPuzzle, 2);

console.log(`Generated in: ${easyTime}ms`);
console.log(`Clues: ${easyClues}`);
console.log(`Unique solution: ${easySolutionCount === 1 ? '✅ YES' : '❌ NO'}`);
console.log();

// Test MEDIUM generation
console.log('=== MEDIUM Puzzle ===');
const startMedium = Date.now();
const mediumPuzzle = Generator.generate('MEDIUM');
const mediumTime = Date.now() - startMedium;
const mediumClues = mediumPuzzle.filter(v => v !== 0).length;
const mediumSolutionCount = Solver.countSolutions(mediumPuzzle, 2);

console.log(`Generated in: ${mediumTime}ms`);
console.log(`Clues: ${mediumClues}`);
console.log(`Unique solution: ${mediumSolutionCount === 1 ? '✅ YES' : '❌ NO'}`);
console.log();

// Test HARD generation
console.log('=== HARD Puzzle ===');
const startHard = Date.now();
const hardPuzzle = Generator.generate('HARD');
const hardTime = Date.now() - startHard;
const hardClues = hardPuzzle.filter(v => v !== 0).length;
const hardSolutionCount = Solver.countSolutions(hardPuzzle, 2);

console.log(`Generated in: ${hardTime}ms`);
console.log(`Clues: ${hardClues}`);
console.log(`Unique solution: ${hardSolutionCount === 1 ? '✅ YES' : '❌ NO'}`);
console.log();

// Test hint system
console.log('=== Hint System ===');
const hint = Solver.getHint(hardPuzzle);
if (hint) {
  const row = Math.floor(hint.cellId / 9);
  const col = hint.cellId % 9;
  console.log(`Hint found: Cell [${row},${col}] = ${hint.value} ✅`);
} else {
  console.log(`No hint available ❌`);
}
console.log();

// Summary
const allUnique = easySolutionCount === 1 && mediumSolutionCount === 1 && hardSolutionCount === 1;
const avgTime = (easyTime + mediumTime + hardTime) / 3;

console.log('=== Summary ===');
console.log(`All puzzles have unique solutions: ${allUnique ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Average generation time: ${Math.round(avgTime)}ms`);
console.log(`Performance target (<2000ms): ${avgTime < 2000 ? '✅ PASS' : '❌ FAIL'}`);
