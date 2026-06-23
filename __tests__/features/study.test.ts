import {
  cardRepository,
  deckRepository,
  reviewLogRepository,
} from '@/db/repositories';
import { createBasicCard } from '@/features/cards/card-service';
import { formatInterval } from '@/features/study/format-interval';
import { gradeCard } from '@/services/srs';
import type { Database } from '@/db/client';
import { Grade } from '@/types';

import { createTestDb } from '../helpers/test-db';

describe('Phase 4 — study session', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('getDueWithNotes', () => {
    it('returns due cards with their note content', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createBasicCard(db, { deckId: deck.id, front: 'q', back: 'a' });

      const due = await cardRepository.getDueWithNotes(db, deck.id, Date.now());
      expect(due).toHaveLength(1);
      expect(due[0].noteFields).toEqual({ Front: 'q', Back: 'a' });
    });

    it('excludes cards scheduled in the future', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createBasicCard(db, { deckId: deck.id, front: 'q', back: 'a' });
      const [card] = await cardRepository.getByDeck(db, deck.id);
      await cardRepository.update(db, card.id, { due: Date.now() + 1_000_000 });

      const due = await cardRepository.getDueWithNotes(db, deck.id, Date.now());
      expect(due).toHaveLength(0);
    });
  });

  describe('grade + undo round-trip', () => {
    it('restores the card and removes the log on undo', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createBasicCard(db, { deckId: deck.id, front: 'q', back: 'a' });
      const [before] = await cardRepository.getByDeck(db, deck.id);

      const res = await gradeCard(db, before.id, Grade.Good);
      expect(res.reviewLogId).toBeTruthy();

      const graded = await cardRepository.getById(db, before.id);
      expect(graded!.reps).toBe(1);
      expect(await reviewLogRepository.getByCard(db, before.id)).toHaveLength(1);

      // Undo: restore the snapshot and delete the log.
      await cardRepository.update(db, before.id, {
        state: before.state,
        due: before.due,
        stability: before.stability,
        difficulty: before.difficulty,
        reps: before.reps,
        lapses: before.lapses,
        learningSteps: before.learningSteps,
        lastReviewedAt: before.lastReviewedAt ?? null,
      });
      await reviewLogRepository.remove(db, res.reviewLogId);

      const restored = await cardRepository.getById(db, before.id);
      expect(restored!.reps).toBe(0);
      expect(restored!.due).toBe(before.due);
      expect(await reviewLogRepository.getByCard(db, before.id)).toHaveLength(0);
    });
  });

  describe('formatInterval', () => {
    it('formats intervals into compact labels', () => {
      expect(formatInterval(0)).toBe('now');
      expect(formatInterval(30_000)).toBe('<1m');
      expect(formatInterval(10 * 60_000)).toBe('10m');
      expect(formatInterval(3 * 3_600_000)).toBe('3h');
      expect(formatInterval(4 * 86_400_000)).toBe('4d');
      expect(formatInterval(60 * 86_400_000)).toBe('2mo');
    });
  });
});
