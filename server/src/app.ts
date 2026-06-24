import Database from 'better-sqlite3';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

/** Validate the bearer token; return the user id or send 401 and return null. */
async function authenticate(
  db: Database.Database,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    await reply.status(401).send({ error: 'Missing or invalid Authorization header' });
    return null;
  }
  const token = auth.slice(7);
  const user = db.prepare('SELECT id FROM users WHERE token = ?').get(token) as
    | { id: string }
    | undefined;
  if (!user) {
    await reply.status(401).send({ error: 'Invalid token' });
    return null;
  }
  return user.id;
}

/**
 * Build the Fastify application. Accepts the DB instance so tests can inject
 * an in-memory database without starting a real server.
 */
export async function buildApp(db: Database.Database): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok' }));

  // ── Sync: pull ──────────────────────────────────────────────────────────────
  app.get('/sync', async (request, reply) => {
    const userId = await authenticate(db, request, reply);
    if (!userId) return;

    const row = db
      .prepare('SELECT data FROM snapshots WHERE user_id = ?')
      .get(userId) as { data: string } | undefined;

    if (!row) {
      return reply.status(204).send();
    }
    return reply.status(200).type('application/json').send(row.data);
  });

  // ── Sync: push ──────────────────────────────────────────────────────────────
  app.put('/sync', async (request, reply) => {
    const userId = await authenticate(db, request, reply);
    if (!userId) return;

    if (!request.body || typeof request.body !== 'object') {
      return reply.status(400).send({ error: 'Body must be a JSON object' });
    }

    db.prepare(
      `INSERT INTO snapshots (user_id, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    ).run(userId, JSON.stringify(request.body), Date.now());

    return reply.status(204).send();
  });

  return app;
}
