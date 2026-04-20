// Console renderer with beautiful Unicode box-drawing characters
export class ConsoleRenderer {
  constructor() {
    this.cursorRow = 0;
    this.cursorCol = 0;
  }

  // Simple ASCII box-drawing characters (clearer and more compatible)
  BOX = {
    TL: '+',      // top-left
    TR: '+',      // top-right
    BL: '+',      // bottom-left
    BR: '+',      // bottom-right
    H: '-',       // horizontal
    V: '|',       // vertical
    VL: '+',      // vertical-left
    VR: '+',      // vertical-right
    HT: '+',      // horizontal-top
    HB: '+',      // horizontal-bottom
    CROSS: '+',   // cross
    // Thin lines for cell separators
    THIN_H: '-',
    THIN_V: '|',
    THIN_CROSS: '+'
  };

  // ANSI color codes
  COLORS = {
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    DIM: '\x1b[2m',

    // Foreground colors
    CYAN: '\x1b[36m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    RED: '\x1b[31m',
    WHITE: '\x1b[37m',
    GRAY: '\x1b[90m',

    // Background colors
    BG_CYAN: '\x1b[46m',
    BG_BLUE: '\x1b[44m',
    BG_GRAY: '\x1b[100m'
  };

  clearScreen() {
    console.clear();
  }

  getBoardLines(cells, cursorRow, cursorCol, highlightState = {}) {
    this.cursorRow = cursorRow;
    this.cursorCol = cursorCol;

    const lines = [];

    // Top border
    lines.push('+-------+-------+-------+');

    // Render each row
    for (let row = 0; row < 9; row++) {
      let line = '|';

      for (let col = 0; col < 9; col++) {
        const cellId = row * 9 + col;
        const cell = cells[cellId];
        const isCursor = row === cursorRow && col === cursorCol;
        const isHighlighted = highlightState.highlightedCells?.has(cellId);
        const isConflict = highlightState.conflictCells?.has(cellId);

        // Cell content
        let cellText = cell.value ? String(cell.value) : '.';

        // Apply styling
        if (isCursor) {
          cellText = this._styleCell(cellText, 'cursor', cell.given);
        } else if (isConflict) {
          cellText = this._styleCell(cellText, 'conflict', cell.given);
        } else if (isHighlighted) {
          cellText = this._styleCell(cellText, 'highlight', cell.given);
        } else if (cell.given) {
          cellText = this._styleCell(cellText, 'original', true);
        } else {
          cellText = this._styleCell(cellText, 'normal', false);
        }

        line += ' ' + cellText;

        // Add separator after every 3rd column
        if ((col + 1) % 3 === 0) {
          line += ' |';
        }
      }

      lines.push(line);

      // Add horizontal separator after every 3rd row
      if ((row + 1) % 3 === 0 && row < 8) {
        lines.push('+-------+-------+-------+');
      }
    }

    // Bottom border
    lines.push('+-------+-------+-------+');

    return lines;
  }

  _styleCell(text, style, isOriginal) {
    const { BOLD, CYAN, GREEN, YELLOW, RED, GRAY, BG_CYAN, BG_GRAY, RESET } = this.COLORS;

    switch (style) {
      case 'cursor':
        return isOriginal
          ? `${BG_CYAN}${BOLD}${text}${RESET}`
          : `${BG_CYAN}${GREEN}${text}${RESET}`;
      case 'conflict':
        return `${RED}${BOLD}${text}${RESET}`;
      case 'highlight':
        return isOriginal
          ? `${BG_GRAY}${BOLD}${text}${RESET}`
          : `${BG_GRAY}${GREEN}${text}${RESET}`;
      case 'original':
        return `${BOLD}${text}${RESET}`;
      case 'normal':
        return text === '.' ? `${GRAY}${text}${RESET}` : `${GREEN}${text}${RESET}`;
      default:
        return text;
    }
  }

  getRulesAndControlsLines() {
    const { YELLOW, CYAN, RESET, DIM } = this.COLORS;
    const lines = [];

    lines.push(`${YELLOW}Rules:${RESET}`);
    lines.push(`${DIM}Fill the grid so that every column,${RESET}`);
    lines.push(`${DIM}row and 3x3 box contains each of${RESET}`);
    lines.push(`${DIM}the digits 1 to 9.${RESET}`);
    lines.push('');
    lines.push('');
    lines.push(`${YELLOW}Controls:${RESET}`);
    lines.push(`  ${CYAN}↑↓←→ / hjkl${RESET}  ${DIM}move cursor${RESET}`);
    lines.push(`  ${CYAN}1-9${RESET}          ${DIM}place digit${RESET}`);
    lines.push(`  ${CYAN}0 / Backspace${RESET} ${DIM}clear digit${RESET}`);
    lines.push(`  ${CYAN}n${RESET}            ${DIM}new board${RESET}`);
    lines.push(`  ${CYAN}s${RESET}            ${DIM}save game${RESET}`);
    lines.push(`  ${CYAN}r${RESET}            ${DIM}restart${RESET}`);
    lines.push(`  ${CYAN}u${RESET}            ${DIM}undo last move${RESET}`);
    lines.push(`  ${CYAN}v${RESET}            ${DIM}solve${RESET}`);
    lines.push(`  ${CYAN}?${RESET}            ${DIM}request hint${RESET}`);
    lines.push(`  ${CYAN}q${RESET}            ${DIM}quit game${RESET}`);

    return lines;
  }

  render(gameState) {
    this.clearScreen();

    const { GREEN, RESET } = this.COLORS;

    // Difficulty at top
    if (gameState.difficulty) {
      console.log(`\n${GREEN}randomly generated - ${gameState.difficulty}${RESET}\n`);
    }

    if (gameState.cells) {
      // Get board lines
      const boardLines = this.getBoardLines(
        gameState.cells,
        gameState.cursorRow || 0,
        gameState.cursorCol || 0,
        gameState.highlightState
      );

      // Get rules and controls lines
      const sideLines = this.getRulesAndControlsLines();

      // Merge side by side
      const maxLines = Math.max(boardLines.length, sideLines.length);
      for (let i = 0; i < maxLines; i++) {
        const boardLine = boardLines[i] || '';
        const sideLine = sideLines[i] || '';
        console.log(`${boardLine}  ${sideLine}`);
      }
    }

    // Stats at bottom
    if (gameState.moves !== undefined && gameState.time) {
      console.log(`\n${GREEN}Moves: ${gameState.moves}  Time: ${gameState.time}${RESET}`);
    }

    // Message at bottom
    if (gameState.message) {
      const { RED, YELLOW } = this.COLORS;
      const color = gameState.messageType === 'error' ? RED : gameState.messageType === 'warning' ? YELLOW : GREEN;
      console.log(`\n${color}${gameState.message}${RESET}`);
    }
  }
}
