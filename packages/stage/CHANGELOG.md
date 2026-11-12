# @luismlorenzana/uma-stage

## 0.2.0

### Minor Changes

- 42a5052: The farm's openings (ST2, P145; uma-farm F57's release 2), each opt-in, so a game using none of them runs as on 0.1.0:
  a portrait layout (`TurnedStage layout="portrait"`, never turned); the kit format's `farm` kind with wave 1 and wave 2
  lists, a `set` on building pieces and doors 128 or 256 wide; `parseFarmDesign` (up to 9 × 48 tiles, buildings from sets
  with one- or two-column doors and mounted pieces, props, markers `place`, `slot`, `gate`, `path`, `lot`) and
  `farmGeometry`; and `BandStage`: a vertical band camera that glides and settles on a band, tap picking on either layout,
  walkers by grid path-finding at a walk or a run, standees for outfits with no sprite set, a cap of 8 live sprite sets
  nearest the camera's centre, and a live grade per scene. A stand-in farm kit and `SAMPLE_FARM`, with a review page.

## 0.1.0

### Minor Changes

- 925a9b6: New package (ST1, P140, P142): uma-quest's HD-2D stage, shared. The engine, camera, frames, input, turn, `TurnedStage`,
  the field controls, the world builder, walking, effects, the kit loader, the sprite player and the stand-ins, with the
  kit and design formats also under a pure `./formats` entry point (ESM and CommonJS). three.js 0.187.0, React, uma-kit and
  uma-data are optional peers. Game content stays in the game: its kits, worlds and sprite sets are handed in.
