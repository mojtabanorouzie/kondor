import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  type AppConfig,
  type RefreshTokenPayload,
  hashPassword,
  hashToken,
  issueTokens,
  requireAuth,
  verifyJwt,
  verifyPassword,
} from './auth';

const DEFAULT_CONFIG: AppConfig = {
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod',
  bcryptRounds: 10,
};

/**
 * Build the Fastify application. Accepts the DB instance so tests can inject
 * an in-memory database without starting a real server.
 */
export async function buildApp(
  db: Database.Database,
  config: Partial<AppConfig> = {},
): Promise<FastifyInstance> {
  const cfg: AppConfig = { ...DEFAULT_CONFIG, ...config };

  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok' }));

  // ── Auth: register ──────────────────────────────────────────────────────────
  app.post('/auth/register', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.status(400).send({ error: 'Valid email is required' });
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password, cfg.bcryptRounds);
    db.prepare(
      'INSERT INTO users (id, email, password_hash, provider, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, email, passwordHash, 'local', Date.now());

    const tokens = await issueTokens(db, id, email, cfg.jwtSecret);
    return reply.status(201).send(tokens);
  });

  // ── Auth: login ─────────────────────────────────────────────────────────────
  app.post('/auth/login', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const user = db
      .prepare('SELECT id, email, password_hash FROM users WHERE email = ? AND provider = ?')
      .get(email, 'local') as { id: string; email: string; password_hash: string } | undefined;

    if (!user || !user.password_hash) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const tokens = await issueTokens(db, user.id, user.email, cfg.jwtSecret);
    return reply.status(200).send(tokens);
  });

  // ── Auth: OAuth — Google ────────────────────────────────────────────────────
  app.post('/auth/oauth/google', async (request, reply) => {
    if (!cfg.googleClientId || !cfg.googleClientSecret) {
      return reply.status(503).send({ error: 'Google OAuth not configured' });
    }
    const body = request.body as Record<string, unknown>;
    const code = typeof body?.code === 'string' ? body.code : '';
    const redirectUri = typeof body?.redirectUri === 'string' ? body.redirectUri : '';
    if (!code) return reply.status(400).send({ error: 'code is required' });

    // Exchange code for tokens.
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: cfg.googleClientId,
        client_secret: cfg.googleClientSecret,
      }),
    });
    if (!tokenRes.ok) {
      return reply.status(400).send({ error: 'Google token exchange failed' });
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };

    // Fetch user profile.
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) {
      return reply.status(400).send({ error: 'Failed to fetch Google profile' });
    }
    const profile = (await profileRes.json()) as { sub: string; email: string };

    const user = await upsertOAuthUser(db, 'google', profile.sub, profile.email);
    const tokens = await issueTokens(db, user.id, user.email, cfg.jwtSecret);
    return reply.status(200).send(tokens);
  });

  // ── Auth: OAuth — GitHub ────────────────────────────────────────────────────
  app.post('/auth/oauth/github', async (request, reply) => {
    if (!cfg.githubClientId || !cfg.githubClientSecret) {
      return reply.status(503).send({ error: 'GitHub OAuth not configured' });
    }
    const body = request.body as Record<string, unknown>;
    const code = typeof body?.code === 'string' ? body.code : '';
    if (!code) return reply.status(400).send({ error: 'code is required' });

    // Exchange code for access token.
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: cfg.githubClientId,
        client_secret: cfg.githubClientSecret,
        code,
      }),
    });
    if (!tokenRes.ok) {
      return reply.status(400).send({ error: 'GitHub token exchange failed' });
    }
    const tokenData = (await tokenRes.json()) as { access_token: string; error?: string };
    if (tokenData.error || !tokenData.access_token) {
      return reply.status(400).send({ error: 'GitHub token exchange failed' });
    }

    // Fetch user profile.
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });
    if (!profileRes.ok) {
      return reply.status(400).send({ error: 'Failed to fetch GitHub profile' });
    }
    const profile = (await profileRes.json()) as { id: number; login: string; email: string | null };

    let email = profile.email;
    if (!email) {
      // Fall back to primary verified email from /user/emails.
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[];
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email ?? `${profile.login}@users.noreply.github.com`;
      } else {
        email = `${profile.login}@users.noreply.github.com`;
      }
    }

    const user = await upsertOAuthUser(db, 'github', String(profile.id), email);
    const tokens = await issueTokens(db, user.id, user.email, cfg.jwtSecret);
    return reply.status(200).send(tokens);
  });

  // ── Auth: refresh ───────────────────────────────────────────────────────────
  app.post('/auth/refresh', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';
    if (!refreshToken) {
      return reply.status(400).send({ error: 'refreshToken is required' });
    }

    const payload = (await verifyJwt(refreshToken, cfg.jwtSecret)) as RefreshTokenPayload | null;
    if (!payload || payload.type !== 'refresh' || !payload.sub || !payload.jti) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    const session = db
      .prepare('SELECT id, user_id, token_hash, expires_at FROM sessions WHERE id = ?')
      .get(payload.jti) as
      | { id: string; user_id: string; token_hash: string; expires_at: number }
      | undefined;

    if (!session || session.user_id !== payload.sub) {
      return reply.status(401).send({ error: 'Session not found or revoked' });
    }
    if (session.expires_at < Date.now()) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
      return reply.status(401).send({ error: 'Refresh token expired' });
    }
    if (session.token_hash !== hashToken(refreshToken)) {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }

    const user = db
      .prepare('SELECT id, email FROM users WHERE id = ?')
      .get(payload.sub) as { id: string; email: string } | undefined;
    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }

    // Rotate: delete old session, issue new tokens.
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    const tokens = await issueTokens(db, user.id, user.email, cfg.jwtSecret);
    return reply.status(200).send(tokens);
  });

  // ── Auth: logout ────────────────────────────────────────────────────────────
  app.post('/auth/logout', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';
    if (refreshToken) {
      const payload = (await verifyJwt(refreshToken, cfg.jwtSecret)) as RefreshTokenPayload | null;
      if (payload?.jti) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(payload.jti);
      }
    }
    return reply.status(204).send();
  });

  // ── Auth: forgot-password (stub) ────────────────────────────────────────────
  app.post('/auth/forgot-password', async (_request, reply) => {
    // Always respond 204 to prevent email enumeration.
    return reply.status(204).send();
  });

  // ── Auth: me ────────────────────────────────────────────────────────────────
  app.get('/auth/me', async (request, reply) => {
    const userId = await requireAuth(cfg.jwtSecret, request, reply);
    if (!userId) return;

    const user = db
      .prepare('SELECT id, email, provider FROM users WHERE id = ?')
      .get(userId) as { id: string; email: string; provider: string } | undefined;

    if (!user) return reply.status(404).send({ error: 'User not found' });
    return reply.status(200).send(user);
  });

  // ── Sync: pull ──────────────────────────────────────────────────────────────
  app.get<{ Querystring: { since?: string } }>('/sync', async (request, reply) => {
    const userId = await requireAuth(cfg.jwtSecret, request, reply);
    if (!userId) return;

    const row = db
      .prepare('SELECT data, seq FROM snapshots WHERE user_id = ?')
      .get(userId) as { data: string; seq: number } | undefined;

    if (!row) {
      reply.header('X-Sync-Seq', '0');
      return reply.status(204).send();
    }

    reply.header('X-Sync-Seq', String(row.seq));

    const sinceParam = request.query.since;
    const since = sinceParam !== undefined ? Number(sinceParam) : undefined;

    // No `since` param → full snapshot (backward-compatible first sync).
    if (since === undefined || since === 0) {
      return reply.status(200).type('application/json').send(row.data);
    }

    // Client is up-to-date — nothing changed.
    if (since >= row.seq) {
      return reply.status(204).send();
    }

    // Build delta: entities whose IDs appear in snapshot_deltas with seq > since.
    const changedRows = db
      .prepare(
        'SELECT entity_type, entity_id FROM snapshot_deltas WHERE user_id = ? AND seq > ?',
      )
      .all(userId, since) as { entity_type: string; entity_id: string }[];

    const byType: Record<string, Set<string>> = {};
    for (const { entity_type, entity_id } of changedRows) {
      (byType[entity_type] ??= new Set()).add(entity_id);
    }

    const full = JSON.parse(row.data) as ServerSnapshot;
    const delta: ServerSnapshot = {
      updatedAt: full.updatedAt,
      data: {
        decks: filterById(full.data.decks, byType['decks']),
        noteTypes: filterById(full.data.noteTypes, byType['noteTypes']),
        notes: filterById(full.data.notes, byType['notes']),
        cards: filterById(full.data.cards, byType['cards']),
        reviewLogs: filterById(full.data.reviewLogs, byType['reviewLogs']),
      },
    };
    return reply.status(200).type('application/json').send(JSON.stringify(delta));
  });

  // ── Sync: push ──────────────────────────────────────────────────────────────
  app.put('/sync', async (request, reply) => {
    const userId = await requireAuth(cfg.jwtSecret, request, reply);
    if (!userId) return;

    if (!request.body || typeof request.body !== 'object') {
      return reply.status(400).send({ error: 'Body must be a JSON object' });
    }

    const incoming = request.body as ServerSnapshot;
    if (!incoming.data || typeof incoming.data !== 'object') {
      return reply.status(400).send({ error: 'Body must be a JSON object' });
    }

    const now = Date.now();
    const existing = db
      .prepare('SELECT data, seq FROM snapshots WHERE user_id = ?')
      .get(userId) as { data: string; seq: number } | undefined;

    const oldSnapshot: ServerSnapshot | null = existing
      ? (JSON.parse(existing.data) as ServerSnapshot)
      : null;
    const oldData: ServerSyncData = oldSnapshot?.data ?? {
      decks: [], noteTypes: [], notes: [], cards: [], reviewLogs: [],
    };
    const oldSeq = existing?.seq ?? 0;

    const newData = serverMerge(oldData, incoming.data);
    const newSeq = oldSeq + 1;
    // Preserve the logical collection timestamp rather than the server wall clock.
    const newUpdatedAt = Math.max(incoming.updatedAt ?? 0, oldSnapshot?.updatedAt ?? 0);
    const newSnapshot: ServerSnapshot = { updatedAt: newUpdatedAt, data: newData };

    const changes = computeChanges(oldData, newData);

    db.transaction(() => {
      db.prepare(
        `INSERT INTO snapshots (user_id, data, seq, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           data = excluded.data, seq = excluded.seq, updated_at = excluded.updated_at`,
      ).run(userId, JSON.stringify(newSnapshot), newSeq, now);

      const ins = db.prepare(
        'INSERT OR IGNORE INTO snapshot_deltas (user_id, seq, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      );
      for (const { type, id } of changes) {
        ins.run(userId, newSeq, type, id);
      }
    })();

    reply.header('X-Sync-Seq', String(newSeq));
    return reply.status(204).send();
  });

  return app;
}

