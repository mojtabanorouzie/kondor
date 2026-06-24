import type { Database } from '@/db/client';
import * as schema from '@/db/schema';
import type { CardRow, DeckRow, NoteRow, NoteTypeRow, ReviewLogRow } from '@/db/schema';

export const BACKUP_FORMAT = 'kondor-backup';
export const BACKUP_VERSION = 1;

export interface KondorBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  data: {
    decks: DeckRow[];
    noteTypes: NoteTypeRow[];
    notes: NoteRow[];
    cards: CardRow[];
    reviewLogs: ReviewLogRow[];
  };
}

export interface ImportResult {
  decks: number;
  notes: number;
  cards: number;
}

/** Read the entire collection into a portable backup object. */
export async function exportBackup(db: Database): Promise<KondorBackup> {
  const [decks, noteTypes, notes, cards, reviewLogs] = await Promise.all([
    db.select().from(schema.decks),
    db.select().from(schema.noteTypes),
    db.select().from(schema.notes),
    db.select().from(schema.cards),
    db.select().from(schema.reviewLogs),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    data: { decks, noteTypes, notes, cards, reviewLogs },
  };
}

export function serializeBackup(backup: KondorBackup): string {
  return JSON.stringify(backup);
}

/** Parse and validate backup JSON, throwing a friendly error if malformed. */
export function parseBackup(text: string): KondorBackup {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }
  const b = obj as Partial<KondorBackup>;
  if (b?.format !== BACKUP_FORMAT || typeof b.version !== 'number') {
    throw new Error('That doesn’t look like a Kondor backup.');
  }
  if (b.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of Kondor.');
  }
  if (!b.data || !Array.isArray(b.data.decks)) {
    throw new Error('The backup is missing its data.');
  }
  return b as KondorBackup;
}

// SQLite caps bound parameters per statement; insert rows in safe chunks.
const CHUNK = 100;

async function insertAll<T extends Record<string, unknown>>(
  db: Database,
  table: Parameters<Database['insert']>[0],
  rows: T[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(table).values(rows.slice(i, i + CHUNK));
  }
}

/**
 * Replace the entire collection with the backup's contents. Deletes existing
 * data first (FK-safe order), then re-inserts.
 */
export async function importBackupReplace(
  db: Database,
  backup: KondorBackup,
): Promise<ImportResult> {
  const d = backup.data;

  await db.delete(schema.reviewLogs);
  await db.delete(schema.cards);
  await db.delete(schema.notes);
  await db.delete(schema.decks);
  await db.delete(schema.noteTypes);

  await insertAll(db, schema.noteTypes, d.noteTypes);
  await insertAll(db, schema.decks, d.decks);
  await insertAll(db, schema.notes, d.notes);
  await insertAll(db, schema.cards, d.cards);
  await insertAll(db, schema.reviewLogs, d.reviewLogs ?? []);

  // Count only live (non-tombstoned) rows for the user-facing summary.
  return {
    decks: d.decks.filter((r) => r.deletedAt == null).length,
    notes: d.notes.filter((r) => r.deletedAt == null).length,
    cards: d.cards.filter((r) => r.deletedAt == null).length,
  };
}
