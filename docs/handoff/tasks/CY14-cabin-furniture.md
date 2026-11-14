# CY14 — The cabins' furniture, keepsakes and gifts as pixel art (uma-cyberpunk)

**uma-platform (`scripts/pixel-art`, uma-art) · Claude, code-drawn (P126, P147) · M · Needs: nothing · Unblocks: the
uma-cyberpunk packet that pins it, before its Phase 4 exit (CY19's play-through)**

> **Status: 2026-11-13, done (P164): uma-art 2.29.0** ([#86](https://github.com/luismlorenzana/uma-platform/pull/86); previews in `assets/previews/cabins.html`). Deviations, all accepted: the Brass Lamp is a wall sconce, the other lights hang from the ceiling; the Quilted Bed is seen from its foot; `foot` is on every room frame (a wall or ceiling piece's bottom edge). The request: The request is uma-cyberpunk's
> [art-requests/cabin-furniture.md](https://github.com/luismlorenzana/uma-cyberpunk/blob/main/docs/design/art-requests/cabin-furniture.md)
> (its CY14, D25, at 891e50e); the item table is its `packages/domain/src/cabins/items.ts` (ids, names, slots, styles,
> `DECOR_COLORS`). Original prop art: no Uma, no master data, so it is in git and in uma-art.

## What ships

Two new uma-art families, each the usual `atlas.png` and `atlas.json` (`{ schemaVersion: 1, width, height, frames }`,
frames keyed by the game's item ids), exported from `@luismlorenzana/uma-art`:

| Family | Frames | Cells | Frame fields |
|---|---|---|---|
| `cabin-icons` | All 48 items: 30 furniture, 6 keepsakes, 12 gifts, in the item table's order | 64 × 64, eight across (512 × 384) | `x, y, w, h, name, kind` (`furniture`, `keepsake`, `gift`), and `slot` and `style`, or `gift` (its kind) |
| `cabin-room` | The 30 furniture pieces at room size, for the diorama | Bed, Desk, Floor 150 × 150; Wall, Light 96 × 96 | `x, y, w, h, name, slot, style, mount` (`floor`, `wall`, `ceiling`), `foot` (`{ x, y, w }`: where a standing piece meets the floor, in the cell; a rug lies flat, its whole cell the footprint) |

A keepsake shows in the diorama by its icon (64 px), so it has no room frame; ask again if the diorama wants one.

## The look

- **Night and neon,** as the game's code-drawn marks: dark, cool shadows; each style's accent glowing where it makes
  sense (tubes, LEDs, screens, lanterns, fireflies) with a soft 1 px halo; a dark selective outline.
- **Three-quarter from the front and slightly above, light from the top left,** a soft contact shadow under standing
  pieces; wall pieces seen face on.
- **Each style by its colour pair** (`DECOR_COLORS`), base for the body and accent for the details, so a line of five
  reads as a set: Neon `#2a1640`/`#ff3dc8`, Classic `#4a3626`/`#e0b070`, Cozy `#5a3a46`/`#ffb3c1`, Sporty
  `#173a5a`/`#4fd1ff`, Tech `#1b2a33`/`#7cf2c8`, Wild `#26402a`/`#a6e36a`. Keepsakes and gifts have their own colours.
- **Native pixels at both sizes:** each piece is drawn at 64 and at room size, never resampled.

## The list

| Style | Bed | Desk | Wall | Floor | Light |
|---|---|---|---|---|---|
| Neon | Glow Pod Bed | Holo Desk | Neon Sign | Light-Grid Mat | Strip Lights |
| Classic | Oak Bunk | Writing Desk | Framed Print | Woven Rug | Brass Lamp |
| Cozy | Quilted Bed | Tea Table | Plush Shelf | Fluffy Rug | Paper Lantern |
| Sporty | Training Cot | Gear Bench | Race Poster | Stretch Mat | Track Light |
| Tech | Capsule Bunk | Console Desk | Wall Screen | Grid Floor Panel | Smart Lamp |
| Wild | Rope Hammock | Driftwood Desk | Vine Wall | Moss Rug | Firefly Jar |

Keepsakes: First Trophy, Crew Photo, Captain's Charm, Hand-Drawn Star Map, Old Race Ribbon, Pocket Radio. Gifts: Steamed
Buns, Fizz Candy, Mix Tape, Spare Earbuds, Grip Gloves, Tune-Up Kit, Tiny Succulent, Seed Packet, Paperback Novel,
Pocket Atlas, Enamel Pin, Postcard. The ids are the game's (`neon-bed`, `keepsake-photo`, `gift-buns`…); a renamed piece
keeps its id.

## Do

1. Painters in `scripts/pixel-art/src/cabins/`, with the item table copied (ids, names, slots, styles, colours) and the
   source commit noted.
2. Both atlases into `packages/art/cabin-icons/` and `packages/art/cabin-room/`, exports in uma-art's package.json; no
   other family's pixels change.
3. Tests: every id once at its size, deterministic, nothing touching its cell's edge, each furniture piece carrying its
   style's accent, silhouettes that differ within a line, room frames' `foot` inside the cell.
4. Previews: contact sheets at 1×, 2× and 4×, on night and light backgrounds, each line as a set, and a mock diorama
   (640 × 360) with one full line placed; a review page `assets/previews/cabins.html`.
5. A uma-art minor (changeset, `pnpm version-packages`), the README's section, a P-decision; message uma-cyberpunk the
   version.

## Done when

The release is out with both families, the previews are reviewed, and uma-cyberpunk has the version to pin.
