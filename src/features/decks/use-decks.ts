import { useDatabase } from '@/db';
import { deckRepository, noteTypeRepository, type DeckWithCounts } from '@/db/repositories';
import { seedDatabase } from '@/db/seed';
import { useAsyncData } from '@/hooks/use-async-data';

/**
 * Live list of decks with card counts. On a fresh install (no decks and no
 * note types) it seeds a sample deck. The note-type check prevents re-seeding
 * after a user deliberately deletes all their decks.
 */
export function useDecks() {
  const db = useDatabase();
  return useAsyncData<DeckWithCounts[]>(async () => {
    let decks = await deckRepository.getAllWithCounts(db);
    if (decks.length === 0) {
      const types = await noteTypeRepository.getAll(db);
      if (types.length === 0) {
        await seedDatabase(db);
        decks = await deckRepository.getAllWithCounts(db);
      }
    }
    return decks;
  }, [db]);
}
