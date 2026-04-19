export class IRenderer {
  renderBoard(cells) { throw new Error('Not implemented'); }
  updateCell(cellId, cell) { throw new Error('Not implemented'); }
  applyHighlights(highlightState, prevState) { throw new Error('Not implemented'); }
  updateTimer(seconds) { throw new Error('Not implemented'); }
  updateMoves(moves) { throw new Error('Not implemented'); }
  showCompletionModal(data) { throw new Error('Not implemented'); }
}
