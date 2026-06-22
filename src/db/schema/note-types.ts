import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Defines the shape of a note: its named fields (e.g. ["Front", "Back"]).
 * Card templates generate one or more cards from a note of this type.
 */
export const noteTypes = sqliteTable('note_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** Ordered field names, stored as a JSON array. */
  fields: text('fields', { mode: 'json' }).notNull().$type<string[]>(),
});

export type NoteTypeRow = typeof noteTypes.$inferSelect;
export type NewNoteTypeRow = typeof noteTypes.$inferInsert;
