# @luismlorenzana/uma-kit

## 0.2.0

### Minor Changes

- - **The whole screen in an iOS Home Screen app.** iOS 26 sizes a translucent-status-bar web app's viewport a status bar
    short (62pt on an iPhone 17), and draws no fixed content below that line: the empty band under the bottom bar.
    `fillScreen()` makes the document one screen tall, which gives the page the whole screen; `initAppearance()` calls
    it, so games get it at boot. Measured in the iOS 26.4 Simulator.
  - **A docked bottom bar.** Full width, square, flush to the bottom edge, its panel under the home indicator; five equal
    slots; the Play disc rises out of the bar in a notch of the bar's colour; the active tab has a marker on the top edge.
    New utility `pb-bar-safe`; `mb-bar-safe` stays for games that use it.

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
