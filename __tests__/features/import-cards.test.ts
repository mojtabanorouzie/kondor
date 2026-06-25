import type { Database } from '@/db/client';
import { cardRepository, deckRepository, noteRepository } from '@/db/repositories';
import * as cardService from '@/features/cards/card-service';
import { JsonImportError, parseCardJson, parseCardRows } from '@/services/import-export';
import { importCards } from '@/services/import-export';

import { createTestDb } from '../helpers/test-db';

describe('Bulk import — parseCardJson', () => {
  it('parses Shape A: array of objects with default key casings', () => {
    const cards = parseCardJson(
      JSON.stringify([
        { front: 'bonjour', back: 'hello' },
        { Front: 'merci', Back: 'thank you' },
      ]),
    );
    expect(cards).toEqual([
      { front: 'bonjour', back: 'hello' },
      { front: 'merci', back: 'thank you' },
    ]);
  });

  it('parses Shape B: array of pairs', () => {
    const cards = parseCardJson('[["bonjour","hello"],["merci","thank you"]]');
    expect(cards).toEqual([
      { front: 'bonjour', back: 'hello' },
      { front: 'merci', back: 'thank you' },
    ]);
  });

  it('remaps custom keys', () => {
    const cards = parseCardJson(
      JSON.stringify([
        { q: 'cat', a: 'gato' },
        { term: 'dog', definition: 'perro' }, // ignored — wrong keys
      ]),
      { frontKey: 'q', backKey: 'a' },
    );
    expect(cards).toEqual([{ front: 'cat', back: 'gato' }]);
  });

  it('skips rows missing a field and trims whitespace-only fields', () => {
    const cards = parseCardJson(
      JSON.stringify([
        { front: 'ok', back: 'good' },
        { front: 'lonely' },
        { front: '   ', back: 'blank front' },
      ]),
    );
    expect(cards).toEqual([{ front: 'ok', back: 'good' }]);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseCardJson('{not json')).toThrow(JsonImportError);
    try {
      parseCardJson('{not json');
    } catch (e) {
      expect((e as JsonImportError).code).toBe('invalid-json');
    }
  });

  it('throws when the document is not an array', () => {
    expect(() => parseCardJson('{"front":"a","back":"b"}')).toThrow(JsonImportError);
    try {
      parseCardJson('{"front":"a"}');
    } catch (e) {
      expect((e as JsonImportError).code).toBe('not-array');
    }
  });
});

describe('Bulk import — importCards', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
    jest.restoreAllMocks();
  });

  it('imports valid cards and returns the summary shape', async () => {
    const deck = await deckRepository.create(db, { name: 'Vocab' });
    const summary = await importCards(db, deck.id, [
      { front: 'gato', back: 'cat' },
      { front: 'perro', back: 'dog' },
    ]);

    expect(summary).toEqual({
      total: 2,
      imported: 2,
      skipped: 0,
      duplicates: 0,
      errors: [],
    });
    const rows = await cardRepository.getByDeckWithNotes(db, deck.id);
    expect(rows.map((r) => r.noteFields.Front).sort()).toEqual(['gato', 'perro']);
  });

  it('skips rows missing front or back', async () => {
    const deck = await deckRepository.create(db, { name: 'D' });
    const summary = await importCards(db, deck.id, [
      { front: 'gato', back: 'cat' },
      { front: '', back: 'orphan' },
      { front: 'lonely', back: '   ' },
    ]);

    expect(summary.imported).toBe(1);
    expect(summary.skipped).toBe(2);
    expect(await cardRepository.getByDeck(db, deck.id)).toHaveLength(1);
  });

  it('dedupes against existing fronts and within the batch', async () => {
    const deck = await deckRepository.create(db, { name: 'D' });
    await cardService.createBasicCard(db, { deckId: deck.id, front: 'gato', back: 'cat' });

    const summary = await importCards(
      db,
      deck.id,
      [
        { front: 'gato', back: 'cat again' }, // dup with existing
        { front: 'perro', back: 'dog' },
        { front: 'PERRO', back: 'dog again' }, // dup within batch (case-insensitive)
      ],
      { dedupe: true },
    );

    expect(summary.imported).toBe(1);
    expect(summary.duplicates).toBe(2);
    expect(await cardRepository.getByDeck(db, deck.id)).toHaveLength(2);
  });

  it('rolls back the whole batch on a forced mid-batch failure', async () => {
    const deck = await deckRepository.create(db, { name: 'D' });
    const real = cardService.createBasicCard;
    let calls = 0;
    jest.spyOn(cardService, 'createBasicCard').mockImplementation(async (...args) => {
      calls += 1;
      if (calls === 2) throw new Error('boom');
      return real(...args);
    });

    const summary = await importCards(db, deck.id, [
      { front: 'a', back: '1' },
      { front: 'b', back: '2' }, // throws
      { front: 'c', back: '3' },
    ]);

    expect(summary.errors).toEqual([{ index: 1, message: 'boom' }]);
    expect(summary.imported).toBe(0);
    // Rollback removed the row that succeeded before the failure.
    expect(await cardRepository.getByDeck(db, deck.id)).toHaveLength(0);
    expect(await noteRepository.getByDeck(db, deck.id)).toHaveLength(0);
  });

  it('round-trips CSV through parseCardRows → importCards', async () => {
    const deck = await deckRepository.create(db, { name: 'Round trip' });
    const csv = 'Front,Back\ngato,cat\n"say ""hi""","a greeting"\n,skipme\nperro,dog';
    const cards = parseCardRows(csv, { hasHeader: true });

    const summary = await importCards(db, deck.id, cards);

    expect(summary.imported).toBe(3);
    const rows = await cardRepository.getByDeckWithNotes(db, deck.id);
    expect(rows.map((r) => r.noteFields.Front).sort()).toEqual(['gato', 'perro', 'say "hi"']);
  });
});
