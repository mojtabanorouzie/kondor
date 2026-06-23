import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy';
import {
  openDatabaseAsync,
  type SQLiteBindValue,
  type SQLiteDatabase,
} from 'expo-sqlite';

import { runMigrations } from './migrate';
import * as schema from './schema';

export const DATABASE_NAME = 'kondor.db';

/**
 * Shared database type. Repositories accept this so they work against both the
 * app's async proxy client and the in-memory better-sqlite3 client used in
 * tests — both expose Drizzle's common `BaseSQLiteDatabase` query API.
 */
export type Database = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

type ProxyMethod = 'run' | 'all' | 'values' | 'get';

/**
 * Execute one query through expo-sqlite's ASYNC API and return rows as the
 * positional value arrays Drizzle's sqlite-proxy driver expects.
 *
 * We deliberately avoid Drizzle's `expo-sqlite` driver: it uses the synchronous
 * SQLite API, whose web (WASM worker) implementation corrupts results under the
 * app's startup query burst. The async API is reliable on web and native alike.
 */
async function execute(
  expo: SQLiteDatabase,
  sql: string,
  params: SQLiteBindValue[],
  method: ProxyMethod,
): Promise<{ rows: unknown[] }> {
  if (method === 'run') {
    await expo.runAsync(sql, params);
    return { rows: [] };
  }

  const statement = await expo.prepareAsync(sql);
  try {
    const result =
      await statement.executeForRawResultAsync<Record<string, unknown>>(params);
    const rows = (await result.getAllAsync()) as unknown[][];
    return { rows: method === 'get' ? (rows[0] ?? []) : rows };
  } finally {
    await statement.finalizeAsync();
  }
}

/** Open the database, apply migrations, and wrap it with Drizzle (async). */
export async function openDatabase(): Promise<Database> {
  const expo = await openDatabaseAsync(DATABASE_NAME);
  await runMigrations(expo);

  const db = drizzleProxy(
    (sql, params, method) =>
      execute(expo, sql, params as SQLiteBindValue[], method),
    { schema },
  );

  return db as unknown as Database;
}

export { schema };
