import { cardRepository, deckRepository } from '@/db/repositories';
import {
  createBasicCard,
  deleteCardByNote,
  getOrCreateBasicNoteType,
  loadCardForEdit,
  updateBasicCard,
} from '@/features/cards/card-service';
import type { Database } from '@/db/client';
import { CardState } from '@/types';

import { createTestDb } from '../helpers/test-db';

describe('Phase 3 — decks & cards', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('deckRepository.getAllWithCounts', () => {
    it('returns zeroed counts for an empty deck', async () => {
      await deckRepository.create(db, { name: 'Empty' });
      const [deck] = await deckRepository.getAllWithCounts(db);
      expect(deck.total).toBe(0);
      expect(deck.newCount).toBe(0);
      expect(deck.learningCount).toBe(0);
      expect(deck.dueCount).toBe(0);
    });

    it('aggregates new / learning / due counts', async () => {
      const deck = await deckRepository.create(db, { name: 'Counts' });
      await createBasicCard(db, { deckId: deck.id, front: 'a', back: '1' });
      await createBasicCard(db, { deckId: deck.id, front: 'b', back: '2' });

      const cards = await cardRepository.getByDeck(db, deck.id);
      // Move one card to Review, due far in the future (not new, not due).
      await cardRepository.update(db, cards[0].id, {
        state: CardState.Review,
        due: Date.now() + 1_000_000_000,
      });
      // Move the other to Learning, due now.
      await cardRepository.update(db, cards[1].id, {
        state: CardState.Learning,
        due: Date.now(),
      });

      const [deckCounts] = await deckRepository.getAllWithCounts(db, Date.now());
      expect(deckCounts.total).toBe(2);
      expect(deckCounts.newCount).toBe(0);
      expect(deckCounts.learningCount).toBe(1);
      expect(deckCounts.dueCount).toBe(1); // only the Learning card is due
    });
  });

  describe('cardRepository.getByDeckWithNotes', () => {
    it('joins each card with its note content', async () => {
      const deck = await deckRepository.create(db, { name: 'Vocab' });
      await createBasicCard(db, { deckId: deck.id, front: 'gato', back: 'cat' });

      const rows = await cardRepository.getByDeckWithNotes(db, deck.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].noteFields).toEqual({ Front: 'gato', Back: 'cat' });
    });
  });

  describe('card service', () => {
    it('creates the Basic note type once and reuses it', async () => {
      const a = await getOrCreateBasicNoteType(db);
      const b = await getOrCreateBasicNoteType(db);
      expect(a.id).toBe(b.id);
      expect(a.fields).toEqual(['Front', 'Back']);
    });

    it('creates a Basic card as a New card with note content', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createBasicCard(db, { deckId: deck.id, front: 'Q', back: 'A' });

      const [card] = await cardRepository.getByDeck(db, deck.id);
      expect(card.state).toBe(CardState.New);
      expect(card.reps).toBe(0);

      const edit = await loadCardForEdit(db, card.id);
      expect(edit).toMatchObject({ front: 'Q', back: 'A' });
    });

    it('updates a card’s content', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createBasicCard(db, { deckId: deck.id, front: 'old', back: 'old' });
      const [card] = await cardRepository.getByDeck(db, deck.id);
      const edit = await loadCardForEdit(db, card.id);

      await updateBasicCard(db, edit!.noteId, { front: 'new', back: 'value' });

      const rows = await cardRepository.getByDeckWithNotes(db, deck.id);
      expect(rows[0].noteFields).toEqual({ Front: 'new', Back: 'value' });
    });

    it('deletes a card by removing its note', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createBasicCard(db, { deckId: deck.id, front: 'x', back: 'y' });
      const [card] = await cardRepository.getByDeck(db, deck.id);
      const edit = await loadCardForEdit(db, card.id);

      await deleteCardByNote(db, edit!.noteId);

      expect(await cardRepository.getByDeck(db, deck.id)).toHaveLength(0);
    });
  });
});
