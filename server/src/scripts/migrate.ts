// Simple SQL migration runner for SQLite.
// Reads ../../sql/migrations/*.sql in lexicographic order and applies the
// ones not yet recorded in the SchemaMigrations table.
//
// Usage:
//   npm run migrate --workspace=server
//
// Notes:
// - Each migration runs inside a single SQLite transaction; failure rolls back.
// - The runner uses `db.exec` so a migration file may contain multiple
//   statements separated by `;`.
// - SQLite has no separate DDL user — the same DB file is used by app and
//   migrator. Permissions are filesystem-level (the file is owned by the
//   service user).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';
import { getDb, closeDb } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../sql/migrations');

function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS SchemaMigrations (
      filename   TEXT NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function listApplied(db: Database.Database): Set<string> {
  const rows = db.prepare('SELECT filename FROM SchemaMigrations').all() as {
    filename: string;
  }[];
  return new Set(rows.map((r) => r.filename));
}

function applyMigration(db: Database.Database, filename: string, body: string) {
  const tx = db.transaction(() => {
    db.exec(body);
    db.prepare('INSERT INTO SchemaMigrations (filename) VALUES (?)').run(filename);
  });
  tx();
}

function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const db = getDb();
  ensureMigrationsTable(db);
  const applied = listApplied(db);

  let appliedCount = 0;
  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(JSON.stringify({ event: 'migration_skip', filename }));
      continue;
    }
    const body = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    console.log(JSON.stringify({ event: 'migration_apply', filename }));
    applyMigration(db, filename, body);
    appliedCount += 1;
  }

  console.log(
    JSON.stringify({ event: 'migration_done', applied: appliedCount, total: files.length }),
  );
  closeDb();
}

try {
  main();
} catch (err) {
  console.error('Migration failed:', err);
  closeDb();
  process.exit(1);
}
