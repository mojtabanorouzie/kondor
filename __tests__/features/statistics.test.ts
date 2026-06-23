import { cardRepository, deckRepository } from '@/db/repositories';
import { createNote } from '@/features/cards/card-service';
import {
  computeRetention,
  computeStatistics,
  computeStreak,
  dayKey,
} from '@/features/statistics/stats-service';
import { gradeCard } from '@/services/srs';
import type { Database } from '@/db/client';
import { CardState, Grade } from '@/types';

import { createTestDb } from '../helpers/test-db';

const DAY = 86_400_000;

describe('Phase 6 — statistics', () => {
  describe('computeStreak', () => {
    const now = Date.UTC(2026, 5, 24, 12, 0, 0);

    it('counts consecutive days ending today', () => {
      const days = new Set([dayKey(now), dayKey(now - DAY), dayKey(now - 2 * DAY)]);
      expect(computeStreak(days, now)).toBe(3);
    });

    it('is zero when there is no review today', () => {
      expect(computeStreak(new Set([dayKey(now - DAY)]), now)).toBe(0);
      expect(computeStreak(new Set(), now)).toBe(0);
    });

    it('stops at the first gap', () => {
      const days = new Set([dayKey(now), dayKey(now - 2 * DAY)]);
      expect(computeStreak(days, now)).toBe(1);
    });
  });

  describe('computeRetention', () => {
    const log = (grade: Grade, stateBefore: CardState) => ({
      grade,
      stateBefore,
      reviewedAt: 0,
      deckId: 'd',
    });

    it('is null without mature (Review-state) reviews', () => {
      expect(computeRetention([])).toBeNull();
      expect(computeRetention([log(Grade.Good, CardState.New)])).toBeNull();
    });

    it('is the pass rate over mature reviews', () => {
      const logs = [
        log(Grade.Good, CardState.Review),
        log(Grade.Easy, CardState.Review),
        log(Grade.Again, CardState.Review), // a lapse
        log(Grade.Again, CardState.New), // ignored (not mature)
      ];
      expect(computeRetention(logs)).toBe(67); // 2 of 3
    });
  });

  describe('computeStatistics', () => {
    let db: Database;

    beforeEach(() => {
      db = createTestDb();
    });

    it('summarises a fresh deck with no reviews', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createNote(db, { deckId: deck.id, kind: 'basic', fields: { Front: 'a', Back: 'b' } });
      await createNote(db, { deckId: deck.id, kind: 'basic', fields: { Front: 'c', Back: 'd' } });

      const now = Date.now();
      const stats = await computeStatistics(db, { now });
      expect(stats.totalCards).toBe(2);
      expect(stats.byState.new).toBe(2);
      expect(stats.reviewsToday).toBe(0);
      expect(stats.totalReviews).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.retentionPct).toBeNull();
      expect(stats.reviewsByDay).toHaveLength(30);
    });

    it('reflects a review and a forecast entry', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createNote(db, { deckId: deck.id, kind: 'basic', fields: { Front: 'a', Back: 'b' } });
      const now = Date.now();
      const [card] = await cardRepository.getByDeck(db, deck.id);

      await gradeCard(db, card.id, Grade.Good, { now });
      // Pin it into the future as a Review card to exercise the forecast.
      await cardRepository.update(db, card.id, {
        state: CardState.Review,
        due: now + 3 * DAY,
      });

      const stats = await computeStatistics(db, { now });
      expect(stats.reviewsToday).toBe(1);
      expect(stats.totalReviews).toBe(1);
      expect(stats.streak).toBe(1);
      expect(stats.forecast.reduce((s, d) => s + d.count, 0)).toBe(1);
    });

    it('scopes to a single deck', async () => {
      const a = await deckRepository.create(db, { name: 'A' });
      const b = await deckRepository.create(db, { name: 'B' });
      await createNote(db, { deckId: a.id, kind: 'basic', fields: { Front: '1', Back: '2' } });
      await createNote(db, { deckId: b.id, kind: 'basic', fields: { Front: '3', Back: '4' } });

      const stats = await computeStatistics(db, { deckId: a.id });
      expect(stats.totalCards).toBe(1);
    });
  });
});
