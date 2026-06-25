import { sql } from 'drizzle-orm';

import type { Database } from '@/db/client';
import { cardRepository } from '@/db/repositories';
import { createBasicCard } from '@/features/cards/card-service';

import type { ParsedCard } from './csv';

export interface ImportSummary {
  /** Rows/items found in the file. */
  total: number;
  /** Cards successfully created. */
  imported: number;
  /** Rows skipped because Front or Back was empty. */
  skipped: number;
  /** Rows skipped by the dedupe option because the Front already existed. */
  duplicates: number;
  /** Per-row failures, by their index in the input array. */
  errors: { index: number; message: string }[];
}

export interface ImportOptions {
  /** Skip cards whose Front already exists in the target deck (and within the batch). */
  dedupe?: boolean;
  /** Called after each processed row with the 1-based count, for progress UI. */
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Persist a batch of parsed cards into a deck inside a single transaction.
 *
 * Validation skips (empty fields) and dedupe skips never touch the database.
 * Genuine write failures are collected per-row rather than thrown; if any row
 * fails, the whole transaction is rolled back so the deck is never left
 * half-imported, and `imported` is reported as 0.
 */
export async function importCards(
  db: Database,
  deckId: string,
  cards: ParsedCard[],
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: cards.length,
    imported: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
  };

  // Build the set of existing Fronts up front (one query) for dedupe.
  const seenFronts = new Set<string>();
  if (options.dedupe) {
    const existing = await cardRepository.getByDeckWithNotes(db, deckId);
    for (const row of existing) {
      const front = (row.noteFields.Front ?? '').trim();
      if (front) seenFronts.add(front.toLowerCase());
    }
  }

  await db.run(sql`BEGIN`);
  try {
    for (let index = 0; index < cards.length; index++) {
      const front = (cards[index].front ?? '').trim();
      const back = (cards[index].back ?? '').trim();

      if (!front || !back) {
        summary.skipped += 1;
      } else if (options.dedupe && seenFronts.has(front.toLowerCase())) {
        summary.duplicates += 1;
      } else {
        try {
          await createBasicCard(db, { deckId, front, back });
          summary.imported += 1;
          if (options.dedupe) seenFronts.add(front.toLowerCase());
        } catch (e) {
          summary.errors.push({ index, message: (e as Error).message });
        }
      }
      options.onProgress?.(index + 1, cards.length);
    }

    if (summary.errors.length > 0) {
      await db.run(sql`ROLLBACK`);
      summary.imported = 0;
    } else {
      await db.run(sql`COMMIT`);
    }
  } catch (e) {
    // A failure of the transaction control itself — roll back and surface it.
    try {
      await db.run(sql`ROLLBACK`);
    } catch {
      // already rolled back / no active transaction
    }
    summary.imported = 0;
    summary.errors.push({ index: -1, message: (e as Error).message });
  }

  return summary;
}
