# Uma Games — Roadmap

The order of work across all four repos (P16). Each phase lists its exit check. Architecture is in
[architecture.md](architecture.md); decisions are in [decisions.md](decisions.md).

| Phase | Repo | Goal | Can overlap with | Status |
|---|---|---|---|---|
| 0 | uma-platform | Master data pipeline, first release, `uma-data` package | Phase 1 design spec | In progress (started 2026-10-10) |
| 1 | uma-rpg | Design spec, scaffold, RPG rules ported, master data connected | Phase 0 | Not started |
| 2 | uma-rpg | Hub, Farm and leveling with Phaser scenes and original art | | Not started |
| 3 | uma-racer, uma-platform | Switch to platform data, extract shared kit, strip RPG and puzzles, rework Farm | | Not started |
| 4 | uma-puzzle | Design spec, scaffold from the kit, puzzle core ported | | Not started |

Until Phase 3, **uma-racer gets no new RPG or puzzle features** (P17), so the port isn't chasing a moving target.

## Phase 0 — uma-platform foundation

**Status:** in progress since 2026-10-10.

- Scaffold the monorepo: pnpm, Turbo, TypeScript, Vitest, CI for lint, test and build.
- Lift `scripts/data` and `scripts/assets` from uma-racer `origin/main`. Leave the game-only normalizers behind (flair,
  card focus, Spark Rivals, RPG, puzzles, Princess Connect art).
- Define neutral master types in `packages/data` (schema major 1) with runtime validators and synthetic fixtures. Keep
  every field the import has today and add what's missing for full Uma stats.
- Create the GCP project and private bucket. Add `pnpm release:publish` with the bucket layout from architecture §2.2.
- Publish `@luismlorenzana/uma-data` to GitHub Packages with Changesets.
- Optional: one-time loads from uma-planner where it holds owner-authored facts GameTora lacks.

**Exit:** from a fresh clone, `pnpm data:import && pnpm assets:import && pnpm release:publish` produces a release in
the bucket, and a throwaway consumer installs `uma-data` and loads `latest` with validation passing.

## Phase 1 — uma-rpg foundation

- **Design spec with the owner:** core loop, goals, passive farm, per-Uma leveling, Hub. Today the RPG only produces
  tokens for uma-racer; it needs its own reason to play.
- Scaffold from uma-racer's skeleton: web, API, domain, login allowlist, Firebase/GCP project, deploy workflow, PWA.
- Port the RPG rules and tests from uma-racer `packages/domain/src/rpg/`. Replace Inspiration token rewards with the
  RPG's own rewards.
- Write the master data adapter and serve master data through the API.

**Exit:** a deployed, logged-in app on the iPhone that lists Umas from master data, and the ported battle and campaign
tests pass.

## Phase 2 — uma-rpg Hub, Farm and leveling

- Phaser scenes for the Hub, chapter map and battle. React for menus and HUD.
- Original art in `uma-platform/assets/`: tiles, maps, UI frames, effects, farm props.
- Passive generators with offline accrual, and per-Uma leveling.
- Keep the generic parts (scene host, idle math, content loading) in separate folders, ready to extract.

**Exit:** the full loop is playable on the iPhone (Hub → farm → party → chapter → battle → rewards → leveling).

## Phase 3 — uma-racer refactor

- **Farm rework spec with the owner:** what Farm takes over from the RPG and puzzles.
- Tag uma-racer before stripping (`pre-split`), so uma-puzzle can port from that point.
- Switch to uma-platform master data and delete uma-racer's own GameTora pipeline. Game-only overlays (flair, card
  focus, Spark Rivals) stay in uma-racer.
- Extract shared packages from uma-rpg now that there's a second user (P11).
- Remove the RPG and puzzles: code, API routes, save fields, content packs. No save carry-over (P4).
- Align the Hub with the shared pattern.

**Exit:** uma-racer deploys on platform data and shared packages, with no RPG or puzzle code left.

## Phase 4 — uma-puzzle

- Design spec with the owner.
- Scaffold from the shared kit (the third user, so the kit gets a real test).
- Port the puzzle core from uma-racer's `pre-split` tag: rules, campaign, `PuzzleBattleScene`.

**Exit:** a deployed puzzle game with its own Hub, farm and leveling.
