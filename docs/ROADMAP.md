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

- [ ] Rich text / basic HTML or Markdown rendering on cards
- [ ] Images (expo-image) and audio (expo-av) on cards
- [ ] Cloze deletion note type
- [ ] Multiple note types + card templates
- [ ] LaTeX/MathJax rendering (optional)

**Done when:** cards support text, images, audio, and cloze.

---

## Phase 6 — Statistics & Insights
*Goal: motivation through visible progress.*

- [ ] Review history persisted and queryable
- [ ] Charts: reviews/day, retention, forecast of due cards, streaks
- [ ] Per-deck and global stats
- [ ] Heatmap calendar

**Done when:** users can see meaningful learning analytics.

---

## Phase 7 — Import / Export & Interop
*Goal: don't trap users' data; meet them where they are.*

- [ ] Export/import Kondor's own JSON backup format
- [ ] Import Anki `.apkg` (unzip, read SQLite collection, map media)
- [ ] Import CSV/TSV
- [ ] Share/export a deck

**Done when:** an existing AnkiDroid user can bring their decks in.

---

## Phase 8 — Polish, i18n & Accessibility
*Goal: store-quality experience.*

- [ ] Full i18n (English + Persian) with RTL layout support
- [ ] Light/dark themes + dynamic type
- [ ] Accessibility pass (screen readers, contrast, focus order)
- [ ] Onboarding flow + empty-state guidance
- [ ] App icon, splash, store screenshots
- [ ] Settings: notifications/reminders (expo-notifications)

**Done when:** the app feels finished and is usable in fa + en.

---

## Phase 9 — Sync & Accounts (optional cloud)
*Goal: multi-device, local-first sync.*

- [ ] Choose backend (Supabase / custom) — see ADR
- [ ] Auth (email + OAuth)
- [ ] Conflict-resolving sync of decks/cards/logs
- [ ] Offline-first reconciliation

**Done when:** the same account stays in sync across two devices.

---

## Phase 10 — Release & Operations
*Goal: ship and keep shipping.*

- [ ] EAS Build + EAS Submit pipelines
- [ ] App Store + Google Play listings, privacy policy
- [ ] Crash/error reporting (Sentry) + analytics (privacy-respecting)
- [ ] Beta channel (TestFlight / Play internal testing)
- [ ] Versioning + release notes + OTA updates (expo-updates)
- [ ] Post-launch backlog & feedback loop

**Done when:** Kondor is live in both stores with an update pipeline.

---

## Working Rhythm

1. Pick the next unchecked item in the current phase.
2. Branch (`feat/…`, `fix/…`), implement with tests, open a PR.
3. CI must be green; self-review against the checklist.
4. Merge, check the box here, update `CHANGELOG.md`.
5. Demo the app at the end of each phase before moving on.

**Definition of Done (every task):** typechecks · lints · tested · works on Android + Web · documented if user-facing.
