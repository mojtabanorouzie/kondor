import { and, eq, lte } from 'drizzle-orm';

import type { Database } from '../client';
import { cards, noteTypes, notes, type CardRow, type NewCardRow } from '../schema';
import type { NoteKind } from '@/types';
import { uuid } from '@/utils/id';

export type CreateCardInput = Omit<NewCardRow, 'id'>;

/** A card joined with its source note's content and note-type kind. */
export interface CardWithNote extends CardRow {
  noteFields: Record<string, string>;
  noteKind: NoteKind;
}

export const cardRepository = {
  async create(db: Database, input: CreateCardInput): Promise<CardRow> {
    const [created] = await db
      .insert(cards)
      .values({ id: uuid(), ...input })
      .returning();
    return created;
  },

  async getByDeck(db: Database, deckId: string): Promise<CardRow[]> {
    return db.select().from(cards).where(eq(cards.deckId, deckId));
  },

  /** Every card in the collection (for global statistics). */
  async getAll(db: Database): Promise<CardRow[]> {
    return db.select().from(cards);
  },

  /** All cards generated from a single note. */
  async getByNote(db: Database, noteId: string): Promise<CardRow[]> {
    return db.select().from(cards).where(eq(cards.noteId, noteId));
  },

  /** A deck's cards joined with their note content + kind, newest first. */
  async getByDeckWithNotes(
    db: Database,
    deckId: string,
  ): Promise<CardWithNote[]> {
    const rows = await db
      .select({ card: cards, noteFields: notes.fields, noteKind: noteTypes.kind })
      .from(cards)
      .innerJoin(notes, eq(cards.noteId, notes.id))
      .innerJoin(noteTypes, eq(notes.noteTypeId, noteTypes.id))
      .where(eq(cards.deckId, deckId))
      .orderBy(notes.createdAt);
    return rows.map((r) => ({
      ...r.card,
      noteFields: r.noteFields,
      noteKind: r.noteKind as NoteKind,
    }));
  },

  async getById(db: Database, id: string): Promise<CardRow | undefined> {
    const [row] = await db.select().from(cards).where(eq(cards.id, id));
    return row;
  },

  /** A deck's due cards joined with note content, ordered by due (soonest first). */
  async getDueWithNotes(
    db: Database,
    deckId: string,
    now: number = Date.now(),
  ): Promise<CardWithNote[]> {
    const rows = await db
      .select({ card: cards, noteFields: notes.fields, noteKind: noteTypes.kind })
      .from(cards)
      .innerJoin(notes, eq(cards.noteId, notes.id))
      .innerJoin(noteTypes, eq(notes.noteTypeId, noteTypes.id))
      .where(and(eq(cards.deckId, deckId), lte(cards.due, now)))
      .orderBy(cards.due);
    return rows.map((r) => ({
      ...r.card,
      noteFields: r.noteFields,
      noteKind: r.noteKind as NoteKind,
    }));
  },

  /** Cards in a deck that are due at or before `now` (epoch ms). */
  async getDue(
    db: Database,
    deckId: string,
    now: number = Date.now(),
  ): Promise<CardRow[]> {
    return db
      .select()
      .from(cards)
      .where(and(eq(cards.deckId, deckId), lte(cards.due, now)))
      .orderBy(cards.due);
  },

  /** Persist updated scheduling state after a review. Bumps `updatedAt`. */
  async update(
    db: Database,
    id: string,
    patch: Partial<CreateCardInput>,
  ): Promise<CardRow | undefined> {
    const [row] = await db
      .update(cards)
      .set({ ...patch, updatedAt: Date.now() })
      .where(eq(cards.id, id))
      .returning();
    return row;
  },

  async remove(db: Database, id: string): Promise<void> {
    await db.delete(cards).where(eq(cards.id, id));
  },
};
