import { cardRepository, deckRepository } from '@/db/repositories';
import type { DeckRow, NoteTypeRow, ReviewLogRow } from '@/db/schema';
import { createNote } from '@/features/cards/card-service';
import type { Database } from '@/db/client';
import { memoryBackend, mergeSnapshots, sync, type SyncData } from '@/services/sync';
import { CardState } from '@/types';

import { createTestDb } from '../helpers/test-db';

const EMPTY: SyncData = {
  decks: [],
  noteTypes: [],
  notes: [],
  cards: [],
  reviewLogs: [],
};

function deck(id: string, updatedAt: number, name = 'd'): DeckRow {
  return {
    id,
    name,
    description: null,
    newPerDay: 20,
    reviewsPerDay: 200,
    createdAt: 0,
    updatedAt,
    deletedAt: null,
  };
}

describe('Phase 9 — sync', () => {
  describe('mergeSnapshots', () => {
    it('returns local unchanged when there is no remote', () => {
      const local: SyncData = { ...EMPTY, decks: [deck('a', 1)] };
      expect(mergeSnapshots(local, null)).toEqual(local);
    });

    it('keeps the newer deck (last-write-wins by updatedAt)', () => {
      const local: SyncData = { ...EMPTY, decks: [deck('a', 10, 'old')] };
      const remote: SyncData = { ...EMPTY, decks: [deck('a', 20, 'new')] };
      const merged = mergeSnapshots(local, remote);
      expect(merged.decks).toHaveLength(1);
      expect(merged.decks[0].name).toBe('new');
    });

    it('unions note types and review logs by id', () => {
      const nt = (id: string): NoteTypeRow => ({ id, name: id, kind: 'basic', fields: [] });
      const log = (id: string): ReviewLogRow => ({
        id,
        cardId: 'c',
        grade: 3,
        stateBefore: 0,
        scheduledDays: 1,
        reviewedAt: 0,
      });
      const local: SyncData = { ...EMPTY, noteTypes: [nt('x')], reviewLogs: [log('1')] };
      const remote: SyncData = { ...EMPTY, noteTypes: [nt('y')], reviewLogs: [log('2')] };
      const merged = mergeSnapshots(local, remote);
      expect(merged.noteTypes.map((n) => n.id).sort()).toEqual(['x', 'y']);
      expect(merged.reviewLogs.map((l) => l.id).sort()).toEqual(['1', '2']);
    });

    it('is idempotent and order-independent (converges)', () => {
      const a: SyncData = { ...EMPTY, decks: [deck('a', 10), deck('b', 5)] };
      const b: SyncData = { ...EMPTY, decks: [deck('a', 20), deck('c', 7)] };
      const ab = mergeSnapshots(a, b);
      const ba = mergeSnapshots(b, a);
      const sortDecks = (d: DeckRow[]) => [...d].sort((x, y) => x.id.localeCompare(y.id));
      expect(sortDecks(ab.decks)).toEqual(sortDecks(ba.decks));
      // merging again with either side changes nothing
      expect(sortDecks(mergeSnapshots(ab, b).decks)).toEqual(sortDecks(ab.decks));
    });

    it('tombstone wins over live row when tombstone is newer (LWW)', () => {
      const live: SyncData = { ...EMPTY, decks: [deck('a', 10, 'alive')] };
      const deleted: SyncData = {
        ...EMPTY,
        decks: [{ ...deck('a', 20, 'alive'), deletedAt: 20 }],
      };
      const merged = mergeSnapshots(live, deleted);
      expect(merged.decks[0].deletedAt).toBe(20);
    });

    it('live row wins when the edit is newer than the delete (resurrection)', () => {
      const resurrected: SyncData = { ...EMPTY, decks: [deck('a', 30, 'alive')] };
      const deleted: SyncData = {
        ...EMPTY,
        decks: [{ ...deck('a', 20, 'alive'), deletedAt: 20 }],
      };
      const merged = mergeSnapshots(resurrected, deleted);
      expect(merged.decks[0].deletedAt).toBeNull();
    });
  });

  describe('two-device convergence', () => {
    it('propagates new cards and edits across devices via a shared backend', async () => {
      const backend = memoryBackend();
      const deviceA: Database = createTestDb();
      const deviceB: Database = createTestDb();

      // A creates a deck + card, then syncs.
      const d = await deckRepository.create(deviceA, { name: 'Shared' });
      await createNote(deviceA, {
        deckId: d.id,
        kind: 'basic',
        fields: { Front: 'q', Back: 'a' },
      });
      await sync(deviceA, backend);

      // B syncs and receives them.
      await sync(deviceB, backend);
      const bCards = await cardRepository.getAll(deviceB);
      expect(bCards).toHaveLength(1);

      // B edits the card's schedule, then syncs.
      await cardRepository.update(deviceB, bCards[0].id, {
        state: CardState.Review,
        due: 9_999_999_999_999,
      });
      await sync(deviceB, backend);

      // A syncs and converges to B's edit.
      await sync(deviceA, backend);
      const aCards = await cardRepository.getAll(deviceA);
      expect(aCards).toHaveLength(1);
      expect(aCards[0].state).toBe(CardState.Review);
      expect(aCards[0].due).toBe(9_999_999_999_999);

      // Both devices match.
      expect(aCards[0]).toEqual(bCards[0] && (await cardRepository.getById(deviceB, bCards[0].id)));
    });

    it('propagates deletions via tombstones (Phase 11)', async () => {
      const backend = memoryBackend();
      const deviceA: Database = createTestDb();
      const deviceB: Database = createTestDb();

      // A creates a deck and syncs.
      const d = await deckRepository.create(deviceA, { name: 'ToDelete' });
      await createNote(deviceA, {
        deckId: d.id,
        kind: 'basic',
        fields: { Front: 'q', Back: 'a' },
      });
      await sync(deviceA, backend);

      // B syncs — receives the deck and card.
      await sync(deviceB, backend);
      expect(await deckRepository.getAll(deviceB)).toHaveLength(1);
      expect(await cardRepository.getAll(deviceB)).toHaveLength(1);

      // A deletes the deck (soft-delete cascades to notes + cards).
      await deckRepository.remove(deviceA, d.id);
      expect(await deckRepository.getAll(deviceA)).toHaveLength(0);
      expect(await cardRepository.getAll(deviceA)).toHaveLength(0);

      // A syncs — pushes tombstones.
      await sync(deviceA, backend);

      // B syncs — receives tombstones; deck and card disappear from B.
      await sync(deviceB, backend);
      expect(await deckRepository.getAll(deviceB)).toHaveLength(0);
      expect(await cardRepository.getAll(deviceB)).toHaveLength(0);
    });
  });
});
