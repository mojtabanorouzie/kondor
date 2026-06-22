import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { decks } from './decks';
import { noteTypes } from './note-types';

/** The source content a card is generated from (e.g. a word + its definition). */
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  deckId: text('deck_id')
    .notNull()
    .references(() => decks.id, { onDelete: 'cascade' }),
  noteTypeId: text('note_type_id')
    .notNull()
    .references(() => noteTypes.id, { onDelete: 'restrict' }),
  /** Field name → content (HTML/Markdown), stored as JSON. */
  fields: text('fields', { mode: 'json' })
    .notNull()
    .$type<Record<string, string>>(),
  /** Tags, stored as a JSON array. */
  tags: text('tags', { mode: 'json' }).notNull().$type<string[]>().default([]),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type NoteRow = typeof notes.$inferSelect;
export type NewNoteRow = typeof notes.$inferInsert;
