#!/usr/bin/env node

import { EventBus } from '../../core/events.js';
import { Game } from '../../core/Game.js';
import { Generator } from '../../core/Generator.js';
import { Solver } from '../../core/Solver.js';
import { EVENTS, DIFFICULTY } from '../../core/constants.js';
import { ConsoleRenderer } from './Renderer.js';
import { ConsoleInput } from './Input.js';
import { ConsoleStorage } from './Storage.js';

class ConsoleSudoku {
  constructor() {
    this.eventBus = new EventBus();
    this.storage = new ConsoleStorage();
    this.renderer = new ConsoleRenderer();
    this.input = new ConsoleInput(this.eventBus);
    this.game = new Game(this.eventBus, this.storage);

    this.currentDifficulty = 'EASY';
    this.isRunning = true;
    this.message = null;
    this.messageType = 'info';
  }

  init() {
    this.setupEventListeners();
    this.input.init();

    // Try to load saved game
    if (!this.game.loadSavedGame()) {
      // Start new game
      this.startNewGame();
    } else {
      this.message = 'Game resumed from save';
      // Select first cell
      this.input.setCursor(0, 0);
      this.game.selectCell(0, 0);
    }

    this.render();
  }

  setupEventListeners() {
    // Core game events
    this.eventBus.on(EVENTS.GAME_STARTED, () => {
      this.render();
    });

    this.eventBus.on(EVENTS.BOARD_CHANGED, () => {
      this.render();
    });

    this.eventBus.on(EVENTS.SELECTION_CHANGED, () => {
      this.render();
    });

    this.eventBus.on(EVENTS.HIGHLIGHT_CHANGED, () => {
      this.render();
    });

    this.eventBus.on(EVENTS.GAME_COMPLETED, () => {
      const t = this.formatTime(this.game.elapsed);
      const m = this.game.moves;
      this.message = `Completed in ${t} — ${m} moves.`;
      this.messageType = 'info';
      this.render();
    });

    // Input events
    this.eventBus.on('cursor-move', ({ row, col }) => {
      this.input.setCursor(row, col);
      this.game.selectCell(row, col);
    });

    this.eventBus.on('place-digit', ({ value }) => {
      const row = this.input.cursorRow;
      const col = this.input.cursorCol;
      this.game.setCell(row, col, value);
    });

    this.eventBus.on('clear-digit', () => {
      const row = this.input.cursorRow;
      const col = this.input.cursorCol;
      this.game.setCell(row, col, 0);
    });

    this.eventBus.on('new-game', () => {
      this.startNewGame();
    });

    this.eventBus.on('save-game', () => {
      this.game.save();
      this.message = 'Game saved!';
      this.messageType = 'info';
      this.render();
      setTimeout(() => {
        this.message = null;
        this.render();
      }, 2000);
    });

    this.eventBus.on('restart-game', () => {
      // Restart by starting a new game with the same puzzle
      if (this.game.board) {
        const originalPuzzle = this.game.board.cells.map(cell =>
          cell.given ? cell.value : 0
        );
        this.game.startGame(originalPuzzle);
        this.message = 'Game restarted';
        this.messageType = 'info';
      }
    });

    this.eventBus.on('undo', () => {
      if (this.game.undoStack.length === 0) {
        this.message = 'Nothing to undo';
        this.messageType = 'warning';
        this.render();
        setTimeout(() => {
          this.message = null;
          this.render();
        }, 1500);
      } else {
        this.game.undo();
      }
    });

    this.eventBus.on('solve', () => {
      const currentPuzzle = this.game.board.cells.map(cell => cell.value);
      const solution = Solver.solve(currentPuzzle);

      if (solution) {
        // Apply solution to board
        this.game.board.cells.forEach((cell, idx) => {
          if (!cell.given) {
            cell.value = solution[idx];
            cell.source = 'solver';
          }
        });

        // Check if complete
        if (this.game.board.isComplete()) {
          this.game._stopTimer();
          this.eventBus.emit(EVENTS.GAME_COMPLETED, {
            elapsed: this.game.elapsed,
            moves: this.game.moves
          });
        }

        this.eventBus.emit(EVENTS.BOARD_CHANGED, {});
        this.message = 'Puzzle solved.';
        this.messageType = 'info';
      } else {
        this.message = 'Could not solve puzzle';
        this.messageType = 'error';
      }
      this.render();
    });

    this.eventBus.on('hint', () => {
      const row = this.input.cursorRow;
      const col = this.input.cursorCol;
      const cellId = row * 9 + col;
      const cell = this.game.board.cells[cellId];

      if (cell.given) {
        this.message = 'This cell is already filled';
        this.messageType = 'warning';
      } else {
        const currentPuzzle = this.game.board.cells.map(c => c.value);
        const solution = Solver.solve(currentPuzzle);

        if (solution) {
          this.message = `Hint: The correct value is ${solution[cellId]}`;
          this.messageType = 'info';
        } else {
          this.message = 'Could not generate hint';
          this.messageType = 'error';
        }
      }
      this.render();
      setTimeout(() => {
        this.message = null;
        this.render();
      }, 3000);
    });

    this.eventBus.on('quit', () => {
      this.quit();
    });
  }

  startNewGame() {
    const puzzle = Generator.generate(this.currentDifficulty);
    this.game.startGame(puzzle);
    this.message = `New ${DIFFICULTY[this.currentDifficulty].name} puzzle generated`;
    this.messageType = 'info';

    // Select first empty cell
    this.input.setCursor(0, 0);
    this.game.selectCell(0, 0);
  }

  render() {
    if (!this.game.board) return;

    const highlightState = this.game._computeHighlightState();

    const gameState = {
      cells: this.game.board.cells,
      cursorRow: this.input.cursorRow,
      cursorCol: this.input.cursorCol,
      highlightState: {
        highlightedCells: highlightState.region,
        conflictCells: highlightState.conflicts
      },
      difficulty: DIFFICULTY[this.currentDifficulty].name.toLowerCase(),
      moves: this.game.moves,
      time: this.formatTime(this.game.elapsed),
      message: this.message,
      messageType: this.messageType
    };

    this.renderer.render(gameState);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  quit() {
    this.renderer.clearScreen();
    console.log('');
    this.input.cleanup();
    process.exit(0);
  }
}

// Start the game
const sudoku = new ConsoleSudoku();
sudoku.init();
