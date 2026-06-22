import {
  cardRepository,
  deckRepository,
  noteRepository,
  noteTypeRepository,
  reviewLogRepository,
} from '@/db/repositories';
import { seedDatabase } from '@/db/seed';
import type { Database } from '@/db/client';
import { CardState, Grade } from '@/types';

import { createTestDb } from '../helpers/test-db';

describe('data layer', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('deckRepository', () => {
    it('creates a deck with defaults and timestamps', async () => {
      const deck = await deckRepository.create(db, { name: 'Spanish' });

      expect(deck.id).toBeTruthy();
      expect(deck.name).toBe('Spanish');
      expect(deck.newPerDay).toBe(20);
      expect(deck.reviewsPerDay).toBe(200);
      expect(deck.createdAt).toBeGreaterThan(0);
    });

    it('reads, updates, and deletes', async () => {
      const deck = await deckRepository.create(db, { name: 'Geo' });

      expect(await deckRepository.getById(db, deck.id)).toMatchObject({
        name: 'Geo',
      });

      const updated = await deckRepository.update(db, deck.id, {
        name: 'Geography',
      });
      expect(updated?.name).toBe('Geography');

      await deckRepository.remove(db, deck.id);
      expect(await deckRepository.getById(db, deck.id)).toBeUndefined();
    });

    it('lists decks ordered by name', async () => {
      await deckRepository.create(db, { name: 'Zoology' });
      await deckRepository.create(db, { name: 'Anatomy' });

      const all = await deckRepository.getAll(db);
      expect(all.map((d) => d.name)).toEqual(['Anatomy', 'Zoology']);
    });
  });

  describe('notes and json fields', () => {
    it('round-trips JSON fields and tags', async () => {
      const nt = await noteTypeRepository.create(db, {
        name: 'Basic',
        fields: ['Front', 'Back'],
      });
      const deck = await deckRepository.create(db, { name: 'Vocab' });

      const note = await noteRepository.create(db, {
        deckId: deck.id,
        noteTypeId: nt.id,
        fields: { Front: 'gato', Back: 'cat' },
        tags: ['animals', 'a1'],
      });

      const fetched = await noteRepository.getById(db, note.id);
      expect(fetched?.fields).toEqual({ Front: 'gato', Back: 'cat' });
      expect(fetched?.tags).toEqual(['animals', 'a1']);
    });
  });

  describe('cardRepository.getDue', () => {
    it('returns only cards due at or before now, ordered by due', async () => {
      const nt = await noteTypeRepository.create(db, {
        name: 'Basic',
        fields: ['Front', 'Back'],
      });
      const deck = await deckRepository.create(db, { name: 'Due test' });
      const note = await noteRepository.create(db, {
        deckId: deck.id,
        noteTypeId: nt.id,
        fields: { Front: 'a', Back: 'b' },
        tags: [],
      });

      const now = 10_000;
      await cardRepository.create(db, {
        noteId: note.id,
        deckId: deck.id,
        state: CardState.Review,
        due: now - 100, // overdue
      });
      const future = await cardRepository.create(db, {
        noteId: note.id,
        deckId: deck.id,
        state: CardState.Review,
        due: now + 100, // not yet due
      });

      const due = await cardRepository.getDue(db, deck.id, now);
      expect(due).toHaveLength(1);
      expect(due[0].id).not.toBe(future.id);
    });
  });

  describe('cascade deletes', () => {
    it('removes cards and notes when their deck is deleted', async () => {
      await seedDatabase(db);
      const [deck] = await deckRepository.getAll(db);

      expect(await cardRepository.getByDeck(db, deck.id)).not.toHaveLength(0);

      await deckRepository.remove(db, deck.id);

      expect(await cardRepository.getByDeck(db, deck.id)).toHaveLength(0);
      expect(await noteRepository.getByDeck(db, deck.id)).toHaveLength(0);
    });
  });

  describe('reviewLogRepository', () => {
    it('records a review log for a card', async () => {
      await seedDatabase(db);
      const [deck] = await deckRepository.getAll(db);
      const [card] = await cardRepository.getByDeck(db, deck.id);

      await reviewLogRepository.create(db, {
        cardId: card.id,
        grade: Grade.Good,
        stateBefore: CardState.New,
        scheduledDays: 1,
      });

      const logs = await reviewLogRepository.getByCard(db, card.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].grade).toBe(Grade.Good);
    });
  });
});
