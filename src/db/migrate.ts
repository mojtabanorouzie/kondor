import type { SQLiteDatabase } from 'expo-sqlite';

import migrationsBundle from './migrations/migrations';

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

interface MigrationsBundle {
  journal: { entries: JournalEntry[] };
  migrations: Record<string, string>;
}

const MIGRATIONS_TABLE = '__drizzle_migrations';

/**
 * Apply pending Drizzle migrations using expo-sqlite's async API.
 *
 * We can't use Drizzle's bundled migrators here: the expo one runs synchronously
 * (unreliable on web), and the sqlite-proxy one reads migration files from disk
 * (unavailable in a RN bundle). So we apply the babel-inlined migration SQL
 * ourselves, tracking applied migrations by their journal timestamp.
 */
export async function runMigrations(expo: SQLiteDatabase): Promise<void> {
  const bundle = migrationsBundle as unknown as MigrationsBundle;

  await expo.execAsync(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (` +
      `id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)`,
  );

  const applied = await expo.getAllAsync<{ created_at: number }>(
    `SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`,
  );
  const lastWhen = applied.length ? Number(applied[0].created_at) : 0;

  for (const entry of bundle.journal.entries) {
    if (entry.when <= lastWhen) continue;

    const key = `m${String(entry.idx).padStart(4, '0')}`;
    const sql = bundle.migrations[key];
    if (!sql) continue;

    // execAsync runs every statement in the migration file (and ignores the
    // `--> statement-breakpoint` SQL comments between them).
    await expo.execAsync(sql);
    await expo.runAsync(
      `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`,
      entry.tag,
      entry.when,
    );
  }
}
