# Changelog

All notable changes to Kondor are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
- Initial project scaffold: Expo (SDK 56) + TypeScript + Expo Router.
- Feature-first source architecture (`src/features`, `src/db`, `src/services`, …).
- Project documentation: README, ROADMAP, ARCHITECTURE, ADR-0001 (tech stack).
- Shared domain types (`Deck`, `Note`, `Card`, `ReviewLog`).
- **Phase 1 — Data layer:** expo-sqlite + Drizzle ORM with a 5-table schema
  (decks, note_types, notes, cards, review_logs) and an initial migration.
- Typed repository layer with CRUD per entity, including `cards.getDue` and
  cascade deletes; a development seed (Persian starter deck).
- `DatabaseProvider` runs migrations at startup; home screen shows live
  due/total card counts read from SQLite.
- Jest test suite (7 tests) running real SQL against in-memory better-sqlite3.
- Metro/Babel config for Drizzle `.sql` inline imports and web WASM SQLite.
- Scripts: `test`, `typecheck`, `db:generate`.
- **Phase 2 — SRS engine:** integrated `ts-fsrs` v5 in `src/services/srs`.
  `rateCard` (pure) computes the next schedule + review log from a grade;
  `gradeCard` persists the result and writes a review log. `SrsConfig` exposes
  retention target, max interval, and fuzz.
- Added `cards.learning_steps` column for FSRS short-term scheduling (migration 0001).
- 6 engine tests: state transitions, Again≤Hard≤Good≤Easy interval ordering,
  lapse counting, purity, and end-to-end persistence.
- **Phase 3 — Decks & Cards UI:** Stack navigation with a deck list (new /
  learning / due counts), create / rename / delete deck, a per-deck card browser
  with search, and add / edit / delete card screens.
- Reusable UI primitives: `Button`, `TextField`, `EmptyState`, `Screen`, and a
  focus-aware `useAsyncData` hook so lists refresh after edits.
- Data layer: `deckRepository.getAllWithCounts` (aggregate counts) and
  `cardRepository.getByDeckWithNotes` (card↔note join); a `card-service` for
  Basic note/card create/update/delete. 7 new tests (20 total).
- Documented that Android/iOS are primary; web preview is limited by an upstream
  expo-sqlite sync-worker issue (see ARCHITECTURE.md).

### Fixed
- **Web now works.** Replaced Drizzle's sync `expo-sqlite` driver with the async
  `sqlite-proxy` driver routed through expo-sqlite's async API, sidestepping the
  WASM-worker sync-channel corruption. Added an async migrator (`src/db/migrate.ts`)
  over the bundled migration SQL. One driver now serves web + native; verified on
  web (deck list, card browser, Persian content, navigation all render correctly).
