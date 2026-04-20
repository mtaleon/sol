import fs from 'fs';
import path from 'path';
import os from 'os';

export class ConsoleStorage {
  constructor() {
    this.storageDir = path.join(os.homedir(), '.sudoku-console');
    this.storageFile = path.join(this.storageDir, 'save.json');
    this._ensureStorageDir();
  }

  _ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  set(key, value) {
    try {
      let data = {};
      if (fs.existsSync(this.storageFile)) {
        const content = fs.readFileSync(this.storageFile, 'utf8');
        data = JSON.parse(content);
      }
      data[key] = value;
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save:', error);
      return false;
    }
  }

  get(key) {
    try {
      if (!fs.existsSync(this.storageFile)) {
        return null;
      }
      const content = fs.readFileSync(this.storageFile, 'utf8');
      const data = JSON.parse(content);
      return data[key] || null;
    } catch (error) {
      console.error('Failed to load:', error);
      return null;
    }
  }

  remove(key) {
    try {
      if (!fs.existsSync(this.storageFile)) {
        return true;
      }
      const content = fs.readFileSync(this.storageFile, 'utf8');
      const data = JSON.parse(content);
      delete data[key];
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to remove:', error);
      return false;
    }
  }

  clear() {
    try {
      if (fs.existsSync(this.storageFile)) {
        fs.unlinkSync(this.storageFile);
      }
      return true;
    } catch (error) {
      console.error('Failed to clear:', error);
      return false;
    }
  }
}
