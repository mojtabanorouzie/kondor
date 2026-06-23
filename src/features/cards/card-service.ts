import type { Database } from '@/db/client';
import {
  cardRepository,
  noteRepository,
  noteTypeRepository,
} from '@/db/repositories';
import type { NoteTypeRow } from '@/db/schema';
import { newCardState } from '@/services/srs';
import { cardOrdinalsFor } from '@/services/templating';
import type { NoteKind } from '@/types';

const NOTE_TYPE_DEFS: Record<NoteKind, { name: string; fields: string[] }> = {
  basic: { name: 'Basic', fields: ['Front', 'Back'] },
  cloze: { name: 'Cloze', fields: ['Text', 'Extra'] },
};

/** Find the shared note type for a kind, creating it once if missing. */
export async function getOrCreateNoteType(
  db: Database,
  kind: NoteKind,
): Promise<NoteTypeRow> {
  const existing = await noteTypeRepository.getAll(db);
  const match = existing.find((t) => t.kind === kind);
  if (match) return match;
  const def = NOTE_TYPE_DEFS[kind];
  return noteTypeRepository.create(db, {
    name: def.name,
    kind,
    fields: def.fields,
  });
}

/** Field names a kind expects (for building forms). */
export function fieldsForKind(kind: NoteKind): string[] {
  return NOTE_TYPE_DEFS[kind].fields;
}

async function addCard(
  db: Database,
  noteId: string,
  deckId: string,
  templateIndex: number,
): Promise<void> {
  const fresh = newCardState();
  await cardRepository.create(db, {
    noteId,
    deckId,
    templateIndex,
    state: fresh.state,
    due: fresh.due,
    stability: fresh.stability,
    difficulty: fresh.difficulty,
    reps: fresh.reps,
    lapses: fresh.lapses,
    learningSteps: fresh.learningSteps,
  });
}

export interface CreateNoteInput {
  deckId: string;
  kind: NoteKind;
  fields: Record<string, string>;
}

/** Create a note of any kind and generate its card(s). */
export async function createNote(
  db: Database,
  input: CreateNoteInput,
): Promise<void> {
  const noteType = await getOrCreateNoteType(db, input.kind);
  const note = await noteRepository.create(db, {
    deckId: input.deckId,
    noteTypeId: noteType.id,
    fields: input.fields,
    tags: [],
  });
  for (const ordinal of cardOrdinalsFor(input.kind, input.fields)) {
    await addCard(db, note.id, input.deckId, ordinal);
  }
}

/** Update a note's content. For Cloze, re-sync cards to the current ordinals. */
export async function updateNote(
  db: Database,
  noteId: string,
  kind: NoteKind,
  fields: Record<string, string>,
): Promise<void> {
  const note = await noteRepository.getById(db, noteId);
  if (!note) return;
  await noteRepository.update(db, noteId, { fields });

  if (kind !== 'cloze') return;

  const wanted = new Set(cardOrdinalsFor('cloze', fields));
  const existing = await cardRepository.getByNote(db, noteId);
  const have = new Map(existing.map((c) => [c.templateIndex, c]));

  for (const ordinal of wanted) {
    if (!have.has(ordinal)) await addCard(db, noteId, note.deckId, ordinal);
  }
  for (const [ordinal, card] of have) {
    if (!wanted.has(ordinal)) await cardRepository.remove(db, card.id);
  }
}

/** Delete a card by removing its note (cascades to all of its cards). */
export async function deleteCardByNote(
  db: Database,
  noteId: string,
): Promise<void> {
  await noteRepository.remove(db, noteId);
}

export interface EditableNote {
  noteId: string;
  kind: NoteKind;
  fields: Record<string, string>;
}

/** Load the editable note behind a card, including its kind and all fields. */
export async function loadNoteForEdit(
  db: Database,
  cardId: string,
): Promise<EditableNote | undefined> {
  const card = await cardRepository.getById(db, cardId);
  if (!card) return undefined;
  const note = await noteRepository.getById(db, card.noteId);
  if (!note) return undefined;
  const noteType = await noteTypeRepository.getById(db, note.noteTypeId);
  return {
    noteId: note.id,
    kind: (noteType?.kind ?? 'basic') as NoteKind,
    fields: note.fields,
  };
}

// --- Basic-specific convenience wrappers (used by seed-era code and tests) ---

export async function getOrCreateBasicNoteType(db: Database) {
  return getOrCreateNoteType(db, 'basic');
}

export async function createBasicCard(
  db: Database,
  input: { deckId: string; front: string; back: string },
): Promise<void> {
  await createNote(db, {
    deckId: input.deckId,
    kind: 'basic',
    fields: { Front: input.front, Back: input.back },
  });
}

export async function updateBasicCard(
  db: Database,
  noteId: string,
  input: { front: string; back: string },
): Promise<void> {
  await updateNote(db, noteId, 'basic', {
    Front: input.front,
    Back: input.back,
  });
}

export async function loadCardForEdit(
  db: Database,
  cardId: string,
): Promise<{ cardId: string; noteId: string; front: string; back: string } | undefined> {
  const note = await loadNoteForEdit(db, cardId);
  if (!note) return undefined;
  return {
    cardId,
    noteId: note.noteId,
    front: note.fields.Front ?? '',
    back: note.fields.Back ?? '',
  };
}
