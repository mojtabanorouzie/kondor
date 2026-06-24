# ADR-0003: Universal Offline-First + Self-Hosted Sync

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

Phases 0–10 deliver a fully-functional offline-first spaced-repetition app on iOS, Android, and
Web, with a pure LWW sync engine and a pluggable `SyncBackend` seam. Two gaps remain before the
definition of done:

1. **True universal offline** — confirmed durable local storage on every target platform (Android,
   iOS, Web/PWA, Windows desktop), with platform branching isolated to `src/db/client.ts`.
2. **Self-hosted sync** — a server I run on my own computer so all my devices sync, with deletion
   propagation, incremental protocol, and auth.

## Decisions

### 1. Per-platform on-device storage

| Platform | Storage driver | Notes |
|---|---|---|
| Android / iOS | expo-sqlite async API (existing) | Already working via the sqlite-proxy path in `src/db/client.ts`. |
| Web / PWA | expo-sqlite async API (same code path) | Under Expo SDK 56, expo-sqlite's web implementation uses a WASM worker backed by OPFS for durable persistence — the same `openDatabaseAsync` call works on all platforms. |
| Windows | PWA (install from Chrome or Edge) | The web platform path already covers Windows with zero additional code. Users install via the browser's "Install app" prompt. |

All platform differences remain inside `src/db/client.ts`. Repositories, services, and UI are
untouched.

**Rejected:** wa-sqlite + manual OPFS binding — added complexity; expo-sqlite's async path already
solves persistence.

**Rejected:** Electron for Windows — ~100 MB runtime, separate main/renderer build pipeline, and
`better-sqlite3` native module compilation; PWA is installable with zero added code.

**Deferred to Phase 15:** Bundle sql.js locally for offline Anki import. sql.js is already in
`package.json`; it currently loads the WASM from CDN. Switching to a local bundle is a config
change with no domain impact.

### 2. Sync protocol: tombstones (Phase 11)

**Problem:** the Phase 9 LWW merge has no concept of deletion. A deck deleted on device A
reappears on device B at the next sync because the row simply vanishes from A's snapshot.

**Solution:** soft-delete with tombstones.

- Migration 0005 adds `deleted_at INTEGER` (nullable) to `decks`, `notes`, and `cards`.
- Repositories soft-delete: `deleteById` sets `deleted_at = updatedAt = now()`; all read queries
  add `WHERE deleted_at IS NULL`.
- `mergeSnapshots` is **unchanged** — the existing LWW logic already handles tombstones correctly:
  a deleted row has a later `updatedAt` than the live row on the other device, so the tombstone
  wins. "Resurrection by later edit" (re-editing after someone else deleted) is also correct: the
  higher `updatedAt` wins.
- `exportBackup` (used by the sync engine) selects all rows including tombstones so they propagate.
  User-facing import result counts exclude tombstoned rows.
- Cascade: deleting a deck soft-deletes its notes and cards (manual cascade in the repo, since
  the SQLite `ON DELETE CASCADE` only fires on hard deletes).

**Rejected:** hard-delete with a separate tombstone table — more complex; inline `deleted_at` is
simpler and keeps the existing schema shape.

**Rejected:** CRDTs — significantly more complex; LWW + tombstones is provably correct for this
personal use case.

### 3. Sync protocol: delta / incremental (Phase 14)

The Phase 9 engine transfers the full collection on each sync. For personal collections (thousands
of cards) this is fast enough, but it scales poorly.

Phase 14 adds a monotonic `seq` integer per user-slot on the server. The client stores
`lastSyncSeq` in `appSettings`; subsequent syncs send `GET /sync?since=<seq>` (delta pull) and
push only changed rows. The server merges the delta with the stored snapshot and returns the new
`seq`. Full-snapshot sync remains available as a fallback.

### 4. Server stack

**Fastify 5 + better-sqlite3**

- `better-sqlite3` is already a dev dependency in the root project (used in tests); it is promoted
  to a production dependency in the `server/` sub-package.
