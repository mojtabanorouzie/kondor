import { and, eq, isNull, sql } from 'drizzle-orm';

import type { Database } from '../client';
import { cards, decks, notes, type DeckRow, type NewDeckRow } from '../schema';
import { uuid } from '@/utils/id';

export type CreateDeckInput = Omit<NewDeckRow, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

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
    return db.select().from(decks).where(isNull(decks.deletedAt)).orderBy(decks.name);
  },

  /** All live decks with aggregated live-card counts (total / new / learning / due). */
  async getAllWithCounts(db: Database, now: number = Date.now()): Promise<DeckWithCounts[]> {
    return db
      .select({
        id: decks.id,
        name: decks.name,
        description: decks.description,
        newPerDay: decks.newPerDay,
        reviewsPerDay: decks.reviewsPerDay,
        createdAt: decks.createdAt,
        updatedAt: decks.updatedAt,
        deletedAt: decks.deletedAt,
        total: sql<number>`count(${cards.id})`,
        newCount: sql<number>`coalesce(sum(case when ${cards.state} = 0 then 1 else 0 end), 0)`,
        learningCount: sql<number>`coalesce(sum(case when ${cards.state} in (1, 3) then 1 else 0 end), 0)`,
        dueCount: sql<number>`coalesce(sum(case when ${cards.due} <= ${now} then 1 else 0 end), 0)`,
      })
      .from(decks)
      .where(isNull(decks.deletedAt))
      .leftJoin(cards, and(eq(cards.deckId, decks.id), isNull(cards.deletedAt)))
      .groupBy(decks.id)
      .orderBy(decks.name);
  },

  async getById(db: Database, id: string): Promise<DeckRow | undefined> {
    const [row] = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, id), isNull(decks.deletedAt)));
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
      .where(and(eq(decks.id, id), isNull(decks.deletedAt)))
      .returning();
    return row;
  },

  /** Soft-delete the deck and cascade to all its notes and cards. */
  async remove(db: Database, id: string): Promise<void> {
    const now = Date.now();
    await db.update(cards).set({ deletedAt: now, updatedAt: now }).where(eq(cards.deckId, id));
    await db.update(notes).set({ deletedAt: now, updatedAt: now }).where(eq(notes.deckId, id));
    await db.update(decks).set({ deletedAt: now, updatedAt: now }).where(eq(decks.id, id));
  },
};
