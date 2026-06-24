import type { SyncData } from './types';

interface Versioned {
  id: string;
  updatedAt: number;
}

/** Deterministic newer-of-two: by updatedAt, then by id to break ties. */
function newer<T extends Versioned>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return a.id >= b.id ? a : b;
}

/** Last-write-wins union keyed by id. Order-independent and idempotent. */
function lwwById<T extends Versioned>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of a) map.set(row.id, row);
  for (const row of b) {
    const existing = map.get(row.id);
    map.set(row.id, existing ? newer(row, existing) : row);
  }
  return [...map.values()];
}

/** Union keyed by id; first occurrence wins (for immutable/append-only rows). */
function unionById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of b) map.set(row.id, row);
  for (const row of a) map.set(row.id, row);
  return [...map.values()];
}

/**
 * Reconcile two collections. `decks`/`notes`/`cards` use last-write-wins by
 * `updatedAt`; `note_types`/`review_logs` are unioned by id. Pure, commutative,
 * and idempotent, so repeated syncs in any order converge.
 */
export function mergeSnapshots(local: SyncData, remote: SyncData | null): SyncData {
  if (!remote) return local;
  return {
    noteTypes: unionById(local.noteTypes, remote.noteTypes),
    decks: lwwById(local.decks, remote.decks),
    notes: lwwById(local.notes, remote.notes),
    cards: lwwById(local.cards, remote.cards),
    reviewLogs: unionById(local.reviewLogs, remote.reviewLogs),
  };
}
