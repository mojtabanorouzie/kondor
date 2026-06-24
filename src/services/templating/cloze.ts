/**
 * Cloze deletion support, Anki-style.
 *
 * Syntax: `{{c1::answer}}` or `{{c1::answer::hint}}`. A note's `Text` may contain
 * several clozes; each distinct ordinal (c1, c2, …) generates its own card.
 */

const CLOZE_RE = /\{\{c(\d+)::([\s\S]*?)\}\}/g;

/** Sorted, de-duplicated list of cloze ordinals present in the text. */
export function clozeOrdinals(text: string): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(CLOZE_RE)) {
    found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

function splitContent(content: string): { answer: string; hint?: string } {
  const sep = content.indexOf('::');
  if (sep === -1) return { answer: content };
  return { answer: content.slice(0, sep), hint: content.slice(sep + 2) };
}

/**
 * Render the cloze text for a given active ordinal.
 * - front: the active cloze becomes `[...]` (or `[hint]`); other clozes show
 *   their answer.
 * - back: every cloze shows its answer, with the active one **highlighted**.
 */
export function renderCloze(text: string, activeOrdinal: number, side: 'front' | 'back'): string {
  return text.replace(CLOZE_RE, (_full, num: string, content: string) => {
    const ordinal = Number(num);
    const { answer, hint } = splitContent(content);
    if (ordinal === activeOrdinal) {
      if (side === 'front') return hint ? `[${hint}]` : '[...]';
      return `**${answer}**`;
    }
    return answer;
  });
}
