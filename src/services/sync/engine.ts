import type { Database } from '@/db/client';
import { exportBackup, importBackupReplace } from '@/services/import-export';

import { mergeSnapshots } from './merge';
import type { SyncBackend, SyncResult } from './types';

/**
 * Run one sync pass: collect the local collection, pull the remote snapshot,
 * merge them, write the merged result locally, then push it back. Both sides
 * end at the same merged state. Safe to call repeatedly (idempotent).
 */
export async function sync(
  db: Database,
  backend: SyncBackend,
): Promise<SyncResult> {
  const local = await exportBackup(db);
  const remote = await backend.pull();

  const merged = mergeSnapshots(local.data, remote?.data ?? null);

  // Local becomes the merge (merged ⊇ local, so a replace is correct).
  await importBackupReplace(db, { ...local, data: merged });
  await backend.push({ updatedAt: Date.now(), data: merged });

  return {
    decks: merged.decks.length,
    notes: merged.notes.length,
    cards: merged.cards.length,
    reviewLogs: merged.reviewLogs.length,
  };
}
