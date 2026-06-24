import { createDb } from './db';
import { buildApp } from './app';

const PORT = Number(process.env.PORT ?? 3000);
const DB_PATH = process.env.DB_PATH ?? 'kondor-server.db';

async function main(): Promise<void> {
  const db = createDb(DB_PATH);
  const app = await buildApp(db, {
    jwtSecret: process.env.JWT_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  });

  await app.listen({ port: PORT, host: '0.0.0.0' });

  console.log(`\nKondor sync server listening on http://0.0.0.0:${PORT}`);
  console.log('Register an account via POST /auth/register to start syncing.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
