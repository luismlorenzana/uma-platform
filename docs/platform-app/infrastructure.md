# The Uma Platform app: infrastructure

> **Status: live since 2026-11-11 (SH2, P127).** Every value below exists and was checked. The design is
> [README.md](README.md) (AP7–AP13); the plan for every app in the project is uma-rpg's
> [cloud plan](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/design/cloud/plan.md) (IN1–IN26).

## The shared project

The app lives in GCP project **`uma-rpg`** (number 727687479415), beside uma-rpg, uma-quest and uma-farm, with every
piece its own (IN2). It shares the project's Firebase Auth (Google sign-in and the one allowed email), the
`github-actions` Workload Identity pool and the $5 budget alert (IN3).

**Never change the active gcloud account.** Scope every command:

```bash
CLOUDSDK_ACTIVE_CONFIG_NAME=default CLOUDSDK_CORE_PROJECT=uma-rpg gcloud run services describe platform-api --region=us-central1
```

Never touch the games' pieces: `(default)`, `quest`, `farm`, `rpg-*`, `quest-*`, `farm-*`, `github-deployer`, and the
`uma-rpg`, `uma-quest` and `uma-farm` sites.

## The pieces (created 2026-11-11 by `infra/bootstrap.sh`)

| Piece | Value |
|---|---|
| Site | `https://uma-platform.web.app`, Hosting site `uma-platform` (the name was free), 20 versions kept |
| Firebase web app | Uma Platform web (`1:727687479415:web:8db09dffb68ef21b684672`); its public config is in `apps/web/.env.production`, auth domain `uma-platform.web.app` |
| API | Cloud Run `platform-api`, `us-central1`, min 0, max 1, 512 MiB, 1 CPU, public at the edge, owner guard on every route but `/api/health`; `https://platform-api-727687479415.us-central1.run.app`, reached through the site's `/api/**` rewrite |
| Runtime account | `platform-api-runtime`: object admin on `gs://uma-platform-content`; reader of `gs://uma-platform-master-data`; reader of `gs://uma-quest-content` under the condition `resource.name.startsWith("projects/_/buckets/uma-quest-content/objects/traveler-keys/")` (AP11). No project role, so no database |
| Bucket | `gs://uma-platform-content`, `us-central1`, uniform access, public access prevented (enforced), versioned, `app=platform`: the Ranker's boards, plan and franchise art from RK1 |
| Images | Artifact Registry `platform`, keeping the last 3 |
| Deployer | `platform-deploy`: writer on `platform` images, admin of `platform-api`, user of `platform-api-runtime`, Hosting admin (project-wide, IN7; `firebase.json` names the site and `scripts/check-hosting-site.test.mjs` checks it) |
| Deploy sign-in | Provider `uma-platform` in pool `github-actions`, `main` of `luismlorenzana/uma-platform` only |
| Sign-in domain | `uma-platform.web.app` in Auth's authorized domains (added by the bootstrap). The OAuth client's redirect URI `https://uma-platform.web.app/__/auth/handler` and JavaScript origin `https://uma-platform.web.app`, added by the owner on 2026-11-11: Google accepts the redirect (its sign-in page opens "to continue to uma-platform.web.app", no `redirect_uri_mismatch`) |
| Label | `app=platform` |
| Local | API on 8111, web on 5204 (`.claude/launch.json`: `platform-api`, `platform-web`) |

**Repository variables:** `GCP_PROJECT_ID=uma-rpg`, `WIF_PROVIDER`, `DEPLOY_SA`, `ALLOWED_EMAIL` (uma-rpg's),
`MASTER_BUCKET`, `HOSTING_SITE=uma-platform`, `CONTENT_BUCKET=uma-platform-content`,
`QUEST_CONTENT_BUCKET=uma-quest-content`, `DEPLOY_ENABLED=true`.

## Deploys

`.github/workflows/deploy-app.yml` runs on a push to `main` that touches `apps/`, `packages/{kit,data,server,tiers}`, the
lockfile, `firebase.json`, `.dockerignore` or the workflow. It checks the repo's rules, lints, tests and builds the app
and its packages, builds the API image (`apps/api/Dockerfile`, the API's own install), deploys `platform-api`,
checks `/api/health` answers with the commit and `/api/master/…` answers 401 without a token and with a bad one, then deploys
`hosting:uma-platform` and checks the same through the site. `ci.yml` still checks the whole repo on every push.

## Isolation, checked 2026-11-11 (AP13, IN21)

Policy Troubleshooter (`gcloud policy-troubleshoot iam`) on buckets, services and image repositories. It doesn't accept
object names or Firestore databases, so the conditional read is stated from its binding, and the databases from the
runtime account having no project role at all.

| Account | Check | Answer |
|---|---|---|
| `platform-api-runtime` | read and write `gs://uma-platform-content` | Granted |
| | read `gs://uma-platform-master-data` | Granted; write: not granted |
| | read `gs://uma-quest-content` | Conditional: `traveler-keys/` only; write: not granted |
| | read `gs://uma-rpg-content`, `gs://uma-platform-authoring` | Not granted |
| | any Firestore database (`(default)`, `quest`, `farm`) | No project role: no `datastore.*` |
| `platform-deploy` | update `platform-api`; push to `platform` images | Granted |
| | update `quest-api`, `farm-api`, `rpg-api`; push to `quest`, `farm`, `rpg` | Not granted |

## What it costs

| Piece | Size | Free tier | A month |
|---|---|---|---|
| Hosting site | ~0.5 MB of app | 10 GB stored, 360 MB a day | $0 |
| `platform-api` | owner only, min 0 | 2M requests, 180,000 vCPU-s, 360,000 GiB-s | $0 |
| Images, last 3 | the API's whole install (about 280 MB unpacked) | 0.5 GB, shared with the games' three repositories (0.37 GB) | ≤$0.03 |
| `gs://uma-platform-content` | empty until RK1, then ~0.2 GB | 5 GB-months in us-central1, shared on the billing account | $0 to $0.004 |
| **Total** | | | **$0 to about $0.03** |

## Re-run and rollback

- **Re-run:** `CLOUDSDK_ACTIVE_CONFIG_NAME=default bash infra/bootstrap.sh` describes each piece before creating it,
  re-applies the grants as they are, and prints the web config and the repository variables. A second run on
  2026-11-11 created nothing.
- **Rollback,** in this order: set `DEPLOY_ENABLED` to false; delete the provider `uma-platform`; then `platform-api`, the
  `platform` images, `platform-deploy` and `platform-api-runtime` (removing its grants on the master bucket and on
  `gs://uma-quest-content`); the site `uma-platform` and the web app; the domain from Auth's list; and the bucket once
  its boards are pulled (`pnpm ranker:pull`, RK1).
