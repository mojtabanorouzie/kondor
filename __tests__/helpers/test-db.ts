import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'node:path';

import type { Database } from '@/db/client';
import * as schema from '@/db/schema';

/**
 * Build a fresh in-memory database with the real migrations applied. Each test
 * gets an isolated db, so tests can run in any order without shared state.
 */
export function createTestDb(): Database {
  const sqlite = new BetterSqlite3(':memory:');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: join(__dirname, '../../src/db/migrations') });

  return db as unknown as Database;
}
