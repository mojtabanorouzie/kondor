import type { Database } from '@/db/client';
import {
  cardRepository,
  noteRepository,
  noteTypeRepository,
} from '@/db/repositories';
import type { NoteTypeRow } from '@/db/schema';
import { newCardState } from '@/services/srs';

export const BASIC_NOTE_TYPE = 'Basic';
export const BASIC_FIELDS = ['Front', 'Back'] as const;

/** Find the shared "Basic" note type, creating it once if missing. */
export async function getOrCreateBasicNoteType(
  db: Database,
): Promise<NoteTypeRow> {
  const existing = await noteTypeRepository.getAll(db);
  const basic = existing.find((t) => t.name === BASIC_NOTE_TYPE);
  if (basic) return basic;
  return noteTypeRepository.create(db, {
    name: BASIC_NOTE_TYPE,
    fields: [...BASIC_FIELDS],
  });
}

export interface BasicCardInput {
  deckId: string;
  front: string;
  back: string;
}

/** Create a Basic note and a fresh (New) card for it. */
export async function createBasicCard(
  db: Database,
  input: BasicCardInput,
): Promise<void> {
  const noteType = await getOrCreateBasicNoteType(db);
  const note = await noteRepository.create(db, {
    deckId: input.deckId,
    noteTypeId: noteType.id,
    fields: { Front: input.front, Back: input.back },
    tags: [],
  });

  const fresh = newCardState();
  await cardRepository.create(db, {
    noteId: note.id,
    deckId: input.deckId,
    state: fresh.state,
    due: fresh.due,
    stability: fresh.stability,
    difficulty: fresh.difficulty,
    reps: fresh.reps,
    lapses: fresh.lapses,
    learningSteps: fresh.learningSteps,
  });
}

/** Update the content of an existing Basic note. */
export async function updateBasicCard(
  db: Database,
  noteId: string,
  input: { front: string; back: string },
): Promise<void> {
  await noteRepository.update(db, noteId, {
    fields: { Front: input.front, Back: input.back },
  });
}

/** Delete a card by removing its note (cascades to the card). */
export async function deleteCardByNote(
  db: Database,
  noteId: string,
): Promise<void> {
  await noteRepository.remove(db, noteId);
}

export interface EditableCard {
  cardId: string;
  noteId: string;
  front: string;
  back: string;
}

/** Load a single card with its editable Front/Back content. */
export async function loadCardForEdit(
  db: Database,
  cardId: string,
): Promise<EditableCard | undefined> {
  const card = await cardRepository.getById(db, cardId);
  if (!card) return undefined;
  const note = await noteRepository.getById(db, card.noteId);
  if (!note) return undefined;
  return {
    cardId: card.id,
    noteId: note.id,
    front: note.fields.Front ?? '',
    back: note.fields.Back ?? '',
  };
}
