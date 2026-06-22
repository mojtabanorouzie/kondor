# Kondor — Incremental Development Roadmap

The guiding principle: **every milestone produces a runnable, demonstrable app.** We never spend weeks in a non-working state. Each phase builds on the last and ends with something you could hand to a tester.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation & Tooling
*Goal: a clean, runnable skeleton with the engineering guardrails of a professional project.*

- [x] Scaffold Expo + TypeScript + Expo Router project
- [x] Define folder architecture (feature-first)
- [ ] Git repository + `.gitignore` + conventional commits
- [ ] ESLint + Prettier + `tsconfig` strict mode
- [ ] Jest + React Native Testing Library wired up (one passing test)
- [ ] GitHub Actions CI: typecheck + lint + test on push/PR
- [ ] Design tokens (colors, spacing, typography) in `src/theme`
- [ ] Path aliases (`@/*`) confirmed working

**Done when:** `npm run start` opens a themed home screen; CI is green.

---

## Phase 1 — Data Layer & Domain Model
*Goal: a typed, migrated local database — the backbone of everything.*

- [ ] Install `expo-sqlite` + `drizzle-orm` + `drizzle-kit`
- [ ] Schema: `decks`, `cards`, `notes`, `note_types`, `review_logs`
- [ ] Migration tooling + initial migration
- [ ] Repository layer (`src/db`) with typed CRUD per entity
- [ ] Seed script with sample decks/cards for development
- [ ] Unit tests for repositories

**Done when:** the app reads/writes real data from SQLite; tests cover CRUD.

---

## Phase 2 — Core Spaced Repetition Engine
*Goal: correct scheduling — the heart of the app.*

- [ ] Integrate `ts-fsrs`; wrap it in `src/services/srs`
- [ ] Map our `Card` model ↔ FSRS state (due, stability, difficulty, reps, lapses)
- [ ] `rateCard(card, grade)` → next schedule + review log entry
- [ ] "Cards due today" query per deck
- [ ] Configurable params (retention target, max interval) in settings
- [ ] Thorough unit tests against known FSRS outcomes

**Done when:** grading a card advances its schedule correctly and is logged.

---

## Phase 3 — Decks & Cards (CRUD UI)
*Goal: manage content end-to-end.*

- [ ] Deck list screen (counts: new / learning / due)
- [ ] Create / rename / delete deck
- [ ] Card browser within a deck (list, search, filter)
- [ ] Add / edit card (front/back basic note type)
- [ ] Empty states, loading states, error handling
- [ ] Component tests for forms

**Done when:** a user can build a deck of cards from scratch in-app.

---

## Phase 4 — Study Session
*Goal: the daily review loop that users live in.*

- [ ] Study screen: show front → reveal back
- [ ] Grade buttons (Again / Hard / Good / Easy) wired to FSRS
- [ ] Session queue (new + due, respecting daily limits)
- [ ] Progress indicator + end-of-session summary
- [ ] Undo last answer
- [ ] Smooth animations (Reanimated) + haptics
- [ ] Keyboard shortcuts on web

**Done when:** a full daily review can be completed with correct scheduling.

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
