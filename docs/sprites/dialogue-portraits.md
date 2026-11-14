# Dialogue portraits (`dialogue-portraits`)

> **Status: 2026-11-14, live (P170): master data `f4ca0273cb2b`, uma-data 1.7.0; a third Uma (1067) joined in
> `6983da0f6614` (P176).** uma-farm's F75 builds its dialogue on these. Three Umas by character id: 1068, 1129 and 1067,
> 12 bases and 15 faces each. Private: they show franchise characters, so they live in master
> data's private release only, never in git or uma-art. Her full-screen scenes are the sibling family,
> [illustrations.md](illustrations.md).

## What a character has

| Piece | One per | Size | Notes |
|---|---|---|---|
| **Base** | Outfit | 525 × 700, opaque | Her portrait in that outfit, her face neutral |
| **Face** | Expression | 224 × 224, alpha | Just her face in that expression, drawn to sit over any of her bases |

The outfits, in Farm Life's order: spring, summer, fall, winter, swimsuit, kimono, dinner, wedding, farm-work,
garden-party, pajamas-playful, wedding-night. The expressions: neutral (each base's own face, so no face picture), happy,
laughing, surprised, thinking, sad, angry, worried, determined, pouting, shy, tender, flustered, loving, tearful-joy,
sleepy. The parser accepts new names in the same form (lowercase words joined by hyphens), so a later outfit needs no
uma-data release.

## Drawing a state

The neutral state is the base alone. Any other draws its face over the base with the face's top-left corner at **that
base's face position**, no scaling or rotation, straight alpha: where the face's alpha a > 0, each colour channel becomes
`round(base × (1 − a/255) + face × a/255)`; the base is unchanged elsewhere. The position is per base because the art
pipeline fitted each outfit's head (they differ by a pixel or two).

`dialoguePortraitFor(portraits, outfit, expression)` returns the base, the face (null for neutral), the position and
what was drawn, falling back per picture: an outfit she hasn't got is her first in Farm Life's order; an expression she
hasn't got is neutral.

## In master data

- The art index's `dialoguePortraits` map: character id → her manifest, `art/dialogue-portraits/<id>.<hash16>.json`.
- The manifest (`DialoguePortraits`): `characterId`, `revision`, `approvedOn`, `base` and `faceSize` (`{ width,
  height }`), `bases` by outfit (`{ path, width, height, bytes, sha256, face: { left, top } }`) and `faces` by expression
  (`{ path, width, height, bytes, sha256 }`).
- The pictures: `art/dialogue-portraits/<id>-base-<outfit>.<hash16>.webp` and `…-face-<expression>.<hash16>.webp`,
  lossless.
- `client.dialoguePortraits(manifest, art, characterId)` returns her manifest checked against the release (every picture
  listed, its bytes and SHA-256 as listed), or null. Each picture is then fetched and cached by hash through
  `client.file` (uma-kit's content client does it for the apps). Older clients ignore the map.
- Tests: `syntheticDialoguePortraits()` and `buildMemoryRelease(undefined, { dialoguePortraits })`.

## How portraits get there

1. The art pipeline publishes a universe's approved portraits to the platform app's bucket:
   `art/universes/<universe>/portraits/` with an `index.json` (`kind: universe-portraits`: characters, bases, faces,
   and every state with the face's position), approved by the owner.
2. `pnpm portraits:pack [universe]` (default `farm-life`) mirrors that folder privately
   (`content/published/art/universes/<universe>/portraits/`), matches each character to master data by name, takes each
   base's face position from its approved states (one place per base, or it stops), checks every file against the index's
   SHA-256 and size, and writes the family into the local release as lossless WebP.
3. `pnpm release:publish -- --portraits-only` publishes latest plus the family to the `candidate` channel (with
   `--illustrations-only` too, both families go in one release);
   `pnpm release:check -- --channel candidate --against latest` reads it back; `--promote <version>` moves latest.

The next Umas join the same way: the art pipeline publishes them, then steps 2 and 3.
