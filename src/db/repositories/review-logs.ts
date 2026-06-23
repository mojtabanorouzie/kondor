import { desc, eq, gte } from 'drizzle-orm';

import type { Database } from '../client';
import {
  cards,
  reviewLogs,
  type NewReviewLogRow,
  type ReviewLogRow,
} from '../schema';
import { uuid } from '@/utils/id';

export type CreateReviewLogInput = Omit<NewReviewLogRow, 'id'>;

/** A review event tagged with the deck of the card it belongs to. */
export interface ReviewLogWithDeck {
  reviewedAt: number;
  grade: number;
  stateBefore: number;
  deckId: string;
}

export const reviewLogRepository = {
  async create(
    db: Database,
    input: CreateReviewLogInput,
  ): Promise<ReviewLogRow> {
    const [created] = await db
      .insert(reviewLogs)
      .values({ id: uuid(), ...input })
      .returning();
    return created;
  },

  async getByCard(db: Database, cardId: string): Promise<ReviewLogRow[]> {
    return db
      .select()
      .from(reviewLogs)
      .where(eq(reviewLogs.cardId, cardId))
      .orderBy(desc(reviewLogs.reviewedAt));
  },

  /** Remove a single log (used to undo a review). */
  async remove(db: Database, id: string): Promise<void> {
    await db.delete(reviewLogs).where(eq(reviewLogs.id, id));
  },

  /** All reviews at/after `since` (epoch ms), each tagged with its deck. */
  async getSinceWithDeck(
    db: Database,
    since: number,
  ): Promise<ReviewLogWithDeck[]> {
    return db
      .select({
        reviewedAt: reviewLogs.reviewedAt,
        grade: reviewLogs.grade,
        stateBefore: reviewLogs.stateBefore,
        deckId: cards.deckId,
      })
      .from(reviewLogs)
      .innerJoin(cards, eq(reviewLogs.cardId, cards.id))
      .where(gte(reviewLogs.reviewedAt, since))
      .orderBy(reviewLogs.reviewedAt);
  },
};
