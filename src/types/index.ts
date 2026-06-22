/**
 * Shared domain types for Kondor.
 *
 * These describe the conceptual model independent of the database layer.
 * The Drizzle schema (src/db/schema) is the authoritative row shape; these
 * types are what services, stores, and UI speak in.
 */

/** Unique id type. SQLite rows use text UUIDs. */
export type Id = string;

/** FSRS card lifecycle state. */
export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

/** Grade a user gives when reviewing a card (FSRS rating). */
export enum Grade {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface Deck {
  id: Id;
  name: string;
  description?: string;
  /** Max new cards introduced per day. */
  newPerDay: number;
  /** Max review cards per day. */
  reviewsPerDay: number;
  createdAt: number;
  updatedAt: number;
}

export interface NoteType {
  id: Id;
  name: string;
  /** Field names, e.g. ["Front", "Back"]. */
  fields: string[];
}

export interface Note {
  id: Id;
  deckId: Id;
  noteTypeId: Id;
  /** Field name → content (HTML/Markdown). */
  fields: Record<string, string>;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/** A single study unit generated from a note; carries FSRS scheduling state. */
export interface Card {
  id: Id;
  noteId: Id;
  deckId: Id;
  state: CardState;
  /** Epoch ms when the card is next due. */
  due: number;
  /** FSRS memory-state parameters. */
  stability: number;
  difficulty: number;
  /** Total successful reviews. */
  reps: number;
  /** Times the card was forgotten. */
  lapses: number;
  /** FSRS short-term learning step index. */
  learningSteps: number;
  /** Last time this card was reviewed (epoch ms), if ever. */
  lastReviewedAt?: number;
}

/** One row per grading event — the basis for scheduling history and stats. */
export interface ReviewLog {
  id: Id;
  cardId: Id;
  grade: Grade;
  /** State before this review. */
  stateBefore: CardState;
  /** Scheduled interval applied, in days. */
  scheduledDays: number;
  reviewedAt: number;
}
