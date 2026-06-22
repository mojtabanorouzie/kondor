import {
  createScheduler,
  gradeCard,
  newCardState,
  rateCard,
  type SchedulingState,
} from '@/services/srs';
import { cardRepository, deckRepository } from '@/db/repositories';
import { reviewLogRepository } from '@/db/repositories';
import { seedDatabase } from '@/db/seed';
import { CardState, Grade } from '@/types';

import { createTestDb } from '../helpers/test-db';

// Deterministic scheduler (no fuzz) so intervals are reproducible in tests.
const scheduler = createScheduler({
  requestRetention: 0.9,
  maximumInterval: 36500,
  enableFuzz: false,
});

const T0 = Date.UTC(2026, 5, 23, 0, 0, 0); // 2026-06-23

/** Rate Good repeatedly (advancing time to each due date) until Review state. */
function advanceToReview(start: SchedulingState): SchedulingState {
  let card = start;
  for (let i = 0; i < 10 && card.state !== CardState.Review; i++) {
    card = rateCard(card, Grade.Good, card.due, scheduler).card;
  }
  return card;
}

describe('SRS engine (ts-fsrs)', () => {
  describe('newCardState', () => {
    it('starts a card in the New state with zeroed memory', () => {
      const c = newCardState(T0);
      expect(c.state).toBe(CardState.New);
      expect(c.stability).toBe(0);
      expect(c.difficulty).toBe(0);
      expect(c.reps).toBe(0);
      expect(c.lapses).toBe(0);
    });
  });

  describe('rateCard', () => {
    it('advances a new card and produces a review log entry', () => {
      const { card, log } = rateCard(
        newCardState(T0),
        Grade.Good,
        T0,
        scheduler,
      );

      expect(card.reps).toBe(1);
      expect(card.stability).toBeGreaterThan(0);
      expect(card.difficulty).toBeGreaterThan(0);
      expect(card.due).toBeGreaterThan(T0); // scheduled into the future
      expect(card.lastReviewedAt).toBe(T0);

      expect(log.grade).toBe(Grade.Good);
      expect(log.stateBefore).toBe(CardState.New);
      expect(log.reviewedAt).toBe(T0);
    });

    it('is pure — it does not mutate the input card', () => {
      const before = newCardState(T0);
      const snapshot = { ...before };
      rateCard(before, Grade.Easy, T0, scheduler);
      expect(before).toEqual(snapshot);
    });

    it('orders intervals Again ≤ Hard ≤ Good ≤ Easy from the same state', () => {
      const review = advanceToReview(newCardState(T0));
      expect(review.state).toBe(CardState.Review);

      const at = review.due;
      const again = rateCard(review, Grade.Again, at, scheduler).card;
      const hard = rateCard(review, Grade.Hard, at, scheduler).card;
      const good = rateCard(review, Grade.Good, at, scheduler).card;
      const easy = rateCard(review, Grade.Easy, at, scheduler).card;

      expect(again.due).toBeLessThanOrEqual(hard.due);
      expect(hard.due).toBeLessThanOrEqual(good.due);
      expect(good.due).toBeLessThanOrEqual(easy.due);
    });

    it('counts a lapse when a review card is forgotten (Again)', () => {
      const review = advanceToReview(newCardState(T0));
      const lapsedBefore = review.lapses;
      const { card } = rateCard(review, Grade.Again, review.due, scheduler);
      expect(card.lapses).toBe(lapsedBefore + 1);
      expect(card.state).toBe(CardState.Relearning);
    });
  });

  describe('gradeCard (persistence)', () => {
    it('persists the new schedule and writes a review log', async () => {
      const db = createTestDb();
      await seedDatabase(db);
      const [deck] = await deckRepository.getAll(db);
      const [card] = await cardRepository.getByDeck(db, deck.id);

      const outcome = await gradeCard(db, card.id, Grade.Good, {
        now: T0,
        config: { requestRetention: 0.9, maximumInterval: 36500, enableFuzz: false },
      });

      const updated = await cardRepository.getById(db, card.id);
      expect(updated?.reps).toBe(1);
      expect(updated?.due).toBe(outcome.card.due);
      expect(updated?.lastReviewedAt).toBe(T0);
      expect(updated?.state).toBe(outcome.card.state);

      const logs = await reviewLogRepository.getByCard(db, card.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].grade).toBe(Grade.Good);
      expect(logs[0].stateBefore).toBe(CardState.New);
    });
  });
});
