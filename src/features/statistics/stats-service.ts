import type { Database } from '@/db/client';
import { cardRepository, reviewLogRepository } from '@/db/repositories';
import type { CardRow } from '@/db/schema';
import type { ReviewLogWithDeck } from '@/db/repositories';
import { CardState, Grade } from '@/types';

export interface DayCount {
  /** Local calendar day, 'YYYY-MM-DD'. */
  day: string;
  count: number;
}

export interface Statistics {
  totalCards: number;
  byState: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  reviewsByDay: DayCount[];
  reviewsToday: number;
  totalReviews: number;
  /** Young/mature retention as a 0–100 %, or null when no mature reviews yet. */
  retentionPct: number | null;
  /** Consecutive days (ending today) with at least one review. */
  streak: number;
  /** Cards becoming due over the next N days. */
  forecast: DayCount[];
  /** Daily review counts for the heatmap window. */
  heatmap: DayCount[];
}

export interface StatsOptions {
  deckId?: string;
  now?: number;
  reviewDays?: number;
  forecastDays?: number;
  heatmapDays?: number;
}

// --- pure date helpers (local time) ---

export function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(ms: number, n: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Zero-filled day series ending on `endMs`'s day, `length` days long. */
function daySeries(
  counts: Map<string, number>,
  endMs: number,
  length: number,
): DayCount[] {
  const out: DayCount[] = [];
  const end = startOfDay(endMs);
  for (let i = length - 1; i >= 0; i--) {
    const day = dayKey(addDays(end, -i));
    out.push({ day, count: counts.get(day) ?? 0 });
  }
  return out;
}

function bucketByDay(timestamps: number[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const ts of timestamps) m.set(dayKey(ts), (m.get(dayKey(ts)) ?? 0) + 1);
  return m;
}

// --- pure computations (exported for testing) ---

export function computeStreak(reviewDays: Set<string>, now: number): number {
  let streak = 0;
  let cursor = startOfDay(now);
  while (reviewDays.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeRetention(logs: ReviewLogWithDeck[]): number | null {
  // True retention: among reviews of cards already in the Review state,
  // a pass is any grade better than Again.
  const mature = logs.filter((l) => l.stateBefore === CardState.Review);
  if (mature.length === 0) return null;
  const passed = mature.filter((l) => l.grade !== Grade.Again).length;
  return Math.round((passed / mature.length) * 100);
}

export function computeForecast(
  cards: CardRow[],
  now: number,
  days: number,
): DayCount[] {
  const counts = new Map<string, number>();
  for (const c of cards) {
    if (c.state === CardState.New) continue; // new cards aren't "scheduled"
    if (c.due <= now) continue; // already due
    counts.set(dayKey(c.due), (counts.get(dayKey(c.due)) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  const start = startOfDay(now);
  for (let i = 1; i <= days; i++) {
    const day = dayKey(addDays(start, i));
    out.push({ day, count: counts.get(day) ?? 0 });
  }
  return out;
}

export function computeByState(cards: CardRow[]): Statistics['byState'] {
  const by = { new: 0, learning: 0, review: 0, relearning: 0 };
  for (const c of cards) {
    if (c.state === CardState.New) by.new += 1;
    else if (c.state === CardState.Learning) by.learning += 1;
    else if (c.state === CardState.Review) by.review += 1;
    else if (c.state === CardState.Relearning) by.relearning += 1;
  }
  return by;
}

/** Build the full statistics summary, optionally scoped to one deck. */
export async function computeStatistics(
  db: Database,
  options: StatsOptions = {},
): Promise<Statistics> {
  const now = options.now ?? Date.now();
  const reviewDays = options.reviewDays ?? 30;
  const forecastDays = options.forecastDays ?? 14;
  const heatmapDays = options.heatmapDays ?? 17 * 7; // 17 weeks

  const cards = options.deckId
    ? await cardRepository.getByDeck(db, options.deckId)
    : await cardRepository.getAll(db);

  const since = startOfDay(addDays(now, -(heatmapDays - 1)));
  let logs = await reviewLogRepository.getSinceWithDeck(db, since);
  if (options.deckId) logs = logs.filter((l) => l.deckId === options.deckId);

  const byDay = bucketByDay(logs.map((l) => l.reviewedAt));
  const today = dayKey(now);

  return {
    totalCards: cards.length,
    byState: computeByState(cards),
    reviewsByDay: daySeries(byDay, now, reviewDays),
    reviewsToday: byDay.get(today) ?? 0,
    totalReviews: logs.length,
    retentionPct: computeRetention(logs),
    streak: computeStreak(new Set(byDay.keys()), now),
    forecast: computeForecast(cards, now, forecastDays),
    heatmap: daySeries(byDay, now, heatmapDays),
  };
}
