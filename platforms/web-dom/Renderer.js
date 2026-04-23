import { IRenderer } from '../../platform/IRenderer.js';
import { SIZE, EVENTS } from '../../core/constants.js';
import { t } from '../../core/i18n.js';

const PROMO_URL = 'https://play.google.com/store/apps/details?id=com.octile.app';

export class WebRenderer extends IRenderer {
  constructor(eventBus = null) {
    super();
    this.eventBus = eventBus; // For emitting UI modal events
    this.gridElement = document.getElementById('sudoku-grid');
    this.timerElement = document.getElementById('timer');
    this.mistakesElement = document.getElementById('mistakes');
    this.difficultyLabel = document.getElementById('difficulty-label');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.lastHighlightState = null;
    this.modalElement = null;
    this.onNewGame = null;
    this.onRestart = null;
  }

  renderBoard(cells) {
    this.gridElement.innerHTML = '';

    cells.forEach((cell, index) => {
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;

      const cellElement = document.createElement('div');
      cellElement.className = 'cell';
      cellElement.dataset.row = row;
      cellElement.dataset.col = col;
      cellElement.dataset.cellId = index;

      if (cell.given) {
        cellElement.classList.add('fixed');
      }

      this._renderCellContent(cellElement, cell);
      this.gridElement.appendChild(cellElement);
    });
  }

  updateCell(cellId, cell) {
    const cellElement = this.gridElement.querySelector(`[data-cell-id="${cellId}"]`);
    if (!cellElement) return;

    cellElement.classList.toggle('fixed', cell.given);
    this._renderCellContent(cellElement, cell);
  }

  _renderCellContent(cellElement, cell) {
    cellElement.innerHTML = '';

    if (cell.value !== 0) {
      const valueSpan = document.createElement('span');
      valueSpan.className = 'cell-value';
      if (cell.source === 'hint') {
        valueSpan.classList.add('hint-source');
      }
      valueSpan.textContent = cell.value;
      cellElement.appendChild(valueSpan);
    } else if (cell.notes.size > 0) {
      const notesGrid = document.createElement('div');
      notesGrid.className = 'notes-grid';

      for (let num = 1; num <= 9; num++) {
        const noteCell = document.createElement('div');
        noteCell.className = 'note-cell';
        if (cell.notes.has(num)) {
          noteCell.textContent = num;
          noteCell.classList.add('active');
        }
        notesGrid.appendChild(noteCell);
      }

      cellElement.appendChild(notesGrid);
    }
  }

