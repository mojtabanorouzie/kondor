import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '@/db';
import {
  cardRepository,
  deckRepository,
  reviewLogRepository,
  type CardWithNote,
} from '@/db/repositories';
import type { CardRow } from '@/db/schema';
import { createScheduler, gradeCard, rateCard, type SchedulingState } from '@/services/srs';
import { CardState, Grade } from '@/types';

import { formatInterval } from './format-interval';

export interface GradePrediction {
  grade: Grade;
  /** Compact interval label this grade would schedule, e.g. "10m", "4d". */
  label: string;
}

export interface SessionSummary {
  again: number;
  hard: number;
  good: number;
  easy: number;
  total: number;
}

type GradeKey = keyof Omit<SessionSummary, 'total'>;

interface UndoEntry {
  snapshot: CardRow;
  reviewLogId: string;
  grade: Grade;
}

const EMPTY: SessionSummary = { again: 0, hard: 0, good: 0, easy: 0, total: 0 };

function gradeKey(g: Grade): GradeKey {
  return g === Grade.Again
    ? 'again'
    : g === Grade.Hard
      ? 'hard'
      : g === Grade.Good
        ? 'good'
        : 'easy';
}

function toState(c: CardRow): SchedulingState {
  return {
    state: c.state,
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    reps: c.reps,
    lapses: c.lapses,
    learningSteps: c.learningSteps,
    lastReviewedAt: c.lastReviewedAt ?? undefined,
  };
}

/**
 * Drives a single study session for a deck: builds the due queue once, tracks
 * reveal/grade progress, persists each grade via the FSRS engine, and supports
 * undo. Lapsed cards keep their (correct) schedule; re-showing them later within
 * the same session is a future enhancement.
 */
export function useStudySession(deckId: string) {
  const db = useDatabase();
  const [queue, setQueue] = useState<CardWithNote[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [summary, setSummary] = useState<SessionSummary>(EMPTY);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const deck = await deckRepository.getById(db, deckId);
        const due = await cardRepository.getDueWithNotes(db, deckId);
        const newCards = due
          .filter((c) => c.state === CardState.New)
          .slice(0, deck?.newPerDay ?? 20);
        const reviews = due
          .filter((c) => c.state !== CardState.New)
          .slice(0, deck?.reviewsPerDay ?? 200);
        if (!cancelled) {
          setQueue([...reviews, ...newCards]);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, deckId]);

  const current = queue[index] as CardWithNote | undefined;
  const done = !loading && !error && index >= queue.length;
  const remaining = Math.max(queue.length - index, 0);

  const predictions = useMemo<GradePrediction[]>(() => {
    if (!current) return [];
    const now = Date.now();
    const scheduler = createScheduler();
    return [Grade.Again, Grade.Hard, Grade.Good, Grade.Easy].map((g) => {
      const out = rateCard(toState(current), g, now, scheduler);
      return { grade: g, label: formatInterval(out.card.due - now) };
    });
  }, [current]);

  const reveal = useCallback(() => setRevealed(true), []);

  const grade = useCallback(
    async (g: Grade) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        const { noteFields: _ignore, ...snapshot } = current;
        const res = await gradeCard(db, current.id, g);
        setUndoStack((s) => [...s, { snapshot, reviewLogId: res.reviewLogId, grade: g }]);
        setSummary((t) => ({
          ...t,
          total: t.total + 1,
          [gradeKey(g)]: t[gradeKey(g)] + 1,
        }));
        setIndex((i) => i + 1);
        setRevealed(false);
      } catch (e) {
        setError(e as Error);
      } finally {
        setBusy(false);
      }
    },
    [current, busy, db],
  );

  const undo = useCallback(async () => {
    if (busy) return;
    const entry = undoStack[undoStack.length - 1];
    if (!entry) return;
    setBusy(true);
    try {
      await cardRepository.update(db, entry.snapshot.id, {
        state: entry.snapshot.state,
        due: entry.snapshot.due,
        stability: entry.snapshot.stability,
        difficulty: entry.snapshot.difficulty,
        reps: entry.snapshot.reps,
        lapses: entry.snapshot.lapses,
        learningSteps: entry.snapshot.learningSteps,
        lastReviewedAt: entry.snapshot.lastReviewedAt ?? null,
      });
      await reviewLogRepository.remove(db, entry.reviewLogId);
      setUndoStack((s) => s.slice(0, -1));
      setSummary((t) => ({
        ...t,
        total: t.total - 1,
        [gradeKey(entry.grade)]: t[gradeKey(entry.grade)] - 1,
      }));
      setIndex((i) => Math.max(i - 1, 0));
      setRevealed(true);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }, [busy, db, undoStack]);

  return {
    loading,
    error,
    current,
    revealed,
    predictions,
    remaining,
    total: queue.length,
    done,
    summary,
    canUndo: undoStack.length > 0,
    busy,
    reveal,
    grade,
    undo,
  };
}
