const STORAGE_KEY = 'sudoku-settings';

const DEFAULTS = {
  mistakeLimit: 3,        // 0=off, 3=default, -1=unlimited
  showTimer: true,
  autoRemoveNotes: true,
  highlightRegion: true,
  highlightSameNumber: true,
  showConflicts: true,
  language: 'en',
};

export class Settings {
  constructor(storage) {
    this.storage = storage;
    this.data = { ...DEFAULTS };
    this._load();
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    if (!(key in DEFAULTS)) return;
    this.data[key] = value;
    this._save();
  }

  getAll() {
    return { ...this.data };
  }

  reset() {
    this.data = { ...DEFAULTS };
    this._save();
  }

  _load() {
    const saved = this.storage.get(STORAGE_KEY);
    if (saved) {
      for (const key of Object.keys(DEFAULTS)) {
        if (saved[key] !== undefined) {
          this.data[key] = saved[key];
        }
      }
    }
  }

  _save() {
    this.storage.set(STORAGE_KEY, { ...this.data });
  }
}
