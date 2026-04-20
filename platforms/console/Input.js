import readline from 'readline';

export class ConsoleInput {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.cursorRow = 0;
    this.cursorCol = 0;
  }

  init() {
    // Set up raw mode for reading keypresses
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
      this.handleKeypress(str, key);
    });
  }

  handleKeypress(str, key) {
    if (!key) return;

    // Handle Ctrl+C to exit gracefully
    if (key.ctrl && key.name === 'c') {
      this.eventBus.emit('quit');
      return;
    }

    // Arrow keys and vim-style movement
    switch (key.name) {
      case 'up':
      case 'k':
        this.moveCursor(-1, 0);
        break;
      case 'down':
      case 'j':
        this.moveCursor(1, 0);
        break;
      case 'left':
      case 'h':
        this.moveCursor(0, -1);
        break;
      case 'right':
      case 'l':
        this.moveCursor(0, 1);
        break;

      // Number input
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        this.eventBus.emit('place-digit', { value: parseInt(str) });
        break;

      // Clear cell
      case '0':
      case 'backspace':
      case 'delete':
        this.eventBus.emit('clear-digit');
        break;

      // Game commands
      case 'n':
        this.eventBus.emit('new-game');
        break;
      case 's':
        this.eventBus.emit('save-game');
        break;
      case 'r':
        this.eventBus.emit('restart-game');
        break;
      case 'u':
        this.eventBus.emit('undo');
        break;
      case 'v':
        this.eventBus.emit('solve');
        break;
      case 'q':
        this.eventBus.emit('quit');
        break;
      case '?':
        this.eventBus.emit('hint');
        break;

      default:
        // Ignore other keys
        break;
    }
  }

  moveCursor(rowDelta, colDelta) {
    this.cursorRow = Math.max(0, Math.min(8, this.cursorRow + rowDelta));
    this.cursorCol = Math.max(0, Math.min(8, this.cursorCol + colDelta));
    this.eventBus.emit('cursor-move', {
      row: this.cursorRow,
      col: this.cursorCol
    });
  }

  setCursor(row, col) {
    this.cursorRow = row;
    this.cursorCol = col;
  }

  cleanup() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }
}
