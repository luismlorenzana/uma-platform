# The Uma Platform app

> **Status: 2026-11-11 (P127–P130): live at https://uma-platform.web.app** (SH1, SH2); the owner's two sign-in entries are in
> and Google accepts the redirect. RK1 and CA1 are next. Every cloud value: [infrastructure.md](infrastructure.md). The owner's direction: an Uma Platform
> website in the `uma-rpg` project, with Google sign-in and the games' shell, where separate sub-apps open from tiles. It
> starts with the **Uma Ranker** (today's Studio boards) and **Uma Character Art** (uma-quest's Album, moved here).
> Visual page: [previews/platform-app.html](previews/platform-app.html).
>
> It builds on the cloud plan's IN1–IN26 ([uma-rpg's plan](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/design/cloud/plan.md)),
> uma-quest's [infrastructure](https://github.com/luismlorenzana/uma-quest/blob/main/docs/technical/infrastructure.md) and
> [Album](https://github.com/luismlorenzana/uma-quest/blob/main/docs/game/album.md) (its Q52, Q53, D46, D47), and
> [authoring/tiers.md](../authoring/tiers.md) (P113–P125). It adds AP1–AP24.

## The short answer

- **One site, `uma-platform.web.app`, signed in with the same Google account as the games.** The home page is a grid of
  tiles, one for each sub-app, each showing its own live numbers. Each sub-app has its own route, its own API routes and
  its own code folder. A sub-app never imports from another one.
- **It lives in this repo** (`apps/web`, `apps/api`), so it uses the workspace packages directly: uma-kit's shell and
  sign-in, uma-data's release client, uma-server's owner guard and master data proxy, and the Studio's tier model.
- **The cloud is the games' pattern,** named `platform`: a Hosting site, a Cloud Run API, a runtime account, a deployer
  and one private bucket. There's no database: boards are small JSON files in the bucket, and the bucket's versioning
  keeps every old save. **About $0.01 a month** ([the bill](#what-it-costs)).
- **The sub-apps, in order:**

  | Sub-app | What | Packets |
  |---|---|---|
  | **Uma Ranker** | The Studio's eleven boards, moved online as they are; then Umas split by outfit again, with the new ranking you describe | RK1, then RK2 |
  | **Uma Character Art** | uma-quest's Album, moved here; then every Uma's chibi sprite sets, support card art and authoring inputs | CA1, then CA2 |
  | Uma Quest Art, Uma Farm Art, Uma Platform Art | Each game's and the platform's original assets, drawn from their releases | Later (GA1–GA3) |
  | Publish | Publish from your private authoring | Later (PB1) |

- **Your steps:** the go for the cloud (one word); then two entries in the Google Cloud console for sign-in, the same
  as uma-quest's; then, for RK2, how the new Uma ranking should work.

## What it looks like

```text
uma-platform.web.app   (Google sign-in, owner only)
┌──────────────────────────────────────────────────────────────┐
│  Uma Platform                                  [account]      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ Uma Ranker   │ │ Character Art│ │ Quest Art    │  later…   │
│  │ 135 Umas     │ │ 272 outfits  │ │ (GA1)        │           │
│  │ 60 in cast   │ │ 10 adult sets│ │              │           │
│  └──────┬───────┘ └──────┬───────┘ └──────────────┘           │
└─────────┼────────────────┼────────────────────────────────────┘
          │ /ranker/…      │ /art/…
          ▼                ▼
   platform-api /api/ranker/…   /api/art/…   /api/master/…   (owner guard on every route but health)
          │                │                 │
          ▼                ▼                 ▼
 gs://uma-platform-content   gs://uma-quest-content         gs://uma-platform-master-data
 ranker/boards/*.json        traveler-keys/ (read only)     files/, manifests/, channels/
 ranker/plan.json                                           source-art/ (read only)
 ranker/assets/ (enemy art)
```

## The app

| Id | Call |
|---|---|
| AP1 | **One site, sub-apps inside it.** Each sub-app is a lazy route (`/ranker`, `/art`, …) with its own folder (`apps/web/src/apps/<id>/`), and a NestJS module under `/api/<id>/…` (`apps/api/src/<id>/`). A sub-app imports only the shell, sign-in and the content client, never another sub-app; a test checks the imports. It can be split into its own site later without a rewrite |
| AP2 | **In uma-platform's monorepo,** not a new repo: `apps/web` and `apps/api` read uma-kit, uma-data, uma-server and the tier model as workspace packages, with no release step in between, and the later Publish sub-app can call the release scripts in the same repo. The repo is already private |
| AP3 | **The games' stack, copied from uma-quest at a recorded commit** (as its Q8 copied the fight engine): Vite, React 19, react-router 7, Firebase web sign-in, uma-kit's `AuthProvider`, `AppFrame`, `AccountBar` and `ContentProvider`; NestJS with uma-server's `/auth` (the owner guard) and `/content` (the master data proxy). Local ports: API 8111, web 5204 (after uma-farm's 8101 and 5194) |
| AP4 | **The home page is tiles,** one per sub-app, each with a few live numbers from its own API (`GET /api/<id>/summary`). A sub-app that isn't built yet isn't shown. A wide layout for desktop; phones get one column |
| AP5 | **Owner only:** the same Firebase Auth and allowed email as the games (IN3), uma-server's guard on every route but `/api/health` |
| AP6 | **Nothing private in git:** names, art, boards and imports are read at run time from the buckets. uma-quest's private-content check is copied for `apps/`, and the Studio's tests keep using invented records |
| AP7 | **Deploys on push to `main`** when `apps/` or a package they use changes: a new `deploy-app.yml` signs in keylessly as `platform-deploy`, deploys `platform-api` and then `hosting:uma-platform`, and checks health against the commit. Package releases and master data are unchanged |

## The cloud

All in project `uma-rpg`, following IN1–IN26, with app id `platform` (IN4's names).

| Id | Call |
|---|---|
| AP8 | **The pieces:** Hosting site `uma-platform` (`uma-platform-lm` if taken, 20 versions kept); Firebase web app "Uma Platform web"; Cloud Run `platform-api` (us-central1, min 0, max 1, 512 MiB, 1 CPU, public at the edge, guarded); runtime account `platform-api-runtime`; deployer `platform-deploy` (scoped like `quest-deploy`); image repository `platform` (keeps 3); deploy sign-in provider `uma-platform` (only `main` of `luismlorenzana/uma-platform`); label `app=platform` on everything. An idempotent `infra/bootstrap.sh` creates them, every command scoped with `CLOUDSDK_ACTIVE_CONFIG_NAME=default CLOUDSDK_CORE_PROJECT=uma-rpg` |
| AP9 | **One private bucket, `gs://uma-platform-content`** (us-central1, uniform access, public access prevented, versioned): `ranker/boards/<board>.json`, `ranker/plan.json`, `ranker/assets/` and `ranker/imports/` (the franchise art and lists). The runtime account is object admin on it, and nothing else is |
| AP10 | **No Firestore database.** A board is about 10 KB; a write uses the object's generation as its precondition (`ifGenerationMatch`), which is the Studio's revision check, and versioning keeps every older board. A named database would cost a few cents a month for nothing more (Google's free Firestore quota covers only `(default)`) |
| AP11 | **What it reads:** master data, like the games (the runtime account is a reader on `gs://uma-platform-master-data`, which covers `source-art/`), and **uma-quest's key pack, read only:** a reader grant on `gs://uma-quest-content` limited by an IAM condition to `traveler-keys/`. This is a deliberate exception to IN2: the platform reads what the games publish. It never writes to a game's bucket, and never touches a game's database or saves |
| AP12 | **Sign-in:** the bootstrap adds `uma-platform.web.app` to Auth's authorized domains through the API. You add `https://uma-platform.web.app/__/auth/handler` to the OAuth client's redirect URIs and `https://uma-platform.web.app` to its JavaScript origins (IN13; the console has no API for it) |
| AP13 | **Isolation is checked, as IN21 says:** Policy Troubleshooter confirms `platform-api-runtime` can reach its own bucket and read master data and `traveler-keys/`, and is refused on every database, `gs://uma-rpg-content` and the rest of `gs://uma-quest-content`. It also confirms `platform-deploy` can deploy only `platform-api` and its own images |

### What it costs

| Piece | Size | Free tier | Cost a month |
|---|---|---|---|
| Hosting site | ~2 MB of app | 10 GB stored, 360 MB a day transferred | $0 |
| `platform-api` (owner only, min 0) | a few thousand requests | 2M requests, 180,000 vCPU-s, 360,000 GiB-s | $0 |
| Image repository, last 3 images | ~0.15 GB | 0.5 GB, shared with the games' three repositories (0.37 GB today) | ≤$0.01 |
| `gs://uma-platform-content` | ~0.2 GB (boards, 169 MB of franchise art) | 5 GB-months in us-central1, shared by every bucket on the billing account | $0 to $0.004 |
| Bucket operations | a few thousand reads, a few hundred writes | 50,000 Class B, 5,000 Class A | $0 |
| Pictures to your phone | first visit ~0.3 GB, then cached on the device | 1 GB from Cloud Run in North America | $0 |
| **Total** | | | **$0 to about $0.01**, under the project's $5 budget alert |

## Uma Ranker

| Id | Call |
|---|---|
| AP14 | **RK1 moves the boards online as they are:** the eleven boards, one scale (SSS on the two Uma boards only), keys `1`–`6`, notes, undo, drag and drop, the filtered bulk B or F, Left out, default outfits, import and export, the flow-down, the home's numbers and the plan (P113–P125). The pages are rewritten in React on uma-kit, with taps on a phone; the keyboard keys stay on desktop |
| AP15 | **The tier model becomes a workspace package,** `packages/tiers` (`@uma-platform/tiers`, private, not published): `tier-model.ts` and its tests move there unchanged, and the web app, the API, the local Studio and the sprite queue (TA2) all import it. It has no Node imports, so the browser and the server run the same code |
| AP16 | **The bucket becomes the source of truth.** RK1 uploads the eleven local boards at their current revisions once, then each save writes `ranker/boards/<board>.json` and rewrites `ranker/plan.json`. A rejected precondition returns 409, the same conflict the Studio raises today |
| AP17 | **Local tools keep their copy.** `pnpm ranker:pull` writes the online boards and plan to `content/authoring/tiers/` (the sprite queue, uma-quest's story sandbox and its `enemies:candidates` read them there), and the authoring backup keeps them. After RK1, the local Studio's board pages show a read-only notice with a link to the Ranker; its sprite tools (desk, field, queue, gates) stay local until the Publish sub-app |
| AP18 | **Franchise imports stay local, then upload:** `pnpm tiers:import <franchise>` still downloads and cuts the images on this Mac, and `pnpm ranker:push` uploads the new images and lists to `ranker/assets/` and `ranker/imports/`, never overwriting an existing file. Uma art comes from master data |
| AP19 | **RK2 comes after RK1: Umas split by outfit again, and the new ranking.** Each outfit is ranked on its own; the character view and the plan are derived from her outfits. How the ranking works is your description, so RK2 is written from it |

## Uma Character Art

| Id | Call |
|---|---|
| AP20 | **CA1 moves uma-quest's Album here as it is:** **Adult travelers** (each one's standing baseline stills, all twelve battle keys put together as the fight draws them, and her ten faces) and **Every Uma** (272 outfits by name, searchable, each with her portrait, bust, face, glass window, chibis A and B, and her character's face and four dresses). The code is copied from uma-quest at a recorded commit; the art is read at run time, hash-checked and kept on the device |
| AP21 | **The full-body art is already full size.** The 3D full-body renders (`outfit-portraits` and `character-dresses`) and the chibis come from GameTora and the wiki at 512 px, the size of the originals on this Mac (`scripts/assets/.cache`, 272 stands, 540 dresses, 536 chibis), so master data already holds every input picture. No new store is needed |
| AP22 | **CA2 adds what the Album doesn't show:** each outfit's chibi sprite set (`outfit-sprites`, played by action and facing, frame by frame); each character's support card art (`support-card-art`, by the card's `characterId`); and, for an adult traveler, her authoring inputs (the master data portrait and chibi, her approved chibi sprite, the shared references) with her source-art release (batch, date, approval, file count and hashes, from its manifest). The tar archives themselves aren't unpacked |
| AP23 | **uma-quest's Album moves here once CA1 is live:** a uma-quest packet (its next Q number, written by its session) replaces `/album` with a link to the platform's Character Art and removes its Album code; its key pack and baseline stills stay, since the game plays them. Its infrastructure doc's "See it all" row points here |

## Later

| Id | Call |
|---|---|
| AP24 | **Later sub-apps, written as packets when you ask:** **GA1–GA3**, Uma Quest Art, Uma Farm Art and Uma Platform Art (every original asset each one uses, from the uma-art release and each game's private pack: kits, props, bubbles, icons, foes); **PB1**, Publish from your private authoring. Publishing needs the files on this Mac, so PB1 will read them from the authoring backup (`gs://uma-platform-authoring`) or through a local helper; it decides which, and it moves the Studio's approval pages online |

## The packets

| Id | What | Who | Size | Needs | State |
|---|---|---|---|---|---|
| SH1 | The app, local: `apps/web` and `apps/api`, the home tiles, sign-in (off locally), the master data proxy, the private-content check, `packages/tiers` | Claude | M | — | **Done** (P130) |
| SH2 | The cloud and the deploy: `infra/bootstrap.sh`, `deploy-app.yml`, the isolation checks, live | Claude | M | SH1 ✓, your go ✓, your console entries ✓ | **Done** (P130) |
| [RK1](../handoff/tasks/RK1-ranker-online.md) | Uma Ranker: the eleven boards online, the bucket store, `ranker:pull` and `ranker:push`, the local boards read-only | Claude | L | SH2 ✓ | Ready |
| RK2 | Umas split by outfit, and the new ranking | Claude | M | RK1, your description | Written from your description |
| [CA1](../handoff/tasks/CA1-character-art.md) | Uma Character Art: uma-quest's Album moved here | Claude | M | SH2 ✓ | Ready |
| CA2 | Chibi sprite sets, support card art, authoring inputs and source-art releases | Claude | M | CA1 | Written after CA1 |
| — | uma-quest: `/album` becomes a link here, and its Album code goes | uma-quest's session | S | CA1 live | Requested when CA1 lands |
| GA1–GA3, PB1 | The art sub-apps and Publish | Claude | — | Your ask | Later |

**Order:** SH1 and SH2 are done; RK1 and CA1 can run side by side now; RK2 and CA2 follow.

## Your steps

| When | What |
|---|---|
| ~~Now~~ Done 2026-11-11 | ~~The go for the cloud~~: "Go, start SH1" |
| ~~Now~~ Done 2026-11-11 | Two entries on the OAuth client in [the Google Cloud console](https://console.cloud.google.com/apis/credentials?project=uma-rpg): the redirect URI `https://uma-platform.web.app/__/auth/handler` and the JavaScript origin `https://uma-platform.web.app` |
| Before RK2 | How the new Uma ranking should work |
| When each lands | A look at the Ranker and at Character Art on your phone |
