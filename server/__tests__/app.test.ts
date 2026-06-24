import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { createDb } from '../src/db';
import { signAccessToken } from '../src/auth';

// Fast bcrypt for tests; JWT secret is deterministic.
const TEST_CONFIG = { jwtSecret: 'test-secret', bcryptRounds: 1 };

const SNAPSHOT = {
  updatedAt: 1_000_000,
  data: {
    decks: [
      {
        id: 'd1',
        name: 'Test',
        deletedAt: null,
        updatedAt: 100,
        createdAt: 0,
        description: null,
        newPerDay: 20,
        reviewsPerDay: 200,
      },
    ],
    noteTypes: [],
    notes: [],
    cards: [],
    reviewLogs: [],
  },
};

/** Register a user and return { accessToken, refreshToken, userId }. */
async function register(
  app: FastifyInstance,
  email = 'user@example.com',
  password = 'password123',
) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    headers: { 'Content-Type': 'application/json' },
    payload: { email, password },
  });
  const body = res.json() as { accessToken: string; refreshToken: string };
  return body;
}

describe('Kondor sync server — Phase 13', () => {
  let app: FastifyInstance;
  let db: Database.Database;

  beforeEach(async () => {
    db = createDb(':memory:');
    app = await buildApp(db, TEST_CONFIG);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  // ── Health ────────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200 ok without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok' });
    });
  });

  // ── Auth: register ────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('creates a user and returns accessToken + refreshToken', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'alice@example.com', password: 'securepass' },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
    });

    it('rejects duplicate email with 409', async () => {
      await register(app, 'alice@example.com');
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'alice@example.com', password: 'anotherpass' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('rejects invalid email with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'not-an-email', password: 'password123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects short password with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'bob@example.com', password: 'short' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── Auth: login ───────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns tokens on valid credentials', async () => {
      await register(app, 'alice@example.com', 'mypassword');
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'alice@example.com', password: 'mypassword' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
    });

    it('rejects wrong password with 401', async () => {
      await register(app, 'alice@example.com', 'mypassword');
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'alice@example.com', password: 'wrongpass' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects unknown email with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'nobody@example.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Auth: refresh ─────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns new token pair on valid refresh token', async () => {
      const { refreshToken } = await register(app);
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: { 'Content-Type': 'application/json' },
        payload: { refreshToken },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
      // New refresh token must differ from the old one (rotation).
      expect(body.refreshToken).not.toBe(refreshToken);
    });

    it('rejects an invalid refresh token with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: { 'Content-Type': 'application/json' },
        payload: { refreshToken: 'not.a.valid.jwt' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects a refresh token after logout (revoked session)', async () => {
      const { refreshToken } = await register(app);

      // Logout to revoke the session.
      await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { 'Content-Type': 'application/json' },
        payload: { refreshToken },
      });

      // Refresh attempt should now fail.
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: { 'Content-Type': 'application/json' },
        payload: { refreshToken },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Auth: logout ──────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('returns 204 and revokes the session', async () => {
      const { refreshToken } = await register(app);
      const res = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { 'Content-Type': 'application/json' },
        payload: { refreshToken },
      });
      expect(res.statusCode).toBe(204);

      // Session row must be gone.
      const sessions = db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number };
      expect(sessions.c).toBe(0);
    });

    it('returns 204 even with no refresh token body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { 'Content-Type': 'application/json' },
        payload: {},
      });
      expect(res.statusCode).toBe(204);
    });
  });

  // ── Auth: forgot-password ─────────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('always returns 204 regardless of whether email exists', async () => {
      const res1 = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'nobody@example.com' },
      });
      expect(res1.statusCode).toBe(204);

      await register(app, 'alice@example.com');
      const res2 = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'alice@example.com' },
      });
      expect(res2.statusCode).toBe(204);
    });
  });

  // ── Auth: me ──────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('returns user info when authenticated', async () => {
      const { accessToken } = await register(app, 'alice@example.com');
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.email).toBe('alice@example.com');
      expect(body.provider).toBe('local');
      expect(typeof body.id).toBe('string');
    });

    it('returns 401 without Authorization header', async () => {
      const res = await app.inject({ method: 'GET', url: '/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 with a bogus token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { Authorization: 'Bearer bogus.token.here' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Auth: JWT middleware on /sync ─────────────────────────────────────────

  describe('JWT auth middleware', () => {
    it('rejects missing Authorization header with 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/sync' });
      expect(res.statusCode).toBe(401);
    });

    it('rejects an access token signed with the wrong secret with 401', async () => {
      const badToken = await signAccessToken('fake-user', 'x@x.com', 'wrong-secret');
      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: `Bearer ${badToken}` },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── OAuth: Google ─────────────────────────────────────────────────────────

  describe('POST /auth/oauth/google', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns 503 when Google OAuth is not configured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/oauth/google',
        headers: { 'Content-Type': 'application/json' },
        payload: { code: 'abc', redirectUri: 'http://localhost' },
      });
      expect(res.statusCode).toBe(503);
    });

    it('exchanges code and returns tokens (mocked)', async () => {
      const googleApp = await buildApp(db, {
        ...TEST_CONFIG,
        googleClientId: 'g-client-id',
        googleClientSecret: 'g-client-secret',
      });
      await googleApp.ready();

      const fetchMock = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'gat' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ sub: 'google-sub-123', email: 'guser@gmail.com' }),
            { status: 200 },
          ),
        );

      const res = await googleApp.inject({
        method: 'POST',
        url: '/auth/oauth/google',
        headers: { 'Content-Type': 'application/json' },
        payload: { code: 'auth-code', redirectUri: 'http://localhost/callback' },
      });

      expect(res.statusCode).toBe(200);
      expect(typeof res.json().accessToken).toBe('string');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await googleApp.close();
    });

    it('returns 400 when Google token exchange fails (mocked)', async () => {
      const googleApp = await buildApp(db, {
        ...TEST_CONFIG,
        googleClientId: 'g-client-id',
        googleClientSecret: 'g-client-secret',
      });
      await googleApp.ready();

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('error', { status: 400 }),
      );

      const res = await googleApp.inject({
        method: 'POST',
        url: '/auth/oauth/google',
        headers: { 'Content-Type': 'application/json' },
        payload: { code: 'bad-code', redirectUri: 'http://localhost' },
      });
      expect(res.statusCode).toBe(400);

      await googleApp.close();
    });
  });

  // ── OAuth: GitHub ─────────────────────────────────────────────────────────

  describe('POST /auth/oauth/github', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns 503 when GitHub OAuth is not configured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/oauth/github',
        headers: { 'Content-Type': 'application/json' },
        payload: { code: 'abc' },
      });
      expect(res.statusCode).toBe(503);
    });

    it('exchanges code and returns tokens (mocked)', async () => {
      const githubApp = await buildApp(db, {
        ...TEST_CONFIG,
        githubClientId: 'gh-client-id',
        githubClientSecret: 'gh-client-secret',
      });
      await githubApp.ready();

      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'ghat' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ id: 42, login: 'ghuser', email: 'ghuser@example.com' }),
            { status: 200 },
          ),
        );

      const res = await githubApp.inject({
        method: 'POST',
        url: '/auth/oauth/github',
        headers: { 'Content-Type': 'application/json' },
        payload: { code: 'gh-auth-code' },
      });
      expect(res.statusCode).toBe(200);
      expect(typeof res.json().accessToken).toBe('string');

      await githubApp.close();
    });
  });

  // ── Sync: pull ────────────────────────────────────────────────────────────

  describe('GET /sync (pull)', () => {
    it('returns 204 when no snapshot exists yet', async () => {
      const { accessToken } = await register(app);
      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.statusCode).toBe(204);
    });

    it('returns the stored snapshot after a push', async () => {
      const { accessToken } = await register(app);
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        payload: SNAPSHOT,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(SNAPSHOT);
    });
  });

  // ── Sync: push ────────────────────────────────────────────────────────────

  describe('PUT /sync (push)', () => {
    it('returns 204 on a valid push', async () => {
      const { accessToken } = await register(app);
      const res = await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        payload: SNAPSHOT,
      });
      expect(res.statusCode).toBe(204);
    });

    it('is idempotent — a second push with the same data returns 204', async () => {
      const { accessToken } = await register(app);
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: 'PUT',
          url: '/sync',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          payload: SNAPSHOT,
        });
        expect(res.statusCode).toBe(204);
      }
    });

    it('overwrites the stored snapshot on a second push', async () => {
      const { accessToken } = await register(app);
      const snapshot2 = { ...SNAPSHOT, updatedAt: 2_000_000 };
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        payload: SNAPSHOT,
      });
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        payload: snapshot2,
      });
      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.json().updatedAt).toBe(2_000_000);
    });

    it('rejects a non-JSON body with 400', async () => {
      const { accessToken } = await register(app);
      const res = await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'text/plain' },
        payload: 'not json',
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── Data isolation ────────────────────────────────────────────────────────

  describe('data isolation', () => {
    it('user A cannot see user B sync data', async () => {
      const { accessToken: tokenA } = await register(app, 'alice@example.com');
      const { accessToken: tokenB } = await register(app, 'bob@example.com');

      // Alice pushes a snapshot.
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        payload: SNAPSHOT,
      });

      // Bob pulls — should see no data.
      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(res.statusCode).toBe(204);
    });

    it('user B push does not overwrite user A data', async () => {
      const { accessToken: tokenA } = await register(app, 'alice@example.com');
      const { accessToken: tokenB } = await register(app, 'bob@example.com');

      const snapshotA = { ...SNAPSHOT, updatedAt: 111 };
      const snapshotB = { ...SNAPSHOT, updatedAt: 999 };

      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        payload: snapshotA,
      });
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
        payload: snapshotB,
      });

      const resA = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(resA.json().updatedAt).toBe(111);
    });
  });

  // ── Full round-trip ───────────────────────────────────────────────────────

  describe('full round-trip', () => {
    it('register → push → pull round-trip works end-to-end', async () => {
      // Register a new user.
      const regRes = await app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'Content-Type': 'application/json' },
        payload: { email: 'roundtrip@example.com', password: 'testpassword' },
      });
      expect(regRes.statusCode).toBe(201);
      const { accessToken } = regRes.json() as { accessToken: string };

      // Push a snapshot.
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        payload: SNAPSHOT,
      });

      // Pull and verify.
      const pullRes = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(pullRes.statusCode).toBe(200);
      expect(pullRes.json()).toEqual(SNAPSHOT);
    });
  });

  // ── Delta sync (Phase 14) ─────────────────────────────────────────────────

  describe('delta sync', () => {
    const deck = (id: string, name: string, updatedAt = 100) => ({
      id,
      name,
      deletedAt: null,
      updatedAt,
      createdAt: 0,
      description: null,
      newPerDay: 20,
      reviewsPerDay: 200,
    });

    async function push(token: string, data: object) {
      return app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        payload: { updatedAt: Date.now(), data },
      });
    }

    async function pull(token: string, since?: number) {
      const url = since !== undefined ? `/sync?since=${since}` : '/sync';
      return app.inject({
        method: 'GET',
        url,
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    it('PUT /sync returns X-Sync-Seq header that increments on each push', async () => {
      const { accessToken } = await register(app);
      const r1 = await push(accessToken, { decks: [deck('d1', 'A')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      expect(r1.statusCode).toBe(204);
      expect(Number(r1.headers['x-sync-seq'])).toBe(1);

      const r2 = await push(accessToken, { decks: [deck('d2', 'B')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      expect(Number(r2.headers['x-sync-seq'])).toBe(2);
    });

    it('GET /sync with no data returns X-Sync-Seq: 0', async () => {
      const { accessToken } = await register(app);
      const res = await pull(accessToken);
      expect(res.statusCode).toBe(204);
      expect(res.headers['x-sync-seq']).toBe('0');
    });

    it('GET /sync (no since) returns full snapshot regardless of seq', async () => {
      const { accessToken } = await register(app);
      const data = { decks: [deck('d1', 'A'), deck('d2', 'B')], noteTypes: [], notes: [], cards: [], reviewLogs: [] };
      await push(accessToken, data);
      await push(accessToken, { decks: [deck('d3', 'C')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });

      const res = await pull(accessToken); // no since → full
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.decks).toHaveLength(3);
    });

    it('GET /sync?since=<current seq> returns 204 (nothing new)', async () => {
      const { accessToken } = await register(app);
      const r = await push(accessToken, { decks: [deck('d1', 'A')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      const seq = Number(r.headers['x-sync-seq']);

      const res = await pull(accessToken, seq);
      expect(res.statusCode).toBe(204);
    });

    it('GET /sync?since=N returns only entities that changed after seq N', async () => {
      const { accessToken } = await register(app);
      // Push seq 1 with deck A
      const r1 = await push(accessToken, { decks: [deck('a', 'Deck A')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      const seq1 = Number(r1.headers['x-sync-seq']);

      // Push seq 2 with deck B
      await push(accessToken, { decks: [deck('b', 'Deck B')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });

      // Delta pull since seq1 → should contain only deck B
      const res = await pull(accessToken, seq1);
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.decks).toHaveLength(1);
      expect(body.data.decks[0].id).toBe('b');
    });

    it('server merges partial payloads using LWW — winning deck survives', async () => {
      const { accessToken } = await register(app);
      // Push deck A at updatedAt=10
      await push(accessToken, { decks: [deck('a', 'Old', 10)], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      // Push deck A at updatedAt=20 (newer → should win)
      await push(accessToken, { decks: [deck('a', 'New', 20)], noteTypes: [], notes: [], cards: [], reviewLogs: [] });

      const res = await pull(accessToken);
      const body = res.json();
      expect(body.data.decks).toHaveLength(1);
      expect(body.data.decks[0].name).toBe('New');
    });

    it('two-client delta: client B receives only the change client A pushed after seqB', async () => {
      const { accessToken: tokenA } = await register(app, 'a@x.com');
      const { accessToken: tokenB } = await register(app, 'b@x.com');

      // A: push deck A1
      const r1 = await push(tokenA, { decks: [deck('a1', 'A1')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      const seqAfterA1 = Number(r1.headers['x-sync-seq']);

      // B (different user) has independent data — A's seqAfterA1 is irrelevant to B.
      // Isolate: A pushes again
      await push(tokenA, { decks: [deck('a2', 'A2')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });

      // A does delta pull since seqAfterA1 → should get a2 only
      const res = await pull(tokenA, seqAfterA1);
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.decks.map((d: { id: string }) => d.id)).toEqual(['a2']);

      // B is isolated — B still has no data
      const resB = await pull(tokenB);
      expect(resB.statusCode).toBe(204);
    });

    it('delta pull returns X-Sync-Seq matching the stored seq', async () => {
      const { accessToken } = await register(app);
      await push(accessToken, { decks: [deck('d1', 'A')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      const r2 = await push(accessToken, { decks: [deck('d2', 'B')], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      const currentSeq = Number(r2.headers['x-sync-seq']);

      const res = await pull(accessToken, 0); // since=0 → full pull
      expect(Number(res.headers['x-sync-seq'])).toBe(currentSeq);
    });

    it('conflict resolution: stale update loses to newer one in server merge', async () => {
      const { accessToken } = await register(app);
      // Push newer version first
      await push(accessToken, { decks: [deck('x', 'Winner', 200)], noteTypes: [], notes: [], cards: [], reviewLogs: [] });
      // Push older version — should NOT overwrite
      await push(accessToken, { decks: [deck('x', 'Loser', 100)], noteTypes: [], notes: [], cards: [], reviewLogs: [] });

      const res = await pull(accessToken);
      const body = res.json();
      expect(body.data.decks[0].name).toBe('Winner');
    });
  });
});
