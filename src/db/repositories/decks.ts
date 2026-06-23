import { eq, sql } from 'drizzle-orm';

import type { Database } from '../client';
import { cards, decks, type DeckRow, type NewDeckRow } from '../schema';
import { uuid } from '@/utils/id';

export type CreateDeckInput = Omit<
  NewDeckRow,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface DeckWithCounts extends DeckRow {
  total: number;
  newCount: number;
  learningCount: number;
  dueCount: number;
}

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

  /** All decks with aggregated card counts (total / new / learning / due). */
  async getAllWithCounts(
    db: Database,
    now: number = Date.now(),
  ): Promise<DeckWithCounts[]> {
    return db
      .select({
        id: decks.id,
        name: decks.name,
        description: decks.description,
        newPerDay: decks.newPerDay,
        reviewsPerDay: decks.reviewsPerDay,
        createdAt: decks.createdAt,
        updatedAt: decks.updatedAt,
        total: sql<number>`count(${cards.id})`,
        newCount: sql<number>`coalesce(sum(case when ${cards.state} = 0 then 1 else 0 end), 0)`,
        learningCount: sql<number>`coalesce(sum(case when ${cards.state} in (1, 3) then 1 else 0 end), 0)`,
        dueCount: sql<number>`coalesce(sum(case when ${cards.due} <= ${now} then 1 else 0 end), 0)`,
      })
      .from(decks)
      .leftJoin(cards, eq(cards.deckId, decks.id))
      .groupBy(decks.id)
      .orderBy(decks.name);
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
