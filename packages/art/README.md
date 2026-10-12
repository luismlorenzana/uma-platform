# @luismlorenzana/uma-art

Original art for the Uma games, drawn from code by `scripts/pixel-art` (`pnpm art:draw` rewrites it). Never edit the
files by hand.

- `items/atlas.png`: every item icon (32×32) on one sheet, ten grades across, one row per family side (raw, refined).
- `items/atlas.json`: `{ schemaVersion: 1, cell, width, height, frames }`, where `frames[itemId]` is
  `{ x, y, name, family, side, effect, grade, refined }`. Item ids follow uma-rpg's catalog (`docs/design/items.md`).

- `dishes/atlas.png` / `.json`: the 100 cooked dishes (32×32), one row per family with grades 1–10 across, then the
  Duo dishes and Feasts. Frames: `{ x, y, w, h, name, kind, grade, family? }` by uma-rpg dish id (`dish-<family>-<grade>`,
  `duo-…`, `feast-<grade>`).
- `gear/atlas.png` / `.json`: 26 equipment types × 10 grades (32×32), id `<type>-g<grade>`; the grade's material sets
  the fittings' colours. Frames: `{ x, y, w, h, type, grade, slot, material }`. The bottom-right 9×9 stays clear for a game's
  accent mark.
- `buildings/atlas.png` / `.json`: the 36 Hub places (48×48), id = uma-rpg place id. Frames: `{ x, y, w, h, page,
  anchorY, smoke? }`: `anchorY` is the ground line, `smoke` a chimney top.
- `tiles/atlas.png` / `.json`: Hub terrain on a 16 px grid per page: `<page>/ground-0…3`, `<page>/path-<mask>` and
  `wilds/water-<mask>` (mask bits N 1, E 2, S 4, W 8), and props `<page>/<prop>` (16×16, tall ones 16×32). Frames:
  `{ x, y, w, h, page, kind }`.
- `ui/atlas.png` / `.json`: five class emblems (24×24) and ten status badges (12×12). The index is
  `{ schemaVersion: 1, width, height, frames }`, with `{ x, y, w, h, group, key }` by `class/<class>` or `status/<key>`.
  Classes: Brawler, Mage, Spell Blade, Cleric and Summoner. Debuffs: Armor Break, Mind Break, Enfeeble, Shatter and Hex;
  buffs: Brave, Faith, Aegis, Breaker and Clarity. Each has a distinct glyph; debuffs also have red-violet badges,
  buffs gold-teal. Render at native size or a whole-number scale. Keep full class names beside emblems and full
  status names in accessible labels; unknown statuses should retain the game's text fallback.

A bundler imports the files directly, e.g. Vite: `import atlasUrl from '@luismlorenzana/uma-art/items/atlas.png?url'`.

## Gear rows in 2.0.0

Breaking change: the old 15-row gear sheet is replaced by a 320×832 atlas. Consumers must update their row map and
sheet height together. Columns are grades 1–10; `x = (grade - 1) * 32`, `y = row * 32`. Rows are zero-based:

| Rows | Types, in order |
|---|---|
| 0–4 | `greatsword`, `axe`, `lance`, `bow`, `katana` |
| 5–9 | `tome-fire`, `tome-ice`, `tome-lightning`, `tome-light`, `tome-dark` |
| 10–13 | `garb`, `leather`, `mail`, `plate` |
| 14–15 | `ring`, `charm` |
| 16–20 | `orb-greatsword`, `orb-axe`, `orb-lance`, `orb-bow`, `orb-katana` |
| 21–25 | `orb-fire`, `orb-ice`, `orb-lightning`, `orb-light`, `orb-dark` |

The `short-sword`, `spear`, `mage-staff`, `arcane-staff`, `cleric-staff` and `summoner-tome` ids no longer exist.
Every current gear type has its own row; a consumer no longer needs fallback art or a damage-kind badge.

Arms and Arms Orb settings use the ingot ladder; Tomes and Elemental Orb settings use cut gems. Their main family
is the first recipe family (ores or crystals). Garb keeps a cloth body, with grade-wood edging and plank metadata;
Leather, Mail, Plate, Ring and Charm retain their hide, ingot, cut-gem and carving ladders. Elemental covers and
spheres use the game's element colours; Arms Orb spheres stay polished steel with a recessed weapon silhouette.

The build rejects object/outline pixels in the bottom-right 9×9 (`x >= 23`, `y >= 23`) and removes only soft shadows
or glow there, so the complete corner is transparent. Its row, grade, material and clear-zone contracts are tested.
