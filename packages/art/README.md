# @luismlorenzana/uma-art

Original art for the Uma games, drawn from code by `scripts/pixel-art` (`pnpm art:draw` rewrites it). Never edit the
files by hand.

- `items/atlas.png`: every item icon (32×32) on one sheet, ten grades across, one row per family side (raw, refined),
  then the ungraded Speed Ticket (A02), ten graded tonics (A04), three made-item grade rows and the Branch Gem (H73).
- `items/atlas.json`: `{ schemaVersion: 1, cell, width, height, frames }`, where `frames[itemId]` is
  `{ x, y, name, family, side, effect, grade, refined }`. Item ids follow uma-rpg's catalog (`docs/design/items.md`).
  Tonics add `{ x, y, w, h, name, kind: 'tonic', grade }`; made items add
  `{ x, y, w, h, name, kind: 'made', line, grade }`; the existing ticket keeps its ungraded metadata.

- `dishes/atlas.png` / `.json`: the 100 cooked dishes (32×32), one row per family with grades 1–10 across, then the
  Duo dishes and Feasts. Frames: `{ x, y, w, h, name, kind, grade, family? }` by uma-rpg dish id (`dish-<family>-<grade>`,
  `duo-…`, `feast-<grade>`).
- `gear/atlas.png` / `.json`: 56 rows × 10 grades (including six retained retired rows) (32×32), id `<type>-g<grade>`; the grade's material sets
  the fittings' colours, and since 2.15.0 each Arm also has a row in its own colour. Frames: `{ x, y, w, h, type, grade, slot, material }`. The bottom-right 9×9 stays clear for a game's
  accent mark.
- `gems/atlas.png` / `.json`: 100 Star Gems (32×32), a dedicated 320×320 sheet, keyed by uma-rpg gem id.
  Frames: `{ x, y, w, h, name, kind, grade, effects }`.
- `buildings/atlas.png` / `.json`: 51 shared Hub places (48×48), id = place id. Frames: `{ x, y, w, h, page,
  anchorY, smoke? }`: `anchorY` is the ground line, `smoke` a chimney top.
- `tiles/atlas.png` / `.json`: Hub terrain on a 16 px grid per page: `<page>/ground-0…3`, `<page>/path-<mask>` and
  `wilds/water-<mask>` (mask bits N 1, E 2, S 4, W 8), and props `<page>/<prop>` (16×16, tall ones 16×32). Frames:
  `{ x, y, w, h, page, kind }`.
- `ui/atlas.png` / `.json`: thirteen class emblems (24×24), ten status badges (12×12), four currency marks (16×16),
  three tier crests (12×12), four Rift front crests (16×16) and eleven achievement badges (24×24). The index is
  `{ schemaVersion: 1, width, height, frames }`, with `{ x, y, w, h, group, key }` by `class/<class>`,
  `status/<key>`, `currency/<key>`, `tier/<1…3>`, `front/<front>` or `achievement/<key>`.
  Classes: Recruit, Duelist, Acolyte, Caller, Apprentice; Brawler, Arms Spellblade, Tome Spellblade, Paladin, Cleric,
  Arms Summoner, Tome Summoner and Sorcerer. Read positions from the JSON. Debuffs: Armor Break, Mind Break, Enfeeble, Shatter and Hex;
  buffs: Brave, Faith, Aegis, Breaker and Clarity. Each has a distinct glyph; debuffs also have red-violet badges,
  buffs gold-teal. Render at native size or a whole-number scale. Keep full class names beside emblems and full
  status names in accessible labels; unknown statuses should retain the game's text fallback.

A bundler imports the files directly, e.g. Vite: `import atlasUrl from '@luismlorenzana/uma-art/items/atlas.png?url'`.

## The Healer Sanctum (H135, 2.17.0)

`healer-sanctum` appends after the Charm Forge at **(96, 384)**, native 48×48, `page: learning`, `anchorY: 44`,
without smoke. The buildings sheet stays **288×432**, now 51 frames; every older record and pixel is unchanged.

