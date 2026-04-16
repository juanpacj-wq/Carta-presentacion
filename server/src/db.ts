import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = config.db.path;

    // Ensure parent directory exists for file-backed databases.
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    db = new Database(dbPath);

    // WAL gives us concurrent readers + a single writer with much better
    // throughput than the default rollback journal. NORMAL synchronous is the
    // recommended pairing for WAL — durable across crashes, faster than FULL.
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');

    console.log(JSON.stringify({ event: 'db_open', path: dbPath }));
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
