import crypto from 'node:crypto';
import { createDb } from './db';
import { buildApp } from './app';

const PORT = Number(process.env.PORT ?? 3000);
const DB_PATH = process.env.DB_PATH ?? 'kondor-server.db';

async function main(): Promise<void> {
  const db = createDb(DB_PATH);

  // Resolve the access token: env var → stored → auto-generate.
  const envToken = process.env.KONDOR_TOKEN;
  const stored = db
    .prepare('SELECT token FROM users LIMIT 1')
    .get() as { token: string } | undefined;

  let token: string;

  if (stored) {
    // Use the stored token (or override it if KONDOR_TOKEN changed).
    if (envToken && envToken !== stored.token) {
      db.prepare('UPDATE users SET token = ?').run(envToken);
      token = envToken;
      console.log('Access token updated from KONDOR_TOKEN env var.');
    } else {
      token = stored.token;
    }
  } else {
    // First run: create a user with the env token or a fresh random token.
    token = envToken ?? crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO users (id, token, created_at) VALUES (?, ?, ?)').run(
      crypto.randomUUID(),
      token,
      Date.now(),
    );
    if (!envToken) {
      console.log('\n┌──────────────────────────────────────────────────────────┐');
      console.log('│  Kondor Sync Server — First Run                          │');
      console.log('│                                                          │');
      console.log(`│  Access token: ${token}  │`);
      console.log('│                                                          │');
      console.log('│  Copy this token into Settings → Sync in the Kondor app.│');
      console.log('│  It is stored in kondor-server.db and won\'t change.      │');
      console.log('└──────────────────────────────────────────────────────────┘\n');
    }
  }

  const app = await buildApp(db);
  await app.listen({ port: PORT, host: '0.0.0.0' });

  console.log(`Kondor sync server listening on http://0.0.0.0:${PORT}/sync`);
  console.log(`Token: ${token}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
