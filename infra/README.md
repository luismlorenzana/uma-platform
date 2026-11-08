# Infrastructure

The platform's GCP project holds one thing: the private bucket with master data releases (architecture §2.2, §6).
Everything here was set up from the owner's machine with gcloud. **Local gcloud has two accounts and the active
configuration is the owner's work account: never change it.** Every command below is scoped with environment
variables; never run `gcloud config set`.

```bash
export CLOUDSDK_ACTIVE_CONFIG_NAME=default   # the owner's personal account
export CLOUDSDK_CORE_PROJECT=uma-platform-lm
```

| Thing | Value |
|---|---|
| Project | `uma-platform-lm` ("Uma Platform"; the ID `uma-platform` is taken globally) |
| Billing | The owner's "Amazon Card" billing account, the one uma-racer uses (linked 2026-10-10 with the owner's approval) |
| Bucket | `gs://uma-platform-master-data`, `us-central1`, Standard, uniform bucket-level access, public access prevention enforced, default 7-day soft delete |
| Writers | The owner's account, through `pnpm release:publish` |
| Readers | Each game's API service account, `roles/storage.objectViewer` on the bucket only |

## Set-up (done 2026-10-10)

```bash
# Owner-approved: creates the project and links billing. A billing account links at most 5 projects by default;
# the owner freed a slot first.
gcloud projects create uma-platform-lm --name="Uma Platform"
gcloud billing projects link uma-platform-lm --billing-account=0101E5-D99B49-A8B713

# Inside the project.
gcloud services enable storage.googleapis.com
gcloud storage buckets create gs://uma-platform-master-data \
  --location=us-central1 --default-storage-class=STANDARD \
  --uniform-bucket-level-access --public-access-prevention
```

## Give a game read access

When a game's API exists (uma-rpg in Phase 1), grant its Cloud Run service account read-only access to this bucket
and nothing else:

```bash
gcloud storage buckets add-iam-policy-binding gs://uma-platform-master-data \
  --member=serviceAccount:<api-runtime-sa>@<game-project>.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer
```

The game's API then reads `channels/v1/latest.json`, the manifest and `files/…` with its own credentials and serves
them through its logged-in endpoint (README "Use `@luismlorenzana/uma-data` in a game").

## Publish a release

```bash
pnpm release:publish -- --dry-run
pnpm release:publish
```

The publisher pins its own gcloud calls to the `default` configuration and the project (`scripts/data`), so it works
whatever the shell's active configuration is. If gcloud reports expired credentials, run
`CLOUDSDK_ACTIVE_CONFIG_NAME=default gcloud auth login` (the owner signs in; never automate it).

## Checks

```bash
gcloud storage buckets describe gs://uma-platform-master-data \
  --format="yaml(location,uniform_bucket_level_access,public_access_prevention)"
gcloud storage cat gs://uma-platform-master-data/channels/v1/latest.json
```

Nothing is ever deleted from the bucket (P23). If storage ever needs pruning, delete only objects that no manifest
under `manifests/` references, and never a manifest.

## Authoring backup (UA6)

The owner approved `gs://uma-platform-authoring` on 2026-11-08. It uses Standard storage in `us-central1`,
uniform access, enforced public access prevention, object versioning, default seven-day soft delete and label
`app=platform`. No service accounts were granted access. Never change the shell's active work configuration.

```sh
pnpm sprites:backup
CLOUDSDK_ACTIVE_CONFIG_NAME=default CLOUDSDK_CORE_PROJECT=uma-platform-lm \
  gcloud storage buckets describe gs://uma-platform-authoring --format=json
```

The script recursively rsyncs `content/authoring/` without destination deletion. It excludes rebuildable
`draw-things/models/`, `draw-things/bin/`, `node_modules/` and `.cache/` directories. The initial directory contained
about 35.4 GB logically, mostly downloaded checkpoint files and an unfinished sparse download; those caches
are excluded. Art, masters, raw generation outputs, configs, roster and reviews are included. Existing object
versions preserve overwrites. Run after every gate and at the end of each art packet.

Restore to a temporary directory first, then compare SHA-256 of every relative file against the original inventory:

```sh
CLOUDSDK_ACTIVE_CONFIG_NAME=default CLOUDSDK_CORE_PROJECT=uma-platform-lm \
  gcloud storage rsync gs://uma-platform-authoring/authoring/sprites/<id>/rN /tmp/authoring-restore/<id>/rN --recursive
```

Compare relative-path inventories and hashes before moving a restore into place. Never overwrite a surviving
revision or its approvals. To recover an overwritten roster/review, list object versions, copy the chosen generation
to the temporary directory, inspect it, and restore atomically. Do not delete backup objects as part of routine use.

Verified 2026-11-08: 6,508 live objects / 2,391,485,667 bytes; 2,404,753,077 bytes including noncurrent authored versions. A restored revision matched all 185 files (38,755,938 bytes) by SHA-256. All observed excluded cache generations and abandoned `gcloud/tmp/parallel_composite_uploads/` chunks were removed after stopping the original unfiltered process and workers. Default soft-delete retention remains seven days; deleted cache bytes expire after that window. Filtered backup subsequently exited successfully. Studio gate saves serialize this backup automatically.

Re-verified 2026-11-08 after UA5 (P101): no upload running; all versions listed show 6,508 live objects
(2,391,485,667 bytes) and 5 noncurrent authored versions (13,267,410 bytes), with **no object under an excluded path,
live or noncurrent**. The 102 removed model files (38,795,312,862 bytes) are only soft-deleted and expire on
2026-11-15; GCS can't purge them earlier, and the window costs about $0.18 once. A second revision, 113401 r2, restored
177/177 files identical by SHA-256 (36,400,573 bytes). `pnpm sprites:backup` then copied exactly the three files UA5
changed (`published.json` and both progress files).
