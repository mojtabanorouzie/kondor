import { desc, eq } from 'drizzle-orm';

import type { Database } from '../client';
import {
  reviewLogs,
  type NewReviewLogRow,
  type ReviewLogRow,
} from '../schema';
import { uuid } from '@/utils/id';

export type CreateReviewLogInput = Omit<NewReviewLogRow, 'id'>;

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
};
