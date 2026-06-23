import { useDatabase } from '@/db';
import { useAsyncData } from '@/hooks/use-async-data';

import { computeStatistics, type Statistics } from './stats-service';

/** Loads the statistics summary, optionally scoped to a single deck. */
export function useStatistics(deckId?: string) {
  const db = useDatabase();
  return useAsyncData<Statistics>(
    () => computeStatistics(db, { deckId }),
    [db, deckId],
  );
}
