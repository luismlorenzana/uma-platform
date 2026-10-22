# pixel-art

Draws the Uma games' original pixel art from code: no dependencies, no hand-edited image files (architecture §5, P35).

```bash
pnpm art:draw
```

It writes all 320 material icons (16 families × 10 raw + 10 refined, in `src/items/index.ts`), the Speed Ticket and ten tonics,
as 32×32 PNGs to
`assets/items/<family>/<id>.png`, plus `assets/previews/items.png` (a 3× contact sheet) and
`assets/previews/items.html` (named cards at 3× and 1×). The same code always draws the same pixels.

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

## Racer buildings and Racing terrain (A01)

`src/buildings/racer.ts` appends Card Library, Gym, Racecourse and Trophy Hall after every existing place, using the
48px kit and ground line 44. `racing` is appended to the terrain pages: four striped turf variants, sixteen raked
dirt/white-edge paths, and `props/racing.ts`'s rail, furlong post, pennant and flower box. Existing pages do not change.
No new building returns smoke (none has a chimney). `buildings/legacy-2.5.0.json` freezes old frame metadata and pixels.

`racer-buildings-2x.png` compares new places (top) to Stable, Observatory, Brawler Dojo and Scenario Gate (bottom).
`racing-tiles-2x.png` is a terrain sample; `racing-hub-2x.png` adds the Racing page's four buildings. The review-only
`tiles/racing-map.ts` reserves 3×3 footprints and connects their doors without any closed 2×2 path block.

## Racer marks and utility ticket (A02)

`src/ui/racer.ts` adds three 16px currency marks and three 12px tier crests after the original UI rows. The coin,
horizontal teal stub and vertical gold punched ticket differ in shape, and shield pips are distinct connected
clusters at native size. `src/ticket.ts` paints the lightning stub directly at 16px and 32px; `items/tickets.ts`
supplies the ungraded item, appended after all material families. Do not give utility art fake material grades.

`racer-marks-{1x,2x,4x}.png` shows all six on white/dark panels; `racer-ticket-items-2x.png` compares Speed Ticket,
Wheat and Apple. Existing H11 contact sheets stay byte-identical. `ui/legacy-2.6.0.json` guards all prior UI/item
bounds and metadata/pixel hashes; UI and ticket tests check the saved output, silhouettes, punched hole and pip counts.

## Racer tonics (A04)

`src/items/tonics.ts` paints ten native 32px stoppered herbal/sports flasks with a paper stride label, a grade-colour
ladder and lower-body ribs. Ribbon, wax seal, bronze/silver/gold cap and final raised trim add structural progression;
`drawIcon` supplies the same G9–10 glints as the other items. There are no potion auras or copied source images.

The item builder appends a complete row after the Speed Ticket, never reuses the old row's empty cells, and writes
`tonic-1` … `tonic-10` with `kind: tonic`, `grade`, `w` and `h`, alongside standalone PNGs in `assets/items/tonics/`.
`items/legacy-2.9.0.json` freezes every prior frame's exact metadata and the full old sheet's RGBA hash.

`items/tonic-previews.ts` writes `racer-tonics-{16,24,32,64,128}px.png` and labelled `racer-tonics.html`. Each sheet
shows white above dark, G1–5, G6–10, then two existing dishes and the Speed Ticket. The HTML also uses real CSS
16/24/32px images. Previews are original art and safe in git. Tests cover the old sheet, every new frame/painter/file,
ten colour-independent structural variants, glint clearance, borders and repeatable comparison sheets.

## Laurel and Battle terrain (H31)

`src/laurel.ts` paints an open green wreath directly at the target grid. Its native 16px `currency/laurel` occupies
the empty UI slot (84, 36) without moving any old mark or tier crest. `laurel-marks-{1x,2x,4x}.png` compares all four
currencies on white/dark chips; the older A02 sheets remain byte-identical.

`battle` appends to the tile pages: packed earth and trampled grass, sixteen flagstone masks, and six original
`tiles/props/battle.ts` furniture painters. Banner, training dummy and torch are tall; rack, crate and shield stand
are short. The native sheet grows to 256×304, 170 frames. `tiles/battle-map.ts` lays both existing Battle buildings
and all six props on a review-only 12×22 page, with a connected road, no 2×2 blocks and reserved footprints/name rows.
`battle-hub-2x.png` shows this composition; `battle-tiles-2x.png` scatters props across a terrain sample.

`testing/legacy-h31-2.8.0.json` freezes every prior UI/tile entry and pixel (excluding only the previously blank
Laurel rectangle). Tests also check native sizes, unique masks/props, seam continuity, open wreath, saved pixels,
deterministic painters and review-layout clearance. No game-specific layout or rules are shipped in the art package.

## The Rift (H38)

`src/buildings/rift.ts` appends `rift` after the Lapidary on a new `battle` buildings page: a torn lens of light,
near-white lilac at the core and indigo at its torn edges, over a two-step cracked dais with leaning obsidian shards
and four rim stones in the fronts' colours. It reuses the `rift` biome palette, paints its `glow()` two pixels clear
of every edge and returns no smoke. `rift-2x.png` compares it to the Scenario Gate and Tier Finale on Battle ground;
`battleHubMap` takes optional lots, and `rift-battle-hub-2x.png` puts the Rift in the Tier Finale's lot while
`battle-hub-2x.png` keeps its default.

`src/ui/rift.ts` paints the 16px `front/*` crests and 24px `achievement/*` badges at their own grids: wax seals with a
pressed crest, the crown, and one shared banner whose six 12×12 pictograms tell the titles apart. They append below
the A02 row (y=52, then 68/92/116), keeping the sheet 120 wide. `rift-marks-{1x,2x,4x}.png` shows them on white and
dark chips. `testing/legacy-h38-2.10.0.json` and `rift.test.ts` freeze every older frame (the Rift's empty cell
zeroed), check ids, positions, deterministic painters, edge clearance, crest silhouettes and distinct pictograms.

## The Paladin (H54)

`classEmblem`'s `paladin` branch draws the sixth class on the five's kit (the shared dome, steel and wood ramps, the
contact shadow and outline) in the Knight's Bastion banner's blue and gold: a tall tower shield with a star boss and a
sword's hilt rising behind it. `Class` gains `paladin`, but `CLASSES` keeps the five that place the y=0 row by index;
the Paladin's spec appends last and `packUi` puts her in the free cell at (24, 116). `ui.png` and `ui-1x.png` still show
H11's five; `paladin-emblems-{1x,2x,4x}.png` shows all six on white and dark chips, and the buildings build writes
`paladin-bastion-2x.png`, the emblem beside `knights-bastion`. `testing/legacy-h54-2.11.0.json` and `paladin.test.ts`
freeze every 2.11.0 `ui` frame (the new cell zeroed) and `knights-bastion`, and check the new frame's place, painter,
corners, and a silhouette that differs from each of the five in at least a quarter of their combined pixels.

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

`src/ui/` draws six 24×24 class emblems (the Paladin since H54) and ten 12×12 status glyphs into `packages/art/ui/atlas.{png,json}`.
`spec.ts` pins the class/status keys; `atlas.ts` checks completeness, ids and native sizes before packing.
`pnpm art:draw` also writes `assets/previews/ui.png` (3×), `ui-1x.png` and `ui.html`, with named cards and native-size
class/stack examples. `pnpm test` checks glyph uniqueness, deterministic bytes and the saved atlas contract.
