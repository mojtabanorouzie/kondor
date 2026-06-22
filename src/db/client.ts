import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'kondor.db';

/**
 * Shared database type. Repositories accept this so they work against both the
 * expo-sqlite client (app) and an in-memory client (tests) — drizzle exposes a
 * common interface across drivers.
 */
export type Database = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

/** The live expo-sqlite database, with change listeners for live queries. */
const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, { schema }) as unknown as Database;

/** Raw handle, e.g. for `useMigrations` / drizzle-studio dev tooling. */
export { expoDb };
export { schema };