A wide white-stone temple stands on three steps, with four columns, open side bays, a dark cella doorway and a
low triangular pediment carrying a gold sun. Two braziers at its foot burn gold and violet, with static painted
glows at alpha 65 or less, two pixels clear of the edges. It has neither the Chapel's belfry nor the Bastion's keep.
The existing `knights-bastion` and `cleric-chapel` remain available, unchanged.

`healer-sanctum-2x.png` compares the Knight's Bastion, Sanctum and Cleric Chapel on Learning ground; the general
buildings contact sheet, named cards and Learning mock include the new temple. All other preview PNGs stay exact.
The published-sheet baseline and `sanctum.test.ts` guard old records/pixels, the new cell, deterministic drawing,
edge/glow clearance and distinct silhouettes. RPG H133 (or its first later adopter) pins this version and uses
`healer-sanctum` directly, dropping the keep override when the game's Sanctum exists.

## Wilds trios (H113, 2.14.0)

Eight new frames append after the Rift, growing the buildings atlas from **288×336 to 288×432**. All 42 older
frames retain their exact metadata and RGBA pixels, including the original `forge`, `workbench` and `arcane-armory`.
Read the atlas dimensions from JSON rather than retaining the old sheet height.

| Frame | Position | Smoke |
|---|---|---|
| `mine-workbench` | (0, 336) | Yes |
| `fields-workbench` | (48, 336) | No |
| `forest-workbench` | (96, 336) | No |
| `fishery-workbench` | (144, 336) | No |
| `den-workbench` | (192, 336) | No |
| `weapon-forge` | (240, 336) | Yes |
| `tome-forge` | (0, 384) | Yes |
| `charm-forge` | (48, 384) | Yes |

All eight are native 48×48, `page: wilds`, `anchorY: 44`. The five open timber sheds share a low shingle roof,
front bench and hanging trade sign, with grey/green/tan/blue/violet awnings and trade-specific tools and materials.
The forges have stone/brick kilns: a weapon rack and anvil, a peaked slate roof with open tome and violet runes,
and hanging gold pendants, respectively. These are distinct original designs, not aliases for the older workshops.

`assets/previews/buildings.html#wilds-trios` shows the fifteen places in Metal / Vegetables / Wood / Fish / Stone
rows, at **1.5 CSS pixels per art pixel**, with 112px names and connected paths around the middle buildings.
`wilds-trios-{1x,1.5x,3x}.png` provides the same composition without labels; `buildings-contact-3x.png` contains
all fifty old and new frames in atlas order. Placement, names and production rules remain game-owned.

## Racer Hub (A01, 2.6.0)

Four buildings append after the 36 RPG places, with `anchorY: 44`: `card-library` (`town`), `gym` (`learning`),
`racecourse` and `trophy-hall` (`racing`). Books and cards, athletic equipment, a roofed grandstand and a columned
trophy hall distinguish them from the RPG's magical/combat halls and ring stadium. None has a chimney or `smoke`.
The buildings sheet is **288×336**; all preceding positions and pixels are unchanged.

`racing` appends below the four preceding tile pages. It supplies four cool mown-turf `ground-0…3` variants,
sixteen raked-dirt `path-0…15` masks with white rail edging at the turf boundary, and four props: `rail` and
`flower-box` (16×16), `furlong-post` and `pennant` (16×32). The tiles sheet is **256×256**, 144 frames; all 120
preceding positions and pixels are unchanged. Ground variants share edge strips; joined paths have no rail across
the connection. Network layouts must never close a 2×2 road block. Tall props stamp one row above their foot cell.

`assets/previews/racer-buildings-2x.png` shows the additions above Stable, Observatory, Brawler Dojo and Scenario
Gate, left to right. `racing-tiles-2x.png` shows the terrain alone; `racing-hub-2x.png` composes all four Racing places
on a 12×22-tile sample, including the reused Scenario Gate and Tier Finale. These are review layouts, not game rules.
Vitest freezes every published 2.5.0 building/tile frame, metadata and RGBA byte in `buildings/legacy-2.5.0.json`.

## Racer marks (A02, 2.7.0)

