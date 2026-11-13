# @luismlorenzana/uma-stage

## 0.4.0

### Minor Changes

- ceda7ca: ST4 (uma-farm F12's stage request, its D71; P154), each opt-in, so a game that uses none runs as on 0.3.0:

  - `BandStage.setFadeFigures(ids | (figure) => boolean)`: which figures count for the fade, beside `setFadeMarkers`.
  - `setWorld(design, kit, { keepCamera, keepWalks })`: the camera stays through a rebuild; a walk whose tiles still stand
    keeps going (`pathStands`), any other stops and resolves false.
  - `onSettled` and `atRest`: told once each time the stage comes to rest, after that frame is drawn (the saver's pacing
    never skips it); `stop({ draw: true })` draws the current state before stopping.
  - `farmProblems`, `standInFarmAtlas` and `SAMPLE_FARM` from the three-free `formats` entry (ESM and CommonJS).
  - Fix: a fade part first drawn opaque now visibly fades (its materials recompile when the fade toggles).

## 0.3.0

### Minor Changes

- d7e45ab: ST3 (P146; uma-farm F11's stage request, its D68): two `BandStage` options, off unless asked, so uma-quest is unchanged.
  `fade` fades a building (with its mounted pieces) or a blocking prop to 0.35 while it covers a figure, her bubble's
  anchor or a marker of the named kinds (slot, gate, lot), easing over 150 ms (at once with reduced motion);
  `setFadeMarkers` changes which markers count. `fit: 'width'` scales the camera down so the design's width fills a
  narrower canvas (a 2× phone), never up, with the kit mipmapped only while scaled. Also `buildWorldParts`, the fade's pure
  half (`farmOccluders`, `coveringOccluders`, `stepFade`, `fitScale`) and a `scale` on picking's `View`.

## 0.2.1

### Patch Changes

- b0653a8: The farm's stand-in kit moves into its own module (`standInFarmAtlas`, `drawStandInFarm`, `standInFarmKit`), so a game
  that never draws a farm doesn't carry it: uma-quest's stage chunk is +0.66 KB gzip over 0.1.0 instead of +4.04.
  `standInKitAtlas` and `standInKit` take `'biome' | 'town'` again, as in 0.1.0; `pixelTexture` is exported.

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
