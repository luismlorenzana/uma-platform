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

## D103 armor (H27)

`src/gear/armor-pieces.ts` adds paired head/body/legs/arms pieces to rows 26–33, after `orb-dark`. Do not edit or
remove the first 26 rows. `legacy-2.0.0.json` pins their exact RGBA and frame metadata hashes from the published
2.0.0 tag, independent of zlib compression; the saved atlas is checked against all 340 fresh painters.

The 2× `gear-armor-d103.png` comparison places new rows at left, retained Garb/Leather/Mail/Plate/Ring/Charm at right.
`gear-armor-d103-1x.png` checks all eighty additions at native size. Full `gear.png` / `gear-1x.png` / `gear.html`
also include them. Material ladders and shared lighting/outline/shadow helpers are unchanged.

## D124 feet and defensive accessories (H28)

`src/gear/d124.ts` appends rows 34–45: Boots, Slippers, five Talismans and five Amulets, ten grades each. Boots are
plated sabatons; Slippers use the same staggered pair footprint in cloth with grade-gem trim. Every defensive
pendant has its own silhouette (heart, fang, shield, anvil, thorned vine; drop, swirl, veiled crescent, rune circle,
hand mirror), not a new symbol pasted onto the same disk. Construction changes at grades 4 and 7; glow starts at 8.

`gear-d124-2x.png` / `gear-d124-1x.png` show these twelve rows, grades 1–10 across, in the order above. Labelled 1×/3×
cards are in `gear.html`. Existing H27 previews stay byte-identical. `legacy-2.4.0.json` pins all 340 preceding frame
metadata and pixel hashes; the same saved-atlas, deterministic-grade and clear 9×9 corner checks cover all 460 icons.
Art's primary material metadata follows the existing Arms metal / Arcana gem ladders, with cloth and stone details;
it is not a game recipe table.

## World art

`src/world/build.ts` writes the `world` atlas and previews from the RPG's `docs/design/world/map-art.md` contract.
H06 milestone 1 is the approved five-biome visual gate; `worldFrameSpecs()` retains its 194-frame contract, and
`worldFrameSpecs(BIOME_IDS, true)` emits the complete 310-frame family in milestone 2. `maps-full.ts` adds the ten-band continent and five-island world in milestone 3 (H08 backdrops are separate).

Ground/road helpers and the road `closesBlock` guard are shared with the Hub. Roads use edge-neighbour masks;
liquids use **corner** masks and filled vertex blobs, not the Hub's thin stream bands. Never compose the two with the
same mask function. `world.html` provides 2× phone plots and labelled 3× frames; `pnpm art:draw` regenerates it.

## Stage buildings (owner map feedback)

`src/world/stage-buildings.ts` paints native 64×64 barracks, elite towers and boss strongholds for all nineteen
biomes, with locked/open/cleared states and two large frontier rings. Cleared sprites are completely grayscale.
`worldFrames(BIOME_IDS, true, true, true)` appends these 173 frames after 2.2.0's 329, preserving every old position
and pixel. The build emits `stage-buildings-{1x,2x,sample}.png` and labelled `stage-buildings.html`.

## Compact stage towers

`src/world/compact-stages.ts` authors native 32px regular chess towers, elite towers and castles with the same
biome palette as the retained 64px set. `compact-build.ts` writes the separate `world/stages-compact.{png,json}`
sheet (173 frames, 256×704) and `stage-compact-{1x,2x,sample}.png` / labelled HTML. The old world sheet and all
4×4 painters/previews remain unchanged; tests freeze their published 2.3.0 bytes alongside the new native contract.

## Battle horizons (H08)

`src/world/backdrops.ts` draws transparent-sky 128×48 strips with two periodic depth layers and the biome's original
landmarks. The last eight rows blend into actual ground tiles. `worldFrames(BIOME_IDS, true, true)` appends these
nineteen frames after H06's 310, preserving every original frame. The build checks sizes and exact horizontal seams;
`backdrops.png` / `backdrops.html` show two adjacent repeats per biome at 2×.

## Battle effects

`src/fx/build.ts` adds the `fx` family: four 32 px hit poses and two familiar poses for each of the ten D86 kinds.
The frame list in `src/fx/spec.ts` is the build contract. Impacts keep their object pixels inside the cutout; the
last pose is readable without motion. Familiars use two bob/flap/tail poses and bounded glow, in the same house style.

`fx.html` shows animated 1×/2×/4× previews, a reduced-motion final-pose toggle, and static 3×/1× cards. The package
ships only the atlas/index; playback and summon lifetimes belong to the game.

## UI emblems and status badges

`src/ui/` draws five 24×24 class emblems and ten 12×12 status glyphs into `packages/art/ui/atlas.{png,json}`.
`spec.ts` pins the class/status keys; `atlas.ts` checks completeness, ids and native sizes before packing.
`pnpm art:draw` also writes `assets/previews/ui.png` (3×), `ui-1x.png` and `ui.html`, with named cards and native-size
class/stack examples. `pnpm test` checks glyph uniqueness, deterministic bytes and the saved atlas contract.