The `ui` sheet grows from 120×36 to **120×52** without moving or repainting any class/status frame. The appended
row contains `currency/prize-money` (round gold coin with a horseshoe stamp), `currency/speed-ticket` (teal horizontal
lightning stub), `currency/uma-ticket` (vertical gold ticket with a transparent horseshoe punch), then `tier/1…3`
(bronze, silver, gold shields with one, two, three distinct pips). Currency marks are native 16×16; crests are 12×12.
Use a whole-number scale and retain full names/counts in the game's labels; silhouettes and pip counts do not rely
on colour alone. Groups `currency` and `tier` extend the index's vocabulary; existing entries are unchanged.

The items sheet grows from 320×1024 to **320×1056**: `speed-ticket` appends at (0, 1024), still `cell: 32`.
Its entry is `{ x, y, name: "Speed Ticket", kind: "ticket" }`, **ungraded**, outside the material families. Existing
320 entries keep every field and pixel; consumers of grade/family metadata should filter material entries rather
than treating every item as a material. The 32px item and 16px HUD mark share an original code-drawn design, not a
resized bitmap. No game economy or ticket quantities live in the package.

`assets/previews/racer-marks-{1x,2x,4x}.png` shows Prize Money, Speed Ticket, Uma Ticket, Tier 1, Tier 2, Tier 3 in
that order, on the account bar's white panel (top) and inverse dark stage (bottom). `racer-ticket-items-2x.png`
compares the item to Wheat and Apple. `ui.html` labels every icon. H11's `ui.png` and `ui-1x.png` stay byte-identical.
`ui/legacy-2.6.0.json` and tests freeze both preceding sheets' positions, metadata and RGBA bytes.

## Racer tonic items (A04, 2.10.0)

Ten native **32×32** frames, `tonic-1` … `tonic-10`, append as a complete grade row at **y=1056**, x=0…288.
The items sheet is now **320×1088**, 331 frames. Every prior frame's position, metadata and RGBA pixels are
unchanged, including the Speed Ticket and the empty cells beside it. Consumers read dimensions from JSON.

The set uses one original, straight-shouldered stoppered flask with a large paper stride label. Herbal green liquid
and labels progress through teal, blue, violet and rose to gold. Lower-body ribs distinguish grades within each
finish; a neck ribbon appears at G4, a wax seal and metal cap at G7, silver at G8, gilding/shared legendary glints at
G9–10, and raised cap/base trim at G10. No fantasy-potion glow or borrowed infusion art. Metadata is art identity
only: names and grades, not recipes, costs or unlocks. Racer already looks up a tonic's own item id after pinning.

Standalone originals are in `assets/items/tonics/`. `assets/previews/racer-tonics-{32,64,128}px.png` show exact
1×/2×/4× on white above dark; each panel has G1–5, G6–10, then Honeycomb Cake, Apple Tart and Speed Ticket.
The 16px/24px sheets and labelled `racer-tonics.html` additionally check the compact chip sizes. Tests pin every
preceding item field/pixel, each fresh painter/standalone/atlas cutout, colour-independent structural differences,
legendary glint clearance, transparent borders and deterministic comparison sheets. Other art families are unchanged.

## Made items (H73, 2.13.0)

Thirty-one native **32×32** frames append after the tonics: `weapon-gem-g1…g10` at **y=1088**,
`armor-fittings-g1…g10` at **y=1120**, `accessory-setting-g1…g10` at **y=1152**, then `branch-gem` at
**(0, 1184)**. The items sheet is **320×1216**, 362 frames. Made metadata is art identity only:
`{ x, y, w: 32, h: 32, name, kind: 'made', line, grade }`; Branch Gem uses grade 5 and its own `branch-gem` line.

Weapon Gems are pointed faceted stones with a crossguard-like clasp, rivets and short tang. Armor Fittings pair a
strap and buckle with a curved riveted plate; G6–10 grow the plate and add a set stone. Accessory Settings remain
visibly empty face-on bezel cups, progressing from wire and cord through prongs, silver filigree and gold. Grades
1–3 are rough/simple, 4–6 cut/cast, 7–8 mounted/silver and 9–10 gilded with the shared legendary glints. Branch Gem
is one teal-and-violet Y crystal held at its fork by a gold Weapon-Gem clasp. Every frame keeps a transparent 1 px
border and bottom-right 9×9 corner.

