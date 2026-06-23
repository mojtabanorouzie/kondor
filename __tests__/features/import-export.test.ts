import BetterSqlite3 from 'better-sqlite3';
import { zipSync } from 'fflate';

import { cardRepository, deckRepository } from '@/db/repositories';
import { createNote } from '@/features/cards/card-service';
import {
  exportBackup,
  importApkg,
  importBackupReplace,
  mapAnkiNotes,
  parseBackup,
  parseCardRows,
  parseDelimited,
  serializeBackup,
} from '@/services/import-export';

import { createTestDb } from '../helpers/test-db';

describe('Phase 7 — import / export', () => {
  describe('Kondor backup', () => {
    it('round-trips a collection through export → import', async () => {
      const src = createTestDb();
      const deck = await deckRepository.create(src, { name: 'Spanish' });
      await createNote(src, { deckId: deck.id, kind: 'basic', fields: { Front: 'gato', Back: 'cat' } });
      await createNote(src, { deckId: deck.id, kind: 'basic', fields: { Front: 'perro', Back: 'dog' } });

      const json = serializeBackup(await exportBackup(src));

      const dest = createTestDb();
      const result = await importBackupReplace(dest, parseBackup(json));
      expect(result).toEqual({ decks: 1, notes: 2, cards: 2 });

      const decks = await deckRepository.getAll(dest);
      expect(decks).toHaveLength(1);
      expect(decks[0].name).toBe('Spanish');
      expect(await cardRepository.getByDeck(dest, decks[0].id)).toHaveLength(2);
    });

    it('replaces existing data on import', async () => {
      const src = createTestDb();
      const d1 = await deckRepository.create(src, { name: 'Keep' });
      await createNote(src, { deckId: d1.id, kind: 'basic', fields: { Front: 'a', Back: 'b' } });
      const backup = await exportBackup(src);

      const dest = createTestDb();
      await deckRepository.create(dest, { name: 'Will be wiped' });
      await importBackupReplace(dest, backup);

      const decks = await deckRepository.getAll(dest);
      expect(decks.map((d) => d.name)).toEqual(['Keep']);
    });

    it('rejects files that are not Kondor backups', () => {
      expect(() => parseBackup('not json')).toThrow();
      expect(() => parseBackup('{"format":"other"}')).toThrow();
    });
  });

  describe('CSV/TSV parsing', () => {
    it('handles quoted fields, escaped quotes, and embedded newlines', () => {
      const rows = parseDelimited('a,"b,c","line1\nline2","say ""hi"""', ',');
      expect(rows[0]).toEqual(['a', 'b,c', 'line1\nline2', 'say "hi"']);
    });

    it('maps rows to front/back, skipping a header and blanks', () => {
      const cards = parseCardRows('Front,Back\ngato,cat\n,missing\nperro,dog', {
        hasHeader: true,
      });
      expect(cards).toEqual([
        { front: 'gato', back: 'cat' },
        { front: 'perro', back: 'dog' },
      ]);
    });

    it('auto-detects tab-separated values', () => {
      const cards = parseCardRows('uno\tone\ndos\ttwo');
      expect(cards).toEqual([
        { front: 'uno', back: 'one' },
        { front: 'dos', back: 'two' },
      ]);
    });
  });

  describe('Anki note mapping', () => {
    const models = {
      '1': { type: 0, flds: [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }] },
      '2': { type: 1, flds: [{ name: 'Text', ord: 0 }] },
    };

    it('maps standard notes to Basic and cloze models to Cloze', () => {
      const mapped = mapAnkiNotes(models, [
        { mid: '1', flds: 'Bonjour\x1fHello' },
        { mid: '2', flds: 'The {{c1::cat}} sat\x1f' },
        { mid: '1', flds: '\x1fonly back' }, // empty primary → skipped
      ]);
      expect(mapped).toEqual([
        { kind: 'basic', fields: { Front: 'Bonjour', Back: 'Hello' } },
        { kind: 'cloze', fields: { Text: 'The {{c1::cat}} sat', Extra: '' } },
      ]);
    });
  });

  describe('Anki .apkg import', () => {
    function buildApkg(): Uint8Array {
      const adb = new BetterSqlite3(':memory:');
      adb.exec('CREATE TABLE col (models TEXT); CREATE TABLE notes (mid TEXT, flds TEXT);');
      const models = {
        '1': { type: 0, flds: [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }] },
      };
      adb.prepare('INSERT INTO col (models) VALUES (?)').run(JSON.stringify(models));
      adb.prepare('INSERT INTO notes (mid, flds) VALUES (?, ?)').run('1', 'Bonjour\x1fHello');
      adb.prepare('INSERT INTO notes (mid, flds) VALUES (?, ?)').run('1', 'Merci\x1fThanks');
      const bytes = new Uint8Array(adb.serialize());
      adb.close();
      return zipSync({
        'collection.anki21': bytes,
        media: new TextEncoder().encode('{}'),
      });
    }

    it('imports notes from a .apkg into a new deck', async () => {
      const db = createTestDb();
      const apkg = buildApkg();

      const result = await importApkg(db, apkg, 'French');

      expect(result.notes).toBe(2);
      const decks = await deckRepository.getAll(db);
      expect(decks).toHaveLength(1);
      expect(decks[0].name).toBe('French');
      const rows = await cardRepository.getByDeckWithNotes(db, decks[0].id);
      expect(rows.map((r) => r.noteFields.Front).sort()).toEqual(['Bonjour', 'Merci']);
    });
  });
});
