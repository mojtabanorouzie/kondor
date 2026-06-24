# ADR-0002: Sync Architecture

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

Kondor is local-first: SQLite is the source of truth and the app works fully
offline. We want optional multi-device sync without compromising that. The app
runs on web + native, and the backend must be swappable (the project may use
Supabase, a custom server, or none).

## Decision

**A backend-agnostic, snapshot-based, last-write-wins (LWW) sync engine.**

- **Backend interface** (`SyncBackend`): `pull()` returns the remote snapshot;
  `push(snapshot)` stores it. The engine knows nothing about transport or auth.
- **Snapshot** = the same portable shape as a Kondor backup (decks, note types,
  notes, cards, review logs).
- **Merge** (`mergeSnapshots`, pure & tested): reconcile local and remote.
  - `decks`, `notes`, `cards`: **last-write-wins** by `updatedAt`.
  - `note_types`, `review_logs`: **union by id** (definitions are stable; review
    logs are append-only).
- **Engine** (`sync(db, backend)`): collect local → pull remote → merge → write
  the merged set locally → push it back. Both sides converge to the merge.
- **Convergence:** because the merge is a pure function of two snapshots and is
  commutative/idempotent per row (LWW by `updatedAt`, union by id), repeated
  syncs converge regardless of order.

To support LWW on cards we add `cards.updated_at` (migration 0004), bumped on
every card mutation.

### Backends shipped

- **`localStorageBackend`** — stores the snapshot in the browser (web). Lets the
  user try sync end-to-end with no server (single-device "cloud" stand-in).
- **`memoryBackend`** — in-memory; used by tests to simulate two devices.
- **`restSyncBackend(url, token?)`** — reference client: `GET {url}` → snapshot,
  `PUT {url}` ← snapshot, with an optional bearer token. Point it at any server
  (including a thin Supabase Edge Function) to get real multi-device sync.

## Consequences

- **Positive:** the hard part (offline reconciliation) is real, pure, and tested
  now; adding a real backend is just implementing two methods. No lock-in.
- **Trade-offs (v1):**
  - **Deletions are not yet propagated** (no tombstones) — a deleted deck can
    reappear from another device. Tombstones are the next step.
  - **Whole-snapshot** transfer each sync — fine for personal collections
    (thousands of cards); a delta/cursor protocol is a later optimization.
  - **No auth/identity yet** — the REST backend accepts a token seam; real
    email/OAuth needs the chosen backend and is release-time work.
- **Revisit when:** collections get large (move to deltas + tombstones) or we
  pick a concrete backend (add an ADR for auth + schema).