Standalone files are in `assets/items/made/`. `assets/previews/made-items-{1x,2x,4x}.png` repeats each line, Branch
Gem and a comparison strip on white and `#17202b`; `made-items.html` labels the same source-drawn icons. The 2.12.0
baseline freezes all 331 prior frame records and the complete old RGBA rectangle. Tests also pin order/positions,
standalones, atlas cutouts, structural grade differences, distinct G5 silhouettes, clear glints and repeatable sheets.

## Star Gems and the Lapidary (H29, 2.8.0)

The new **320×320** `gems` sheet follows uma-rpg's `GEM_IDENTITIES` order: eight ten-grade moon rows (HP, MP,
ATK, M.ATK, DEF, M.DEF, Speed, Limit), sixteen bridges, then four Sun prisms. IDs are `gem-<effect>-<1…10>`,
`gem-<a>-<b>-<3|7>` and `gem-sun-<4|6|8|10>`. Bridge pairs run HP–DEF, DEF–M.DEF, M.DEF–MP, MP–M.ATK,
M.ATK–ATK, ATK–Speed, Speed–Limit, Limit–HP, each G3 then G7. Rows 8–9 wrap every ten entries.

Each planet has a distinct silhouette and fixed colour: heart, drop, spear, star, shield, tablet, bolt, crescent.
Rough stones at 1–3 gain facets at 4–6, bronze/silver settings at 7–8, then gold and shared legendary glints at
9–10. Bridge crystals retain both planets' colours, with larger metal-mounted G7 twins. Gold Sun prisms gain
4/6/8/10 rays. Every frame reserves a fully transparent bottom-right 9×9 corner; build checks reject object or
outline intrusion rather than erasing it. Dishes and all existing item/gear art remain unchanged.

`lapidary` appends to buildings at **(192, 288)**, 48×48 with `anchorY: 44`, `page: wilds`, no smoke. Stone walls,
a copper/terracotta tiled roof, grinding wheel, gem sign and crystal bench distinguish this workshop from the
violet Arcane Armory and slate Forge. The buildings sheet stays **288×336**. Every prior building's metadata
and exact RGBA cutout is frozen in `buildings/legacy-2.7.0.json` and tested.

Review `assets/previews/gems-{1x,2x}.png`, labelled `gems.html`, `gems-planets-2x.png` (G8 against each planet's
map colour), and `lapidary-2x.png` (Workbench, Lapidary, Forge). Preview layouts are illustrative, not game rules.

## Laurel and Battle terrain (H31, 2.9.0)

`currency/laurel` is a native 16×16 green wreath, sharing the RPG's `#8fd18a` hue. It fills the previously empty
rectangle at **(84, 36)**; the UI sheet stays **120×52**, now 22 frames. All 21 preceding entries retain every
metadata field and pixel. `src/laurel.ts` paints at the target grid, like the shared ticket painter, not by scaling
a bitmap. Keep the game's currency name and count beside it.

The sixth terrain page, `battle`, appends below Racing: four packed-earth/trampled-grass `ground-0…3` variants,
sixteen flagstone `path-0…15` masks (N 1, E 2, S 4, W 8), and six props. `weapon-rack`, `crate` and `shield-stand`
are 16×16; `banner`, `training-dummy` and `torch` are 16×32, standing in the lower cell. The tiles sheet is now
**256×304**, 170 frames. All 144 preceding frames, their metadata and the old 256×256 pixels are unchanged.

`assets/previews/laurel-marks-{1x,2x,4x}.png` compares Prize Money, Speed Ticket, Uma Ticket and Laurels, in that
order, on white chips (top) and dark chips (bottom). `battle-tiles-2x.png` shows the terrain and furniture;
`battle-hub-2x.png` composes Scenario Gate and Tier Finale with all six props. Its 12×22 layout is for review,
not a game layout. Roads never close a 2×2 block; all furniture clears both footprints, names and paths.
`testing/legacy-h31-2.8.0.json` freezes both preceding atlases. Game wiring and package adoption stay with Phase A.

## The Rift (H38, 2.11.0)

