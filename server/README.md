# Kondor Sync Server

A self-hosted sync server for Kondor. Run it on your own machine; point all your devices at it to
sync decks, cards, and review history.

Fastify 5 + better-sqlite3. Multi-user, JWT auth, server-side merge, and an incremental (delta)
pull protocol. 42 tests in [`__tests__/app.test.ts`](__tests__/app.test.ts).

## Quick start

```bash
cd server
npm install
npm start
```

```
Kondor sync server listening on http://0.0.0.0:3000
Register an account via POST /auth/register to start syncing.
```

There is no auto-generated access token. Accounts are created by registering:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"at-least-8-chars"}'
# → 201 {"accessToken":"...","refreshToken":"..."}
```

In production, always set `JWT_SECRET` — it otherwise falls back to the development default
`dev-secret-change-in-prod` (`server/src/app.ts`). Copy `.env.example` to `.env` and fill it in.

## Configure the app

Open **Settings → Sync** in Kondor and enter the server's **base URL** — no path:

```
http://192.168.1.X:3000
```

The app appends `/auth/*` and `/sync` itself. A trailing `/sync` is tolerated and stripped for
backward compatibility with the Phase-12 layout (`normalizeUrl` in `src/store/auth.tsx`), but the
bare origin is the correct value. Sign in from the app's login screen, then tap **Sync now**.

## Environment variables

Read in [`src/index.ts`](src/index.ts); see [`.env.example`](.env.example).

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | TCP port to listen on |
| `DB_PATH` | `kondor-server.db` | Path to the SQLite database |
| `JWT_SECRET` | `dev-secret-change-in-prod` | HMAC key for access/refresh JWTs — **set this** |
| `GOOGLE_CLIENT_ID` | _(unset)_ | Enables `POST /auth/oauth/google`; 503 without it |
| `GOOGLE_CLIENT_SECRET` | _(unset)_ | " |
| `GITHUB_CLIENT_ID` | _(unset)_ | Enables `POST /auth/oauth/github`; 503 without it |
| `GITHUB_CLIENT_SECRET` | _(unset)_ | " |

## API

`/health` is public. Every other endpoint below the auth block requires
`Authorization: Bearer <accessToken>`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | `{ status: "ok" }` |
| `POST` | `/auth/register` | Creates a user (bcrypt); returns an access + refresh token pair |
| `POST` | `/auth/login` | Verifies the password hash; returns a token pair |
| `POST` | `/auth/oauth/google` | Exchanges an OAuth `code`; upserts the user; returns a token pair |
| `POST` | `/auth/oauth/github` | Same for GitHub, falling back to `/user/emails` for a private email |
| `POST` | `/auth/refresh` | Rotates the session: old refresh token is deleted, a new pair issued |
| `POST` | `/auth/logout` | Deletes the session row for the supplied refresh token |
| `POST` | `/auth/forgot-password` | **Stub.** Always 204 so callers cannot enumerate emails; sends nothing |
| `GET` | `/auth/me` | `{ id, email, provider }` for the bearer token |
| `GET` | `/sync` | Pull. `?since=<seq>` returns only entities changed after `seq`; omit for a full snapshot. 204 when nothing is new |
| `PUT` | `/sync` | Push a snapshot. Merged server-side; new sequence returned in `X-Sync-Seq` |

Access tokens live 15 minutes, refresh tokens 30 days. Refresh tokens are stored only as SHA-256
hashes (`sessions.token_hash`), so a database read does not yield usable tokens.

## How sync works

The server is **not** a dumb pipe — it merges. `PUT /sync` reconciles the incoming payload against
the stored snapshot with the same last-write-wins rules the client uses, bumps a per-user `seq`,
and records which entity ids changed at that `seq` in `snapshot_deltas`. A later
`GET /sync?since=N` replays only those ids, so a client that is one change behind downloads one
change rather than the whole collection.

`decks`, `notes`, and `cards` merge last-write-wins on `updatedAt` (ties broken by id, so the
result is deterministic and order-independent). `noteTypes` and `reviewLogs` are append-only and
merge by union. Deletions propagate as tombstones (`deletedAt`) rather than row removals, so a
delete survives a merge instead of being resurrected by a peer that never saw it.

Every user's snapshot is keyed by `user_id`; there are tests asserting that one account cannot read
or overwrite another's data.

### Schema

Created by [`src/db.ts`](src/db.ts) on first run:

```sql
users           (id PK, email UNIQUE, password_hash, provider, provider_id, created_at)
sessions        (id PK, user_id → users, token_hash, expires_at, created_at)
snapshots       (user_id PK → users, data, seq, updated_at)
snapshot_deltas (user_id, seq, entity_type, entity_id, PRIMARY KEY (user_id, seq, entity_type, entity_id))
```

`createDb` also migrates two older layouts in place: a Phase-12 `users.token` table is dropped and
rebuilt, and a pre-Phase-14 `snapshots` table gains its `seq` column via `ALTER TABLE`.

## Connecting from other devices

### Same LAN

Use the host machine's local IP (`ipconfig` on Windows, `ip addr` on Linux/macOS):

```
http://192.168.1.X:3000
```

### Remote (Tailscale — recommended)

[Tailscale](https://tailscale.com) gives you a stable hostname and TLS with no port-forwarding.
Install it on the server and on your phone, join both to the same tailnet, then use
`https://<hostname>.ts.net` as the server URL.

| Alternative | Notes |
|---|---|
| Cloudflare Tunnel | `cloudflared tunnel` — free, persistent HTTPS URL, no port-forward |
| ngrok | `ngrok http 3000` — easy to demo; free tier has session limits |
| Port-forward + DDNS | Fragile and ISP-dependent; not recommended |

> **Security.** The server listens on `0.0.0.0` and terminates no TLS of its own. Bearer tokens
> must not cross an untrusted network in plaintext — put it behind Tailscale or a TLS-terminating
> proxy before exposing it beyond your LAN.

## Tests

```bash
cd server
npm test          # 42 tests: auth, token rotation, OAuth, data isolation, delta sync
npm run typecheck
```

Both run in CI on every push and pull request — see
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
