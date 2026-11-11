# SH2 — The Uma Platform app's cloud and deploy

**uma-platform's `infra/`, `.github/workflows/` and `docs/technical/` · Claude · M · Needs: SH1, the owner's go, then the
owner's two console entries · Unblocks: RK1 and CA1**

## Why

SH1 builds the app locally. This packet puts it at `uma-platform.web.app` in the `uma-rpg` project, following the
games' cloud plan ([platform-app/README.md](../../platform-app/README.md), AP7–AP13, P127).

## Context (read first)

- [platform-app/README.md](../../platform-app/README.md) §The cloud and §What it costs.
- uma-rpg's [cloud plan](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/design/cloud/plan.md), IN1–IN26.
- uma-quest's `infra/bootstrap.sh`, its deploy workflow and its
  [infrastructure.md](https://github.com/luismlorenzana/uma-quest/blob/main/docs/technical/infrastructure.md): the same
  pieces with `quest` names.

## Decisions made

- **The pieces (AP8):** site `uma-platform` (`uma-platform-lm` if taken, 20 versions kept), Firebase web app "Uma
  Platform web", Cloud Run `platform-api` (us-central1, min 0, max 1, 512 MiB, 1 CPU, public at the edge, created with
  Google's sample image, IN8), runtime account `platform-api-runtime`, deployer `platform-deploy`, image repository
  `platform` (keeps 3), provider `uma-platform` in pool `github-actions` (only `main` of
  `luismlorenzana/uma-platform`), label `app=platform`.
- **The bucket (AP9):** `gs://uma-platform-content`, us-central1, uniform access, public access prevented, versioned,
  labelled; `platform-api-runtime` is object admin on it.
- **Reads (AP11):** `platform-api-runtime` reads `gs://uma-platform-master-data` (granted in project `uma-platform-lm`,
  as the games' are) and `gs://uma-quest-content` under the condition
  `resource.name.startsWith("projects/_/buckets/uma-quest-content/objects/traveler-keys/")`. No database grant.
- **Sign-in (AP12):** the bootstrap adds the site's domain to Auth's authorized domains (add only). The owner adds the
  redirect URI and JavaScript origin in the console.
- **Every command is scoped** with `CLOUDSDK_ACTIVE_CONFIG_NAME=default CLOUDSDK_CORE_PROJECT=uma-rpg` (or
  `uma-platform-lm` for the master data grant). Never `gcloud config set`; never touch the games' pieces.
- **Deploy (AP7):** `deploy-app.yml` runs on push to `main` when `apps/**`, `packages/{kit,data,server,tiers}/**`, the
  lockfile or the workflow change; it lints and tests, builds, deploys `platform-api`, then `hosting:<site>`, and
  checks `/api/health` answers with the commit and `/api/master/…` answers 401 without a token. CI fails if
  `firebase.json`'s site and the workflow's differ (IN7). Repository variables as uma-quest's, with
  `HOSTING_SITE`, `MASTER_BUCKET`, `CONTENT_BUCKET=uma-platform-content` and `QUEST_CONTENT_BUCKET=uma-quest-content`.

## Do

1. `infra/bootstrap.sh`, idempotent (describe before create, grants re-applied as they are), printing the repository
   variables; run it once after the owner's go.
2. `apps/web/.env.production` with the web app's public config; `firebase.json` naming the site, with `/api/**`
   rewritten to `platform-api`.
3. `deploy-app.yml`; set the repository variables with `gh variable set`.
4. Isolation checks (AP13) with Policy Troubleshooter, recorded in the infrastructure doc.
5. `docs/technical/infrastructure.md` (new): every value, the bill, re-run and rollback. Add the platform app to
   architecture.md §1 and §6, and to uma-rpg's infrastructure doc's list of the project's apps (a one-line change in
   that repo, following its CLAUDE.md).
6. Ask the owner for the two console entries with the link; check sign-in once they're in.

## Done when

- `https://uma-platform.web.app` serves the SH1 home; `/api/health` answers with the commit; a signed-out call is 401
  and a wrong account 403.
- The owner signs in on the phone and sees the home.
- The isolation table is recorded; the cost table matches what was created.
- A Done row in the handoff, the roadmap's Phase 9 updated, and P127's state updated.
