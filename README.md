# Kondor — کُندُر

[![version](https://img.shields.io/github/v/tag/mojtabanorouzie/kondor?label=version&color=0d6efd&sort=semver)](https://github.com/mojtabanorouzie/kondor/tags)
[![CI](https://img.shields.io/github/actions/workflow/status/mojtabanorouzie/kondor/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/mojtabanorouzie/kondor/actions/workflows/ci.yml)
[![typescript](https://img.shields.io/badge/typescript-6.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![expo](https://img.shields.io/badge/expo-SDK%2056-000020?logo=expo&logoColor=white)](https://docs.expo.dev/versions/v56.0.0/)
[![react native](https://img.shields.io/badge/react%20native-0.85-61dafb?logo=react&logoColor=white)](https://reactnative.dev/)
[![platforms](https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-8a2be2)](#getting-started)
[![license](https://img.shields.io/github/license/mojtabanorouzie/kondor?color=green)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/mojtabanorouzie/kondor/pulls)

> A professional, cross-platform spaced-repetition app — a modern, open alternative to AnkiDroid.

**Kondor** (Persian: **کُندُر**, *kondor* — "frankincense") takes its name from the aromatic resin traded for millennia along Persian trade routes. In classical Persian and traditional medicine, frankincense was prized as a **memory strengthener** (تقویت حافظه) — students were said to chew it before study. A fitting name for an app whose whole purpose is to help you remember.

---

## Features

- **FSRS Scheduling** — the modern algorithm Anki itself adopted, via `ts-fsrs`
- **Full CRUD** — decks, cards, note types (Basic + Cloze), card templating
- **Rich Cards** — markdown, images, cloze deletions
- **Study Session** — reveal → grade (Again / Hard / Good / Easy) with live interval previews, undo, keyboard shortcuts
- **Statistics & Insights** — heatmap calendar, retention charts, review forecast, streaks
- **Import / Export** — Anki `.apkg`, CSV/TSV, and Kondor's own JSON backup
- **Sync** — offline-first LWW engine; self-hosted REST backend with JWT auth, delta sync, and OAuth (Google + GitHub)
- **PWA** — installable on Windows/Mac/Linux; works fully offline; service worker + local WASM bundle
- **i18n + RTL** — English and Persian (فارسی) with full RTL layout
- **Light / Dark / System** — persisted theme preference
- **Settings** — language, appearance, backup, sync server URL + token

---

## Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **React Native + Expo SDK 56** | iOS · Android · Web from one codebase |
| Language | **TypeScript 6 (strict)** | End-to-end type safety |
| Navigation | **Expo Router (file-based)** | Deep links, nested stacks |
| Local DB | **expo-sqlite + Drizzle ORM** | Local-first, typed migrations |
| State | **Zustand** | Minimal, ergonomic global state |
| Scheduling | **ts-fsrs v5** | FSRS algorithm |
| i18n / RTL | **i18next + expo-localization** | English + Persian |
| Sync backend | **Fastify 5 + better-sqlite3** | Self-hosted; JWT + OAuth |
| Testing | **Jest + jest-expo** | 59 passing tests |
| CI | **GitHub Actions** | Lint · typecheck · test on every push |
| Linting | **ESLint 8 + Prettier 3** | `eslint-config-expo`, zero errors |

---

## Project Structure

```
Kondor/
├── src/
│   ├── app/              # Expo Router routes (screens)
│   ├── components/       # Shared, presentational UI
│   ├── features/         # Feature-first modules
│   │   ├── decks/
│   │   ├── cards/
│   │   ├── study/
│   │   ├── statistics/
│   │   ├── settings/
│   │   └── sync/
│   ├── db/               # Drizzle schema + SQLite migrations
│   ├── services/         # Domain logic (FSRS, import/export, sync engine)
│   ├── store/            # Zustand stores + AuthProvider
│   ├── hooks/            # Reusable hooks
│   ├── theme/            # Design tokens (colors, spacing, typography)
│   ├── i18n/             # Localization (en, fa)
│   ├── types/            # Shared domain types
│   └── utils/            # Pure helpers
├── server/               # Self-hosted sync server (Fastify + SQLite)
├── docs/                 # ROADMAP, ARCHITECTURE, ADRs
├── public/               # PWA manifest, service worker, WASM bundle
└── __tests__/            # Test suites
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`) or `npx expo`
- For native: Android Studio or Xcode

### Install & Run

```bash
git clone https://github.com/mojtabanorouzie/kondor.git
cd kondor
npm install

npm run start        # Expo dev server  →  press a (Android) · i (iOS) · w (Web)
npm run android      # open on Android emulator / device
npm run web          # open in browser
```

### Build for Web (PWA)

```bash
npm run export:web   # copies WASM bundle then runs expo export --platform web
# serve the dist/ folder with any static host
```

### Run Tests

```bash
npm test             # 59 Jest tests
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint (exits 0, no errors)
npm run format:check # Prettier check
```

---

## Downloads

Every version tag (`v*`) triggers [`release.yml`](.github/workflows/release.yml), which attaches
direct-download artifacts to that [GitHub Release](https://github.com/mojtabanorouzie/kondor/releases) —
no app store account needed:

| Platform | Artifact | Notes |
|---|---|---|
| Android | `Kondor.apk` | Debug-keystore signed; enable "install unknown apps" to sideload |
| Windows | `Kondor_x64-setup.exe` | PWA wrapped in Tauri; NSIS installer |

The same workflow also publishes the installable PWA to GitHub Pages (the `pwa` / `deploy-pages`
jobs) — the easiest way to get Kondor on iOS, since Safari's "Add to Home Screen" needs no
signing or sideloading at all.

Real App Store / Play Store listings are a separate, manual path via EAS (`eas.json`) — see the
submission steps in [docs/ROADMAP.md](docs/ROADMAP.md#phase-10--release--operations).

---

## Self-Hosted Sync Server

A lightweight Fastify server lives in `server/`. It handles multi-user JWT auth, OAuth (Google + GitHub), and delta sync.

```bash
cd server
npm install
npm start            # prints an access token and listens on :3000
```

Configure the app via **Settings → Sync** by entering your server URL and access token. See [`server/README.md`](server/README.md) for full deployment notes (including Tailscale + Windows Task Scheduler).

---

## Roadmap

The project is built phase-by-phase — every milestone ships a running, demonstrable app. Completed phases (0–16) cover the full feature set above. Upcoming work:

| Phase | Goal | Status |
|---|---|---|
| 11 | Deletion tombstones (sync) | Planned |
| 15 | Verify OPFS persistence on web PWA | Pending |
| Future | App Store + Play Store listings | Needs developer accounts |

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full incremental plan and **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for design decisions and ADRs.

---

## Contributing

1. Fork + clone the repo.
2. Branch: `feat/<name>` or `fix/<name>`.
3. Make sure `npm test`, `npm run typecheck`, and `npm run lint` all pass.
4. Open a pull request — CI runs automatically.

---

## License

MIT — see [LICENSE](LICENSE).
