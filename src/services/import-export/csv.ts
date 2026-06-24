/**
 * Minimal RFC-4180-ish delimited parser: handles quoted fields, escaped quotes
 * (""), and newlines inside quotes. Works for both CSV (",") and TSV ("\t").
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushField();
    } else if (c === '\n') {
      pushRow();
    } else if (c === '\r') {
      // ignore; \n handles the row break
    } else {
      field += c;
    }
  }
  // trailing field/row (unless the input ended on a clean newline)
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

/** Guess the delimiter from the first line (tab vs comma). */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs > commas ? '\t' : ',';
}

export interface CsvImportOptions {
  delimiter?: string;
  hasHeader?: boolean;
  frontColumn?: number;
  backColumn?: number;
}

export interface ParsedCard {
  front: string;
  back: string;
}

/**
 * Turn delimited text into front/back pairs. Pure — the caller persists them.
 * Rows without both columns filled are skipped.
 */
export function parseCardRows(text: string, options: CsvImportOptions = {}): ParsedCard[] {
  const delimiter = options.delimiter ?? detectDelimiter(text);
  const front = options.frontColumn ?? 0;
  const back = options.backColumn ?? 1;

  const rows = parseDelimited(text, delimiter);
  const body = options.hasHeader ? rows.slice(1) : rows;

  const cards: ParsedCard[] = [];
  for (const r of body) {
    const f = (r[front] ?? '').trim();
    const b = (r[back] ?? '').trim();
    if (f && b) cards.push({ front: f, back: b });
  }
  return cards;
}