  applyHighlights(highlightState, prevState = null) {
    if (prevState) {
      this._removeHighlights(prevState);
    } else if (this.lastHighlightState) {
      this._removeHighlights(this.lastHighlightState);
    }

    if (highlightState.selected !== null) {
      const el = this.gridElement.querySelector(`[data-cell-id="${highlightState.selected}"]`);
      if (el) el.classList.add('selected');
    }

    highlightState.region.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.add('region');
    });

    highlightState.sameNumber.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.add('same-number');
    });

    highlightState.conflicts.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) {
        el.classList.add('conflict');
        if (id === highlightState.primaryConflict) {
          el.classList.add('conflict-primary');
        }
      }
    });

    this.lastHighlightState = highlightState;
  }

  _removeHighlights(state) {
    if (state.selected !== null) {
      const el = this.gridElement.querySelector(`[data-cell-id="${state.selected}"]`);
      if (el) el.classList.remove('selected');
    }

    state.region.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.remove('region');
    });

    state.sameNumber.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) el.classList.remove('same-number');
    });

    state.conflicts.forEach(id => {
      const el = this.gridElement.querySelector(`[data-cell-id="${id}"]`);
      if (el) {
        el.classList.remove('conflict');
        el.classList.remove('conflict-primary');
      }
    });
  }

  updateTimer(seconds) {
    this.timerElement.textContent = this._formatTime(seconds);
  }

  updateMistakes(current, limit) {
    if (limit === 0) {
      this.mistakesElement.classList.add('hidden');
      return;
    }
    this.mistakesElement.classList.remove('hidden');
    const limitStr = limit === -1 ? '' : `/${limit}`;
    this.mistakesElement.textContent = t('header.mistakes', { current, limit: limitStr });
  }

  updateDifficulty(difficulty) {
    const key = 'difficulty.' + difficulty.toLowerCase();
    this.difficultyLabel.textContent = t(key);
  }

  setTimerVisible(visible) {
    this.timerElement.classList.toggle('hidden', !visible);
  }

  updateNumberPadExhaustion(digitCounts) {
    const buttons = document.querySelectorAll('#number-pad button[data-number]');
    buttons.forEach(btn => {
      const num = parseInt(btn.dataset.number);
      const count = digitCounts[num] || 0;
      btn.classList.toggle('exhausted', count >= 9);
    });
  }

  showPauseOverlay() {
    this.pauseOverlay.classList.add('visible');

    // Emit event (AdMobManager listens and hides banner)
    if (this.eventBus) {
      this.eventBus.emit(EVENTS.UI_MODAL_OPENED);
    }
  }

  hidePauseOverlay() {
    this.pauseOverlay.classList.remove('visible');

    // Emit event (AdMobManager listens and shows banner)
    if (this.eventBus) {
      this.eventBus.emit(EVENTS.UI_MODAL_CLOSED);
    }
  }

  // i18n: apply translations to all data-i18n tagged elements
  applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      // Check for interpolation params in data-i18n-param-* attributes
      const params = {};
      for (const attr of el.attributes) {
        if (attr.name.startsWith('data-i18n-param-')) {
          const paramName = attr.name.replace('data-i18n-param-', '');
          params[paramName] = attr.value;
        }
      }
      el.textContent = Object.keys(params).length > 0 ? t(key, params) : t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
  }

  // Settings modal
  showSettings(settings, onChange) {
    const modal = document.getElementById('settings-modal');
    const list = document.getElementById('settings-list');
    list.innerHTML = '';

    // Language selector (first row)
    const langRow = this._createSettingRow(t('settings.language'));
    const langSegment = document.createElement('div');
    langSegment.className = 'segment-control';
    const currentLang = settings.get('language');

    [{ label: 'EN', value: 'en' }, { label: '中文', value: 'zh-TW' }].forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'segment-btn';
      btn.textContent = opt.label;
      if (currentLang === opt.value) btn.classList.add('active');
      btn.addEventListener('click', () => {
        langSegment.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange('language', opt.value);
        // Re-render settings modal with new language
        this.showSettings(settings, onChange);
      });
      langSegment.appendChild(btn);
    });
    langRow.appendChild(langSegment);
    list.appendChild(langRow);

    // Mistake limit (segmented)
    const mistakeRow = this._createSettingRow(t('settings.mistakeLimit'));
    const segmentControl = document.createElement('div');
    segmentControl.className = 'segment-control';
    const mistakeLimit = settings.get('mistakeLimit');

    [{ label: t('settings.off'), value: 0 }, { label: '3', value: 3 }, { label: t('settings.unlimited'), value: -1 }].forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'segment-btn';
      btn.textContent = opt.label;
      if (mistakeLimit === opt.value) btn.classList.add('active');
      btn.addEventListener('click', () => {
        segmentControl.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange('mistakeLimit', opt.value);
      });
      segmentControl.appendChild(btn);
    });
    mistakeRow.appendChild(segmentControl);
    list.appendChild(mistakeRow);

    // Toggle settings
    const toggles = [
      { key: 'showTimer', i18nKey: 'settings.showTimer' },
      { key: 'autoRemoveNotes', i18nKey: 'settings.autoRemoveNotes' },
      { key: 'highlightRegion', i18nKey: 'settings.highlightRegion' },
      { key: 'highlightSameNumber', i18nKey: 'settings.highlightSameNumber' },
      { key: 'showConflicts', i18nKey: 'settings.showConflicts' },
    ];

    toggles.forEach(({ key, i18nKey }) => {
      const row = this._createSettingRow(t(i18nKey));
      const toggle = document.createElement('button');
      toggle.className = 'toggle';
      if (settings.get(key)) toggle.classList.add('on');
      toggle.addEventListener('click', () => {
        const newVal = !toggle.classList.contains('on');
        toggle.classList.toggle('on', newVal);
        onChange(key, newVal);
      });
      row.appendChild(toggle);
      list.appendChild(row);
    });

    modal.classList.add('visible');

    // Emit event (AdMobManager listens and hides banner)
    if (this.eventBus) {
      this.eventBus.emit(EVENTS.UI_MODAL_OPENED);
    }
  }

  hideSettings() {
    document.getElementById('settings-modal').classList.remove('visible');

    // Emit event (AdMobManager listens and shows banner)
    if (this.eventBus) {
      this.eventBus.emit(EVENTS.UI_MODAL_CLOSED);
    }
  }

  _createSettingRow(label) {
    const row = document.createElement('div');
    row.className = 'setting-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'setting-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);
    return row;
  }

  // Completion modal
  showCompletionModal(data) {
    this._hideModal();

    // Emit event (AdMobManager listens and hides banner)
    if (this.eventBus) {
      this.eventBus.emit(EVENTS.UI_MODAL_OPENED);
    }

    const modal = document.createElement('div');
    modal.className = 'modal';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const title = document.createElement('h2');
    title.textContent = t('win.title');
    content.appendChild(title);

    const timeLine = document.createElement('p');
    timeLine.className = 'modal-line';
    timeLine.textContent = t('win.time', { time: this._formatTime(data.elapsed) });
    content.appendChild(timeLine);

    if (data.moves !== undefined) {
      const movesLine = document.createElement('p');
      movesLine.className = 'modal-line';
      movesLine.textContent = t('win.moves', { moves: data.moves });
      content.appendChild(movesLine);
    }

    if (data.mistakes > 0) {
      const mistakesLine = document.createElement('p');
      mistakesLine.className = 'modal-line';
      mistakesLine.textContent = t('win.mistakes', { n: data.mistakes });
      content.appendChild(mistakesLine);
    }

    if (data.hintsUsed > 0) {
      const hintsLine = document.createElement('p');
      hintsLine.className = 'modal-line';
      hintsLine.textContent = t('win.hints', { n: data.hintsUsed });
      content.appendChild(hintsLine);
    }

    // Octile promo
    const promo = document.createElement('p');
    promo.className = 'octile-promo';
    const prefix = document.createElement('span');
    prefix.textContent = t('win.promo');
    promo.appendChild(prefix);
    const link = document.createElement('a');
    link.href = PROMO_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Octile';
    promo.appendChild(link);
    content.appendChild(promo);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const playAgain = document.createElement('button');
    playAgain.textContent = t('win.playAgain');
    playAgain.addEventListener('click', () => {
      this._animateModalOut(modal);
      this.onNewGame?.();
    });
    actions.appendChild(playAgain);
    content.appendChild(actions);

    modal.appendChild(content);
    document.body.appendChild(modal);
    this.modalElement = modal;
    setTimeout(() => modal.classList.add('show'), 10);
  }

  // Game over modal
  showGameOverModal(data) {
    this._hideModal();

    // Emit event (AdMobManager listens and hides banner)
    if (this.eventBus) {
      this.eventBus.emit(EVENTS.UI_MODAL_OPENED);
    }

    const modal = document.createElement('div');
    modal.className = 'modal';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const title = document.createElement('h2');
    title.textContent = t('gameover.title');
    content.appendChild(title);

    const timeLine = document.createElement('p');
    timeLine.className = 'modal-line';
    timeLine.textContent = t('win.time', { time: this._formatTime(data.elapsed) });
    content.appendChild(timeLine);

    const mistakesLine = document.createElement('p');
    mistakesLine.className = 'modal-line';
    mistakesLine.textContent = t('win.mistakes', { n: data.mistakes });
    content.appendChild(mistakesLine);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const tryAgain = document.createElement('button');
    tryAgain.textContent = t('gameover.tryAgain');
    tryAgain.addEventListener('click', () => {
      this._animateModalOut(modal);
      this.onRestart?.();
    });
    actions.appendChild(tryAgain);

    const newGame = document.createElement('button');
    newGame.className = 'secondary';
    newGame.textContent = t('gameover.newGame');
    newGame.addEventListener('click', () => {
      this._animateModalOut(modal);
      this.onNewGame?.();
    });
    actions.appendChild(newGame);

    content.appendChild(actions);
    modal.appendChild(content);
    document.body.appendChild(modal);
    this.modalElement = modal;
    setTimeout(() => modal.classList.add('show'), 10);
  }

  _animateModalOut(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
      if (this.modalElement === modal) this.modalElement = null;

      // Emit event (AdMobManager listens and shows banner)
      if (this.eventBus) {
        this.eventBus.emit(EVENTS.UI_MODAL_CLOSED);
      }
    }, 300);
  }

  _hideModal() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;

      // Emit event when programmatically hiding modal
      if (this.eventBus) {
        this.eventBus.emit(EVENTS.UI_MODAL_CLOSED);
      }
    }
  }

  setNewGameHandler(callback) {
    this.onNewGame = callback;
  }

  setRestartHandler(callback) {
    this.onRestart = callback;
  }

  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
