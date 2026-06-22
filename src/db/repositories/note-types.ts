import { eq } from 'drizzle-orm';

import type { Database } from '../client';
import { noteTypes, type NewNoteTypeRow, type NoteTypeRow } from '../schema';
import { uuid } from '@/utils/id';

export type CreateNoteTypeInput = Omit<NewNoteTypeRow, 'id'>;

export const noteTypeRepository = {
  async create(
    db: Database,
    input: CreateNoteTypeInput,
  ): Promise<NoteTypeRow> {
    const [created] = await db
      .insert(noteTypes)
      .values({ id: uuid(), ...input })
      .returning();
    return created;
  },

  async getAll(db: Database): Promise<NoteTypeRow[]> {
    return db.select().from(noteTypes).orderBy(noteTypes.name);
  },

  async getById(db: Database, id: string): Promise<NoteTypeRow | undefined> {
    const [row] = await db.select().from(noteTypes).where(eq(noteTypes.id, id));
    return row;
  },

  async remove(db: Database, id: string): Promise<void> {
    await db.delete(noteTypes).where(eq(noteTypes.id, id));
  },
};
