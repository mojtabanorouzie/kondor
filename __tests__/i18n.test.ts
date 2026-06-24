import { en } from '@/i18n/locales/en';
import { fa } from '@/i18n/locales/fa';

type Tree = { [k: string]: string | Tree };

function flattenKeys(obj: Tree, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.push(key);
    else out.push(...flattenKeys(v, key));
  }
  return out.sort();
}

describe('i18n locales', () => {
  it('Persian has exactly the same keys as English', () => {
    expect(flattenKeys(fa as Tree)).toEqual(flattenKeys(en as Tree));
  });

  it('has no empty translation strings', () => {
    const empties = (obj: Tree, prefix = ''): string[] => {
      const out: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'string') {
          if (v.trim().length === 0) out.push(key);
        } else out.push(...empties(v, key));
      }
      return out;
    };
    expect(empties(en as Tree)).toEqual([]);
    expect(empties(fa as Tree)).toEqual([]);
  });
});
