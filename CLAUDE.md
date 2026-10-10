# uma-platform — working notes for Claude

- `AGENTS.md` holds the shared rules. `docs/architecture.md` and `docs/roadmap.md` are the cross-game plan that every
  Uma repo follows.
- Claude drives the roadmap across all four repos (uma-platform, uma-racer, uma-rpg, uma-puzzle). Keep the roadmap's
  status current when a phase starts or ends.
- The owner prefers **no open questions**: when a sensible default exists, decide with a recommendation and log it in
  `docs/decisions.md`.
- The master data pipeline starts as a port of uma-racer's `scripts/data` and `scripts/assets` (on `origin/main`;
  the local uma-racer checkout may sit on an old branch). Check how uma-racer solved something before inventing a new
  pattern.
- **Local gcloud has two accounts, and the active one is the owner's work account. Never change it.** Scope every
  command with `CLOUDSDK_ACTIVE_CONFIG_NAME` and `CLOUDSDK_CORE_PROJECT`. Never run `gcloud config set …`.
- Never type credentials into sign-in pages.
- **Claude commits and pushes to `main`** in Conventional Commits style (owner, 2026-10-10). Delegated agents use a branch and a pull request. Check `git status` before every commit: no original-game content.
