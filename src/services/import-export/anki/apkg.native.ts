import type { Database } from '@/db/client';

import type { ImportResult } from '../backup';

/**
 * Native stub for Anki `.apkg` import.
 *
 * The real implementation (`apkg.ts`) depends on `sql.js`, whose bundled
 * `sql-wasm.js` does `require('node:fs')`. That resolves fine on web and in
 * Node (Jest), but Metro cannot resolve `node:fs` for a React Native target,
 * which breaks the release bundle. Anki import is a web/desktop-only feature
 * here, so on native we ship this stub. Metro automatically prefers
 * `apkg.native.ts` over `apkg.ts` for the android/ios platforms.
 */
export async function importApkg(
  _db: Database,
  _bytes: Uint8Array,
  _deckName: string,
): Promise<ImportResult> {
  throw new Error('Importing Anki .apkg files is only supported on the web/desktop app.');
}
