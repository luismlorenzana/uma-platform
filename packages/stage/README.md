# @luismlorenzana/uma-stage

The Uma games' HD-2D stage (uma-platform ST1, P140, P142; ST2, P145): a three.js world built from 2D kits, pixel sprites
from master data, lights, fog and post effects, on uma-kit's turned landscape stage or a portrait one. It began as
uma-quest's engine (its P90) and is shared now that uma-farm is its second user (P11). Private; personal use only.

## The two entry points

| Import | What | Needs |
|---|---|---|
| `@luismlorenzana/uma-stage` | Everything: the stage, the world builder, the sprite player, and the formats | three.js, React, uma-kit, uma-data (peers) |
| `@luismlorenzana/uma-stage/formats` | Only the kit and design formats: pure, no three.js or DOM, **ESM and CommonJS** | Nothing |

A game's rules and its API import `formats` (uma-quest's `@quest/domain` re-exports it), so a server never installs or
loads three.js. The peers are optional for that reason; a game that draws the stage installs them.

**Load the stage lazily.** three.js is large: import the screens that use the engine through `lazy()`, so the main
bundle doesn't grow. Constants and small helpers (`BUTTON_SIZE`, `markStageRequested`) tree-shake on their own.

## The parts

| Part | Exports |
|---|---|
| **Formats** | `parseKitAtlas`, `KIT_REQUIRED`, `kitMissing`, `kitVariants`, `familyVariants`, `pickVariant` (kinds `biome`, `town` and `farm`; `FARM_WAVE_1`, `FARM_WAVE_2`); `parseRoomDesign`, `parseTownDesign`, `parseFarmDesign`, `gridOf`, `townGrid`, `farmGrid`, `farmReach`, `canStep`, `reachable`, `socketTile`, `WALL_LEVELS`, and their types |
| **The stage** | `StageEngine` (uma-quest: rooms, towns, dungeon floors, the party, townsfolk, foes, scenes, paths, the follow camera); `BandStage` (a farm the game drives: the band camera, taps, walkers, standees, the set cap, the grade); `TurnedStage` (landscape or portrait), `useFieldInput`, the field controls (`ToggleRow`, `CycleRow`, `initialSaver`, `capture`, `standalone`), the camera (orthographic, pitched 35°, pixel-snapped), `BandCamera` and `TapPan`, picking (`pickAt`, `project`, `farmTargets`), the grade (`StageGrade`, `DAY_GRADE`, `mixGrade`), frames and timing (`FramePacer`, `FpsRecorder`, battery saver), input (stick, keys), the turn |
| **The world** | `roomGeometry`, `townGeometry`, `farmGeometry` and `farmProblems`, `buildWorld`, `walkWorld` and walking, `findPath` and `farmStepCost`, `Effects` (tilt-shift, bloom), the kit loader (`checkedKit`, `loadKitPage`, `loadedKit`, `standInKit`, `pixelTexture`), the stand-in kits (`standInKitAtlas` for the forest and town; `standInFarmKit` and `standInFarmAtlas` for the farm, a module of its own so uma-quest never carries it), the test room's designs, `SAMPLE_FARM` |
| **Sprites** | `SpriteActor`, `Standee`, `liveSets` (`LIVE_SETS`), `AtlasPlayer`, `loadSpriteSet` and `decodeImage`, `SetCache`, `Blinker`, facing and field poses, `Trail`, `tintAt`, `standInSet` |

## The two layouts

| Layout | Who | What it does |
|---|---|---|
| `<TurnedStage>` (`layout="landscape"`, the default) | uma-quest | The stage always draws landscape; on an upright phone it's turned 90° clockwise, and touches go through `toStage` |
| `<TurnedStage layout="portrait">` | uma-farm (FR3) | Never turned: the viewport as it is, about 9 tiles across on a 3× phone. uma-kit's `KitStage` gets `layout: 'portrait'`, so its sheets stay portrait |

`stageLayout(width, height, insets, layout)` is the pure half: a game that passes no layout gets 0.1.0's behaviour.

## The farm's openings (0.2.0, ST2)

Each is opt-in: a game that uses none of them runs exactly as on 0.1.0. They answer uma-farm's
[F57](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F57-uma-stage.md) asks 4–12 and
[kit-farm.md](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/kit-farm.md) KF1–KF12.

