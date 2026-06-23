# Kondor — Architecture

## Principles

1. **Local-first.** The app is fully functional offline; SQLite is the source of truth. Cloud sync (Phase 9) is an enhancement layered on top, never a dependency.
2. **Feature-first organization.** Code is grouped by domain feature (`decks`, `study`, …), not by technical type, so a feature's logic, UI, and tests live together and stay cohesive.
3. **Pure domain, thin UI.** Scheduling and data rules live in `services/` and `db/` as pure, testable TypeScript. Screens orchestrate; they don't own business logic.
4. **Typed end-to-end.** Drizzle gives typed DB rows; shared domain types in `src/types` flow through stores, services, and components.

## Layers

```
┌─────────────────────────────────────────────┐
│  app/ (Expo Router screens)                 │  presentation / routing
├─────────────────────────────────────────────┤
│  features/* + components/   + store/ (Zustand)│  UI + view state
├─────────────────────────────────────────────┤
│  services/srs (FSRS), services/import-export │  domain logic (pure)
├─────────────────────────────────────────────┤
│  db/ (Drizzle repositories + schema)         │  data access
├─────────────────────────────────────────────┤
│  expo-sqlite                                 │  storage
└─────────────────────────────────────────────┘
```

Dependencies point **downward only**. A screen may call a store or service; a service may call the db layer; the db layer never imports UI.

## Data Model (initial)

- **deck** — a named collection of cards, with study options.
- **note** — the source content (e.g. a word + its definition), of a given **note_type**.
- **card** — a study unit generated from a note via a template; holds FSRS scheduling state (`due`, `stability`, `difficulty`, `reps`, `lapses`, `state`).
- **review_log** — one row per grading event, for scheduling history and statistics.

Separating *notes* from *cards* mirrors Anki and enables one note → many cards (e.g. front→back and back→front) and cloze.

## Scheduling

We use **FSRS** (Free Spaced Repetition Scheduler) via `ts-fsrs`, the same modern algorithm Anki adopted. The `services/srs` module is the only place that knows FSRS internals; the rest of the app speaks in `Card` + `grade`.

## State Management

**Zustand** stores hold transient view state (current study queue, session progress, UI prefs). Persistent data is **not** mirrored into global state — it's read from the DB via repositories/queries so SQLite stays the single source of truth.

## Platform support

Kondor runs on **Android, iOS, and the web** from one codebase.

### Database driver

We do **not** use Drizzle's `expo-sqlite` driver, because it talks to SQLite
through expo-sqlite's *synchronous* API. On web that API is backed by a WASM
worker over a SharedArrayBuffer channel which, under the app's startup query
burst, corrupts its own JSON protocol messages (`SyntaxError: Unterminated
string in JSON`).

Instead, `src/db/client.ts` uses Drizzle's **`sqlite-proxy`** (async) driver
with a small executor that runs every query through expo-sqlite's **async** API
(`prepareAsync` + `executeForRawResultAsync`). The async path is reliable on web
and native alike, so a single driver covers all platforms. Migrations run the
same way via `src/db/migrate.ts` (a tiny async migrator over the babel-inlined
migration SQL), since Drizzle's bundled migrators are either sync (expo) or
filesystem-based (proxy) and unsuitable for a RN bundle.

## Decisions

Significant choices are recorded as ADRs in [`docs/adr/`](adr/). Start with
[ADR-0001: Core technology stack](adr/0001-core-tech-stack.md).
