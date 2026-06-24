import type {
  CardRow,
  DeckRow,
  NoteRow,
  NoteTypeRow,
  ReviewLogRow,
} from '@/db/schema';

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
 */
export interface SyncBackend {
  pull(): Promise<SyncSnapshot | null>;
  push(snapshot: SyncSnapshot): Promise<void>;
}

export interface SyncResult {
  decks: number;
  notes: number;
  cards: number;
  reviewLogs: number;
}
