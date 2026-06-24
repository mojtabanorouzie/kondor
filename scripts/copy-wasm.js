#!/usr/bin/env node
/**
 * Copies sql-wasm.wasm from node_modules into public/ so that the Expo web
 * build (npx expo export --platform web) bundles it as a static asset and
 * Anki .apkg import works fully offline — no CDN required.
 *
 * Run automatically via the `export:web` npm script. Safe to run multiple
 * times; does nothing if the destination is already up-to-date.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const DEST = path.join(__dirname, '..', 'public', 'sql-wasm.wasm');

if (!fs.existsSync(SRC)) {
  console.error('[copy-wasm] sql.js not found — run npm install first.');
  process.exit(1);
}

fs.copyFileSync(SRC, DEST);
console.log('[copy-wasm] Copied sql-wasm.wasm →', path.relative(process.cwd(), DEST));
