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

## World atlas (H06, complete)

`world/atlas.png` / `.json` is a new original-art family for the RPG's map screens. It is not versioned/published until
all three H06 milestones pass review. The complete native-frame family contains **310 frames**: all nineteen biomes (four ground variants, three props and one icon each), four ocean variants, six liquid families, three road materials, all stage/frontier/Spring/flag markers and the capital. All three milestone compositions are complete. No placeholder frames are shipped.

The JSON is `{ schemaVersion: 1, width, height, frames }`; each frame is `{ x, y, w, h, group, biome?, anchorY? }`.
Coordinates are aligned to the 16 px grid, but frames have native sizes: ground/liquids/roads/icons/stages are 16×16,
tall props and place markers 16×32, capital 48×48. Props anchor at `h - 2`, capital at y=44. Consumers read the index;
frame positions are an implementation detail of the shelf packer.

| Frames | Contract |
|---|---|
| `ground/<biome>-0…3` | Seamless variants in any order; all four dealt in each 2×2 preview patch |
| `prop/<biome>/<name>` | Three per biome, selective outlines, soft shadows, declared ground line |
| `liquid/<water\|lava\|marsh\|ice\|void\|cloud>-1…15` | Transparent **corner-mask areas**, NW 1, NE 2, SE 4, SW 8. Mask 15 is filled; no mask-0 frame |
| `road/<dirt\|stone\|boards>-0…15` | Transparent **edge-mask networks**, N 1, E 2, S 4, W 8. Layouts never close a 2×2 road block |
| `marker/<fight\|elite\|boss>-<locked\|open\|cleared>` | Nine kind/state symbols with lock, weapon and check glyphs |
| `marker/frontier-0…1` | Transparent pulse rings over a stage marker; the runtime controls animation/reduced motion |
| `marker/spring`, `marker/spring-dry`, `marker/flag`, `marker/flag-cleared` | 16×32 place/progress symbols |
| `marker/capital` | 48×48, y=44 ground line |
| `icon/<biome>` | 16×16 biome header/list symbols |

`assets/previews/world.png` contains every frame at 3× plus nineteen regions, a ten-band continent and a five-island world. `world.html`
labels frames and shows 2× phone comparison plots/maps. `world-<biome>.png`, `world-continent.png` and `world-plots.png`
are separate 2× examples; `world-markers-1x.png` shows every marker at native size. The build checks every id/size,
ground seams, all corner/edge masks, and ground lines;
Vitest additionally pins non-overlap, seed repeatability, filled ponds, marker shapes, and connected no-loop roads.

`maps-full.ts` describes the cell/sprite/spot compositions for H07: 16×44 continent, forty 4×3 plots, five inter-band Springs, a 16×4 capital plaza; 16×22 world, five staggered 6×4 islands in their continents' two dominant biomes with corner-mask shores. `world-layouts.json` records the synthetic sample positions. No text is painted into the maps.

The complete H06 contract has 310 frames (including ocean); the 19 battle horizon strips are added separately by H08.
