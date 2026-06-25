import { unzipSync } from 'fflate';
import { Platform } from 'react-native';
import initSqlJs, { type SqlJsStatic } from 'sql.js';

import type { Database } from '@/db/client';
import { cardRepository, deckRepository } from '@/db/repositories';
import { createNote } from '@/features/cards/card-service';
import type { NoteKind } from '@/types';

import type { ImportResult } from '../backup';
import { mapAnkiNotes, type AnkiModel, type AnkiNote } from './anki-map';

let sqlPromise: Promise<SqlJsStatic> | null = null;

/**
 * Load sql.js. In Node (tests) it finds the WASM via the filesystem. On web
 * the WASM is served from <baseUrl>/sql-wasm.wasm — copied from node_modules
 * into public/ by `npm run copy-wasm` (or `npm run export:web`) so Anki import
 * works fully offline without any CDN dependency. The baseUrl prefix lets it
 * resolve when the site is hosted under a subpath (e.g. GitHub Pages /kondor).
 */
function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    const base = process.env.EXPO_BASE_URL ?? '';
    sqlPromise = initSqlJs(
      Platform.OS === 'web' ? { locateFile: (f) => `${base}/${f}` } : undefined,
    );
  }
  return sqlPromise;
}

function readCollection(files: Record<string, Uint8Array>): Uint8Array {
  const name =
    'collection.anki21' in files
      ? 'collection.anki21'
      : 'collection.anki2' in files
        ? 'collection.anki2'
        : undefined;
  if (!name) throw new Error('No Anki collection was found in this .apkg file.');
  return files[name];
}

/**
 * Import an Anki `.apkg` (zip) into a new deck. Notes and their fields are
 * imported; scheduling history is not — imported cards start fresh as New.
 */
export async function importApkg(
  db: Database,
  bytes: Uint8Array,
  deckName: string,
): Promise<ImportResult> {
  const files = unzipSync(bytes);
  const collection = readCollection(files);

  const SQL = await loadSqlJs();
  const adb = new SQL.Database(collection);
  let mapped: { kind: NoteKind; fields: Record<string, string> }[];
  try {
    const modelsJson = adb.exec('SELECT models FROM col LIMIT 1')[0]?.values?.[0]?.[0];
    const models = (typeof modelsJson === 'string' ? JSON.parse(modelsJson) : {}) as Record<
      string,
      AnkiModel
    >;

    const noteRows = adb.exec('SELECT mid, flds FROM notes')[0]?.values ?? [];
    const ankiNotes: AnkiNote[] = noteRows.map((r) => ({
      mid: String(r[0]),
      flds: String(r[1]),
    }));
    mapped = mapAnkiNotes(models, ankiNotes);
  } finally {
    adb.close();
  }

  if (mapped.length === 0) {
    throw new Error('No importable notes were found in this file.');
  }

  const deck = await deckRepository.create(db, { name: deckName });
  for (const m of mapped) {
    await createNote(db, { deckId: deck.id, kind: m.kind, fields: m.fields });
  }
  const cards = await cardRepository.getByDeck(db, deck.id);

  return { decks: 1, notes: mapped.length, cards: cards.length };
}
