# AGENTS.md — guide for AI coding agents

uma-platform is the shared foundation for the owner's personal Uma games. Read this before changing anything.

## Read first

1. `docs/architecture.md`: how the repos fit together. **The docs are the source of truth.** Code follows docs.
2. `docs/roadmap.md`: which phase is active and its exit check.
3. `docs/decisions.md`: what's decided (append-only).

## Hard rules

- **Original-game content never goes in git.** Extracted data, images, generated packs and caches live only in the
  gitignored `/content/` and `*/.cache/` folders. **Test fixtures are small and synthetic**: invented values in the right
  shape, never copied from real datasets.
- **Master data stays neutral.** No game-specific rules or fields in `packages/data`. They belong in that game's adapter.
- **Schema changes:** additive changes are a minor version. Anything that removes, renames or changes the meaning of a
  field is a new major, with a Changeset and a `docs/decisions.md` entry.
- **Don't push to `main`.** Work on a `feat/…`, `fix/…` or `docs/…` branch and open a pull request.
- **Don't touch infrastructure** (`.github/workflows/`, `infra/`, buckets, GCP settings) unless your task says so.
- **Never commit secrets.**
- Append new decision rows; never edit old ones.

## Conventions

- TypeScript strict with `noUncheckedIndexedAccess`. No `any` without a comment explaining why.
- Small modules, pure functions where possible, Vitest tests next to the code, no network in tests.
- Conventional Commits (`feat(data): …`, `fix(pipeline): …`, `docs(roadmap): …`). The body explains why.
