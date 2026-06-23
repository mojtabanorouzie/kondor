import { useDatabase } from '@/db';
import { cardRepository, deckRepository } from '@/db/repositories';
import type { CardWithNote } from '@/db/repositories';
import type { DeckRow } from '@/db/schema';
import { useAsyncData } from '@/hooks/use-async-data';

export interface DeckDetail {
  deck: DeckRow | undefined;
  cards: CardWithNote[];
}

/** Loads a deck and its cards (with note content), refreshing on focus. */
export function useDeckCards(deckId: string) {
  const db = useDatabase();
  return useAsyncData<DeckDetail>(async () => {
    const deck = await deckRepository.getById(db, deckId);
    const cards = await cardRepository.getByDeckWithNotes(db, deckId);
    return { deck, cards };
  }, [db, deckId]);
}
