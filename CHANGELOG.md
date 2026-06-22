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
