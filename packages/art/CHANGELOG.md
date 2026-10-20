# @luismlorenzana/uma-art

## 2.10.0

### Minor Changes

- Append ten original 32px tonic item icons, graded 1–10, without moving or repainting any published item frame.

## 2.9.0

### Minor Changes

- 8253e25: Add a native green Laurel currency wreath and the Battle terrain page: packed earth, trampled grass, sixteen flagstone masks and six drill-ground props. All published frame positions, metadata and pixels remain unchanged.

## 2.8.0

### Minor Changes

- f61920c: Add a dedicated 100-icon Star Gem atlas and append the Lapidary workshop without moving or repainting existing frames.

## 2.7.0

### Minor Changes

- 24d4c81: Append three currency marks, three tier crests and an ungraded Speed Ticket item for the Racer Home screen. Preserve all existing UI and item frame positions, metadata and pixels.

## 2.6.0

### Minor Changes

- e3b7967: Add Card Library, Gym, Racecourse and Trophy Hall buildings, plus the Racing page's mown turf, rail-edged track and props. Preserve every existing building and terrain frame and pixel.

## 2.5.0

### Minor Changes

- 19eba58: Append 120 original gear icons for Boots, Slippers, five Talismans and five Amulets (H28), preserving every existing gear frame and pixel.

## 2.4.0

### Minor Changes

- 6edf898: Add native 32px crenellated regular towers, elite towers and castles for compact stage maps in a separate world/stages-compact atlas. Retain every existing 64px structure, frame, painter and preview unchanged.

## 2.3.0

### Minor Changes

- Append native 64px thematic stage buildings for all nineteen biomes, with fully grayscale cleared variants and a four-tile frontier ring. Existing world frames retain their positions and pixels.

## 2.2.0

### Minor Changes

- 3fdb946: Append nineteen seamless 128×48 biome battle horizons to the world atlas. Frames backdrop/<biome> retain a transparent sky, two silhouette depths and a ground-blended foot. Existing frame positions and pixels stay unchanged. Consumers must read the world atlas dimensions from its index.

## 2.1.0

### Minor Changes

- 59a96cd: Append D103's eight armor pieces (Helm, Cuirass, Greaves, Gauntlets, Circlet, Robe, Leggings and Bracers), each in ten grades, to gear rows 26–33. The atlas grows to 320×1088; every existing frame position, material and pixel is unchanged.

  Garb, Leather Armor, Mail, Plate, Ring and Charm are retired game types, retained at their existing rows for consumers still using their art. Read the index or update the sheet height when adopting the new armor rows. No aliases or removals.

## 2.0.0

### Major Changes

- 2183563: Replace the 15-row gear atlas with 26 D86 rows (320×832; 32 px cells, grades 1–10 across). Consumers must update
  their gear row map and sheet height. In zero-based row order:

  - 0–4: greatsword, axe, lance, bow, katana.
  - 5–9: tome-fire, tome-ice, tome-lightning, tome-light, tome-dark.
  - 10–13: garb, leather, mail, plate.
  - 14–15: ring, charm.
  - 16–20: orb-greatsword, orb-axe, orb-lance, orb-bow, orb-katana.
  - 21–25: orb-fire, orb-ice, orb-lightning, orb-light, orb-dark.

  Remove short-sword, spear, mage-staff, arcane-staff, cleric-staff and summoner-tome frames. Add a cavalry Lance,
  the approved Katana, visibly graded elemental Tomes and ten distinct Orb symbols. Arms metadata uses ingots;
  Arcana uses cut gems; Garb uses planks with wood edging over its cloth body. The whole 9×9 accent corner is now
  transparent and checked by the gear build. No runtime changes or third-party art are included.

### Minor Changes

- 7c6ca50: Add the `fx` atlas family: 60 original 32×32 frames, four target-local hit poses and two idle familiar poses for
  each of Greatsword, Axe, Lance, Bow, Katana, Fire, Ice, Lightning, Light and Dark. Element colours match D86.

  Frame ids are `hit/<kind>-0…3` and `familiar/<kind>-0…1`. The JSON includes kind, group, frame number and centre
  anchors (16,16); all object outlines stay inside their cutout, with bounded glow. Final hit poses remain readable
  as static reduced-motion effects. Familiars are spectral Arms, a salamander, ice wisp, thunder hawk, light sprite
  and shadow cat. The game owns playback speed and summon lifecycle; it must retain its procedural fallback.

- 63b4f63: Add a ui atlas with five original 24×24 class emblems and ten 12×12 status badges, plus an index with native sizes and class/status keys.
- 8dab26b: Complete the world atlas with the other fourteen biomes and four ocean variants: nineteen distinct grounds, 57 props and nineteen icons, all code-drawn and deterministically checked.
- 50dfef6: Add the world atlas family (`world/atlas.png` and `world/atlas.json`) with 16 px terrain, native-size props and map
  markers. Liquid overlays use corner masks (NW 1, NE 2, SE 4, SW 8; frames 1–15), while roads keep edge-neighbour
  masks (N 1, E 2, S 4, W 8; frames 0–15). The index includes group, optional biome, and place/prop ground lines.

  H06 part 1 is the 194-frame five-biome visual gate: Meadow, Forest, Coast, Volcano, Glacier; all six liquids and
  three roads; all stage, frontier, Spring, flag and capital markers. Remaining biomes/ocean and complete sample-map
  layouts follow in parts 2–3. Claude versions and publishes only after the last milestone, not after this review gate.

- 6d0cd4e: Finish and document the world atlas compositions: nineteen frontier regions, a ten-band continent with forty plots and five Springs, and a five-island world, drawn deterministically from the same indexed frames consumers use.

## 1.1.0

### Minor Changes

- 11ca2de: Dish, gear, Hub building and Hub terrain atlases (P38).
