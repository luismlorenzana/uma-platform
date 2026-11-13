# Data pipeline

Turns GameTora's public datasets into neutral master sets in the local release (`content/release/`), and publishes the
finished release to the private bucket. Ported from uma-racer's `scripts/data` (`origin/main`); the racer-only
normalizers (flair, card focus, Spark Rivals, RPG, Puzzles) stayed behind. Field reference:
[docs/master-data.md](../../docs/master-data.md).

## Import

```bash
pnpm data:import                 # fetch GameTora's manifest, download datasets whose version changed
pnpm data:import -- --refresh    # download every dataset again
pnpm data:import -- --offline    # no network: the last cached manifest and datasets
```

Eight datasets: `character-cards`, `characters`, `support-cards`, `skills`, `races`, `racetracks`, `scenarios`,
`ura-objectives`. They're cached in `scripts/data/.cache/<dataset>.<version>.json`, one version each (P27).

`src/normalize/` turns them into the nine sets: `characters`, `outfits`, `support-cards`, `skills`, `scenarios`,
`races`, `tracks`, `courses`, `objectives`. A row missing a required field is skipped with a warning naming its id.
Every set passes the published `uma-data` parser before it's written, so a normalizer bug can't reach a release. The
import also warns when a set shrinks or fewer scenarios are out than in the last local release, and lists references
to records the source lacks (none today).

Output: `content/release/data/<set>.<hash16>.json` (`{ set, items }`, items sorted by id) and
`content/release/manifest.json`. The art index and art files written by `pnpm assets:import` are kept; stale set files
are removed. The same sources give the same bytes and the same release version.

## Publish

```bash
pnpm release:publish -- --dry-run   # verify and show the plan; writes nothing
pnpm release:publish -- --channel candidate   # upload everything, leave `latest` alone
pnpm release:publish                # upload and move `latest`
pnpm release:publish -- --rollback <version>  # point the channel back at a published release
pnpm release:publish -- --sprites-only --channel candidate   # latest plus the packed sprite sets (UA5)
pnpm release:publish -- --add-families=outfit-renders --channel candidate   # latest plus a new image family (P137)
pnpm release:publish -- --enemies-only        # latest plus the enemies set and enemy keys, to candidate (Q16, P152)
pnpm release:publish -- --enemies-only --local <dir> --channel dry-run   # the same into a local folder; uploads nothing
pnpm release:publish -- --promote <version>   # point a channel (latest by default) at a published release
pnpm release:check -- --channel candidate --against latest   # read a channel back like a game
pnpm release:check -- --channel candidate --against latest --added-families=outfit-renders
pnpm release:check -- --local <dir> --channel dry-run --against latest   # read a local folder first, then the bucket
```

**Sprite-only releases** (`--sprites-only`, P100) build on the published `latest`, not on the local release: every
file is carried byte for byte except the art index, which gains the `sprites` map of the sets `pnpm sprites:pack`
wrote into `content/release/`. The local release's master sets are never taken, so a GameTora refresh can't ride
along. Moving `latest` (a plain publish, `--sprites-only` or `--promote`) records the sprite revisions it serves in
`content/authoring/sprites/published.json`. The steps for a batch are in
[pipeline.md](../../docs/sprites/pipeline.md) §7, "Publishing a batch".

**Families-only releases** (`--add-families=<family,…>`, P137) also build on the published `latest`: every file is
carried byte for byte, and the art index gains only the named image families, read from the local release that
`pnpm assets:import -- --families=<family>` just wrote. A family `latest` already has is refused, so nothing a game reads
moves and a refresh of a published family never rides along. Check it with `--added-families=<family,…>`, which lets
the art index differ by those families and its `sprites` map only.

**Enemies-only releases** (`--enemies-only`, uma-quest Q16 part A, P152) also build on the published `latest`: every
file is carried byte for byte except the art index, which gains (or extends) the `enemyKeys` map, and the manifest's
sets gain or replace `enemies` only, both read from what `pnpm enemies:pack` wrote into `content/release/`. Earlier
enemy keys stay unless a newer revision replaces them. They go to the `candidate` channel unless `--channel` says
otherwise. The format and the steps are [enemy-keys.md](../../docs/sprites/enemy-keys.md) §9–§10.

**`--local <dir>`** (publish and check) puts a folder in the bucket's layout over the real bucket: a publish writes its
files, manifest and channel there and uploads nothing, and a check reads the folder first, then the bucket. It's how a
dry run is read back like a game without publishing (Q16 part A).

`release:check` loads a channel with the release client (every set and the art index, hash-checked), confirms the
bucket holds every file at its size, loads every sprite set with `spriteSet`, decodes and hash-checks each page, counts the `enemies` by tier, loads each
enemy key with `enemyKey` and checks her images (canvas, clear border, a boss's layers re-compositing), and
with `--against` confirms the other channel's files are carried byte for byte. It ends with `Check passed`.

Options: `--bucket` (or `UMA_RELEASE_BUCKET`), `--project` (or `UMA_GCP_PROJECT`), `--channel` (default `latest`),
`--release-dir`. Defaults are the platform project and bucket (`src/publish-cli.ts`).

The publisher checks the local release the way a client will (manifest version, every byte and SHA-256, every set,
the art index), lists the bucket once, uploads missing files with `--no-clobber`, uploads the manifest unless the
bucket has it (an existing one must list the same files), moves `channels/v1/<channel>.json` and reads it back. It
never deletes anything (P23). A rollback checks the bucket holds that manifest and moves only the pointer. Every gcloud call is pinned with `CLOUDSDK_ACTIVE_CONFIG_NAME=default` and
`CLOUDSDK_CORE_PROJECT`; the active configuration is never read or changed.

## Safety and tests

`content/` and `.cache/` hold original-game data: never commit them, copy them into fixtures, or put them on a public
host. Tests use the invented records in `src/__fixtures__/` and `@luismlorenzana/uma-data/testing`, and never touch the
network.

```bash
pnpm --filter @uma-platform/data-pipeline lint
pnpm --filter @uma-platform/data-pipeline test
```
