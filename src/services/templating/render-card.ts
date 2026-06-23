import type { NoteKind } from '@/types';

import { clozeOrdinals, renderCloze } from './cloze';

export interface RenderedCard {
  /** Markdown shown before the answer is revealed. */
  front: string;
  /** Markdown shown after reveal. */
  back: string;
}

/**
 * Produce the front/back content for one card, given its note's kind, the note
 * fields, and the card's template ordinal (the cloze number, or 0 for Basic).
 */
export function renderCard(
  kind: NoteKind,
  fields: Record<string, string>,
  templateIndex: number,
): RenderedCard {
  if (kind === 'cloze') {
    const text = fields.Text ?? '';
    const extra = (fields.Extra ?? '').trim();
    const back = renderCloze(text, templateIndex, 'back');
    return {
      front: renderCloze(text, templateIndex, 'front'),
      back: extra ? `${back}\n\n${extra}` : back,
    };
  }

  return { front: fields.Front ?? '', back: fields.Back ?? '' };
}

/**
 * Which template ordinals a note produces cards for. Basic always yields one
 * card (ordinal 0); Cloze yields one per distinct cloze number (at least one).
 */
export function cardOrdinalsFor(
  kind: NoteKind,
  fields: Record<string, string>,
): number[] {
  if (kind === 'cloze') {
    const ordinals = clozeOrdinals(fields.Text ?? '');
    return ordinals.length > 0 ? ordinals : [1];
  }
  return [0];
}

/** Strip the lightweight markdown we render, for plain-text previews. */
export function toPreview(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '🖼') // images
    .replace(/[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
