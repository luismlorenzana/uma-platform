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

**Sibling apps, approved 2026-10-16 (P48): [docs/sibling](sibling/README.md).** uma-rpg and uma-racer share one
shell, one Hub and one Uma album through `@luismlorenzana/uma-kit`; only the games differ.
- **Phase 0:** done in both games (uma-rpg H30, D146; uma-racer A03, its D368).
- **Phase A:** done (2026-10-16). Both games run on `@luismlorenzana/uma-kit` (theme, primitives, shell, Hub map;
  0.2.0 fixed the iPhone's bottom band and docked the bar, 0.3.0 added the plaza crowd), with H31's art in uma-art
  2.9.0. Neither game forks the kit; changes go through a kit release.
- **Phase B:** done (2026-10-18). SB1 shipped the `outfit-faces` art family in uma-data 1.1.0 (P52), SB2
  `uma-kit/roster` in uma-kit 0.4.0 (P55) and SB3 `uma-kit/album` in uma-kit 0.7.0 (P58). Both games run every Uma
  list and picker on the kit album (uma-rpg SB4, uma-racer SB6), and both fight or race with busts (SB5, SB6).
- **Phase C:** done (2026-10-21). SC1 shipped `@luismlorenzana/uma-work` 0.1.0, the one work engine (P53), and SC2
  `uma-kit/work`'s screens in uma-kit 0.8.0 (P61; fixes in 0.9.1, P64). uma-rpg runs on both (SC3, SC4), and so does
  uma-racer (SC5).
- **Phase D:** done (2026-10-17). SD1 shipped `@luismlorenzana/uma-server` 0.1.0 with the shared auth guard (P54),
  and SD2 uma-kit 0.5.0 with `/auth` and `/places` (P56); both games get in, and draw Account, Warehouse, Exchange and
  the profile, through them (SD3, SD4).
- **Phase E:** done (2026-10-21). SE2 shipped shared content loading, uma-kit 0.6.0 and uma-server 0.2.0
  `/content` (P57, hardened in P63), adopted by uma-racer (SE4) and uma-rpg (SE3,
  [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39633132807)). SE1 migrated Racer onto
  uma-data and its art families, then retired its old generated content with live overlays preserved
  ([production verified green](https://github.com/luismlorenzana/uma-racer/actions/runs/39636290115)). SE5 (shared push)
  stays parked.
- **Phases B to E:** briefed in [phases.md](sibling/phases.md), and broken into 21 self-contained packets with parallel
  tracks in [docs/handoff/](handoff/README.md) (P51). Ready when they were queued:
  - SA7, the plaza crowd in uma-racer;
  - SB1, face crops;
  - SB2, the album engine;
  - SB5, busts in uma-rpg's battles;
  - SC1, the shared work engine;
  - SD1, the server package;
  - SD2, the places frames;
  - SE1, uma-racer's phase 5.
- The racer's phases 5–7 fold into Phases A and E: its phase 5 is SE1.

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
