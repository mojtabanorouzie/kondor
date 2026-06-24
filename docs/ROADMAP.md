# Kondor — Incremental Development Roadmap

The guiding principle: **every milestone produces a runnable, demonstrable app.** We never spend weeks in a non-working state. Each phase builds on the last and ends with something you could hand to a tester.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation & Tooling
*Goal: a clean, runnable skeleton with the engineering guardrails of a professional project.*

- [x] Scaffold Expo + TypeScript + Expo Router project
- [x] Define folder architecture (feature-first)
- [x] Git repository + `.gitignore` + conventional commits
- [x] `tsconfig` strict mode (ESLint + Prettier still TODO)
- [x] Jest wired up with passing tests (RN Testing Library added in a UI phase)
- [x] GitHub Actions CI: typecheck + lint + test on push/PR
- [x] Design tokens (colors, spacing, typography) in `src/constants/theme`
- [x] Path aliases (`@/*`) confirmed working

**Done when:** `npm run start` opens a themed home screen; CI is green.

---

## Phase 1 — Data Layer & Domain Model
*Goal: a typed, migrated local database — the backbone of everything.*

- [x] Install `expo-sqlite` + `drizzle-orm` + `drizzle-kit`
- [x] Schema: `decks`, `cards`, `notes`, `note_types`, `review_logs`
- [x] Migration tooling + initial migration (`db:generate`, `DatabaseProvider`)
- [x] Repository layer (`src/db/repositories`) with typed CRUD per entity
- [x] Seed script with sample decks/cards for development
- [x] Unit tests for repositories (7 passing, in-memory SQLite)

**Done when:** the app reads/writes real data from SQLite; tests cover CRUD. ✅
Home screen seeds a sample deck and shows live due/total counts from SQLite.

---

## Phase 2 — Core Spaced Repetition Engine
*Goal: correct scheduling — the heart of the app.*

- [x] Integrate `ts-fsrs` (v5); wrap it in `src/services/srs`
- [x] Map our `Card` model ↔ FSRS state (added `learning_steps` column, migration 0001)
- [x] `rateCard(card, grade)` → next schedule + review log entry (pure); `gradeCard` persists
- [x] "Cards due today" query per deck (`cardRepository.getDue`, from Phase 1)
- [x] Configurable params (`SrsConfig`: retention, max interval, fuzz)
- [x] Unit tests (6) — state transitions, interval ordering, lapses, persistence

**Done when:** grading a card advances its schedule correctly and is logged. ✅
Engine is wired and tested; the study-session UI that calls it is Phase 4.

---

## Phase 3 — Decks & Cards (CRUD UI)
*Goal: manage content end-to-end.*

- [x] Deck list screen (counts: new / learning / due)
- [x] Create / rename / delete deck
- [x] Card browser within a deck (list + search)
- [x] Add / edit / delete card (front/back Basic note type)
- [x] Empty states, loading states, error handling
- [x] Stack navigation (replaced demo tabs); reusable UI primitives
- [x] Tests for the deck/card data logic (counts, joins, card service)

**Done when:** a user can build a deck of cards from scratch in-app. ✅
Verified via tests + warm runtime queries. UI runtime is native (Android/iOS);
web preview is limited by an upstream expo-sqlite issue (see ARCHITECTURE.md).
Component-level (render) tests await a jest-expo project in a later phase.

---

## Phase 4 — Study Session
*Goal: the daily review loop that users live in.*

- [x] Study screen: show front → reveal back
- [x] Grade buttons (Again / Hard / Good / Easy) wired to FSRS, with next-interval previews
- [x] Session queue (new + due, respecting per-deck daily limits)
- [x] Progress indicator + end-of-session summary
- [x] Undo last answer (restores card + removes review log)
- [x] Keyboard shortcuts on web (space reveals, 1–4 grade, u/z undo)
- [ ] Smooth animations (Reanimated) + haptics — deferred to polish (Phase 8)
- [ ] Intra-session re-queue of lapsed (Again) cards — future enhancement

**Done when:** a full daily review can be completed with correct scheduling. ✅
Verified on web: reveal → grade with real FSRS interval previews (1m/6m/10m/7d).

---

## Phase 5 — Rich Content
*Goal: cards worth studying.*

- [x] Lightweight markdown on cards (bold, italic, code) — `CardContent`
- [x] Images on cards via `![alt](url)` (expo-image)
- [x] Cloze deletion note type (`{{c1::answer::hint}}`, one card per ordinal)
- [x] Multiple note types + card templating (`src/services/templating`)
- [ ] Audio (expo-av) — deferred (native module; revisit with media attachments)
- [ ] LaTeX/MathJax rendering — deferred (optional)

**Done when:** cards support text, images, and cloze. ✅ (audio/LaTeX deferred)
Schema migration 0002 adds `note_types.kind` and `cards.template_index`.

---

## Phase 6 — Statistics & Insights
*Goal: motivation through visible progress.*

- [x] Review history persisted and queryable (`getSinceWithDeck`)
- [x] Charts: reviews/day, retention, forecast of due cards, streaks
- [x] Per-deck and global stats (shared `StatsView`, optional `deckId`)
- [x] Heatmap calendar (SVG contribution grid)
- [x] Tests for the stats computations (streak, retention, end-to-end)

