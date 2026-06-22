import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { cards } from './cards';

/** One row per grading event — basis for scheduling history and statistics. */
export const reviewLogs = sqliteTable('review_logs', {
  id: text('id').primaryKey(),
  cardId: text('card_id')
    .notNull()
    .references(() => cards.id, { onDelete: 'cascade' }),
  /** FSRS rating: 1 Again, 2 Hard, 3 Good, 4 Easy. */
  grade: integer('grade').notNull(),
  /** Card state before this review. */
  stateBefore: integer('state_before').notNull(),
  /** Scheduled interval applied, in days. */
  scheduledDays: real('scheduled_days').notNull(),
  reviewedAt: integer('reviewed_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type ReviewLogRow = typeof reviewLogs.$inferSelect;
export type NewReviewLogRow = typeof reviewLogs.$inferInsert;
