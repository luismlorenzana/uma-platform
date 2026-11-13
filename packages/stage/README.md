# @luismlorenzana/uma-stage

The Uma games' HD-2D stage (uma-platform ST1, P140, P142; ST2, P145; ST3, P146; ST4, P154; ST5, ST6, P156): a three.js world built from 2D kits, pixel sprites
from master data, lights, fog and post effects, on uma-kit's turned landscape stage or a portrait one. It began as
uma-quest's engine (its P90) and is shared now that uma-farm is its second user (P11). Private; personal use only.

## The two entry points

| Import | What | Needs |
|---|---|---|
| `@luismlorenzana/uma-stage` | Everything: the stage, the world builder, the sprite player, and the formats | three.js, React, uma-kit, uma-data (peers) |
| `@luismlorenzana/uma-stage/formats` | Only the kit and design formats, and (ST4) `farmProblems`, `standInFarmAtlas` and `SAMPLE_FARM`: pure, no three.js or DOM, **ESM and CommonJS** | Nothing |
| `@luismlorenzana/uma-stage/look` | **The look path (LK1, P161), opt-in:** `LookStage`, the town square by day and the tavern at night, camera families, device tiers, the post stack with a per-scene grade, height fog, shafts, particles, wind, static batching, the packed kit (`LookKit`), and the phone test's `FrameRecorder` and `gpuEstimate`. No game uses it before LK3; the review app (`pnpm --filter @luismlorenzana/uma-stage look`) and the platform app's Look sub-app do. It patches three's fog chunks for height fog when a `LookStage` is made | three.js, uma-data (types), a private pack (`pnpm look:pack`) |

A game's rules and its API import `formats` (uma-quest's `@quest/domain` re-exports it), so a server never installs or
loads three.js. A farm's domain checks its designs there too: `farmProblems(design, standInFarmAtlas())` is what
`BandStage.setWorld` refuses on, and a test proves the entry reaches no three.js, React or DOM. The peers are optional for that reason; a game that draws the stage installs them.

**Load the stage lazily.** three.js is large: import the screens that use the engine through `lazy()`, so the main
bundle doesn't grow. Constants and small helpers (`BUTTON_SIZE`, `markStageRequested`) tree-shake on their own.

## The parts

| Part | Exports |
|---|---|
| **Formats** | `parseKitAtlas`, `KIT_REQUIRED`, `kitMissing`, `kitVariants`, `familyVariants`, `pickVariant` (kinds `biome`, `town` and `farm`; `FARM_WAVE_1`, `FARM_WAVE_2`); `parseRoomDesign`, `parseTownDesign`, `parseFarmDesign`, `gridOf`, `townGrid`, `farmGrid`, `farmReach`, `canStep`, `reachable`, `socketTile`, `WALL_LEVELS`, and their types |
| **The stage** | `StageEngine` (uma-quest: rooms, towns, dungeon floors, the party, townsfolk, foes, scenes, paths, the follow camera); `BandStage` (a farm the game drives: the band camera, taps, walkers, standees, the set cap, the grade, the fade, fit-to-width); the fade's pure half (`farmOccluders`, `coveringOccluders`, `stepFade`, `fitScale`); `TurnedStage` (landscape or portrait), `useFieldInput`, the field controls (`ToggleRow`, `CycleRow`, `initialSaver`, `capture`, `standalone`), the camera (orthographic, pitched 35°, pixel-snapped), `BandCamera` and `TapPan`, picking (`pickAt`, `project`, `farmTargets`), the grade (`StageGrade`, `DAY_GRADE`, `mixGrade`), frames and timing (`FramePacer`, `FpsRecorder`, battery saver), input (stick, keys), the turn |
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

### ST3 (0.3.0): the fade and fit-to-width

Both are `BandStage` options, off unless asked (uma-farm F11's request, D68; P146 here):

| Option | What it does |
|---|---|
| `fade: true` or `{ opacity, markers, ms }` | A building (with its mounted pieces) or a blocking prop fades to `opacity` (0.35) while it covers a target, easing over `ms` (150; at once with reduced motion). Targets are every figure with her bubble's anchor, and the markers of the named kinds (`slot`, `gate`, `lot`; the middle of their tile). `setFadeMarkers(kinds or test)` changes which markers count at any time, say only the slots of the sheet that's open. Each part is its own mesh while the fade is on (`buildWorldParts`) |
| `fit: 'width'` | When the canvas is narrower than the design at one texel a pixel (a 2× phone), the camera scales down so the design's width fills it (`fitScale`); never up. The kit's page is mipmapped only while scaled; taps, `headOf` and `project` follow the scale |

With KF2's layout and the default marker kinds, most buildings cover some slot behind them, so most stand faded at
rest; the review page's toggle shows both ways.

**A finding for the farm's layout:** the camera is uma-quest's, pitched 35°, so whatever stands tall hides the ground
behind it. A one-storey building's roof (its ridge 3 levels up) hides about four tiles behind it, a two-storey one about
seven, and a 384-texel prop (the gate arch) about five. With kit-farm KF2's 4-tile bands, a band's buildings hide the
apron and path row of the band behind them; taps still reach what's hidden (`pointerUp` lists it under what's in
front), but it isn't seen. The sample shows it. And on a 2× phone (an iPhone SE, 750 px; an iPhone 11, 828 px) the
9-tile farm (1,152 px) is wider than the screen: the view shows its middle six tiles or so, and the band camera doesn't
pan sideways (FR6).

