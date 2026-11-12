# ST1 — `uma-stage` 0.1.0: uma-quest's HD-2D stage moves into a shared package

**uma-platform `packages/stage`, then uma-quest · Claude · L · Needs: the owner's go (one piece at a time, uma-farm D61)
· Unblocks: ST2, then uma-farm's F11 (the farm on the stage) · From uma-farm's "Both apps" request
[F57](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F57-uma-stage.md) (its D63), release 1**

## Why

uma-farm moves onto the HD-2D stage (its M7, [hd2d-farm.md](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/hd2d-farm.md)).
The engine is uma-quest's. The farm is its second user, so the stage moves here (P11, extract on second use) and both
games use one package; the farm never imports uma-quest or copies an engine. FR2's wait for uma-quest's measured plays
was waived by the owner (uma-quest D21). This release is **the move only**: nothing new, and uma-quest plays exactly as
before. The farm's openings are ST2.

## Context (read first)

- F57 (above): what uma-quest has, what the farm needs, release 1's three asks, its rules.
- uma-quest at `main`: `apps/web/src/stage/` (engine, camera, frames, timing, input, turn, `TurnedStage`, controls,
  `useFieldInput`, stand-in, test room), `stage/world/` (build, geometry, kits, designs, effects, walk, stand-in kit),
  `sprites/` (player, loader, cache, facing, tint, trail, blink, actor, stand-in set; quest content in `batch1.ts`,
  `keySets.ts`, `keys.ts`, `fixture.ts`), `measure/recorder.ts`, and `@quest/domain`'s `world/kit.ts` and
  `world/design.ts` (self-contained: no imports outside `world/`).
- P90 (three.js for uma-quest's scenes, amending P14), P103 (uma-kit's `KitStage`), P11, the
  [change protocol](../../change-protocol.md), the queue's "Releases while packets run in parallel".

## Decisions made

1. **`@luismlorenzana/uma-stage`** in `packages/stage`, built like uma-kit (ESM, types, subpath exports where useful).
   **three.js is a dependency pinned exact (0.187.0)**; React, `@luismlorenzana/uma-kit` and
   `@luismlorenzana/uma-data` are peer dependencies. The game imports the stage lazily, so its main bundle doesn't grow.
2. **What moves:** the stage, camera, frames and timing, input, turn, `TurnedStage`, the field controls and
   `useFieldInput`; the world builder, geometry, walking, effects (lights, fog, post-processing), and the kit loader;
   the sprite player, loader, cache, facing, tint, trail, blink and actor; the stand-in kit and set; the measurement
   recorder and battery saver; the formats `parseKitAtlas`, `KIT_REQUIRED`, `kitMissing`, `kitVariants`, `pickVariant`,
   `parseRoomDesign`, `parseTownDesign`, `gridOf`, `townGrid`, `canStep`, `WALL_LEVELS` and their types. Their tests
   move with them.
3. **What stays in uma-quest (its content and rules):** batch 1's sets, key sets, keys and fixtures; the dungeon
   generator and `FOREST_ROOMS`; the measurement upload queue (it posts to uma-quest's API); the test room (it reads
   uma-quest's fight waves, router and build id); which kits it loads (`kit-forest`, `kit-town-warrior`).
4. **Seams, the smallest that keep the move a move:**
   - **The engine takes a built world** (a room, town or dungeon floor already generated) instead of calling
     `generateDungeon` itself; uma-quest generates its floors and hands them over.
   - **The kit loader takes atlases as inputs** instead of importing uma-art's `kit-forest` itself; uma-quest passes the
     kits it uses.
   - **The sprite loader takes the master data client** uma-quest already builds (`../content/client`), rather than
     importing it.
   Each seam is a parameter with uma-quest's current value; no behaviour changes.
5. **uma-quest moves onto it:** `@quest/domain` re-exports or drops its `world/` formats (whichever keeps its imports
   simplest), and the app imports the stage from the package. Its checks pass, its test room and slice look the same at
   phone width, and **its stage chunk stays within a few KB of today's** (measured before and after with `vite build`).
6. **Nothing else changes:** uma-kit, uma-data, uma-art, uma-rpg, uma-racer and uma-farm are untouched. Phaser stays
   uma-kit's Hub engine (P14) until the farm leaves the Hub.
7. **A new package needs its Actions access granted once by the owner:** on GitHub, `uma-stage` → Package settings →
   Manage Actions access → add **uma-quest** and **uma-farm** with **Read**. Until then their CI can't install it. The
   session asks for it in one line with the link, right after 0.1.0 publishes.

## Do

1. Capture uma-quest's baseline: its checks, its stage chunk size, and phone-width looks at the test room and the slice.
2. Create `packages/stage` with the parts in decision 2 and the seams in decision 4; move their tests; add a README
   (its parts, the two seams, the formats) and a changeset (`minor`, a new package at 0.1.0).
3. In a uma-quest worktree, switch to the package through a local link or copied build (never committed), and run its
   checks, build and test room until they match the baseline.
4. Release: commit and push uma-platform, `pnpm version-packages`, push; the workflow publishes 0.1.0. Read it back.
   Ask the owner for decision 7's access grant.
5. Pin uma-quest to 0.1.0 (message its session, or pin it here if it isn't running): its move commit, its checks, its
   deploy. Log the P-decision amending P90 and P14 (three.js is `uma-stage`'s, for uma-quest and uma-farm; Phaser stays
   for uma-kit's Hub; uma-rpg and uma-racer don't change).
6. Message uma-farm's main session with the version and what moved; check back with the owner before ST2.

## Done when

- `@luismlorenzana/uma-stage@0.1.0` is on GitHub Packages with its tests passing in uma-platform's CI.
- uma-quest pins it, its checks pass, its deploy is green, and its test room and slice look as before at phone width,
  with the stage chunk within a few KB of the baseline.
- uma-rpg, uma-racer and uma-farm are unchanged; the P-decision is logged.

## Rules that hold

No original-game content in the package (stand-in sprites and kits only, no Uma art, no quest content). The stage loads
on demand. One canvas engine alive at a time (FR4). No forks: behaviour only one game needs becomes an option.
