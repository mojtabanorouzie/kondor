import { and, eq, isNull } from 'drizzle-orm';

import type { Database } from '../client';
import { cards, notes, type NewNoteRow, type NoteRow } from '../schema';
import { uuid } from '@/utils/id';

export type CreateNoteInput = Omit<NewNoteRow, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export const noteRepository = {
  async create(db: Database, input: CreateNoteInput): Promise<NoteRow> {
    const now = Date.now();
    const [created] = await db
      .insert(notes)
      .values({ id: uuid(), createdAt: now, updatedAt: now, ...input })
      .returning();
    return created;
  },

  async getByDeck(db: Database, deckId: string): Promise<NoteRow[]> {
    return db
      .select()
      .from(notes)
      .where(and(eq(notes.deckId, deckId), isNull(notes.deletedAt)));
  },

  async getById(db: Database, id: string): Promise<NoteRow | undefined> {
    const [row] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)));
    return row;
  },

  async update(
    db: Database,
    id: string,
    patch: Partial<CreateNoteInput>,
  ): Promise<NoteRow | undefined> {
    const [row] = await db
      .update(notes)
      .set({ ...patch, updatedAt: Date.now() })
      .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
      .returning();
    return row;
  },

  /** Soft-delete the note and cascade to all its cards. */
  async remove(db: Database, id: string): Promise<void> {
    const now = Date.now();
    await db.update(cards).set({ deletedAt: now, updatedAt: now }).where(eq(cards.noteId, id));
    await db.update(notes).set({ deletedAt: now, updatedAt: now }).where(eq(notes.id, id));
  },
};
