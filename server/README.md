# Kondor Sync Server

A self-hosted sync server for Kondor. Run it on your computer; point all your devices at it to sync
decks, cards, and review history.

## Quick start

```bash
cd server
npm install
npm start
```

On first run the server generates a random access token and prints it to the console:

```
┌──────────────────────────────────────────────────────────┐
│  Kondor Sync Server — First Run                          │
│                                                          │
│  Access token: a3f8b2…                                   │
│                                                          │
│  Copy this token into Settings → Sync in the Kondor app.│
└──────────────────────────────────────────────────────────┘
Kondor sync server listening on http://0.0.0.0:3000/sync
```

The token is stored in `kondor-server.db` and won't change on subsequent starts.

## Configure the app

Open **Settings → Sync** in Kondor:

| Field | Value |
|---|---|
| Server URL | `http://<server-ip>:3000/sync` |
| Access token | The token printed on first run |

Tap **Sync now**. Both devices converge on the merged collection.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | TCP port to listen on |
| `DB_PATH` | `kondor-server.db` | Path to the SQLite database |
| `KONDOR_TOKEN` | _(auto-generated)_ | Override the access token |

## Connecting from other devices

### Same LAN (home network)

Use your computer's local IP address:

```
http://192.168.1.X:3000/sync
```

Find your IP with `ipconfig` (Windows) or `ip addr` (Linux/Mac).

### Remote devices (Tailscale — recommended)

[Tailscale](https://tailscale.com) is a free zero-config VPN that provides a stable hostname and
TLS for your server without any port-forwarding.

1. Install Tailscale on the server computer (Windows/Mac/Linux).
2. Install the Tailscale app on your iPhone/Android.
3. Both devices join the same tailnet (same Tailscale account).
4. Find the server's Tailscale hostname in the Tailscale admin panel.
5. Use `https://<hostname>.ts.net/sync` as the server URL.

> **Security:** bearer tokens must not travel in plaintext outside your home network. Use Tailscale
> or another TLS-terminating proxy for any remote access.

### Other options

| Option | Notes |
|---|---|
| Cloudflare Tunnel | `cloudflared tunnel` — free, persistent HTTPS URL, zero port-forward |
| ngrok | `ngrok http 3000` — easy to demo; free tier has session limits |
| Port-forward + DDNS | Fragile, ISP-dependent; not recommended |

## Running tests

```bash
cd server
npm test
```

## Architecture

The server is a **dumb pipe**: it stores the last snapshot pushed by any client and returns it on
pull. The merge logic runs on the client (`mergeSnapshots` in `src/services/sync/merge.ts`).

Phase 14 will add delta sync (incremental payloads via `seq` cursors) and server-side merging.

### Schema

```sql
users     (id TEXT PK, token TEXT UNIQUE, created_at INTEGER)
snapshots (user_id TEXT PK → users, data TEXT, updated_at INTEGER)
```

The schema is multi-user from day one. Phase 13 adds `email` + `password_hash` to `users` and
JWT-based auth endpoints.

## API

All endpoints except `/health` require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status: "ok" }` |
| `GET` | `/sync` | Pull the stored snapshot (204 if none) |
| `PUT` | `/sync` | Push a new snapshot (replaces the stored one) |
