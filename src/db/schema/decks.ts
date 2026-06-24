import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** A named collection of cards with per-deck study limits. */
export const decks = sqliteTable('decks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  /** Max new cards introduced per day. */
  newPerDay: integer('new_per_day').notNull().default(20),
  /** Max review cards per day. */
  reviewsPerDay: integer('reviews_per_day').notNull().default(200),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  /** Epoch ms when the row was soft-deleted; null means the deck is alive. */
  deletedAt: integer('deleted_at'),
});

export type DeckRow = typeof decks.$inferSelect;
export type NewDeckRow = typeof decks.$inferInsert;
