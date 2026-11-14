# LK2 — The look pipeline: from one hand-built slice to scenes made as data

**uma-platform (uma-stage, the art tools, uma-art) · Claude · M · Needs: LK1's bar (the owner's verdict and the phone
run) · Unblocks: LK3 (each game's roll-out)**

> **Status: in progress (2026-11-14, P166).** LK1's look is the bar. Steps 1–3 (kit format v2, the importer, scenes as
> data) hold on any engine and go first; steps 4–6 wait for LK1's phone run, which decides three.js or LK4.

## Why

LK1 proved the look on two scenes built by hand in code (`packages/stage/src/look/town.ts`, `tavern.ts`): every house,
prop and light placed in TypeScript, the kit packed by a script that names its pieces in a list. That reaches the bar
once; it doesn't make the twentieth town. LK2 turns the slice into a pipeline a game session can use: kits as packs,
scenes as data, the look tuned per scene on a page and held by the look measures.

## What LK1 taught

| Lesson | Where it shows | What LK2 does |
|---|---|---|
| Draw calls, not pixels, are the first phone limit | The square was about 5,000 draws a frame on High until merged by material at load (about 690) | Batch at pack time per scene region, so the phone never merges; keep load-time batching as the fallback |
| A modular kit plus our own pixel textures reaches the references' palette and contrast | 6 of 8 look measures within range on the square, 5 of 8 in the tavern | Kit format v2 keeps CC0 or our own meshes as raw shapes and owns the textures at one texel density |
| The scene's light and grade are the "LUT per scene" | `SceneLight` in `scene.ts`: key, sky light, fog, sky, exposure, grade, rim | Presets in the scene's data, tuned on a page and saved, never edited in code |
| Cutaways and camera families are scene properties | The tavern hides a wall the camera stands behind; each scene has front, 3/4 and high presets | The scene format carries camera presets and wall facings |
| The pack keeps first loads small | 265 MB of CC0 source became a 3.2 MB glb (128-texel textures, quantized positions) | One importer for every kit, content-hashed, uploaded by release |
| Warm-over-cool runs high and the focus band strong | Every LK1 frame | Measures run on every saved preset; out-of-range values flagged before the owner looks |

## Decisions made

- **Kit format v2:** a kit is a glb pack (one node per piece, named) plus a JSON manifest: each piece's kind (2D, 2.5D or
  3D by the size rule, LR1), footprint on the 2 m grid, texel density, sockets (window, door, roof), tags and its source
  and licence. CC0 sources are recorded per piece.
- **The importer** is `pnpm look:pack` generalised: any kit's source folder and piece list in, a hash-named pack and
  manifest out, with batching groups precomputed.
- **Scenes as data:** a look scene is a design file: pieces placed on the grid, props, lights, the cast's spots, camera
  presets, wall facings and the light preset. `town.ts` and `tavern.ts` become the first two designs; the code that
  builds them becomes the loader.
- **Where packs ship:** the kits Claude authors (CC0 raw material, our textures) go to **uma-art** as original art (P147,
  P159); a pack that holds any non-CC0 or private material stays in master data's private release. Uma sprites never
  change place.
- **The look-tuning page:** the review app's panel, generalised: open a design, tune its light and grade, see the look
  measures beside the references, save the preset into the design.

## Do

1. Kit format v2 in `packages/stage/src/formats/` with its parser and tests; the LK1 kit described in it.
2. The importer: `scripts/look` packs any kit by its manifest; batching groups by material and region; the pack's
   manifest records sizes and hashes.
3. The look scene format and its loader; `town.ts` and `tavern.ts` ported to two design files, frames unchanged
   (captured before and after, compared by the look measures).
4. The look-tuning page (local), with presets saved into designs.
5. A third scene made only as data, in under a day: a forest path by day (the nature kit), to prove the pipeline.
6. Phone numbers from LK1's run folded into the tiers; the Look sub-app shows the third scene.

## Done when

- A new scene is a design file and a kit pack, no TypeScript; it loads in the Look sub-app.
- Every saved preset carries its look measures; the out-of-range ones are listed on the page.
- The kit pack and its manifest publish by release (uma-art), and a game can pin them.

## Deliver

Commits to `main`, a uma-stage minor with the formats and loader, a uma-art release with the first kit pack, a
P-decision, the handoff row flagged done, and LK3's packets (one per game) written from it.
