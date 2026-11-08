# UA6 — A backup for `content/authoring/`

**uma-platform, GCP project `uma-platform-lm` · Claude · S · Needs: the owner's yes (a new cloud resource) · Unblocks:
—**

> **The owner's yes comes first.** Ask in one line: "UA6 adds a private, versioned bucket backing up the sprite
> masters, configs and approvals, about $0 a month: go?" Wait for a yes.

## Why

`content/authoring/` holds what can't be rebuilt cheaply:
- the owner's roster;
- every generation master;
- every set's config;
- every approval.

It isn't in git, and nothing copies it ([pipeline.md](../../sprites/pipeline.md) §13, CR32). At the full roster it's
about 4 GB.

## Context (read first)

- [pipeline.md](../../sprites/pipeline.md) §3 and §10; [architecture.md](../../architecture.md) §6; `infra/README.md`.
- Scope every command with `CLOUDSDK_ACTIVE_CONFIG_NAME=default CLOUDSDK_CORE_PROJECT=uma-platform-lm`. Never run
  `gcloud config set`.

## Decisions made

- **The bucket:** `gs://uma-platform-authoring` (`gs://uma-platform-lm-authoring` if the name is taken), with:
  - region `us-central1`;
  - uniform access and public access prevention;
  - object versioning on, plus the default soft delete;
  - the label `app=platform`.

  No service account gets access; only the owner's account reads and writes it.
- **`pnpm sprites:backup`:** `gcloud storage rsync content/authoring gs://…/authoring --recursive`. It never passes
  `--delete-unmatched-destination-objects`, so the backup only adds and replaces, and versioning keeps the older bytes.
- **When:** after every gate decision and at the end of every art packet. UA7 onwards say so in their Deliver.
- **Restore** is written in `infra/README.md`: copy a folder back into a temporary directory, compare it, then move it
  into place.

**What it costs:**

| Piece | Free tier | Expected | A month |
|---|---|---|---|
| Storage, Standard, `us-central1` | 5 GB-months in US regions, shared by the billing account | ~0.2 GB now, ~4 GB at the full roster | $0, at most ~$0.08 if the free 5 GB is used elsewhere |
| Versioned older copies | Counted as storage | Small: art revisions are new files, not overwrites | ~$0 |
| Operations | 5,000 Class A and 50,000 Class B a month | A few thousand a backup at most | $0 |

## Do

1. Create the bucket with the settings above, and read them back with `describe`.
2. Add `sprites:backup` to `package.json` and the steps to `infra/README.md`.
3. Run the first backup, then restore one revision into a temporary folder and compare its bytes.
4. Add the bucket to architecture.md §6.

## Done when

- The bucket exists with versioning, uniform access and public access prevention.
- The first backup is complete, and a restored revision matches byte for byte.
- `infra/README.md` and architecture.md say how.

## Deliver

Commit to `main`, `feat(infra): …`. Log a P-decision (from P93, after fetching `main`). Delete this packet and move UA6
to Done in [the handoff](../README.md), with the bucket name and the first backup's size.
