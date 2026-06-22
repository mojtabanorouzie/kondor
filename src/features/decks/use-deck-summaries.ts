import { useEffect, useState } from 'react';

import { cardRepository, deckRepository, useDatabase } from '@/db';
import { seedDatabase } from '@/db/seed';

export interface DeckSummary {
  id: string;
  name: string;
  total: number;
  due: number;
}

/**
 * Loads deck summaries from SQLite. On first run (no decks) it seeds a sample
 * deck so the app has something to show. One-shot load — full reactive queries
 * arrive with the deck/study features in later phases.
 */
export function useDeckSummaries() {
  const db = useDatabase();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let all = await deckRepository.getAll(db);
        if (all.length === 0) {
          await seedDatabase(db);
          all = await deckRepository.getAll(db);
        }

        const now = Date.now();
        const summaries = await Promise.all(
          all.map(async (deck): Promise<DeckSummary> => {
            const [cards, due] = await Promise.all([
              cardRepository.getByDeck(db, deck.id),
              cardRepository.getDue(db, deck.id, now),
            ]);
            return {
              id: deck.id,
              name: deck.name,
              total: cards.length,
              due: due.length,
            };
          }),
        );

        if (!cancelled) {
          setDecks(summaries);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db]);

  return { decks, loading, error };
}