uma-rpg's end-of-tier event (its D161). Original art in the world atlas's `rift` biome palette (indigo, lilac and a
`#cfb3ef` glow), so the Battle page building and the world map read as one place.

`rift` appends to buildings at **(240, 288)**, 48×48, `anchorY: 44`, `page: battle`, no smoke: a tall torn lens of
light over a cracked dark-stone dais, two leaning obsidian shards, floating rock chips and four rim stones lit steel,
violet, crimson and amber (the fronts, left to right). Its glow is painted in and keeps two pixels off every edge.
`battle` is a new buildings `page` value. The buildings sheet stays **288×336**, now 42 frames. uma-racer's
`tier-finale` and every other frame keep their place, metadata and pixels; uma-rpg points its own `tier-finale` place
at the `rift` frame.

The `ui` sheet grows from 120×52 to **120×140**, 37 frames; the old 120×52 is unchanged.

| y | Frames, left to right |
|---|---|
| 52 | `front/iron`, `front/arcane`, `front/duel`, `front/horde` (16×16, x = 0, 16, 32, 48) |
| 68 | `achievement/seal-iron`, `seal-arcane`, `seal-duel`, `seal-horde`, `rift-conquered` (24×24, x = 0…96) |
| 92 | `achievement/iron-will`, `arcane-purity`, `untouched`, `swift-convergence`, `bestiary` |
| 116 | `achievement/crossover` |

- **Front crests** differ by silhouette: a point-down broadsword (Iron), a long-rayed diamond star with two sparks
  (Arcane), one horned mask (Duel), three horned masks in a pyramid (Horde).
- **Seals:** a round wax seal in the front's colour with two ribbon tails, the crest pressed in. **Rift conquered** is
  the set's only crown, its band holding the four front colours.
- **Titles** share one swallow-tailed indigo banner on a gold rod and differ by pictogram: a gauntlet (Iron Will), a
  violet drop (Arcane Purity), a heart under a halo (Untouched), a winged hourglass (Swift Convergence), an open book
  with three claw marks (Bestiary), six pips in six hues (Crossover). Untouched is one badge for all four fronts;
  show the front's crest beside it.
- One frame per badge, no tints. Draw at native size or a whole-number scale (a cut-in at 4× holds up).

Review `assets/previews/rift-2x.png` (Scenario Gate, Tier Finale, Rift on Battle ground), `rift-battle-hub-2x.png`
(H31's review page with the Rift in the Tier Finale's lot) and `rift-marks-{1x,2x,4x}.png` (crests then badges on
white and `#17202b` chips); `ui.html` labels each one. `src/testing/legacy-h38-2.10.0.json` freezes every prior
`ui`/`buildings` frame and pixel.

## The Paladin (H54, 2.12.0)

uma-rpg's sixth class (its D160). `class/paladin` is a native 24×24 emblem at **(24, 116)**, the free cell beside
`achievement/crossover`: the class row at y=0 is full, and published frames never move. The `ui` sheet stays
**120×140**, now 38 frames; every 2.11.0 frame keeps its place, metadata and pixels.

A tall tower shield face on (flat top, rounded foot) in the Knight's Bastion banner's deep blue, with a gold rim and a
gold star boss; a sword's crossguard and grip rise behind its top edge. It's told apart by silhouette, not colour: tall
and upright with a cross on top, where the Cleric's is a small heater shield under a halo.

No new building: uma-rpg's Paladin Bastion draws the existing `knights-bastion` frame (the stone keep with the blue
banner and gold star, drawn with the Learning halls), unchanged.

Review `assets/previews/paladin-emblems-{1x,2x,4x}.png` (the six emblems in game order on white and `#17202b` chips)
and `paladin-bastion-2x.png` (Spell Blade Salle, Knight's Bastion with the emblem beside it, Cleric Chapel, on
Learning ground); `ui.html` labels it. `src/testing/legacy-h54-2.11.0.json` freezes the older frames.

## Classes v3 (H127, 2.16.0)

Seven native 24×24 class emblems append after the Paladin, growing `ui` from **120×140 to 120×164**, 45 frames.
Every older frame retains its metadata and pixels. The last cell at (96, 116) remains empty.

