# Kondor

> A modern, cross-platform spaced-repetition app — an open, polished alternative to AnkiDroid.

**Kondor** (Persian: **کُندُر**, *kondor* — "frankincense") takes its name from the aromatic resin traded for millennia along Persian routes. In classical Persian and traditional medicine, frankincense (*kondor*) was prized as a **memory strengthener** (تقویت حافظه) — students were said to chew it before study. A fitting name for an app whose whole purpose is to help you remember.

---

## Vision

Build a professional, store-ready, cross-platform learning app powered by modern spaced repetition (FSRS). Local-first, fast, beautiful, and fully featured: decks, rich cards, scheduling, statistics, import/export (including Anki `.apkg` compatibility), and optional cloud sync.

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **React Native + Expo (SDK 56)** | One codebase → iOS, Android, Web |
| Language | **TypeScript** | Type safety for a large, long-lived codebase |
| Navigation | **Expo Router** | File-based routing, deep links |
| Local DB | **expo-sqlite + Drizzle ORM** | Local-first, typed queries, migrations |
| State | **Zustand** | Minimal, ergonomic global state |
| Scheduling | **FSRS** (`ts-fsrs`) | The modern algorithm Anki itself adopted |
| i18n / RTL | **i18next + expo-localization** | English + Persian (فارسی) from day one |
| Testing | **Jest + RN Testing Library** | Unit + component tests |
| CI | **GitHub Actions** | Lint, typecheck, test on every push |

## Project Structure

```
src/
  app/          # Expo Router routes (screens)
  components/   # Shared, presentational UI
  features/     # Feature-first modules (decks, cards, study, statistics, settings, sync)
  db/           # Drizzle schema + SQLite migrations
  services/     # Domain logic: srs (FSRS), import-export
  store/        # Zustand stores
  hooks/        # Reusable hooks
  theme/        # Design tokens, colors, typography
  i18n/         # Localization (en, fa)
  types/        # Shared domain types
  utils/        # Pure helpers
docs/           # ROADMAP, ARCHITECTURE, ADRs
__tests__/      # Test suites
```

> **Note:** Expo SDK 56 — always check the versioned docs at
> https://docs.expo.dev/versions/v56.0.0/ before writing platform code.

## Getting Started

```bash
npm install
npm run start      # Expo dev server (press a=Android, w=web, i=iOS)
npm run android
npm run web
npm run lint
```

## Roadmap

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full incremental plan, and
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for design decisions.

## License

MIT — see [LICENSE](LICENSE).
