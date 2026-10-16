# @luismlorenzana/uma-kit

## 0.1.2

### Patch Changes

- - `HubMap` re-lays its terrain only when places' ids, frames or spots, the plaza's spot or the ground change, never on
    a count or pip tick (`sceneKey`). From uma-racer.
  - With sheets open over each other, only the topmost one answers Escape, whatever `onClose`'s identity. From
    uma-racer.
  - `MotionRoot` takes optional `features`, so tests can pass `domMax` instead of nesting their own `LazyMotion`.

## 0.1.1

### Patch Changes

- Load in plain Node ESM: every relative import in `dist` carries its `.js`, so a game's Vitest can import the kit. The
  build checks each entry.

## 0.1.0

### Minor Changes

- First release (P48, sibling Phase A): the theme in light and dark, primitives (icons, marks, sheets, buttons, tabs,
  appearance and motion settings), the app shell (fixed frame, account bar, bottom bar, place menu, peek panel, place
  header, floating pill, overlay routing) and the Hub map (terrain, scene, place targets, pips, page swipe), shared by
  uma-racer and uma-rpg.
