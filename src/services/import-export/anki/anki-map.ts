import type { NoteKind } from '@/types';

/** Anki separates a note's fields with the unit-separator character (0x1f). */
export const ANKI_FIELD_SEP = '\x1f';

/** Subset of an Anki note type (model) we care about. */
export interface AnkiModel {
  /** 0 = standard (front/back), 1 = cloze. */
  type: number;
  flds: { name: string; ord: number }[];
}

/** Subset of an Anki `notes` row. */
export interface AnkiNote {
  /** Model id (stringified — Anki keys models JSON by string id). */
  mid: string;
  /** Field values joined by ANKI_FIELD_SEP. */
  flds: string;
}

export interface MappedNote {
  kind: NoteKind;
  fields: Record<string, string>;
}

/**
 * Map Anki notes into Kondor notes. Anki models can have arbitrary fields, so
 * we take the first field as the primary content and the second as the answer/
 * extra. Cloze models become Kondor cloze notes; everything else becomes Basic.
 * Notes whose primary field is empty are skipped.
 */
export function mapAnkiNotes(models: Record<string, AnkiModel>, notes: AnkiNote[]): MappedNote[] {
  const out: MappedNote[] = [];

  for (const note of notes) {
    const model = models[note.mid];
    const values = note.flds.split(ANKI_FIELD_SEP);
    const first = (values[0] ?? '').trim();
    if (!first) continue;
    const second = values[1] ?? '';

    if (model?.type === 1) {
      out.push({ kind: 'cloze', fields: { Text: values[0], Extra: second } });
    } else {
      out.push({ kind: 'basic', fields: { Front: values[0], Back: second } });
    }
  }

  return out;
}
