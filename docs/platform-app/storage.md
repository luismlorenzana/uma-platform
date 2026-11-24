# Storage reporting and gallery efficiency

The signed-in [Storage Report](https://uma-platform.web.app/storage) shows cloud bytes by universe, purpose and bucket.
It separates live data, noncurrent versions and soft-deleted data. All quantities use binary units. This is an inventory,
not a billing invoice, and it does not include local-only universe-authoring workspaces.

## Collection and privacy

`scripts/storage/collect.mjs` inventories the six configured Uma buckets using object metadata. It downloads no images,
stories or source archives. Attribution uses fixed, known prefixes; neutral master data and ambiguous legacy backups
stay Shared. Duplicate-content estimates count identical live files at different paths without treating either copy as
disposable. Gallery copies and campaign copies occupy storage independently.

Each successful collection writes an immutable aggregate JSON under
`gs://uma-platform-content/reports/storage/snapshots/`. Snapshots contain no individual object paths or character names.
They include the previous collection's change and up to 31 daily history points. A failed or partial inventory publishes
nothing, leaving the previous successful report intact. The app identifies stale data after 36 hours.

The daily [collector workflow](../../.github/workflows/storage-report.yml) runs at 10:17 UTC and supports manual dispatch
on main. It uses `platform-storage-report`, an account separate from the API and deployer. Its custom role has only
`storage.buckets.get` and `storage.objects.list` on the six buckets. Object reads and new-object creation are restricted
to the report snapshot prefix. The workflow verifies that source-object reads are denied before publishing. It cannot
overwrite or delete existing report snapshots, modify lifecycle policies, read source contents or publish art.

The schedule is gated by repository variable `STORAGE_REPORT_ENABLED=true`. Keep it disabled until the identity is
provisioned and a manually dispatched workflow has verified source-read denials and report publication. Then enable
the variable with `gh variable set STORAGE_REPORT_ENABLED --body true` and run once more to publish the active status.
Snapshots explicitly say whether automatic updates are active; manual reports do not claim a daily refresh.

Provision the identity with `pwsh -File infra/storage-reporting.ps1` to review, then `-Apply` to provision. The existing
main-only Uma Platform Workload Identity provider supplies GitHub authentication. Every gcloud call specifies its
configuration and project; no active account or project is changed.

`pnpm storage:collect` writes a private local report to `content/reports/storage/latest.json` and its `snapshots/` child. Add `--publish` to create
a cloud snapshot. `STORAGE_REPORT_DIR` can point the local API at the `content/reports/storage` directory; the API reads
immutable snapshots from its `snapshots/` child in the same layout as the cloud. The report API is behind the existing
owner guard and has a bounded 60-second cache. Check for updates bypasses that cache; it does not start a new inventory.
The report's blob store explicitly allows uppercase letters in snapshot timestamps while retaining path traversal
checks. Other stores retain the default lowercase-only paths.

## Targeted retention

`pnpm storage:retention` inventories eligible versions and saves the before/after lifecycle plan privately under
`content/reports/storage/`. It changes nothing unless `--apply` is supplied. There are two target buckets:

| Bucket | Scope | Eligibility |
|---|---|---|
| `uma-platform-content` | Old JSON versions in `ranker/boards/`, `ranker/casts/`, `ranker/plan.json` and `ranker/profiles.json` | Noncurrent for at least 30 days **and** at least 50 newer versions |
| `uma-platform-authoring` | The same metadata under `authoring/ranker/` | Noncurrent for at least 30 days **and** at least 50 newer versions |
| `uma-platform-authoring` | `gcloud/tmp/` | Noncurrent for at least seven days |

Every managed Delete rule requires `isLive: false`. No live file can qualify. Art, authored source material, immutable
release files, campaign assets, story drafts and their historical versions are outside these scopes. The master-data
bucket and game buckets are not modified. Existing seven-day soft delete and object versioning remain enabled.

The tool refuses unfamiliar existing lifecycle rules, widened policy definitions or disabled recovery settings. Apply
uses the bucket metageneration as a precondition and sends only the lifecycle field, then verifies lifecycle, versioning
and soft-delete settings. Before-policy records support rollback. Google processes lifecycle rules asynchronously;
eligible versions may subsequently spend another seven days in soft delete before storage is reclaimed. The collector
never applies retention.

## Gallery loading

Character Art asks Cloud Storage for `index.json` names with server-side matching and a names-only response. It no
longer transfers metadata for every stored image to discover its catalogs. Pagination tokens remain included, even for
empty filtered pages. Enemy Art reads the selected Cyberpunk index directly, without listing its image directory.

The gallery routes and their landing summaries share a 15-second in-process catalog cache and simultaneous requests
share a single load. Failed loads are not cached. Explicit Refresh bypasses cached catalog results, retaining current
publishing and sister-identity resolution. Portrait and profile indexes load concurrently; profile-only catalogs remain
visible. Hash checks, owner-only access and publication filters remain in force.

Character and Enemy Art share a four-transfer image limit. Original approved bytes are still read and hash-checked by
the content clients, with the existing persistent image caches preserved. This bounds bursts without resizing, replacing
or moving authored art.

## Validation

The root test command includes the native inventory and retention tests. API and web suites cover aggregate validation,
partial snapshots, stale data, catalog-only queries, profile-only catalogs, cache expiry, explicit refresh, failure
recovery and bounded image transfers. All fixtures are small synthetic records. Live provisioning is validated by the
scheduled identity's source-read denials and its successful aggregate publication.
