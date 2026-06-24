import type { Database } from '@/db/client';
import { settingsRepository } from '@/db/repositories';
import { exportBackup, importBackupReplace } from '@/services/import-export';

import { mergeSnapshots } from './merge';
import type { SyncBackend, SyncResult } from './types';

/**
 * Run one sync pass using the delta protocol:
 * 1. Pull only records changed since the last known server seq (`sync.lastSeq`).
 *    Falls back to a full pull on the first sync (lastSeq = 0).
 * 2. Merge the received delta into the local DB.
 * 3. Push the fully-merged snapshot.
 * 4. Store the new server seq for the next delta pull.
 *
 * Safe to call repeatedly (idempotent — repeated full syncs converge).
 */
export async function sync(db: Database, backend: SyncBackend): Promise<SyncResult> {
  const settings = await settingsRepository.getAll(db);
  const lastSeq = Number(settings['sync.lastSeq'] ?? 0);

  // Pull: request a delta when we have a prior seq; otherwise full pull.
  const { snapshot: remote, seq: serverSeq } = await backend.pull(
    lastSeq > 0 ? lastSeq : undefined,
  );

  // Merge remote delta (or full snapshot) into local collection.
  const local = await exportBackup(db);
  const merged = mergeSnapshots(local.data, remote?.data ?? null);
  await importBackupReplace(db, { ...local, data: merged });

  // Push the merged result; server merges server-side and returns the new seq.
  const newSeq = await backend.push({ updatedAt: Date.now(), data: merged });

  // Persist whichever seq is more informative (push result > pull header > 0).
  const finalSeq = newSeq > 0 ? newSeq : serverSeq;
  if (finalSeq > 0) {
    await settingsRepository.set(db, 'sync.lastSeq', String(finalSeq));
  }

  return {
    decks: merged.decks.filter((r) => r.deletedAt == null).length,
    notes: merged.notes.filter((r) => r.deletedAt == null).length,
    cards: merged.cards.filter((r) => r.deletedAt == null).length,
    reviewLogs: merged.reviewLogs.length,
  };
}
