# pixel-art

Draws the Uma games' original pixel art from code: no dependencies, no hand-edited image files (architecture §5, P35).

```bash
pnpm art:draw
```

It writes all 320 item icons (16 families × 10 raw + 10 refined, in `src/items/index.ts`) as 32×32 PNGs to
`assets/items/<family>/<id>.png`, plus `assets/previews/items.png` (a 4× contact sheet) and
`assets/previews/items.html` (named cards at 4× and 1×). The same code always draws the same pixels.

## How an icon is made

| Module | Does |
|---|---|
| `png.ts` | A small PNG encoder (8-bit RGBA, `node:zlib`) |
| `color.ts` | Six-tone ramps: outline, deep shadow, shadow, base, light, highlight. Shadows turn cool and highlights warm |
| `shape.ts` | Masks (ellipse, circle, polygon, union, subtract). `shadeDome` lights any silhouette like a sphere, using a distance transform. `cutStone` + `shadeFacets` shade cut objects facet by facet, ranked so each one shows a full light-to-dark spread |
| `sprite.ts` | The grid of (ramp, tone) cells. Rendering adds the drop shadow, a selective outline (each edge takes the darkest tone of what it borders) and glints |
| `rng.ts` | Seeded randomness, so every run is identical |
| `items/*.ts`, `items/refined/*.ts` | One painter per item, in the order of uma-rpg's catalog (`docs/design/items.md`); `items/index.ts` lists the families |

**Shared rules:** light comes from the top left. Every object has a 1 px outline and a soft shadow. Legendary grades
(9–10) get glints.

The item catalog (names, families, grades) is uma-rpg game design and lives there. The art lives here so any game can
use it.

## UI emblems and status badges

`src/ui/` draws five 24×24 class emblems and ten 12×12 status glyphs into `packages/art/ui/atlas.{png,json}`.
`spec.ts` pins the class/status keys; `atlas.ts` checks completeness, ids and native sizes before packing.
`pnpm art:draw` also writes `assets/previews/ui.png` (3×), `ui-1x.png` and `ui.html`, with named cards and native-size
class/stack examples. `pnpm test` checks glyph uniqueness, deterministic bytes and the saved atlas contract.
