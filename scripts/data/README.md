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
pnpm release:publish                # upload
```

Options: `--bucket` (or `UMA_RELEASE_BUCKET`), `--project` (or `UMA_GCP_PROJECT`), `--channel` (default `latest`),
`--release-dir`. Defaults are the platform project and bucket (`src/publish-cli.ts`).

The publisher checks the local release the way a client will (manifest version, every byte and SHA-256, every set,
the art index), lists the bucket once, uploads missing files with `--no-clobber`, uploads the manifest unless the
bucket has it (an existing one must list the same files), moves `channels/v1/<channel>.json` and reads it back. It
never deletes anything (P23). Every gcloud call is pinned with `CLOUDSDK_ACTIVE_CONFIG_NAME=default` and
`CLOUDSDK_CORE_PROJECT`; the active configuration is never read or changed.

## Safety and tests

`content/` and `.cache/` hold original-game data: never commit them, copy them into fixtures, or put them on a public
host. Tests use the invented records in `src/__fixtures__/` and `@luismlorenzana/uma-data/testing`, and never touch the
network.

```bash
pnpm --filter @uma-platform/data-pipeline lint
pnpm --filter @uma-platform/data-pipeline test
```
