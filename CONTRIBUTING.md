# Contributing to Kondor

## Workflow

1. Pick the next unchecked item from [docs/ROADMAP.md](docs/ROADMAP.md).
2. Create a branch: `feat/<short-name>`, `fix/<short-name>`, or `docs/<short-name>`.
3. Implement with tests. Keep changes scoped to one roadmap item where possible.
4. Run locally before pushing:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm test
   ```
5. Open a PR. CI must be green.
6. On merge: check the box in ROADMAP.md and add a CHANGELOG entry.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(study): add Again/Hard/Good/Easy grading
fix(db): correct due-date query for new cards
docs(roadmap): mark Phase 1 data layer complete
```

## Code conventions

- TypeScript strict mode; no `any` without justification.
- Domain logic (scheduling, data rules) lives in `services/` and `db/` — keep it pure and tested.
- Screens orchestrate; they don't own business logic.
- One feature's code, UI, and tests live together under `src/features/<feature>`.
- Check the **versioned** Expo docs (https://docs.expo.dev/versions/v56.0.0/) before using platform APIs.
