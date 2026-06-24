import Database from 'better-sqlite3';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    provider TEXT NOT NULL DEFAULT 'local',
    provider_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    seq INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS snapshot_deltas (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    PRIMARY KEY (user_id, seq, entity_type, entity_id)
  );
`;

/** Open (or create) the server SQLite database and apply the schema. */
export function createDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Migrate from P12 schema (users.token column) to P13 schema (email/provider-based).
  const tableExists = db
    .prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name='users'")
    .get() as { c: number };
  if (tableExists.c > 0) {
    const cols = db
      .prepare("SELECT name FROM pragma_table_info('users')")
      .all() as { name: string }[];
    if (cols.some((c) => c.name === 'token')) {
      db.exec('DROP TABLE IF EXISTS snapshots; DROP TABLE IF EXISTS users;');
    }
  }

  db.exec(SCHEMA);

  // P14 migration: add seq column to snapshots if created before this phase.
  const snapCols = db
    .prepare("SELECT name FROM pragma_table_info('snapshots')")
    .all() as { name: string }[];
  if (snapCols.length > 0 && !snapCols.some((c) => c.name === 'seq')) {
    db.exec('ALTER TABLE snapshots ADD COLUMN seq INTEGER NOT NULL DEFAULT 0');
  }

  return db;
}
