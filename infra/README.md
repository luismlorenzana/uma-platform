# Infrastructure

The platform's GCP project holds one thing: the private bucket with master data releases (architecture §2.2, §6).
Everything here was set up from the owner's machine with gcloud. **Local gcloud has two accounts and the active
configuration is the owner's work account: never change it.** Every command below is scoped with environment
variables; never run `gcloud config set`.

```bash
export CLOUDSDK_ACTIVE_CONFIG_NAME=default   # the owner's personal account
export CLOUDSDK_CORE_PROJECT=uma-platform
```

| Thing | Value |
|---|---|
| Project | `uma-platform` |
| Billing | The owner's billing account used by uma-racer (linked by the owner's approval) |
| Bucket | `gs://uma-platform-master-data`, `us-central1`, Standard, uniform bucket-level access, public access prevention enforced |
| Writers | The owner's account, through `pnpm release:publish` |
| Readers | Each game's API service account, `roles/storage.objectViewer` on the bucket only |

## Set-up (done once)

```bash
# Owner-approved: creates the project and links billing.
gcloud projects create uma-platform --name="Uma Platform"
gcloud billing projects link uma-platform --billing-account=<billing-account-id>

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
