import type { CardRow, DeckRow, NoteRow, NoteTypeRow, ReviewLogRow } from '@/db/schema';

/** The full, portable collection — the unit of sync (same shape as a backup). */
export interface SyncData {
  decks: DeckRow[];
  noteTypes: NoteTypeRow[];
  notes: NoteRow[];
  cards: CardRow[];
  reviewLogs: ReviewLogRow[];
}

export interface SyncSnapshot {
  /** Epoch ms when this snapshot was produced. */
  updatedAt: number;
  data: SyncData;
}

/**
 * Transport for sync. Implementations decide where the snapshot lives (browser
 * storage, a REST server, …). The engine is agnostic to all of it.
 *
 * `pull(since?)` — pass a seq number to request a delta; omit for a full pull.
 *   Returns `{ snapshot: null, seq: 0 }` when there is nothing to pull.
 *   `seq` is the server's current sequence number (0 for non-delta backends).
 *
 * `push(snapshot)` — returns the server's new seq (0 for non-delta backends).
 */
export interface SyncBackend {
  pull(since?: number): Promise<{ snapshot: SyncSnapshot | null; seq: number }>;
  push(snapshot: SyncSnapshot): Promise<number>;
}

export interface SyncResult {
  decks: number;
  notes: number;
  cards: number;
  reviewLogs: number;
}