| Key | Position | Motif |
|---|---|---|
| `class/tomeblade` | (48, 116) | Mirrored Spellblade, violet blade and steel ring |
| `class/armsummoner` | (72, 116) | Mirrored Summoner, steel spirit, gold ellipse and warm halo |
| `class/recruit` | (0, 140) | Upright axe, hollow iron head and wood haft |
| `class/duelist` | (24, 140) | Slim iron sword, round guard and wood grip |
| `class/acolyte` | (48, 140) | Hollow heater shield and wood boss |
| `class/caller` | (72, 140) | Hollow iron ellipse and small parchment wisp |
| `class/apprentice` | (96, 140) | Closed wood book, hollow panel, parchment edge and iron clasp |

Tier 0 uses plain iron, wood and parchment, with no glow, gold, halo or rune marks. The hybrids share their mirrors'
geometry helpers and receive top-left light after mirroring. A blue-grey edge on Tome Spellblade's steel ring makes
the exchanged channel colours readable at native size. Sorcerer, Arms Spellblade and Tome Summoner retain the ids
`class/mage`, `class/spellblade` and `class/summoner`; their existing images do not change.

`classes-v3-emblems-{1x,2x,4x}.png` shows the five beginners above the eight Tier 1 classes in tree order, on white
and dark chips. `ui.html#classes-v3` labels all thirteen. Older preview PNGs stay byte-identical; the new baseline
and `classes-v3.test.ts` guard the old sheet, positions, mirrored silhouettes and channel contrast.

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

## D103 armor rows (H27, since 2.1.0)

H27 appends eight rows to the 2.0.0 gear sheet, growing it to **320×1088** without moving or repainting rows 0–25.

| Rows | Types, in order |
|---|---|
| 26–29 | `helm`, `cuirass`, `greaves`, `gauntlets` |
| 30–33 | `circlet`, `robe`, `leggings`, `bracers` |

Head, body, legs and arms share paired anchors/footprints. Physical pieces use the grade's ingot and hide colours;
magical pieces use cloth, cut gems and carved bone. Their construction changes at grades 4 and 7, and trim/rune glow
starts at 8, with the shared legendary glints at 9–10. Their `material` field names the primary drawing ladder:
ingots for physical, cut gems for magical, not the game's later recipe rules. Every frame keeps the full
bottom-right 9×9 transparent.

**Retired, retained:** Garb, Leather Armor, Mail, Plate, Ring and Charm (rows 10–15). These remain for existing
consumers; D103's armor is not aliased onto them. Consumers adopting the new rows must read the atlas height/index
rather than retaining the old 832px sheet height.

`assets/previews/gear-armor-d103.png` shows the new eight rows at 2× on the left and those six retired rows on the
right. Each side has grades 1–10 across. `gear-armor-d103-1x.png` shows just the new rows at native size;
`gear.html` provides labelled cards at both 1× and 3×. Tests freeze every 2.0.0 pixel row and frame metadata hash.

## Feet and defensive accessories (H28, 2.5.0)

Twelve rows append after Bracers, growing the gear atlas to **320×1472**. All first 34 rows keep their positions,
metadata and exact RGBA bytes, including every H27 piece and the six retired rows.

| Rows | Types, in order |
|---|---|
| 34–35 | `boots`, `slippers` |
| 36–40 | `talisman-vital`, `talisman-vampire`, `talisman-bulwark`, `talisman-iron`, `talisman-thorn` |
| 41–45 | `amulet-spring`, `amulet-siphon`, `amulet-veil`, `amulet-ward`, `amulet-mirror` |

Each row has grades 1–10. Physical gear uses the ingot ladder, magical gear the gem ladder with cloth detailing.
Feet share a staggered pair footprint; each pendant has its own silhouette. Finishes change at grades 4 and 7,
glow starts at 8, and glints at 9–10. Every corner stays transparent. Consumers must update their sheet height
and use the dedicated row, not borrowed Greaves/Leggings/Charm/Ring art. No gear stats or recipes live here.

`assets/previews/gear-d124-2x.png` and `gear-d124-1x.png` show the twelve rows in this order; `gear.html` has labels.
Tests pin all 2.4.0 frames/pixels and check each new silhouette, ten distinct grades and every saved atlas pixel.