### ST4 (0.4.0): four more options and a three-free check

uma-farm F12's stage request (its D71; P154 here). Each is opt-in, so a game that uses none runs as on 0.3.0:

| Option | What it does |
|---|---|
| `setFadeFigures(ids or test)` | Which figures count for the fade, beside `setFadeMarkers`: these ids, or any test of `{ id, tile, moving }`. Every figure counts until it's called; a figure that doesn't count leaves the roof in front of her whole (the farm: only a Ready Uma counts, so nothing is faded at rest) |
| `setWorld(design, kit, { keepCamera })` | The camera stays where it is through a rebuild, held inside the new farm's range, instead of going back to the top |
| `setWorld(design, kit, { keepWalks })` | A walking figure keeps her walk through a rebuild when the tile she's on and every step left on her path still stand (`pathStands`). Any other walk stops (it resolves false) and she's placed on her tile, so the game can walk her again from there |
| `onSettled` (a `BandStage` option), `atRest` | Called once each time the stage comes to rest (the camera, every walk, every fade and the grade still), after a frame of that rest is drawn: the saver's pacing never skips it. A change made at rest (a figure placed, a rebuild, a set going live) settles again once drawn. Idle loops (breathing, blinks) don't count as motion |
| `stop({ draw: true })` | Draws the stage as it is now, then stops: a paced loop never stops on an undrawn frame |
| `farmProblems`, `standInFarmAtlas`, `SAMPLE_FARM` from `formats` | A farm's domain tests its designs without three.js (the atlas's layout is its own module, `standInFarmAtlas.ts`; the drawing stays in `standInFarm.ts`) |

**A fix in the fade (0.3.0's):** a building or prop drawn opaque on its first frame never visibly faded, because three.js
compiles an opaque material's shader to write alpha 1 whatever its opacity. The fade now recompiles a part's materials
when it starts or stops fading (`needsUpdate`, once a toggle; three.js caches both programs). The sample only showed
0.3.0's fade because its miller stood behind the Sawmill from the first frame.

### ST5 and ST6 (0.5.0): a tunable post layer and a one-off action

**ST5, uma-cyberpunk's CY7 request (its D11):** `Effects` takes options and changes live. A game that passes nothing
draws as before: the same passes and uniforms (uma-quest's `StageEngine` and uma-farm's `BandStage` pass nothing).

| Call | What it does |
|---|---|
| `new Effects(renderer, scene, camera, { bloom?: { strength, radius, threshold }, tiltShift?: { strength, focus } \| false })` | Each value falls back to `BLOOM` (0.35, 0.4, 0.86) and `TILT_SHIFT` (1.6, 0.5); `tiltShift: false` skips its two passes |
| `effects.set({ … })` | Changes only the values given, live (a cut-in's flash, a menu dimming the board); `tiltShift: {}` brings it back with its last values |
| `effects.settings` | The values in use |

The bloom keeps texels whose linear luminance (0.299 R + 0.587 G + 0.114 B) passes `threshold`: at 0.86 only near-white
glows; saturated cyan (`#2ee6ff`, 0.587) needs 0.58 or less, a warm lamp (`#ffb84d`) 0.58, magenta (`#ff3dc8`) 0.39. The
battery saver still turns the whole layer off. Review page: [effects.html](../../docs/stage/previews/effects.html).

**ST6, uma-farm F12's request (its D77):** `BandStage.emote(id, name): Promise<boolean>` plays one action once on a
figure (one pass of a looping one) and puts her back to her stance and facing; it resolves true when it ends.

| Case | Result |
|---|---|
| A standee, or a set not live yet; an action her set lacks; a figure walking; an unknown id | `false` at once, nothing played |
| `walkTo`, `placeFigure`, `removeFigure`, a new set (or the cap dropping hers), another `emote` | Cut short: `false` |
| `setWorld` | Cut short, unless it keeps walks and her tile still stands |
| While it plays | It's motion: `onSettled` and `atRest` wait for it, and the stage rests on a frame showing her stance |

When to play and what is the game's (the farm's seeded 4–7 s nod), and so is reduced motion. `debug.figures` now shows
each figure's `action` and `emote`.

**The review page:** [docs/stage/previews/farm-band.html](../../docs/stage/previews/farm-band.html), a portrait stand-in
farm band (`SAMPLE_FARM` on the stand-in `farm` kit) at phone width, built by `pnpm --filter @luismlorenzana/uma-stage review`.
ST4 adds an idler behind the second house who doesn't count (its roof stays whole; a toggle counts her), a rebuild
button that grows a crop mid-walk (the camera and the walk stay), and a count of the times the stage came to rest. ST6
has the two workers nod every 4–7 s, seeded by their ids, and counts the rests between nods.

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