**Done when:** users can see meaningful learning analytics. ✅
Verified on web: tiles, card-state bar, reviews & forecast bar charts, heatmap.

---

## Phase 7 — Import / Export & Interop
*Goal: don't trap users' data; meet them where they are.*

- [x] Export/import Kondor's own JSON backup format (full collection, replace-on-import)
- [x] Import Anki `.apkg` (fflate unzip + sql.js read of the collection + note mapping)
- [x] Import CSV/TSV (quoted fields, delimiter auto-detect)
- [x] Cross-platform file I/O (web download/upload; native share + document picker)
- [x] Import/Export screen + tests (backup round-trip, CSV, Anki map, synthetic .apkg)

**Done when:** an existing AnkiDroid user can bring their decks in. ✅
Export verified on web; imports verified via tests. Notes:
- Anki import brings in notes/fields into a new deck; scheduling history is not
  imported (cards start New). Media import is a future enhancement.
- sql.js wasm loads from CDN on web (only during import); bundling for offline/
  native import is a follow-up.

---

## Phase 8 — Polish, i18n & Accessibility
*Goal: store-quality experience.*

- [x] Full i18n (English + Persian) with RTL layout support (i18next + expo-localization)
- [x] Light/dark themes with a persisted preference (System/Light/Dark)
- [x] Settings screen (Appearance, Language, Backup, Import) + persisted prefs (app_settings, migration 0003)
- [x] Empty-state guidance across screens (translated)
- [x] i18n parity test (fa keys match en; no empty strings)
- [ ] Accessibility audit (screen readers, focus order) — basic a11y roles in place; deep audit pending
- [ ] Onboarding flow — pending
- [ ] App icon, splash, store screenshots — release-prep
- [ ] Notifications/reminders (expo-notifications) — release-prep

**Done when:** the app feels finished and is usable in fa + en. ✅ (core)
Verified on web: live language switch to Persian flips layout to RTL; theme
switch to Dark applies instantly; both persist. Remaining items are release-prep.

---

## Phase 9 — Sync & Accounts (optional cloud)
*Goal: multi-device, local-first sync.*

- [x] Backend decision recorded — see [ADR-0002](adr/0002-sync-architecture.md)
- [x] Conflict-resolving sync of decks/cards/logs (LWW merge, pure & tested)
- [x] Offline-first reconciliation (snapshot merge; converges, idempotent)
- [x] Pluggable `SyncBackend` (memory for tests, localStorage for web, REST reference)
- [x] Sync UI in Settings; tests incl. two-device convergence
- [ ] Auth (email + OAuth) — seam in place (REST bearer token); needs a backend
- [ ] Deletion tombstones + delta protocol — follow-ups (see ADR)

**Done when:** the same account stays in sync across two devices. ✅ (engine)
Verified: two-device convergence test passes; "Sync now" round-trips on web.
Real multi-device needs deploying the REST backend (or Supabase) — see ADR.

---

## Phase 10 — Release & Operations
*Goal: ship and keep shipping.*

- [x] EAS Build + EAS Submit pipelines (`eas.json` submit config for iOS + Android)
- [x] Privacy policy screen (in-app `/privacy`, linked from Settings → About)
- [x] Error boundary wrapping entire app tree (friendly "Try again" + crash mailto)
- [x] OTA updates (`expo-updates`): "Check for updates" in Settings, `runtimeVersion`
      policy, `app.json` updates stanza + plugin
- [x] Version display in Settings footer (`expo-constants`)
- [x] Onboarding flow (3-slide first-run, persisted `hasSeenOnboarding`)
- [x] `app.json` release config: iOS `bundleIdentifier`, `buildNumber`,
      Android `versionCode`, iOS permission strings
- [x] i18n for all new screens (onboarding, privacy, version, update — en + fa)
- [ ] App Store + Google Play listings — needs developer accounts (external step)
- [ ] Beta channel (TestFlight / Play internal testing) — needs EAS account + build
- [ ] Post-launch feedback loop

**Done when:** Kondor is live in both stores with an update pipeline.
Code-side release infrastructure is complete. Remaining items require external
accounts (Apple/Google developer + EAS). Store submission steps:

1. `eas login` with your Expo account
2. `eas build --platform android --profile production` → AAB
3. `eas build --platform ios --profile production` → IPA
4. Fill in `eas.json` `submit.production.ios.ascAppId` + `appleTeamId`
5. `eas submit --platform android --profile production`
6. `eas submit --platform ios --profile production`
7. Add screenshots, description, and privacy policy URL in App Store Connect
   and Google Play Console, then submit for review

---

## Working Rhythm

1. Pick the next unchecked item in the current phase.
2. Branch (`feat/…`, `fix/…`), implement with tests, open a PR.
3. CI must be green; self-review against the checklist.
4. Merge, check the box here, update `CHANGELOG.md`.
5. Demo the app at the end of each phase before moving on.

**Definition of Done (every task):** typechecks · lints · tested · works on Android + Web · documented if user-facing.
