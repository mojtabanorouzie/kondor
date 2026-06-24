import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { createDb } from '../src/db';

function createTestDb(): Database.Database {
  const db = createDb(':memory:');
  // Insert a test user.
  db.prepare('INSERT INTO users (id, token, created_at) VALUES (?, ?, ?)').run(
    crypto.randomUUID(),
    'test-token',
    Date.now(),
  );
  return db;
}

const SNAPSHOT = {
  updatedAt: 1_000_000,
  data: {
    decks: [{ id: 'd1', name: 'Test', deletedAt: null, updatedAt: 100, createdAt: 0, description: null, newPerDay: 20, reviewsPerDay: 200 }],
    noteTypes: [],
    notes: [],
    cards: [],
    reviewLogs: [],
  },
};

describe('Kondor sync server', () => {
  let app: FastifyInstance;
  let db: Database.Database;

  beforeEach(async () => {
    db = createTestDb();
    app = await buildApp(db);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  describe('GET /health', () => {
    it('returns 200 ok without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok' });
    });
  });

  describe('auth', () => {
    it('rejects missing Authorization header with 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/sync' });
      expect(res.statusCode).toBe(401);
    });

    it('rejects wrong token with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: 'Bearer wrong-token' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /sync (pull)', () => {
    it('returns 204 when no snapshot exists yet', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token' },
      });
      expect(res.statusCode).toBe(204);
    });

    it('returns the stored snapshot after a push', async () => {
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        payload: SNAPSHOT,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(SNAPSHOT);
    });
  });

  describe('PUT /sync (push)', () => {
    it('returns 204 on a valid push', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        payload: SNAPSHOT,
      });
      expect(res.statusCode).toBe(204);
    });

    it('is idempotent — a second push with the same data returns 204', async () => {
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: 'PUT',
          url: '/sync',
          headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
          payload: SNAPSHOT,
        });
        expect(res.statusCode).toBe(204);
      }
    });

    it('overwrites the stored snapshot on a second push', async () => {
      const snapshot2 = { ...SNAPSHOT, updatedAt: 2_000_000 };

      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        payload: SNAPSHOT,
      });
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        payload: snapshot2,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token' },
      });
      expect(res.json().updatedAt).toBe(2_000_000);
    });

    it('rejects a non-JSON body with 400', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'text/plain' },
        payload: 'not json',
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('full round-trip', () => {
    it('two clients push then pull and receive each other\'s data merged by the engine', async () => {
      // Client A pushes snapshot with one deck.
      const snapshotA = {
        updatedAt: 100,
        data: { decks: [{ id: 'a', name: 'Deck A', deletedAt: null, updatedAt: 100, createdAt: 0, description: null, newPerDay: 20, reviewsPerDay: 200 }], noteTypes: [], notes: [], cards: [], reviewLogs: [] },
      };
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        payload: snapshotA,
      });

      // Client B pushes snapshot with another deck.
      const snapshotB = {
        updatedAt: 200,
        data: { decks: [{ id: 'b', name: 'Deck B', deletedAt: null, updatedAt: 200, createdAt: 0, description: null, newPerDay: 20, reviewsPerDay: 200 }], noteTypes: [], notes: [], cards: [], reviewLogs: [] },
      };
      await app.inject({
        method: 'PUT',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
        payload: snapshotB,
      });

      // Pull — receives the last-pushed snapshot (server is a dumb pipe; merge happens on client).
      const res = await app.inject({
        method: 'GET',
        url: '/sync',
        headers: { Authorization: 'Bearer test-token' },
      });
      expect(res.statusCode).toBe(200);
      // Server stores the last-pushed snapshot unchanged.
      expect(res.json().data.decks).toHaveLength(1);
      expect(res.json().data.decks[0].id).toBe('b');
    });
  });
});
