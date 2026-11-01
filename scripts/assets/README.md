# Asset pipeline

Builds the release's art from the master sets in `content/release/`: four icon atlases, per-record WebP art, the
stained-glass windows, and the art index (`data/art.<hash16>.json`) the manifest points at. Ported from uma-racer's `scripts/assets`
(`origin/main`); the Princess Connect and Puzzles importers stayed behind. Families and sizes are in
[docs/master-data.md](../../docs/master-data.md#art).

## Run it

Import the data first; the art follows the records in the local release.

```bash
pnpm data:import
pnpm assets:import                                          # every family
pnpm assets:import -- --source dir:~/Documents/uma-content  # also stage the owner's wiki art folder
pnpm assets:import -- --families=skill-icons,outfit-busts   # rebuild only these families
pnpm assets:import -- --dry-run                             # report wiki coverage and gaps; write nothing
pnpm assets:import -- --refresh                             # download every GameTora source again
pnpm assets:bust-sheet                                      # review sheets in content/review/
pnpm assets:face-sheet                                      # every 192 px outfit face, labelled for review
pnpm assets:glass-sheet                                     # every window, labelled for review
pnpm uma:check                                              # what GameTora has that the local release lacks
pnpm uma:report                                             # what the local release adds to the published one
```

A new Uma goes through all of this in order: [docs/new-umas.md](../../docs/new-umas.md).

**GameTora sources** (outfit icons and portraits, card icons and illustrations, skill icons, scenario crests, chibis) are
derived from record ids (`src/sources.ts`), downloaded at most 8 at a time (6 for full-size art) and cached in
`scripts/assets/.cache/<family>/`. A source GameTora lacks is skipped with a warning; games fall back to their own
drawing (P24). Scenario crests can be overridden by scenario id in `content/overrides/scenario-icons.json`
(`{ "icons": { "<scenarioId>": "https://…" } }`, P26).

**Wiki art** (chibis, outfit stands, faces) comes from the owner's local copy of the original's files, never fetched.
`--source dir:<path>` copies the roster's files into `scripts/assets/.cache/wiki/` once; later runs build from that
cache. Chibis are matched through `Outfit.costumeId`, and a chibi the files lack is downloaded from GameTora by outfit
id, the same art at the same size. With nothing staged, these families keep what the release has.

**Busts** are cut from the portraits around the head band's centroid. Pin a misread one in
`content/overrides/bust-crops.json`: `{ "<outfitId>": { "cx": 0.5, "top": 0.02, "size": 0.6 } }`.

**Faces** are 192 px per-record WebPs cut from the same portraits. Their default square keeps the bust crop's centre,
uses 85% of its size and starts at its top, retaining the whole face, chin and ears with some air while leaving most
of the torso out. Pin an outlier in `content/overrides/face-crops.json` with the same
`{ "<outfitId>": { "cx", "top", "size" } }` shape. Any omitted field still uses the derived default. They remain
per-record because the atlas writer's published contract is fixed to 128 px frames; changing it for one family would
repack or generalize that contract.

**Windows** (`outfit-glass`) are baked from each bust by `glass/bake.py`, in Python because sharp can't segment an image;
the first run sets up its own environment in `.cache/glass-venv` from `glass/requirements.txt`. The art's shading bands
become the glass, large pieces are cut along the hair, and the face stays one sheet with the art kept on it, because
Voronoi and superpixel filters ruin anime faces. A bake takes about 6 seconds, so results are cached in
`.cache/outfit-glass/` by the code, source, crop, colours and pin: a run bakes only what changed, the same inputs always
give the same bytes, and changing `glass.py` rebakes everything (about 3.5 minutes). An import warns about a face whose
sheet covers under 3% or over 20% of the window, which means it was misread. Pin one in
`content/overrides/glass-pins.json`, as shares of the bust's side: `{ "<outfitId>": { "cx": 0.5, "cy": 0.6, "rx": 0.2,
"ry": 0.24, "tilt": 10 } }`. `tilt` is optional, in degrees clockwise.

Atlas frames are 128 px on a 132 px grid (2 px transparent padding), in WebP pages up to 4096 px; a family that grows
past 961 frames gets more pages. Output files are content-addressed; rebuilt families replace their old files, other
families are kept as they are.

## Safety and tests

Never commit anything under `content/` or `scripts/assets/.cache/`. Tests generate tiny synthetic images with invented
ids and never contact GameTora. The bake's own output is checked by eye on `assets:glass-sheet`; tests stand in for
Python, because CI has no original art to bake.

```bash
pnpm --filter @uma-platform/asset-pipeline lint
pnpm --filter @uma-platform/asset-pipeline test
```