## Colored Arms (uma-rpg D234, 2.15.0)

Ten rows append after the Mirror Amulet, growing the gear atlas to **320×1792**. All first 46 rows keep their positions,
metadata and exact RGBA bytes (`legacy-2.14.0.json`).

| Rows | Types, in order |
|---|---|
| 46–50 | `greatsword-hue`, `axe-hue`, `lance-hue`, `bow-hue`, `katana-hue` |
| 51–55 | `orb-greatsword-hue`, `orb-axe-hue`, `orb-lance-hue`, `orb-bow-hue`, `orb-katana-hue` |

Each Arm wears one color at every grade, as a Tome wears its element, beside its twin element's on the wheel: the
Greatsword orange (`#f0922e`, by Fire), the Lance green (`#46c05a`, by Lightning), the Axe purple (`#8466e8`, by Ice);
Light and Dark's pale and deep pair gives the Bow a pale jade (`#6fd6c0`) and the Katana a deep rose (`#d9437f`). The
same painters draw them, so each keeps its plain row's silhouette; the hilt, guard, eye, tips or vamplate are the
grade's ingot (copper to orichalcum), as a Tome's fittings are its grade's gem, and the legendary grades glow in the
Arm's own light. The colored Orbs wear the Arm's color with a white emblem, as the element Orbs do. The plain rows stay
for consumers that want metal by grade (`symbols.ts` exports `ARM_COLORS`).

## World atlas (H06, complete)

`world/atlas.png` / `.json` is an original-art family for the RPG's map screens. The family contains **502 frames**
(310 original map frames, 19 battle backdrops and 173 four-tile building/frontier frames): nineteen biomes, ocean,
six liquid families, three road materials, stage/frontier/Spring/flag markers and the capital. No placeholders.

The JSON is `{ schemaVersion: 1, width, height, frames }`; each frame is `{ x, y, w, h, group, biome?, anchorY? }`.
Coordinates are aligned to the 16 px grid, but frames have native sizes: ground/liquids/roads/icons/stages are 16×16,
tall props and place markers 16×32, capital 48×48, new stage buildings/frontiers 64×64. Props anchor at `h - 2`,
capital at y=44 and stage buildings at y=58. Consumers read the index;
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
| `stage/<biome>/<fight\|elite\|boss>-<locked\|open\|cleared>` | 64×64 original barracks, elite towers and strongholds; ground line y=58 |
| `stage/frontier-0…1` | 64×64 transparent frontier pulse rings |

### Four-tile destinations (2.3.0)

The 173 new frames append to the 2.2.0 sheet without moving or repainting any earlier frame. The atlas is now
**256×3792**. Read its dimensions from JSON. Stage buildings are authored at native 64px (4×4 tiles), not upscaled
16px symbols. All nineteen biomes have matching materials and roof/detail motifs. Open buildings have lit windows
and an open door; locked ones have dark windows and boarded doors. Cleared buildings are fully grayscale, including
their outline and shadow. Old stage markers remain available to existing consumers.

`stage-buildings-1x.png` and `stage-buildings-2x.png` show nine states per biome (rows in `BIOME_IDS` order;
columns fight/elite/boss × locked/open/cleared). `stage-buildings.html` labels each card.
`stage-buildings-sample.png` pairs open and cleared barracks/towers/strongholds for Meadow, Coast, Volcano,
Glacier and Underworld at 2×. Placement and game progression remain the consumer's responsibility.

`assets/previews/world.png` contains every frame at 3× plus nineteen regions, a ten-band continent and a five-island world. `world.html`
labels frames and shows 2× phone comparison plots/maps. `world-<biome>.png`, `world-continent.png` and `world-plots.png`
are separate 2× examples; `world-markers-1x.png` shows every marker at native size. The build checks every id/size,
ground seams, all corner/edge masks, and ground lines;
Vitest additionally pins non-overlap, seed repeatability, filled ponds, marker shapes, and connected no-loop roads.

