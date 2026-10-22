# @luismlorenzana/uma-kit

## 0.14.0

### Minor Changes

- a5e55ef: Let a JobSheet preserve its explicitly selected quantity when the recipe changes, while still clamping it to the new recipe's valid maximum.

## 0.13.0

### Minor Changes

- Let games visually dim eligible Uma picker rows and place a job sheet's quantity controls before long authored recipe grids.

## 0.12.0

### Minor Changes

- 6872da5: AccountBar: `tierShifter` makes the tier crest a link of its own. AppFrame: `tint` (`day`, `dusk`, `night`) shifts the accent and washes the Hub map. Both are off by default.

## 0.11.0

### Minor Changes

- c2fc305: `ProfileFrame`: a tab can show a small green dot (`dot`), named by `dotLabel`. Tabs without it draw as before.

## 0.10.0

### Minor Changes

- 43aafd6: `TargetsStrip`: an optional `grade` on each target draws a "G{grade}" chip in the tile's bottom-right corner (the `targetGrade` word), so the same item at different grades tells apart. Targets without a grade draw as before.

## 0.9.1

### Patch Changes

- f499301: Keep the work job sheet's primary button readable in both themes and let games preview their complete stopped-queue restart against settled state.

## 0.9.0

### Minor Changes

- Add complete offline release snapshots, verified private-pack envelopes, compatible cache keys, cancellable held art URLs and responsive atlas frames for SE4. Keep data interpretation in each game.

## 0.8.0

### Minor Changes

- Add `/work`: shared job rows, queues, speed-up and recall, facility upgrades, targets, stopped queues, size chips and
  the job sheet over uma-work state, with game-injected actions, item art and vocabulary.

## 0.7.1

### Patch Changes

- Keep the album Filter button named for assistive technology when compact Uma pickers hide its visible text. Uses the game's existing `filters` words; no prop or layout change (SB6 integration).

## 0.7.0

### Minor Changes

- d01692d: Add the React album subpath: injected Uma art, shared chrome and filters, three virtualized views, bounded preferences, and the reusable Uma picker.

## 0.6.0

### Minor Changes

- 5aaeb93: `/content` (SE2, P57): master data and art through the game's API. `createContentClient({ base, token })` wraps
  uma-data's release client and fetches private packs; release art is checked against the manifest's SHA-256 and kept
  in memory and in Cache Storage under that hash. `ContentProvider`, `useContent`, `useArtUrl`, `usePackUrl`,
  `imagePath`, `AtlasSprite` and `contentProblem`. uma-data loads on first use.

## 0.5.0

### Minor Changes

- b9247da: `/auth` and `/places` (SD2, P56). `/auth`: Google sign-in through Firebase, loaded only by `import()` with the game's
  config (`AuthProvider`, `useAuth`, `loadAuth`, `idToken`, `signIn`, `signOut`; `firebase` is an optional peer).
  `/places`: the frames around both games, filled by each: `BootGates` (splash → sign-in → boot → first launch → start
  page), `UpdateNotice` with the update lifecycle and `criticalAction`, `AccountPage`, `ShelfView`, `ExchangeRows`,
  `ProfileFrame` and `UnlockConfirm`. Every word is a prop with an English default.

## 0.4.0

### Minor Changes

- 5314901: Add the pure `/roster` subpath: the shared album query engine, level and work ordering, master-data row projection,
  and bounded device preferences.

## 0.3.0

### Minor Changes

- - **A plaza crowd.** `plaza.figures` stands up to five small figures (about 44 px) round the plaza spot: the first in front, two behind, two out wide (`CROWD_SPOTS`). Each bobs 2 px on its own beat (`.kit-bob`, off under reduced motion), and the terrain keeps four columns either side clear of props (`CROWD_CLEARING`). One `node` still works as before. Owner, 2026-10-16: "smaller but multiple Uma chibis" on Town Hall.
  - `Clearing`: a terrain clearing takes an optional `r`, its half-width in columns (2 by default).

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
