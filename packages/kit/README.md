# @luismlorenzana/uma-kit

The app around both Uma games, coded once (uma-platform [P48](../../docs/decisions.md),
[sibling plan](../../docs/sibling/README.md)): the shared theme, primitives, shell and Hub map of uma-rpg and uma-racer.
The games stay their own: rules, screens, saves and which places exist.

| Import | What |
|---|---|
| `@luismlorenzana/uma-kit/theme.css` | Tokens in light and dark (the same names in both), base styles, utilities |
| `@luismlorenzana/uma-kit/ui` | Icons, `UiMark`/`TierCrest`, `Button`, `Chip`, `Tabs`, `Panel`, `BottomSheet`/`Sheet`, `HelpButton`, `AnimatedNumber`, `MotionRoot`, appearance and device preferences, `KitArtProvider` |
| `@luismlorenzana/uma-kit/shell` | `AppFrame`, `AccountBar`, `BottomBar`, `PlaceMenu`, `PeekPanel`, `PlaceHeader`, `FloatingPill`, nav helpers |
| `@luismlorenzana/uma-kit/hub` | `HubMap` (canvas, place links, swipe), `HubCanvas`, `PlaceTargets`, `Pips`, the grid, terrain, palettes and markers |

## Use it in a game

```css
/* index.css */
@import 'tailwindcss';
@import '@luismlorenzana/uma-kit/theme.css';
@source '../node_modules/@luismlorenzana/uma-kit/dist';
/* the game's @font-face rules for 'Outfit Variable' and 'Inter Variable' */
```

```tsx
// main.tsx
import { configureKit, initAppearance, KitArtProvider, MotionRoot } from '@luismlorenzana/uma-kit/ui'
import uiUrl from '@luismlorenzana/uma-art/ui/atlas.png?url'
import ui from '@luismlorenzana/uma-art/ui/atlas.json'
// … tiles and buildings the same way

configureKit({ storagePrefix: 'my-game:' })
initAppearance()
root.render(
  <MotionRoot>
    <KitArtProvider art={{ ui: { url: uiUrl, index: ui }, tiles: …, buildings: … }}>
      <App />
    </KitArtProvider>
  </MotionRoot>,
)
```

- **Peer dependencies:** React 19, react-router 7, Motion 12; Phaser 4.2.1 for `/hub` (loaded lazily when a map mounts).
- **No game state:** components take values, words and links as props. The game keeps its stores and its words.
- **Art:** uma-art's atlases come in through `KitArtProvider`, so the kit never imports image files. A mark or frame the
  atlas lacks falls back (a `fallback` node, or a code-drawn building).
- **Appearance:** `initAppearance()` applies the device's choice (System, Light or Dark: `setAppearance`) as
  `<html data-theme>`, and keeps the browser's theme colour on the page colour.

## Changing it

The kit changes here, in a uma-platform session, and ships as a new version; each game pins it exactly. Try a change in a
game with `pnpm link` (never committed). A game that needs a new behaviour adds an option here instead of copying a
component.
