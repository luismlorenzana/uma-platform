# The Uma Platform app

> **Status: 2026-11-11 (P127–P130): live at https://uma-platform.web.app** (SH1, SH2); the owner's two sign-in entries are in
> and Google accepts the redirect. **Uma Ranker is live (RK1, P131)**: Playable Umas per outfit on ten tiers, one art batch
> each, plus F for Umas not used, and 27 sisters ranked as Umas of their own (P131, P133, P138). **Uma Character Art is live (CA1, P135)**, laid out by the Ranker, with chibi sprites, support cards and source-art
> records (CA2, P136). **An Uma's page also shows her universe looks (CA4, P162):** the approved pictures of her in another
> world (Cyberpunk, Farm Life, High Fantasy), published from private authoring by `pnpm art:push`; 54 looks are live, 27
> each on Kitasan Black's and Almond Eye's pages (Cyberpunk 10, Farm Life 24, High Fantasy 20; P173), and Satono Diamond's 12 Farm Life looks with her 27 portrait pieces (P174). **Her dialogue portraits are published as pieces (CA5, P169):** each outfit's
> neutral crop and each expression's face, with a recipe for the games; her page shows the pieces, and the games compose the
> 384 Farm Life states. Every cloud value: [infrastructure.md](infrastructure.md). The owner's direction: an Uma Platform
> website in the `uma-rpg` project, with Google sign-in and the games' shell, where separate sub-apps open from tiles. It
> starts with the **Uma Ranker** (today's Studio boards) and **Uma Character Art** (uma-quest's Album, moved here).
> Visual page: [previews/platform-app.html](previews/platform-app.html).
>
> It builds on the cloud plan's IN1–IN26 ([uma-rpg's plan](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/design/cloud/plan.md)),
> uma-quest's [infrastructure](https://github.com/luismlorenzana/uma-quest/blob/main/docs/technical/infrastructure.md) and
> [Album](https://github.com/luismlorenzana/uma-quest/blob/main/docs/game/album.md) (its Q52, Q53, D46, D47), and
> [authoring/tiers.md](../authoring/tiers.md) (P113–P125). It adds AP1–AP52, and AP73–AP91 for the universe looks and portraits.
>
> **Uma Story is live (US1, P149)** at https://uma-platform.web.app/story: the third sub-app, one Story App for
> uma-quest's and uma-farm's stories, with three books (Cast, Quest, Farm) on one shared cast. Its page is
> [story.md](story.md) (AP53–AP72, [visual page](previews/story.html)). **It stops there for now (P150, local first):** the
> owner authors and reviews in the games' local Story Sandboxes, so US2–US4 are parked.

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
  | **Uma Ranker** | Every tier board online; Playable Umas per outfit on ten tiers, one art batch each, with sisters ranked as themselves (live) | RK1 ✓, then RK2, the pass after your ranking |
  | **Uma Character Art** | uma-quest's Album, moved here; then every Uma's chibi sprite sets, support card art and authoring inputs; then her approved looks in other universes, on her own page | CA1–CA3 ✓, CA4 ✓ |
  | **Uma Story** | uma-quest's and uma-farm's Story Sandboxes, moved here as three books on one cast: Cast, Quest, Farm ([story.md](story.md)) | US1 ✓ (live); US2–US4 parked, local first (P150) |
  | Uma Quest Art, Uma Farm Art, Uma Platform Art | Each game's and the platform's original assets, drawn from their releases | Later (GA1–GA3) |
  | Publish | Publish from your private authoring | Later (PB1) |

- **Your steps:** the go for the cloud (one word); then two entries in the Google Cloud console for sign-in, the same
  as uma-quest's (done); then the ranking itself, on the Ranker.

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
 art/universes/<universe>/   (CA4: index.json, images/<look>.<hash>.png)
   portraits/                (CA5: index.json, bases/ and faces/<piece>.<hash>.png)
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
| `gs://uma-platform-content` | ~0.27 GB (boards, 169 MB of franchise art, 53 MB of universe looks since CA4, 17 MB of portrait pieces since CA5) | 5 GB-months in us-central1, shared by every bucket on the billing account | $0 to $0.004 |
| Bucket operations | a few thousand reads, a few hundred writes | 50,000 Class B, 5,000 Class A | $0 |
| Pictures to your phone | first visit ~0.3 GB, then cached on the device | 1 GB from Cloud Run in North America | $0 |
| **Total** | | | **$0 to about $0.01**, under the project's $5 budget alert |

## Uma Ranker

| Id | Call |
|---|---|
| AP14 | **RK1 moves the boards online as they are:** the eleven boards, one scale (SSS on the two Uma boards only), keys `1`–`6`, notes, undo, drag and drop, the filtered bulk B or F, Left out, default outfits, import and export, the flow-down, the home's numbers and the plan (P113–P125). The pages are rewritten in React on uma-kit, with taps on a phone; the keyboard keys stay on desktop |
| AP15 | **The tier model becomes a workspace package,** `packages/tiers` (`@uma-platform/tiers`, private, not published): `tier-model.ts` and its tests move there unchanged, and the web app, the API, the local Studio and the sprite queue (TA2) all import it. It has no Node imports, so the browser and the server run the same code |
| AP16 | **The bucket becomes the source of truth.** RK1 uploads the eleven local boards at their current revisions once, then each save writes `ranker/boards/<board>.json` and rewrites `ranker/plan.json`. A rejected precondition returns 409, the same conflict the Studio raises today |
| AP17 | **Local tools keep their copy.** `pnpm ranker:pull` writes the online boards and plan to `content/authoring/tiers/` (the sprite queue, uma-quest's story sandbox and its `enemies:candidates` read them there), and the authoring backup keeps them. After RK1, the local Studio's board pages show a read-only notice with a link to the Ranker; its sprite tools (desk, field, queue, gates) stay local until the Publish sub-app. **Since P155 the pull mirrors the whole `ranker/` folder** (boards, profiles, plan, the enemy catalog, imports, hints, pictures and archive) into `content/authoring/ranker/`, additively, so the local app and every session on the computer read the live Ranker |
| AP18 | **Franchise imports stay local, then upload:** `pnpm tiers:import <franchise>` still downloads and cuts the images on this Mac, and `pnpm ranker:push` uploads the new images and lists to `ranker/assets/` and `ranker/imports/`, never overwriting an existing file. Uma art comes from master data |
| AP19 | **Amended by AP25 (P131):** the outfit split and the new ranking came into RK1 at the owner's word; RK2 is the pass after the ranking (AP36) |
| AP25 | **Playable Umas ranks every outfit on ten straight tiers, T1 to T10, each an art batch** (P131): schema 2, keys `1`–`9` and `0` for T1–T10, Backspace unranks |
| AP26 | **Up and down:** one place up or down crosses into the next tier at its edge (`[` `]`, ▲ ▼); a whole-tier step lands next to the boundary (Shift+`[` `]`, ⇈ ⇊) |
| AP27 | **Uma NPCs stays per character** on SSS to F; a character comes down when none of her own outfits is ranked; a sister has no NPC card |
| AP28 | **Sisters:** an outfit that is really another Uma, her sister running the same career in a fictional age, written by Claude in the private `ranker/profiles.json` (name, relation, age, profile). Eleven to start: 106802, 106803, 106702, 106703, 101003, 110802, 109402 (the owner's names) and 107702, 107703, 107602, 110502 (Claude's). The main Taiki Shuttle's default is her camping outfit, 101002 |
| AP29 | **The picks move to the profiles:** her default outfit (P125, `D`) and her playstyle pick (P117), one per character for every board |
| AP30 | **The move:** the old cast of 60, in its order, became each Uma's default outfit spread evenly, six a tier; everything else starts unranked with its old tiers as hints; the old board is archived; every lettered board moved unchanged |
| AP31 | **Careers:** every ranked Uma, sisters included, is a career of at least three bosses, counted as one pool |
| AP32 | **The plan, schema 2:** each outfit with its Uma and batch, `identities` in ranking order, and the ten `batches`. Character Art lays its album out by it |
| AP33 | **Store and tools as built:** `ranker/boards/`, `profiles.json`, `plan.json`, `legacy.json`, `catalog/enemies.json`, `imports/`, `assets/`; `pnpm ranker:seed`, `ranker:push`, `ranker:pull`, and `ranker:plan` (P138) |
| AP34 | **The Studio's boards retire:** its board links open the Ranker; the sprite tools and `pnpm tiers:import` stay |
| AP35 | **The plan is live while you rank;** a batch whose art has started is locked and never moves |
| AP37 | **Umas per tier** (P133): a strip of every tier's Uma count on the board, a count on each row, and Umas per tier first on the home; an Uma counts once per tier, and unranked means nothing ranked |
| AP38 | **F on Playable Umas** (P133): Umas not used, after T10, in no batch and not the cast; key `F`; its row starts collapsed |
| AP39 | **Eleven more sisters** (P133), named by Claude: 110602, 103103, 102602, 104002, 104003, 101602, 100402, 100602, 100603, 104502, 104503. Locked-in defaults stay the main Uma's; Royce and Royce has one outfit, so none; outfits keep their ranks |
| AP40 | **Landing pages show numbers, not explanations** (P133); the little to know sits behind the (i) |
| AP51 | **Five more sisters** (P138, P139), named by Claude: the alternates 100403, 103102, 101803, 109302, 107802, so every Uma in the ten batches is one card (100 Umas: 76 characters, 24 sisters; 27 sisters in all). **The base outfit is always the real Uma** (P139): a sister is an alternate outfit, so an owner's default-outfit lock on that outfit goes with it (Maruzensky's, Ines Fujin's); outfits keep their ranks |
| AP52 | **`pnpm ranker:plan`** (P138) rebuilds the bucket's plan as the Ranker does, for a change that went around the API (Claude's profile pushes); the Ranker's scripts run on Windows too |
| AP36 | **RK2, the pass after your ranking:** lock the ten batches as the art queue, revisit the sisters, point the sprite queue (TA2) at the plan. A later re-rank or a bigger change is a manual pass with Claude |

## Uma Character Art

| Id | Call |
|---|---|
| AP20 | **CA1 moves uma-quest's Album here, laid out by the Ranker** (AP32: the ten batches in order, each Uma and sister in ranking order, then the unranked): **Adult travelers** (each one's standing baseline stills, all twelve battle keys put together as the fight draws them, and her ten faces) and **Every Uma** (272 outfits by name, searchable, each with her portrait, bust, face, glass window, chibis A and B, and her character's face and four dresses). The code is copied from uma-quest at a recorded commit; the art is read at run time, hash-checked and kept on the device |
| AP21 | **The stands are full size, but waist up** (corrected by AP49): `outfit-portraits` and `character-dresses` and the chibis come from GameTora and the wiki at 512 px, the size of the originals (`scripts/assets/.cache`, 272 stands, 540 dresses, 536 chibis). The stand is a waist-up 3D render, so no picture showed an outfit head to toe until CA3 |
| AP22 | **CA2 adds what the Album doesn't show:** each outfit's chibi sprite set (`outfit-sprites`, played by action and facing, frame by frame); each character's support card art (`support-card-art`, by the card's `characterId`); and, for an adult traveler, her authoring inputs (the master data portrait and chibi, her approved chibi sprite, the shared references) with her source-art release (batch, date, approval, file count and hashes, from its manifest). The tar archives themselves aren't unpacked |
| AP41 | **Every Uma in the Ranker's order** (P135): T1 to T10, each outfit by her place, then the unranked, then F collapsed; a sister by her own name and profile; Every Uma is the first tab |
| AP42 | **The order is fresh on every load:** `/api/art/order` reads the Ranker's files in the bucket and master data, through the shared tier model |
| AP43 | **The Album's code is copied from uma-quest at `6c572e6`;** its key pack is read at `/api/art/content/…` with uma-quest's allowlist |
| AP44 | **Names and titles as the Ranker shows them,** the Global text first |
| AP45 | **Chibi sprites** (CA2, P136): each outfit with a master data sprite set plays every action at its own timings, with play, pause and frame steps |
| AP46 | **Support cards:** her character's cards, SSR first, with their art; a sister's page lists her sister's |
| AP47 | **Source art:** an adult set's release record from the master bucket's `source-art/` (release, approval, revision, personality, files, archive); archives never unpacked |
| AP48 | **The inputs:** her master data portrait and chibis, her approved chibi sprite, and the shared references (counted, inside the archive) |
| AP49 | **Full body** (CA3, P137): GameTora's full-body 3D render, head to toe, joins master data as `outfit-renders` (uma-data 1.5.0): 768×1024, transparent, lossless, every outfit. It's the first picture on an outfit's page. The still only: the idle animation stays out (your call) |
| AP50 | **No game reads it:** older uma-data parsers skip an unknown family, so the games stay pinned where they are; uma-quest's adult travelers take it as an authoring input |
| AP73 | **CA4 puts an Uma's universe looks on her own page** (P162): a "Universes" section under her full-body render, universe by universe (its style, count, revision and publish date), each look a card that opens full size. Never on a sister's page, and her tiles count her looks. There is no separate tab (the owner: "visible on a per-uma basis, on the same menu that shows the full uma input data") |
| AP74 | **The looks live in the app's own bucket,** `gs://uma-platform-content/art/universes/<universe>/`: an `index.json` and `images/<look>.<16 hex>.png`, the approved PNG byte for byte, so the published hash is the approved hash. Not master data (it stays neutral), not uma-art, not git |
| AP75 | **`pnpm art:push <universe>… \| --all [--dry-run]`** reads `content/authoring/character-universes/<universe>/approved/manifest.json` and sends only a look whose entry says the owner approved it and whose PNG still has the approved hash and size. It reads each upload back (size and MD5) before the index, which goes last under a generation check. Nothing is ever deleted: a look that leaves the approved set leaves the index, and its file stays |
| AP76 | **The API:** `GET /api/art/universes` reads every index on each request, so a push shows on the next load; the PNGs come through the art pack route (`/api/art/content/universes/…`), hash-named files only, owner only, checked against their hash and kept on the device |
| AP77 | **A look finds her Uma by name:** the manifest says "Kitasan Black"; the API matches it against master data's names (Global, English, Japanese), so the authoring files carry no game ids, and a name nobody has is simply shown on no page |
| AP78 | **The published flag is a record beside the manifest,** `approved/publication.json`, written by each push and by `pnpm art:status`: every look is `published`, `changed` (approved again with another picture), `unpublished` or `refused` (with the reason), with its date and bucket path. The manifest and the pictures are never touched |
| AP79 | **The local galleries show the flag:** `publication.js` and one shared `publication-flag.js` add a Published badge beside each look's Approved and a line under the page's header. The pages still open from the file system; the tool puts its two script tags back when a gallery is regenerated |
| AP80 | **The Local Art Gallery has a front page:** `pnpm art:gallery` (http://127.0.0.1:4323, launch config `art-gallery`) lists each universe with its approved and published counts and its study pages; this machine only, read only |
| AP81 | **Who pushes:** the owner's approval in the manifest is the go. ChatGPT runs the push as the last step of an approval (P147); Claude runs it on the owner's word, as for the first 30 ("help me by publishing all already approved images") |
| AP83 | **`--only <id|outfit>,…` changes only the named looks** (P168): a named approved look is published, a named published look no longer approved leaves the index, and every other look stays exactly as the bucket has it, published or not, at its published picture. A name that matches nothing stops the push. The owner's pajamas swap was the first: `pnpm art:push farm-life --only pajamas,pajamas-playful` |
| AP84 | **A failed gcloud call stops the tool** (P168): only "not found" (and a guarded write's lost race) is an answer; no gcloud, no sign-in or no network throws with gcloud's words, so `art:status` can never flag published looks as "not published" again |
| AP85 | **CA5 publishes a universe's dialogue portraits as pieces** (P169): each outfit's neutral crop and each expression's face, byte for byte under hash names, and a recipe, at `art/universes/<universe>/portraits/`. Farm Life: 24 crops and 30 faces (17.4 MB) make 384 states, where the flattened portraits would be 205 MB; a new outfit adds one crop per Uma, a new expression one face, instead of multiplying |
| AP86 | **The gate is the owner's approval record:** `dialogue-portraits/approval.json` binds each approved state to its crop's hash, its face's hash and its position; a piece goes up only when its file still has that hash, and a collection with any problem (a changed file, a retired or unknown outfit, a face off the crop, no owner approval) sends nothing |
| AP87 | **`pnpm art:push <universe> --portraits`** sends the whole approved collection (no `--only`), reads every piece back by size and MD5, writes the recipe last under a generation check and deletes nothing. The looks are untouched by it, and a looks push never touches the portraits |
| AP88 | **The recipe is for the games:** `GET /api/art/portraits/<universe>` returns every piece at its pack path, the characters with their master data ids, every state (crop, face or none, and where the face goes) and the blend rule (`round(base × (1 − a) + face × a)` per channel inside the face). The pieces come through the art pack route, hash-named only; the recipe never does |
| AP89 | **The flag:** `dialogue-portraits/publication.json` (published, changed, unpublished or refused), written by each push and by `pnpm art:status`; the approved gallery and the portraits gallery each show a "Dialogue portraits" line, and the Local Art Gallery's front page counts the states |
| AP90 | **Her page shows her pieces, never a composed state** (the owner: "just wiring and uploading the pieces is good enough", then "the pieces are visible in the page though right?"): under each universe, her outfit crops, then her faces on a checkerboard, each opening full size |
| AP91 | **A character's own collection is read like the shared ones** (P174): `<universe>/characters/<key>/active-study.json` names her active version (with the owner's approval of it), whose `manifest.json` holds her approved full-body looks (`fullBodyAssets`) and her portraits (`assets`, `faces`, each state approved). `art:push` adds her looks to the universe's index and `--portraits` her crops and faces to its recipe, under the same hash gate; a path that leaves her folder is refused. Her flags sit beside her active study (`publication.json`, `portraits-publication.json`), her album shows the badges, and the Local Art Gallery's front page lists her |
| AP82 | **Local dev:** a push also fills `content/published/art/`, the same files at the same paths, which the local app reads (`ART_DIR`) |
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
| RK1 | Uma Ranker: every board online, Playable Umas per outfit on ten tiers, sisters, the bucket store, `ranker:seed`, `ranker:push`, `ranker:pull`, the Studio's boards retired | Claude | L | SH2 ✓ | **Done** (P131) |
| RK2 | The pass after your ranking: lock the ten batches as the art queue, revisit the sisters, TA2 reads the plan | Claude | M | RK1 ✓, your ranking | After your ranking |
| CA1 | Uma Character Art: uma-quest's Album moved here, laid out by the Ranker | Claude | M | SH2 ✓, RK1 ✓ | **Done** (P135) |
| CA2 | Chibi sprite sets, support card art, authoring inputs and source-art releases | Claude | M | CA1 ✓ | **Done** (P136) |
| CA3 | Full body: the 3D render as master data's `outfit-renders`, shown in Character Art | Claude | S | CA2 ✓, your ask ✓ | **Done** (P137) |
| CA4 | The universe looks: `pnpm art:push`, `art:status` and `art:gallery`, the looks on each Uma's page, the published flag in the local galleries; 30 looks published | Claude | M | CA3 ✓, your ask ✓ | **Done** (P162) |
| CA5 | Dialogue portraits as pieces: `art:push --portraits`, the recipe route for the games, the pieces on each Uma's page, the flag in the local galleries; Farm Life's 54 pieces (384 states) published | Claude | M | CA4 ✓, your ask ✓ | **Done** (P169) |
| — | uma-quest: `/album` becomes a link here, and its Album code goes | uma-quest's session | S | CA1 live | Requested when CA1 lands |
| US1 | Uma Story's shell: the tile, the cast by batch, a plain reader for both games' drafts, your verdicts, `story:push` and `story:pull` ([story.md](story.md)) | Claude | L | Your go ✓ | **Done** (P149) |
| US2–US4 | The Cast book, the Quest book, the Farm book ([story.md](story.md)) | Claude | L each | Your ask | **Parked** (P150): local first |
| GA1–GA3, PB1 | The art sub-apps and Publish | Claude | — | Your ask | Later |

**Order:** SH1, SH2, RK1 and CA1–CA5 are done; RK2 follows your ranking; US1 is done and Uma Story is parked there (P150); GA1–GA3 and PB1 when you ask.

## Your steps

| When | What |
|---|---|
| ~~Now~~ Done 2026-11-11 | ~~The go for the cloud~~: "Go, start SH1" |
| ~~Now~~ Done 2026-11-11 | Two entries on the OAuth client in [the Google Cloud console](https://console.cloud.google.com/apis/credentials?project=uma-rpg): the redirect URI `https://uma-platform.web.app/__/auth/handler` and the JavaScript origin `https://uma-platform.web.app` |
| **Now** | **Rank** on [the Ranker](https://uma-platform.web.app/ranker): Playable Umas per outfit, T1–T10, and read the sisters on their cards |
| When each lands | A look at the Ranker and at Character Art on your phone |
