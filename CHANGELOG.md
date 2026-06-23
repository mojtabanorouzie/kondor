# Changelog

All notable changes to Kondor are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
- **Phase 7 — Import / Export & interop:** export a full Kondor JSON backup and
  restore it; import cards from CSV/TSV (quoted fields, delimiter auto-detect);
  and import Anki `.apkg` files (fflate unzip + sql.js read of the collection +
  note mapping into a new deck). Cross-platform file I/O (web download/upload,
  native share + document picker) and an Import & Export screen. 8 new tests
  (49 total), including a full synthetic `.apkg` round-trip.
- **Phase 6 — Statistics & insights:** a global and per-deck stats screen with
  summary tiles (cards, reviews today, streak, retention), a card-state bar,
  reviews-per-day and due-forecast bar charts, and a calendar heatmap — built on
  `react-native-svg` (works on web + native). Pure, tested aggregations in
  `stats-service` (`computeStreak`, `computeRetention`, `computeForecast`, …) plus
  `getSinceWithDeck` review-history query. 8 new tests (41 total).
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

- **Phase 4 — Study session:** a daily review screen that shows the front,
  reveals the back, and grades with Again/Hard/Good/Easy — each button previewing
  the next interval (e.g. 1m/6m/10m/7d) computed live from FSRS. Builds the due
  queue (new + review, respecting per-deck daily limits), shows progress and an
  end-of-session summary, supports undo (restores the card and deletes its review
  log), and adds web keyboard shortcuts (space / 1–4 / u). Reachable via a Study
  button on each deck. 5 new tests (24 total).

- **Phase 5 — Rich content:** cloze deletions and multiple note types.
  - New **Cloze** note type: `{{c1::answer::hint}}` syntax generates one card per
    ordinal; study blanks the active cloze and reveals the rest.
  - A card-templating layer (`src/services/templating`) renders front/back per
    note kind and card ordinal.
  - `CardContent` renders lightweight markdown (bold/italic/code) and images
    (`![alt](url)` via expo-image), used in study and the browser.
  - Add-card screen has a Basic/Cloze toggle; editing re-syncs cloze cards.
  - Schema migration 0002: `note_types.kind`, `cards.template_index`.
  - 9 new tests (33 total). Audio and LaTeX deferred.

### Fixed
- **Web now works.** Replaced Drizzle's sync `expo-sqlite` driver with the async
  `sqlite-proxy` driver routed through expo-sqlite's async API, sidestepping the
  WASM-worker sync-channel corruption. Added an async migrator (`src/db/migrate.ts`)
  over the bundled migration SQL. One driver now serves web + native; verified on
  web (deck list, card browser, Persian content, navigation all render correctly).
