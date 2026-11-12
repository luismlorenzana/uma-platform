# @luismlorenzana/uma-stage

The Uma games' HD-2D stage (uma-platform ST1, P140): a three.js world built from 2D kits, pixel sprites from master data,
lights, fog and post effects, on uma-kit's turned landscape stage. It began as uma-quest's engine (its P90) and is shared
now that uma-farm is its second user (P11). Private; personal use only.

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
| **Formats** | `parseKitAtlas`, `KIT_REQUIRED`, `kitMissing`, `kitVariants`, `pickVariant` (kinds `biome` and `town`); `parseRoomDesign`, `parseTownDesign`, `gridOf`, `townGrid`, `canStep`, `reachable`, `socketTile`, `WALL_LEVELS`, and their types |
| **The stage** | `StageEngine` (rooms, towns, dungeon floors, the party, townsfolk, foes, scenes, paths, the camera), `TurnedStage`, `useFieldInput`, the field controls (`ToggleRow`, `CycleRow`, `initialSaver`, `capture`, `standalone`), the camera (orthographic, pitched 35°, pixel-snapped), frames and timing (`FramePacer`, `FpsRecorder`, battery saver), input (stick, keys), the turn |
| **The world** | `roomGeometry`, `townGeometry`, `buildWorld`, `walkWorld` and walking, `Effects` (tilt-shift, bloom), the kit loader (`checkedKit`, `loadKitPage`, `loadedKit`, `standInKit`), the stand-in kits, the test room's designs |
| **Sprites** | `SpriteActor`, `AtlasPlayer`, `loadSpriteSet` and `decodeImage`, `SetCache`, `Blinker`, facing and field poses, `Trail`, `tintAt`, `standInSet` |

## What a game hands in

The package holds no game content. The game passes it:
- **its kits:** a parsed atlas and its page's URL, through `checkedKit` and `loadKitPage` (uma-quest passes uma-art's
  `kit-forest`);
- **its worlds:** room and town designs, and dungeon floors it generates itself (`StageFloor`: cells, heights, spots,
  the floor's number and where the party arrives); the test room's dungeon comes from `EngineOptions.testDungeon`;
- **its sprites:** sets loaded through its own master data client (`loadSpriteSet(client, …)`).

The test room's screen, measurement uploads and the sprite batches stay in each game.

## Rules

No original-game content (stand-in sprites and kits only in tests). three.js is pinned exact (`0.187.0`). One canvas
engine alive at a time. Behaviour only one game needs becomes an option, never a copy.
