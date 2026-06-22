import type { Database } from '@/db/client';
import { cardRepository, reviewLogRepository } from '@/db/repositories';
import type { CardRow } from '@/db/schema';
import type { Grade } from '@/types';

import {
  createScheduler,
  rateCard,
  type ReviewOutcome,
  type SchedulingState,
} from './scheduler';
import { DEFAULT_SRS_CONFIG, type SrsConfig } from './params';

function toState(card: CardRow): SchedulingState {
  return {
    state: card.state,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learningSteps,
    lastReviewedAt: card.lastReviewedAt ?? undefined,
  };
}

/**
 * Grade a stored card: compute its next schedule, persist the updated card,
 * and record a review log. Returns the scheduling outcome.
 *
 * The card update and log write are issued sequentially; wrapping them in a
 * transaction is a future hardening step once we settle a cross-driver helper.
 */
export async function gradeCard(
  db: Database,
  cardId: string,
  grade: Grade,
  options: { now?: number; config?: SrsConfig } = {},
): Promise<ReviewOutcome> {
  const now = options.now ?? Date.now();
  const config = options.config ?? DEFAULT_SRS_CONFIG;

  const card = await cardRepository.getById(db, cardId);
  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }

  const outcome = rateCard(toState(card), grade, now, createScheduler(config));

  await cardRepository.update(db, cardId, {
    state: outcome.card.state,
    due: outcome.card.due,
    stability: outcome.card.stability,
    difficulty: outcome.card.difficulty,
    reps: outcome.card.reps,
    lapses: outcome.card.lapses,
    learningSteps: outcome.card.learningSteps,
    lastReviewedAt: outcome.card.lastReviewedAt ?? null,
  });

  await reviewLogRepository.create(db, {
    cardId,
    grade: outcome.log.grade,
    stateBefore: outcome.log.stateBefore,
    scheduledDays: outcome.log.scheduledDays,
    reviewedAt: outcome.log.reviewedAt,
  });

  return outcome;
}
