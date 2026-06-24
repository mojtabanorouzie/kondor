import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { decks } from './decks';
import { notes } from './notes';

/**
 * A single study unit generated from a note. Holds FSRS scheduling state.
 * `state`: 0 New, 1 Learning, 2 Review, 3 Relearning (see CardState in src/types).
 */
export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  noteId: text('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  deckId: text('deck_id')
    .notNull()
    .references(() => decks.id, { onDelete: 'cascade' }),
  /** Which template/cloze ordinal this card renders (0 for Basic). */
  templateIndex: integer('template_index').notNull().default(0),
  state: integer('state').notNull().default(0),
  /** Epoch ms when the card is next due. */
  due: integer('due').notNull(),
  /** FSRS memory-state parameters (floating point). */
  stability: real('stability').notNull().default(0),
  difficulty: real('difficulty').notNull().default(0),
  /** Total successful reviews. */
  reps: integer('reps').notNull().default(0),
  /** Times the card was forgotten. */
  lapses: integer('lapses').notNull().default(0),
  /** FSRS short-term learning step index (which learning/relearning step). */
  learningSteps: integer('learning_steps').notNull().default(0),
  /** Last review time (epoch ms), if ever reviewed. */
  lastReviewedAt: integer('last_reviewed_at'),
  /** Epoch ms of the last mutation — used for last-write-wins sync. */
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type CardRow = typeof cards.$inferSelect;
export type NewCardRow = typeof cards.$inferInsert;
