# Illustrations (`illustrations`)

> **Status: 2026-11-14, live (P176): master data `e7cdecde7c15`, uma-data 1.8.0.** uma-farm's F84 opens its big
> moments onto these. The first Uma is character 1068: her 9 Farm Life splash scenes, 1672 × 941. Private: they show
> franchise characters, so they live in master data's private release only, never in git or uma-art.
> [Desktop page](previews/illustrations.html).

## What a character has

Her full-screen scenes, in the art pipeline's order (the order a gallery shows them). Each has:

| Field | Example | Notes |
|---|---|---|
| `id` | `confession-loving` | Hers, unique among hers: the universe's id without its `<her key>-splash-` prefix. A story names it to show this scene. |
| `title` | The art's own title | As Uma Character Art shows it. |
| `outfit` | `kimono` | Named as the dialogue portraits name outfits. |
| `moment` | `confession-yes` | The story moment it opens onto. |
| `approvedOn` | `2026-11-14` | The owner's approval. |
| `path`, `width`, `height`, `bytes`, `sha256` | | The release file, an opaque WebP at the art's own size. |

The moments, in story order: `meeting`, `beach`, `confession`, `confession-yes`, `wedding`, `wedding-night`,
`wedding-night-end`, `night-in`, `companion` (`ILLUSTRATION_MOMENTS`). The parser accepts new names in the same form
(lowercase words joined by hyphens), for moments and outfits, so a new one needs no uma-data release.

Character 1068's:

| Moment | Outfit | Her scene |
|---|---|---|
| `meeting` | spring | Greeting at the farm |
| `beach` | swimsuit | A day at the beach, sunbathing |
| `confession` | kimono | The confession, flustered |
| `confession-yes` | kimono | The confession, loving |
| `wedding` | wedding | The wedding, tearful joy |
| `wedding-night` | wedding-night | The wedding night, bedside, flustered |
| `wedding-night-end` | wedding-night | The wedding night, recline, loving |
| `night-in` | pajamas-playful | A quiet evening in |
| `companion` | pajamas-playful | Pajamas, a recline |

## Reading one

- `illustrationFor(ills, moment)`: her scene for a moment, the first in her order with it, or null.
- `illustrationById(ills, id)`: her scene by id, or null.
- `illustrationPaths(ills)`: every picture's release path.

## In master data

- The art index's `illustrations` map: character id → her manifest, `art/illustrations/<id>.<hash16>.json`.
- The manifest (`Illustrations`): `characterId`, `universe` (`farm-life`) and `scenes` (above), in order.
- The pictures: `art/illustrations/<id>-<scene>.<hash16>.webp`, **lossy WebP at quality 92**, with no alpha. A scene is
  only ever shown whole, never drawn over another picture, so lossless buys nothing visible: q92 is about a fifth of
  lossless's bytes (1068's 9: 3.1 MB against 15.2 MB, 296–412 KB each), and the pack refuses any scene that
  comes back under **38 dB** colour PSNR against its approved PNG (hers: 38.7–41.0 dB).
- `client.illustrations(manifest, art, characterId)` returns her manifest checked against the release (every picture
  listed, its bytes and SHA-256 as listed), or null. Each picture is then fetched and cached by hash through
  `client.file` (uma-kit's content client does it for the apps). Older clients ignore the map.
- Tests: `syntheticIllustrations(characterId, moments)` and `buildMemoryRelease(undefined, { illustrations })`.

## How illustrations get there

1. The art pipeline publishes a universe's approved splash art to the platform app's bucket with `pnpm art:push` (P175):
   each scene joins the universe's index, `art/universes/<universe>/index.json`, as `kind: "splash"`, its PNG under
   `images/`.
2. Each scene's moment goes in the private moments map, `content/authoring/illustrations/<universe>.json`
   (`{ universe, moments: { <the universe's id>: <moment> } }`), from the game's request. A scene it doesn't name stops
   the pack, so a new scene never goes out without its moment.
3. `pnpm illustrations:pack [universe]` (default `farm-life`) fetches the universe's index and the splash PNGs it lacks
   (`content/published/art/universes/<universe>/`), matches each character to master data by name, checks every file
   against the index's SHA-256 and size and that it is opaque, encodes it, decodes it back at its size within the floor,
   and writes the family into the local release.
4. `pnpm release:publish -- --illustrations-only` publishes latest plus the family to the `candidate` channel (with
   `--portraits-only` too, both families go in one release); `pnpm release:check -- --channel candidate --against latest`
   reads it back; `--promote <version>` moves latest.

The next Umas join the same way: the art pipeline publishes their scenes, the moments map names them, then steps 3 and 4.
