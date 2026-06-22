import { eq } from 'drizzle-orm';

import type { Database } from '../client';
import { notes, type NewNoteRow, type NoteRow } from '../schema';
import { uuid } from '@/utils/id';

export type CreateNoteInput = Omit<
  NewNoteRow,
  'id' | 'createdAt' | 'updatedAt'
>;

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
    return db.select().from(notes).where(eq(notes.deckId, deckId));
  },

  async getById(db: Database, id: string): Promise<NoteRow | undefined> {
    const [row] = await db.select().from(notes).where(eq(notes.id, id));
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
      .where(eq(notes.id, id))
      .returning();
    return row;
  },

  async remove(db: Database, id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  },
};
