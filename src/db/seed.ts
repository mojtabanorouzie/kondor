import type { Database } from './client';
import { cardRepository, deckRepository, noteRepository, noteTypeRepository } from './repositories';
import { CardState } from '@/types';

/**
 * Populate the database with a sample "Basic" note type, a deck, and a few
 * cards. Idempotency is the caller's concern — intended for first-run / dev.
 */
export async function seedDatabase(db: Database): Promise<void> {
  const basic = await noteTypeRepository.create(db, {
    name: 'Basic',
    fields: ['Front', 'Back'],
  });

  const deck = await deckRepository.create(db, {
    name: 'Persian — Common Words',
    description: 'A starter deck to try out Kondor.',
  });

  const samples: [string, string][] = [
    ['سلام', 'Hello'],
    ['ممنون', 'Thank you'],
    ['کتاب', 'Book'],
    ['آب', 'Water'],
    ['دوست', 'Friend'],
  ];

  const now = Date.now();
  for (const [front, back] of samples) {
    const note = await noteRepository.create(db, {
      deckId: deck.id,
      noteTypeId: basic.id,
      fields: { Front: front, Back: back },
      tags: ['starter'],
    });
    await cardRepository.create(db, {
      noteId: note.id,
      deckId: deck.id,
      state: CardState.New,
      due: now, // due immediately so it appears in the first study session
    });
  }
}
