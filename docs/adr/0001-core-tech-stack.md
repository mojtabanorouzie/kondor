# ADR-0001: Core Technology Stack

- **Status:** Accepted
- **Date:** 2026-06-23

## Context

Kondor is a long-term, cross-platform (iOS, Android, Web) spaced-repetition app intended for the app stores. We need a stack that maximizes code sharing, supports a local-first offline data model, and is maintainable over years.

## Decision

| Area | Choice | Rationale |
|---|---|---|
| App framework | React Native + **Expo (SDK 56)** | Single codebase across platforms; managed workflow + EAS for builds/submission; large ecosystem. |
| Language | **TypeScript (strict)** | Safety and refactorability for a large, long-lived codebase. |
| Routing | **Expo Router** | File-based routing, deep linking, web support out of the box. |
| Local storage | **expo-sqlite + Drizzle ORM** | Relational model fits decks/notes/cards/logs; Drizzle gives typed queries + migrations. |
| Global state | **Zustand** | Tiny, unopinionated, no boilerplate; keeps DB as source of truth. |
| Scheduling | **FSRS via `ts-fsrs`** | State-of-the-art algorithm Anki itself adopted; better retention than SM-2. |
| i18n | **i18next + expo-localization** | Mature; first-class RTL for Persian. |
| Testing | **Jest + RN Testing Library** | Standard, well-supported in Expo. |
| CI/CD | **GitHub Actions + EAS** | Free CI; EAS handles native builds and store submission. |

## Consequences

- **Positive:** One team can ship three platforms; local-first means the app works offline from day one; FSRS gives a competitive scheduling edge.
- **Trade-offs:** Expo's managed workflow constrains some native modules (mitigated by config plugins / dev builds). Web parity for a few native APIs needs care.
- **Revisit when:** we need a native capability Expo can't reach, or sync requirements outgrow the chosen backend (see future ADR for Phase 9).
