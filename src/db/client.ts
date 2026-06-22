import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { openDatabaseAsync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'kondor.db';

/**
 * Shared database type. Repositories accept this so they work against both the
 * expo-sqlite client (app) and an in-memory client (tests) — drizzle exposes a
 * common interface across drivers. Async methods (`await db.select()...`) work
 * on every platform, including web.
 */
export type Database = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

/**
 * Open the database asynchronously and wrap it with Drizzle.
 *
 * We use the async API (not `openDatabaseSync`) because expo-sqlite's web build
 * runs SQLite in a WASM worker; synchronous calls there block on the worker and
 * can fail with "Sync operation timeout". Async works on native and web alike.
 */
export async function openDatabase(): Promise<Database> {
  const expo = await openDatabaseAsync(DATABASE_NAME);
  return drizzle(expo, { schema }) as unknown as Database;
}

export { schema };
