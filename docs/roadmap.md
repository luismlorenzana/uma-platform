# Uma Games — Roadmap

The order of work across all four repos (P16). Each phase lists its exit check. Architecture is in
[architecture.md](architecture.md); decisions are in [decisions.md](decisions.md).

| Phase | Repo | Goal | Can overlap with | Status |
|---|---|---|---|---|
| 0 | uma-platform | Master data pipeline, first release, `uma-data` package | Phase 1 design spec | Done (2026-10-10) |
| 1 | uma-rpg | Design spec, then slice S1: foundation and the four-page Hub on master data | Phase 0 | Done (deployed, 2026-10-10) |
| 2 | uma-rpg | Slices S2–S8: collection, battles, passive layer, Learning District, cooking, equipment, Tier Finale | | In progress (S2–S7 deployed; S8 waits on the owner, 2026-10-12) |
| 3 | uma-racer, uma-platform | Switch to platform data, extract shared kit, strip RPG and puzzles, rework the game | | In progress (racer phase 1 done 2026-10-14; the rework's rules next; racer D321–D339) |
| 4 | uma-puzzle | Design spec, scaffold from the kit, puzzle core ported | | Not started |

Until Phase 3, **uma-racer gets no new RPG or puzzle features** (P17), so the port isn't chasing a moving target.

## Phase 0 — uma-platform foundation

**Status:** done 2026-10-10. Exit check passed from a fresh clone of `6c7f691` (with the private inputs of P31):
`pnpm data:import && pnpm assets:import && pnpm release:publish` published release `d9bbb52a9cd7` (2,299 files,
72.5 MB) to `gs://uma-platform-master-data` and moved `channels/v1/latest.json`; a throwaway consumer installed
`@luismlorenzana/uma-data@1.0.0` from GitHub Packages and loaded `latest` with every hash, set and the art index
validating and no dangling references. Republishing the same release uploads nothing.

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

**Status:** the design is drafted (uma-rpg `docs/design/`: game design v0.4 and the item catalog), and the owner moved
the Hub first: uma-rpg's [build plan](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/plan.md) makes **S1 the
foundation plus the four-page Hub**, specified with tasks T001–T009. The RPG rules port moves to S3. Item icons are
drawn here by `scripts/pixel-art` (P35).

- **Design spec with the owner:** core loop, goals, passive farm, per-Uma leveling, Hub. Today the RPG only produces
  tokens for uma-racer; it needs its own reason to play.
- Scaffold from uma-racer's skeleton: web, API, domain, login allowlist, Firebase/GCP project, deploy workflow, PWA.
- Port the RPG rules and tests from uma-racer `packages/domain/src/rpg/`. Replace Inspiration token rewards with the
  RPG's own rewards.
- Write the master data adapter and serve master data through the API. Starts from `@luismlorenzana/uma-data@1.0.0`
  (README "Use `@luismlorenzana/uma-data` in a game") and release `d9bbb52a9cd7`; a uma-platform session grants the
  API's service account read access (infra/README.md).

**Exit:** a deployed, logged-in app on the iPhone that lists Umas from master data, and the ported battle and campaign
tests pass.

## Phase 2 — uma-rpg Hub, Farm and leveling

- Phaser scenes for the Hub, chapter map and battle. React for menus and HUD.
- Original art in `uma-platform/assets/`: tiles, maps, UI frames, effects, farm props.
- Passive generators with offline accrual, and per-Uma leveling.
- Keep the generic parts (scene host, idle math, content loading) in separate folders, ready to extract.

**Exit:** the full loop is playable on the iPhone (Hub → farm → party → chapter → battle → rewards → leveling).

## Phase 3 — uma-racer refactor

**Status:** in progress. Planned 2026-10-12 in uma-racer's [`docs/rearchitecture/`](https://github.com/luismlorenzana/uma-racer/blob/main/docs/rearchitecture/README.md)
(its D321–D325) and redirected 2026-10-13 by the owner's game rework, [`docs/rework/`](https://github.com/luismlorenzana/uma-racer/blob/main/docs/rework/README.md)
(D326–D338): Race, Farm, Train, three tiers of five scenarios and World Expeditions. The racer's order of work is its
[`08-phases.md`](https://github.com/luismlorenzana/uma-racer/blob/main/docs/rearchitecture/08-phases.md):
1. **A sound base:** done 2026-10-14 (racer D337). The racer's API imports its own domain package, CI enforces a
   180 KB startup budget, `@luismlorenzana/uma-data` installs from GitHub Packages, and a live manual renders from code.
2. **The rework's rules and `sim:loop`** in the racer's domain, before any wipe (racer M033): next.
3. **The generation-2 cutover:** one wipe, 20 starting Uma Tickets, and the RPG, the Puzzles, Spark Rivals,
   Friendship Training, Constellation Level, card stars and tokens deleted.
4. Push notifications, only if the owner asks (a port of uma-rpg's).
5. **Platform master data and the shared kit** (the steps below).
6. The Hub · 7. the Farm and Training scenes · 8. the race on Phaser · 9. World Expeditions.

Changes from the outline below, by the owner's direction:
- **A full data wipe** (save generation 2) with 20 starting Uma Tickets.
- **The RPG is deleted completely**, and **so are the Puzzles** (racer D326): the rework replaces their
  Constellation Level loop with timed Training Hub unlocks. uma-puzzle can still port from `pre-split`.
- **The Farm becomes uma-rpg's farming half** (racer D330): 8 families × 10 grades, the Pantry and the Kitchen, with
  uma-art's items, dishes and `farmlands` buildings. The racer needs a small `racer` buildings family for its Hub
  places (racer `docs/rework/11-hub-and-places.md` §10.3).
- **The shared kit to extract:** `uma-auth`, `uma-ui`, `uma-content`, `uma-scene` (with `hub`) and `uma-idle`, in
  the racer's phases 5–7. `uma-idle` takes one-after-another production with queues, which both games now use. Save
  sync stays per game (a P-decision is due when the kit is extracted).

- **Farm rework spec with the owner:** done, as the racer's `docs/rework/` (D326–D338).
- Tag uma-racer before stripping (`pre-split`), so uma-puzzle can port from that point.
- Switch to uma-platform master data and delete uma-racer's own GameTora pipeline. Game-only overlays (flair and card
  focus) stay in uma-racer; Spark Rivals are deleted with their mode.
- Extract shared packages from uma-rpg now that there's a second user (P11).
- Remove the RPG and puzzles: code, API routes, save fields, content packs. No save carry-over (P4).
- Align the Hub with the shared pattern.

**Exit:** uma-racer deploys on platform data and shared packages, with no RPG or puzzle code left.

## Phase 4 — uma-puzzle

- Design spec with the owner.
- Scaffold from the shared kit (the third user, so the kit gets a real test).
- Port the puzzle core from uma-racer's `pre-split` tag: rules, campaign, `PuzzleBattleScene`.

**Exit:** a deployed puzzle game with its own Hub, farm and leveling.
