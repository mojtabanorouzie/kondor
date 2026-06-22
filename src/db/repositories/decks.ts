import { eq } from 'drizzle-orm';

import type { Database } from '../client';
import { decks, type DeckRow, type NewDeckRow } from '../schema';
import { uuid } from '@/utils/id';

export type CreateDeckInput = Omit<
  NewDeckRow,
  'id' | 'createdAt' | 'updatedAt'
>;

export const deckRepository = {
  async create(db: Database, input: CreateDeckInput): Promise<DeckRow> {
    const now = Date.now();
    const row: NewDeckRow = {
      id: uuid(),
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    const [created] = await db.insert(decks).values(row).returning();
    return created;
  },

  async getAll(db: Database): Promise<DeckRow[]> {
    return db.select().from(decks).orderBy(decks.name);
  },

  async getById(db: Database, id: string): Promise<DeckRow | undefined> {
    const [row] = await db.select().from(decks).where(eq(decks.id, id));
    return row;
  },

  async update(
    db: Database,
    id: string,
    patch: Partial<CreateDeckInput>,
  ): Promise<DeckRow | undefined> {
    const [row] = await db
      .update(decks)
      .set({ ...patch, updatedAt: Date.now() })
      .where(eq(decks.id, id))
      .returning();
    return row;
  },

  async remove(db: Database, id: string): Promise<void> {
    await db.delete(decks).where(eq(decks.id, id));
  },
};