`maps-full.ts` describes the cell/sprite/spot compositions for H07: 16×44 continent, forty 4×3 plots, five inter-band Springs, a 16×4 capital plaza; 16×22 world, five staggered 6×4 islands in their continents' two dominant biomes with corner-mask shores. `world-layouts.json` records the synthetic sample positions. No text is painted into the maps.

The complete H06 contract has 310 frames (including ocean); the 19 battle horizon strips are added separately by H08.

## Compact stage towers (2.4.0)

`world/stages-compact.png` / `.json` adds a **separate 256×704 sheet** of 173 native **32×32 (2×2-tile)** frames.
The existing world atlas, all 64px structures, painters and their preview PNGs/HTML remain exactly unchanged.
Use whichever structure family fits a screen; compact art is authored at 32px, never downscaled from the 64px set.

- `stage-compact/<biome>/<fight|elite|boss>-<locked|open|cleared>`: nineteen biomes × three silhouettes × three states,
  with ground line y=28. Regular stages are low square crenellated chess towers with stonework; elite towers retain
  their tall peaked roofs and bosses their three-tower castle. Cleared pixels are completely grayscale.
- `stage-compact/frontier-0…1`: native 32px transparent rings for the compact footprints.
- Same index schema as `world/atlas.json`; read the separate sheet's dimensions and coordinates from its JSON.

`stage-compact-{1x,2x}.png` and `stage-compact.html` show nine states per biome. `stage-compact-sample.png` pairs
open/cleared regular, elite and boss art for Meadow, Coast, Volcano, Glacier and Underworld at 3×.

## Battle backdrops (H08)

The world atlas also includes nineteen `backdrop/<biome>` frames, **128×48** each, bringing the family to **329**
frames on the 2.2.0 **256×976** sheet (2.3.0 appends buildings below it). The original 310 positions and pixels are unchanged. Read atlas dimensions from JSON;
do not retain the old 512px height in CSS backgrounds.

Each strip has a transparent sky, two silhouette distances, biome landmarks and a foot fading into the matching
native ground. Horizontal border RGBA bytes match exactly. `backdrops.png` / `backdrops.html` preview two adjacent
repeats at 2×. In a game, keep a sky gradient behind it, rest its foot at the rivals' floor line and tile the biome's
ground below. Draw this composition once per size, and darken the party's lower band for readable units and numbers.

## Battle effects and familiars

`fx/atlas.png` / `.json` adds 60 original 32×32 frames for the ten D86 damage kinds: Greatsword, Axe, Lance, Bow,
Katana, Fire, Ice, Lightning, Light and Dark. The sheet is 192×320: each kind has one row, four hit poses followed
by two idle familiar poses. Consumers use ids from the JSON, not row arithmetic.

- `hit/<kind>-0…3`: heavy crescent, cleaving arc, thrust spark, arrow burst, thin double slash, flame burst, shards,
  forked bolt, radiant star and violet implosion, respectively.
- `familiar/<kind>-0…1`: spectral Arms in a soft glow; Fire salamander, Ice wisp, Thunder hawk, Light sprite and
  Shadow cat for the elements.

The index is `{ schemaVersion: 1, width, height, frames }`. Each frame has
`{ x, y, w, h, group, kind, frame, anchorX, anchorY }`; centre anchors are always `(16, 16)`. Object/outline pixels
never touch the frame boundary; glow remains bounded to the same 32×32 cutout. These are target-local effects,
not screen-wide overlays, so they can fit two rows of foes. Familiar frames have a soft ground shadow.

Play hits in frame order 0–3; the last pose remains readable on its own for reduced motion. Familiar frames 0–1
alternate their bob/wing/tail pose. The game controls duration, battle speed, lifecycle, and procedural fallback;
there is no animation runtime in this package. H10's game integration follows publication of this family.

`pnpm art:draw` regenerates `assets/previews/fx.png` (3×), `fx-1x.png` (native size), and `fx.html`. The HTML preview
has 1×/2×/4× speed buttons and a reduced-motion final-pose toggle, and honours the OS preference as well. The build
checks every id, size, kind/frame, readable pose and unclipped outline; Vitest pins byte repeatability and every
checked-in index/frame. All art is drawn from code, with no third-party source images.