| Opening | How to use it |
|---|---|
| **The `farm` kit kind** | `kind: 'farm'`; `KIT_REQUIRED.farm` is the six roles plus wave 1's 87 names; `checkedKit(kit, name, FARM_WAVE_2)` adds wave 2's 30 once the farm draws a wave-2 place |
| **Sets** | `set` (kebab) on `building-wall`, `window`, `door` and `roof` frames only; a building names its `walls` and `roof` sets, and variants within a set go by the position hash |
| **Two-column doors** | `door` frames are 128 or 256 wide; a building's `door: { column, wide: true }` spans two columns. Without `frame`, the door is the set's `door-<set>` (`door-wide-<set>`) |
| **Mounted pieces** | `mounts: [{ name, face: 'front' \| 'roof', column, level }]` on a building: a `sign` or `prop` frame standing at its foot, on the front at `level` levels up (the eave is `storeys × 2`), or up the roof's slope (the ridge caps it); levels in quarters |
| **The farm design** | `parseFarmDesign`: up to 9 × 48 tiles of ground (`g` grass, `p` path, `t` tilled, `f` forest floor, `w` water, `v` paving, `d` paddock, `q` quarry, `#` rock), heights 0–2, buildings, props anywhere but under a building, markers `place`, `slot`, `gate`, `path` and `lot`; every slot and path point reachable from the gate |
| **The band camera** | `BandStage` pans only up and down: a drag follows the finger, a flick glides, and the view settles with a band's first row (4 tiles) at its top, pixel-snapped; `scrollTo(z)` moves it from the game |
| **Taps** | `pointerDown`, `pointerMove`, `pointerUp` (stage CSS px; on the turned layout, `toStage` first): a tap answers every figure, prop, building and marker under it, nearest first; `pick(x, y)` and `headOf(id)` (a bubble's anchor) too |
| **Walkers** | `walkTo(id, tile, { run })` walks a figure along the paths (A*, paths cost 1 and other ground 3) at uma-quest's field speed, or runs; it resolves true on arrival. `placeFigure` puts her there at once |
| **Standees** | A figure whose `set` is null, or not live yet, is a `Standee`: her face on a card on a base, lit, shadowed, gliding with a bob |
| **The set cap** | At most `cap` (8) live sprite sets, for the figures in view nearest the camera's centre first; a live set stays while its figure is in view. `loadSet` is the game's cached loader |
| **The grade** | `setGrade(grade, ms)`: the sky and key light, the sprites' tint, the background and the lamps, blended over `ms` |

**A finding for the farm's layout:** the camera is uma-quest's, pitched 35°, so whatever stands tall hides the ground
behind it. A one-storey building's roof (its ridge 3 levels up) hides about four tiles behind it, a two-storey one about
seven, and a 384-texel prop (the gate arch) about five. With kit-farm KF2's 4-tile bands, a band's buildings hide the
apron and path row of the band behind them; taps still reach what's hidden (`pointerUp` lists it under what's in
front), but it isn't seen. The sample shows it. And on a 2× phone (an iPhone SE, 750 px; an iPhone 11, 828 px) the
9-tile farm (1,152 px) is wider than the screen: the view shows its middle six tiles or so, and the band camera doesn't
pan sideways (FR6).

**The review page:** [docs/stage/previews/farm-band.html](../../docs/stage/previews/farm-band.html), a portrait stand-in
farm band (`SAMPLE_FARM` on the stand-in `farm` kit) at phone width, built by `pnpm --filter @luismlorenzana/uma-stage review`.

## What a game hands in

The package holds no game content. The game passes it:
- **its kits:** a parsed atlas and its page's URL, through `checkedKit` and `loadKitPage` (uma-quest passes uma-art's
  `kit-forest`; uma-farm will pass `kit-farm`, F9);
- **its worlds:** room and town designs, and dungeon floors it generates itself (`StageFloor`: cells, heights, spots,
  the floor's number and where the party arrives); the test room's dungeon comes from `EngineOptions.testDungeon`; a farm
  design it builds from its own rules (uma-farm F11);
- **its sprites:** sets loaded through its own master data client (`loadSpriteSet(client, …)`), and faces for standees.

The test room's screen, measurement uploads and the sprite batches stay in each game.

## Rules

No original-game content (stand-in sprites and kits only in tests). three.js is pinned exact (`0.187.0`). One canvas
engine alive at a time. Behaviour only one game needs becomes an option, never a copy.
