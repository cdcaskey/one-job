import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { DATA_DIR } from './config.js';

// DATA_DIR=':memory:' is a test-only escape hatch for a real, isolated
// SQLite instance with no file on disk — never set this in deployment.
const isMemory = DATA_DIR === ':memory:';

if (!isMemory) fs.mkdirSync(DATA_DIR, { recursive: true });

export const dbPath = isMemory ? ':memory:' : path.join(DATA_DIR, 'app.db');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

export function checkDb(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
