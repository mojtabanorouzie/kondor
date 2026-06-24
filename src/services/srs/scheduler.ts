import {
  createEmptyCard,
  fsrs,
  type Card as FsrsCard,
  type FSRS,
  type Grade as FsrsGrade,
  type State as FsrsState,
} from 'ts-fsrs';

import { CardState, Grade } from '@/types';

import { DEFAULT_SRS_CONFIG, toFsrsParameters, type SrsConfig } from './params';

/**
 * The scheduling-relevant subset of a card. The SRS engine reads and returns
 * this shape; persistence (db rows) and presentation live elsewhere.
 *
 * Note: our `CardState`/`Grade` enums share their numeric values with ts-fsrs
 * `State`/`Rating`, so the conversions below are value-preserving casts.
 */
export interface SchedulingState {
  state: CardState;
  /** Epoch ms when the card is next due. */
  due: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  /** Epoch ms of the last review, if any. */
  lastReviewedAt?: number;
}

export interface ReviewLogEntry {
  grade: Grade;
  /** Card state immediately before this review. */
  stateBefore: CardState;
  /** Interval applied by this review, in days. */
  scheduledDays: number;
  /** Epoch ms when the review happened. */
  reviewedAt: number;
}

export interface ReviewOutcome {
  card: SchedulingState;
  log: ReviewLogEntry;
}

/** Build a configured FSRS scheduler. Reuse one across many ratings. */
export function createScheduler(config: SrsConfig = DEFAULT_SRS_CONFIG): FSRS {
  return fsrs(toFsrsParameters(config));
}

/** Initial scheduling state for a brand-new card (due immediately). */
export function newCardState(now: number = Date.now()): SchedulingState {
  return fromFsrs(createEmptyCard(new Date(now)));
}

function toFsrs(card: SchedulingState): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0, // recomputed by the scheduler from last_review + now
    scheduled_days: 0,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learningSteps,
    state: card.state as unknown as FsrsState,
    last_review: card.lastReviewedAt ? new Date(card.lastReviewedAt) : undefined,
  };
}

function fromFsrs(c: FsrsCard): SchedulingState {
  return {
    state: c.state as unknown as CardState,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    reps: c.reps,
    lapses: c.lapses,
    learningSteps: c.learning_steps,
    lastReviewedAt: c.last_review?.getTime(),
  };
}

/**
 * Apply a grade to a card and return its next scheduling state plus a review
 * log entry. Pure: no I/O, no mutation of the input.
 */
export function rateCard(
  card: SchedulingState,
  grade: Grade,
  now: number = Date.now(),
  scheduler: FSRS = createScheduler(),
): ReviewOutcome {
  const { card: next } = scheduler.next(toFsrs(card), new Date(now), grade as unknown as FsrsGrade);

  return {
    card: fromFsrs(next),
    log: {
      grade,
      stateBefore: card.state,
      scheduledDays: next.scheduled_days,
      reviewedAt: now,
    },
  };
}