- Synchronous SQLite is appropriate for a single-user personal server (no write contention, no
  connection pool needed, simpler code).
- Fastify 5 is TypeScript-first, has a built-in `.inject()` method for zero-dependency HTTP
  testing (no supertest needed), and a lean JSON-schema validation story.
- The server lives in `server/` as a standalone Node.js package with its own `package.json` and
  `tsconfig.json`. It does not contaminate the Expo app's dependency tree.

**Rejected:** Express — less TypeScript-native, heavier default middleware surface.

**Rejected:** Supabase — requires internet, trust in a third party, no self-hosted in free tier.

**Rejected:** Hono — excellent but less ecosystem maturity than Fastify for Node.js deployments.

### 5. Authentication

**MVP (Phase 12): single-user static bearer token**

- The server generates a random 32-byte hex token on first startup and prints it to the console.
- The token is stored in the server's `users` table (schema is multi-user from day one).
- Every API request requires `Authorization: Bearer <token>`; 401 otherwise.
- The Kondor app stores `sync.serverUrl` and `sync.token` in `appSettings`; the sync settings
  section in the UI exposes two text fields for these values.
- `restSyncBackend(url, token)` is already the REST client — no changes to the sync engine.

**Phase 13: JWT-based multi-user accounts**

- `POST /auth/register` and `POST /auth/login` → short-lived JWT (1 h) + refresh token.
- `users` table gains `email TEXT UNIQUE` and `password_hash TEXT`; `snapshots` already has
  `user_id` FK so per-user isolation is in place from Phase 12.
- Client gains login/register form in the sync settings section.

**Rejected (for MVP):** full OAuth — scope creep; a personal self-hosted server doesn't need a
third-party identity provider.

**Rejected:** no auth — even on a Tailscale network, the server should validate the device.

### 6. Remote reachability

**Default: Tailscale**

- Free for ≤ 3 users / 100 devices.
- Zero port-forwarding required; works across NAT, mobile data, firewalls.
- Provides stable hostnames and TLS via MagicDNS HTTPS (`https://<hostname>.ts.net`).
- Install on Windows (server) and iOS/Android (client); point the app at the Tailscale hostname.

**Also documented:**

| Option | Notes |
|---|---|
| LAN (`http://SERVER_IP:3000/sync`) | Simplest; acceptable without TLS on a trusted network. |
| Cloudflare Tunnel | Zero-config persistent HTTPS URL; free tier; slightly more setup. |
| ngrok | Fastest to demo; free tier has session limits; good for testing. |
| Port-forward + DDNS | Fragile, ISP-dependent; not recommended. |

**Security constraint:** bearer tokens and JWTs MUST NOT transit in plaintext over an untrusted
network. Use Tailscale, Cloudflare Tunnel, or any TLS-terminating proxy for any remote access.

## Phases

| Phase | Increment | Key deliverable |
|---|---|---|
| 11 | Tombstones | Deletions propagate across devices via soft-delete + LWW |
| 12 | Self-hosted server MVP | Fastify server; single-user static token; full-snapshot sync |
| 13 | Auth accounts (multi-user) | JWT auth; register/login in app; per-user data isolation |
| 14 | Delta / incremental sync | `seq`-based cursors; partial payloads; server-side merge |
| 15 | Platform polish | Bundled sql.js; Windows PWA guide; Tailscale setup guide |

## Consequences

- **Domain code stays pure:** `src/db/client.ts` is the only file that knows about platform
  storage; repos, services, and UI are untouched across all phases.
- **Existing tests stay green:** migration 0005 adds nullable columns with no default; existing
  rows get `deleted_at = NULL` automatically.
- **Backward-compatible backups:** older backups (without `deletedAt`) are still importable;
  missing fields default to `null` on insert.
- **Gradual migration:** each phase is an independently shippable increment; the server and client
  degrade gracefully if the other side is on an older version.
