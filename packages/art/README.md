# @luismlorenzana/uma-art

Original art for the Uma games, drawn from code by `scripts/pixel-art` (`pnpm art:draw` rewrites it). Never edit the
files by hand.

- `items/atlas.png`: every item icon (32×32) on one sheet, ten grades across, one row per family side (raw, refined).
- `items/atlas.json`: `{ schemaVersion: 1, cell, width, height, frames }`, where `frames[itemId]` is
  `{ x, y, name, family, side, effect, grade, refined }`. Item ids follow uma-rpg's catalog (`docs/design/items.md`).

- `dishes/atlas.png` / `.json`: the 100 cooked dishes (32×32), one row per family with grades 1–10 across, then the
  Duo dishes and Feasts. Frames: `{ x, y, w, h, name, kind, grade, family? }` by uma-rpg dish id (`dish-<family>-<grade>`,
  `duo-…`, `feast-<grade>`).
- `gear/atlas.png` / `.json`: 15 equipment types × 10 grades (32×32), id `<type>-g<grade>`; the grade's material sets
  the colours. Frames: `{ x, y, w, h, type, grade, slot, material }`. The bottom-right 9×9 stays clear for a game's
  accent mark.
- `buildings/atlas.png` / `.json`: the 36 Hub places (48×48), id = uma-rpg place id. Frames: `{ x, y, w, h, page,
  anchorY, smoke? }`: `anchorY` is the ground line, `smoke` a chimney top.
- `tiles/atlas.png` / `.json`: Hub terrain on a 16 px grid per page: `<page>/ground-0…3`, `<page>/path-<mask>` and
  `wilds/water-<mask>` (mask bits N 1, E 2, S 4, W 8), and props `<page>/<prop>` (16×16, tall ones 16×32). Frames:
  `{ x, y, w, h, page, kind }`.

A bundler imports the files directly, e.g. Vite: `import atlasUrl from '@luismlorenzana/uma-art/items/atlas.png?url'`.