// ── Sync helpers ─────────────────────────────────────────────────────────────

type AnyEntity = { id: string; updatedAt?: number; [key: string]: unknown };
interface ServerSyncData {
  decks: AnyEntity[];
  noteTypes: AnyEntity[];
  notes: AnyEntity[];
  cards: AnyEntity[];
  reviewLogs: AnyEntity[];
}
interface ServerSnapshot {
  updatedAt: number;
  data: ServerSyncData;
}

function filterById(arr: AnyEntity[], ids: Set<string> | undefined): AnyEntity[] {
  if (!ids) return [];
  return arr.filter((e) => ids.has(e.id));
}

function lwwMerge(existing: AnyEntity[], incoming: AnyEntity[]): AnyEntity[] {
  const map = new Map<string, AnyEntity>();
  for (const e of existing) map.set(e.id, e);
  for (const e of incoming) {
    const ex = map.get(e.id);
    if (!ex) { map.set(e.id, e); continue; }
    const eAt = e.updatedAt ?? 0;
    const exAt = ex.updatedAt ?? 0;
    if (eAt > exAt || (eAt === exAt && e.id >= ex.id)) map.set(e.id, e);
  }
  return [...map.values()];
}

function unionMerge(existing: AnyEntity[], incoming: AnyEntity[]): AnyEntity[] {
  const map = new Map<string, AnyEntity>();
  for (const e of incoming) map.set(e.id, e);
  for (const e of existing) map.set(e.id, e); // existing wins on conflict
  return [...map.values()];
}

