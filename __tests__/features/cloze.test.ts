import { cardRepository, deckRepository } from '@/db/repositories';
import { createNote, updateNote } from '@/features/cards/card-service';
import {
  cardOrdinalsFor,
  clozeOrdinals,
  renderCard,
  renderCloze,
  toPreview,
} from '@/services/templating';
import type { Database } from '@/db/client';

import { createTestDb } from '../helpers/test-db';

describe('Phase 5 — cloze & templating', () => {
  describe('clozeOrdinals', () => {
    it('lists distinct ordinals in order', () => {
      const text = '{{c2::b}} and {{c1::a}} and {{c1::a2}}';
      expect(clozeOrdinals(text)).toEqual([1, 2]);
    });
  });

  describe('renderCloze', () => {
    const text = 'The capital of {{c1::France}} is {{c2::Paris}}.';

    it('blanks the active cloze and reveals others on the front', () => {
      expect(renderCloze(text, 1, 'front')).toBe(
        'The capital of [...] is Paris.',
      );
    });

    it('uses a hint when provided', () => {
      expect(renderCloze('A {{c1::cat::animal}} sat', 1, 'front')).toBe(
        'A [animal] sat',
      );
    });

    it('reveals and highlights the active cloze on the back', () => {
      expect(renderCloze(text, 2, 'back')).toBe(
        'The capital of France is **Paris**.',
      );
    });
  });

  describe('cardOrdinalsFor', () => {
    it('returns [0] for basic and one per cloze for cloze', () => {
      expect(cardOrdinalsFor('basic', { Front: 'a', Back: 'b' })).toEqual([0]);
      expect(
        cardOrdinalsFor('cloze', { Text: '{{c1::a}} {{c3::b}}' }),
      ).toEqual([1, 3]);
      expect(cardOrdinalsFor('cloze', { Text: 'no clozes' })).toEqual([1]);
    });
  });

  describe('renderCard', () => {
    it('appends Extra to the cloze back', () => {
      const r = renderCard('cloze', { Text: '{{c1::x}}', Extra: 'note' }, 1);
      expect(r.front).toBe('[...]');
      expect(r.back).toBe('**x**\n\nnote');
    });
  });

  describe('toPreview', () => {
    it('strips markdown and marks images', () => {
      expect(toPreview('**bold** and `code`')).toBe('bold and code');
      expect(toPreview('![alt](http://x/y.png)')).toBe('🖼');
    });
  });

  describe('createNote (cloze generates multiple cards)', () => {
    let db: Database;
    beforeEach(() => {
      db = createTestDb();
    });

    it('creates one card per cloze ordinal', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createNote(db, {
        deckId: deck.id,
        kind: 'cloze',
        fields: { Text: '{{c1::a}} and {{c2::b}}', Extra: '' },
      });

      const cards = await cardRepository.getByDeck(db, deck.id);
      expect(cards).toHaveLength(2);
      expect(cards.map((c) => c.templateIndex).sort()).toEqual([1, 2]);
    });

    it('re-syncs cards when clozes are added or removed', async () => {
      const deck = await deckRepository.create(db, { name: 'D' });
      await createNote(db, {
        deckId: deck.id,
        kind: 'cloze',
        fields: { Text: '{{c1::a}}', Extra: '' },
      });
      const [card] = await cardRepository.getByDeck(db, deck.id);

      await updateNote(db, card.noteId, 'cloze', {
        Text: '{{c1::a}} {{c2::b}} {{c3::c}}',
        Extra: '',
      });

      const cards = await cardRepository.getByDeck(db, deck.id);
      expect(cards.map((c) => c.templateIndex).sort()).toEqual([1, 2, 3]);
    });
  });
});
