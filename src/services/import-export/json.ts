import type { ParsedCard } from './csv';

export interface JsonImportOptions {
  /** Object key to read the Front from. Defaults to common casings of "front". */
  frontKey?: string;
  /** Object key to read the Back from. Defaults to common casings of "back". */
  backKey?: string;
}

/** Thrown when the input is not valid JSON or not a JSON array. */
export class JsonImportError extends Error {
  constructor(
    message: string,
    /** Stable reason code so the UI can localise the message. */
    readonly code: 'invalid-json' | 'not-array',
  ) {
    super(message);
    this.name = 'JsonImportError';
  }
}

const DEFAULT_FRONT_KEYS = ['front', 'Front', 'FRONT'];
const DEFAULT_BACK_KEYS = ['back', 'Back', 'BACK'];

function readField(
  obj: Record<string, unknown>,
  explicitKey: string | undefined,
  fallbacks: string[],
): string {
  const keys = explicitKey ? [explicitKey] : fallbacks;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }
  return '';
}

/**
 * Parse a JSON document into front/back pairs. Pure — the caller persists them.
 * Tolerates two shapes and returns the same {@link ParsedCard}[] as CSV import:
 *
 *   Shape A: [{ "front": "…", "back": "…" }, { "Front": "…", "Back": "…" }]
 *   Shape B: [["front", "back"], …]
 *
 * For object rows, `front`/`Front`/`FRONT` (and the `back` equivalents) are
 * recognised by default; pass `frontKey`/`backKey` to remap arbitrary keys
 * (e.g. `q`/`a` or `term`/`definition`). Rows missing either field after
 * trimming are skipped.
 *
 * Throws {@link JsonImportError} for malformed JSON or a non-array document.
 */
export function parseCardJson(text: string, options: JsonImportOptions = {}): ParsedCard[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new JsonImportError('The file is not valid JSON.', 'invalid-json');
  }
  if (!Array.isArray(data)) {
    throw new JsonImportError('Expected a JSON array of cards.', 'not-array');
  }

  const cards: ParsedCard[] = [];
  for (const item of data) {
    let front = '';
    let back = '';
    if (Array.isArray(item)) {
      front = typeof item[0] === 'string' ? item[0] : item[0] != null ? String(item[0]) : '';
      back = typeof item[1] === 'string' ? item[1] : item[1] != null ? String(item[1]) : '';
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      front = readField(obj, options.frontKey, DEFAULT_FRONT_KEYS);
      back = readField(obj, options.backKey, DEFAULT_BACK_KEYS);
    }
    front = front.trim();
    back = back.trim();
    if (front && back) cards.push({ front, back });
  }
  return cards;
}