function serverMerge(existing: ServerSyncData, incoming: Partial<ServerSyncData>): ServerSyncData {
  return {
    decks: lwwMerge(existing.decks, incoming.decks ?? []),
    noteTypes: unionMerge(existing.noteTypes, incoming.noteTypes ?? []),
    notes: lwwMerge(existing.notes, incoming.notes ?? []),
    cards: lwwMerge(existing.cards, incoming.cards ?? []),
    reviewLogs: unionMerge(existing.reviewLogs, incoming.reviewLogs ?? []),
  };
}

function computeChanges(
  oldData: ServerSyncData,
  newData: ServerSyncData,
): { type: string; id: string }[] {
  const result: { type: string; id: string }[] = [];
  const types = ['decks', 'noteTypes', 'notes', 'cards', 'reviewLogs'] as const;
  for (const type of types) {
    const oldMap = new Map(oldData[type].map((e) => [e.id, JSON.stringify(e)]));
    const newMap = new Map(newData[type].map((e) => [e.id, JSON.stringify(e)]));
    for (const [id, val] of newMap) {
      if (oldMap.get(id) !== val) result.push({ type, id });
    }
  }
  return result;
}

// ── OAuth / user helpers ──────────────────────────────────────────────────────

function upsertOAuthUser(
  db: Database.Database,
  provider: 'google' | 'github',
  providerId: string,
  email: string,
): { id: string; email: string } {
  const existing = db
    .prepare('SELECT id, email FROM users WHERE provider = ? AND provider_id = ?')
    .get(provider, providerId) as { id: string; email: string } | undefined;

  if (existing) {
    if (existing.email !== email) {
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, existing.id);
    }
    return { id: existing.id, email };
  }

  // Check if local account exists with same email — link it.
  const byEmail = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email) as { id: string } | undefined;

  if (byEmail) {
    db.prepare('UPDATE users SET provider = ?, provider_id = ? WHERE id = ?').run(
      provider,
      providerId,
      byEmail.id,
    );
    return { id: byEmail.id, email };
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, email, null, provider, providerId, Date.now());
  return { id, email };
}
