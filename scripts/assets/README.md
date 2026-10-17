# Asset pipeline

Builds the release's art from the master sets in `content/release/`: four icon atlases, per-record WebP art, and the
art index (`data/art.<hash16>.json`) the manifest points at. Ported from uma-racer's `scripts/assets`
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
```

**GameTora sources** (outfit icons and portraits, card icons and illustrations, skill icons, scenario crests) are
derived from record ids (`src/sources.ts`), downloaded at most 8 at a time (6 for full-size art) and cached in
`scripts/assets/.cache/<family>/`. A source GameTora lacks is skipped with a warning; games fall back to their own
drawing (P24). Scenario crests can be overridden by scenario id in `content/overrides/scenario-icons.json`
(`{ "icons": { "<scenarioId>": "https://…" } }`, P26).

**Wiki art** (chibis, outfit stands, faces) comes from the owner's local copy of the original's files, never fetched.
`--source dir:<path>` copies the roster's files into `scripts/assets/.cache/wiki/` once; later runs build from that
cache. Chibis are matched through `Outfit.costumeId`. With nothing staged, these families keep what the release has.

**Busts** are cut from the portraits around the head band's centroid. Pin a misread one in
`content/overrides/bust-crops.json`: `{ "<outfitId>": { "cx": 0.5, "top": 0.02, "size": 0.6 } }`.

**Faces** are 192 px per-record WebPs cut from the same portraits. Their default square keeps the bust crop's centre,
uses 70% of its size and starts 2% down from its top. Pin an outlier in `content/overrides/face-crops.json` with the
same `{ "<outfitId>": { "cx", "top", "size" } }` shape. They remain per-record because the atlas writer's published
contract is fixed to 128 px frames; changing it for one family would repack or generalize that contract.

Atlas frames are 128 px on a 132 px grid (2 px transparent padding), in WebP pages up to 4096 px; a family that grows
past 961 frames gets more pages. Output files are content-addressed; rebuilt families replace their old files, other
families are kept as they are.

## Safety and tests

Never commit anything under `content/` or `scripts/assets/.cache/`. Tests generate tiny synthetic images with invented
ids and never contact GameTora.

```bash
pnpm --filter @uma-platform/asset-pipeline lint
pnpm --filter @uma-platform/asset-pipeline test
```
