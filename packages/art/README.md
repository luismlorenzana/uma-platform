# @luismlorenzana/uma-art

Original art for the Uma games, drawn from code by `scripts/pixel-art` (`pnpm art:draw` rewrites it). Never edit the
files by hand.

- `items/atlas.png`: every item icon (32×32) on one sheet, ten grades across, one row per family side (raw, refined).
- `items/atlas.json`: `{ schemaVersion: 1, cell, width, height, frames }`, where `frames[itemId]` is
  `{ x, y, name, family, side, effect, grade, refined }`. Item ids follow uma-rpg's catalog (`docs/design/items.md`).

A bundler imports the files directly, e.g. Vite: `import atlasUrl from '@luismlorenzana/uma-art/items/atlas.png?url'`.
