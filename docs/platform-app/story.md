# Uma Story: one app, two books, one cast

> **Status: 2026-11-12: local first (P150).** The owner authors and reviews stories in the two local Story Sandboxes,
> so this site is **parked after US1**: US2–US4 are not being built, and the sandboxes don't retire. See
> [Local first](#local-first-p150). **US1 is live (P149) at https://uma-platform.web.app/story:** the tile, the cast by batch, and both
> games' drafts in a plain reader with your verdicts ([as built](#as-built-us1-p149)). US2–US4 are written. The owner asked for an intake of the two Story Sandboxes
> (uma-quest's and uma-farm's), a pass between them, uma-quest's planned story tasks mirrored for the farm where they
> fit, and whether it's time for one Story App with two sub-apps while each game's story is still written in its own
> Claude session. This page is the intake, the answer (yes), the calls **AP53–AP72** and the packets **US1–US4**, with
> the farm's mirrored packets (uma-farm F58–F60) and what changes in uma-quest's Q57–Q60. No character name or line of
> story is in git. Visual page: [previews/story.html](previews/story.html).
>
> It builds on [the platform app](README.md) (AP1–AP52), uma-quest's
> [story-sandbox.md](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/story-sandbox.md) (SB1–SB24) and
> [story-cast.md](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/story-cast.md) (SC1–SC22), and
> uma-farm's [F40](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F40-story-authoring.md)
> (RS1–RS20) and [F56](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F56-story-delivery.md).

## The short answer

- **Yes, centralize the tool, not the writing.** **Uma Story** becomes the platform app's third sub-app, at
  `uma-platform.web.app/story`, with three books: **Cast** (shared), **Quest** and **Farm**. Each game's story is still
  written in its own session, in its own repo's private folder, in its own format.
- **The two games already share one cast.** Both sandboxes were built on the same Studio export, and their 20 Umas are
  the same 20 characters. All 20 are in the Ranker's ten tiers. Each sandbox keeps its own copy of the faces, and each
  wrote its own relationships from the same real careers.
- **What's shared moves to the Cast book, written once:** who each of the 100 Umas is in any world (her personality, her
  career, her era and circle) and the real relationships among them. Each game then tells those in its own world.
- **Three stages, the same for both games:** draft (private, on the writer's machine), review (pushed to the
  platform's private bucket, read and judged in Uma Story), publish (the game's own release to its own bucket).
- **Four of uma-quest's six planned story tasks mirror to the farm:** the cast from the Ranker, tags, relationships and
  counts. The tournament rewrite and the world pack don't.
- **No new cloud resource and no access change.** The drafts go in the bucket the Ranker already uses; **$0 a month.**
- **Found on the way:** uma-quest's 20 story bibles had no backup. They're in the private authoring bucket since today.

## Local first (P150)

> **The owner, 2026-11-12, after US1 went live:** "I do all the story validation in the local apps that both the Farm
> session and the Quest session built out already", and "I want to focus on local authoring and local review first for
> sure". **This section is the plan of record. Where the sections below differ, this one wins.**

| What | Now |
|---|---|
| **Where stories are written and reviewed** | In each game's local Story Sandbox, as before. Neither retires: AP62 is withdrawn |
| **The site** (`/story`, US1) | Stays as built and costs nothing. It's for reading a draft away from the Windows PC. Nothing waits on it |
| **US2, US3, US4** | **Parked.** The sandboxes' pages are not rebuilt here, and there is no Cast book or cast session |
| **`pnpm story:push <book>`** | Optional: a backup of the text drafts, and what the site shows |
| **`pnpm story:pull <book> --drafts`** | Optional: takes the farm's drafts to the Mac for its publish (F56) |
| **Verdicts** | Saved by each sandbox in its own `reviews.json`, as before. A session doesn't need to pull anything to work |
| **The check report** (`checks.json`) | Not asked of either game now. The shape below stays for a later day |

**What the two games share, as local files on the Windows PC:**

| Shared | Where it is | Who writes it | Who reads it |
|---|---|---|---|
| The cast list: the Ranker's 100 Umas by batch | `content/authoring/tiers/plan.json` here (`pnpm ranker:pull`) | The Ranker | Both sandboxes' sessions |
| The pictures | uma-quest's pack, `content/stories/packs/` | uma-quest's Q57 | The farm's sandbox copies it (`pnpm stories:import-pack`), as today |
| Each Uma's personality | uma-quest's `content/stories/tags.json` | uma-quest's Q58 | The farm's story session, in place |
| Eras, circles and the real relationships, each with an `id` | uma-quest's `content/stories/relationships.json` | uma-quest's Q59 | The farm's story session, in place; its ties point at them (`from`) |

So uma-quest's Q57–Q60 stand as the owner directed them (its D50), every page built in its sandbox, and the farm's
F58–F60 read and count in the Farm Story Sandbox. The notes that moved pages here are withdrawn in both repos
(uma-quest D58, uma-farm D72).

**To come back to this plan:** the day you want to read and judge stories from your phone or the Mac, US3 and US4 are
written and waiting.

## The intake: the two sandboxes side by side

| | Uma Quest Story Sandbox | Uma Farm Story Sandbox |
|---|---|---|
| **The game's direction** | A campaign in a medieval world: a hero, five bosses, five chapters, tournaments under the real races' names | A romance simulation: you're the farmer, and every Uma has a 27-rung route to a wedding |
| **Where** | `uma-quest/tools/story-sandbox/`, `pnpm stories`, 127.0.0.1:4320 | `uma-farm/tools/story-sandbox/`, `pnpm stories`, 127.0.0.1:4321 |
| **Code** | About 2,270 lines of plain modules, no dependencies | About 2,430 lines, the same build, written as a sibling of uma-quest's |
| **A story is** | A **bundle**: one hero and five bosses | A **route**: 27 events, with her bible, her pair conversations and the household's scenes |
| **Cast today** | 20 heroes and 100 bosses (the Studio's SS export, 2026-11-09). Planned: the Ranker's 100 Umas (its D50) | 20 Umas from the same export: the same 20 characters |
| **Faces and art** | A private pack downloaded from public sources (`packs/ss-2026-11-09/`, 141 MB) | A copy of uma-quest's pack (`pack/ss-2026-11-09/`) |
| **The world** | `setting.json` and the world pack: 26 towns, 50 dungeons, 48 tourneys | `world.md`, a bible of about 1,850 words, and the town's original cast in git |
| **Relationships** | Ties (hero and boss), links (boss and boss), 25 crossings (hero and hero, from real races) | 31 ties among the 20, each with a kind, a strength and a line, from the same real careers |
| **Layers** | Placeholder (planned), skeleton, outline, bible, scripted | Skeleton, bible, pilot, waves |
| **Written so far** | All 20 at bible depth, 28 scenes, about 66,000 words; one story on the tournament shape | Layer 1: the world, 20 arrivals, 31 ties |
| **Script steps** | 15 kinds (line, emote, walk, camera, title, narrate, flashback, letter, boss…) | 9 kinds (say, choice, narrate, thought, place, flag, when, play…) |
| **Checks** | In the sandbox (`lib/model.mjs`) | In the game's own code (`story/authored.ts`): strict in the sandbox, partial in the game |
| **Your verdicts** | `reviews.json`, per story; none saved yet | `reviews.json`, per file and event; none saved yet |
| **Backup** | None until today; now `gs://uma-platform-authoring/stories/` (its SC22) | `gs://uma-platform-authoring/authoring/farm-story/2026-11-10/` |
| **How it reaches the game** | Later: scenes into the game's chapter files, names through its Q55 | F56: a hashed release in `gs://uma-farm-content`, served by farm-api; the bucket has your yes (its D60) |
| **Planned next** | Q57–Q60 (cast, tags, relationships, counts), then Q54 and Q55 | Your read of layer 1, then layer 2 |

### What they share, and what they don't

| Shared today, twice | Different, and staying so |
|---|---|
| The cast: the same 20 characters from one export | The world: a medieval campaign and a countryside farm |
| The faces and art: one pack, copied | What a story is: a bundle and a route |
| Who each Uma is: her canon personality and her real career | The script format and its checks |
| The real relationships behind the crossings and the ties | How the story reaches the game |
| The review loop: layers read one at a time, verdicts saved for the next session | Each game's own tags: a class and a story type; a calling, a favourite line and gifts |
| The tool: two sibling local pages with one design | Who writes it: one session a game |

## Uma Story

```text
 the cast session            uma-quest's story session        uma-farm's story session
 (uma-platform)              (uma-quest)                      (uma-farm)
      │ writes                     │ writes                         │ writes
      ▼                            ▼                                ▼
 content/authoring/story/cast  uma-quest/content/stories      uma-farm/content/story        DRAFT (private, local)
      │                            │                                │
      └────────── pnpm story:push <book> (the book's own check runs first) ──┘
                                   ▼
                 gs://uma-platform-content/story/{cast,quest,farm}/                          REVIEW
                                   ▼
        uma-platform.web.app/story   Cast │ Quest │ Farm   (your verdicts saved here)
                                   │
              pnpm story:pull <book>  (verdicts back to the writer; drafts to another machine)
                                   ▼
        uma-quest's release (later) ─► gs://uma-quest-content ─► uma-quest                    PUBLISH
        uma-farm's pnpm story:publish ─► gs://uma-farm-content ─► uma-farm
```

| Id | Call |
|---|---|
| AP53 | **Uma Story is one sub-app with three books.** One tile, `/story`, with `/story/cast`, `/story/quest` and `/story/farm` inside. The code is `apps/web/src/apps/story/` and `apps/api/src/apps/story/`, each with a `shell`, `cast`, `quest` and `farm` folder. A book imports the shell and the Cast book, never the other game's book; a test checks it, as AP1's does |
| AP54 | **Three books, three sessions.** The Cast book is written by a uma-platform session, uma-quest's stories by its story session, the farm's by its story session. A session writes only its own book's files. The app is where they meet, so no session carries another world in its context |
| AP55 | **Three stages for every book: draft, review, publish.** A draft is private files on the writer's machine. A review copy is those files in the platform's bucket, shown in Uma Story. A publish is the game's own release to its own bucket. A game never reads the review copy |
| AP56 | **The review copies live in the bucket the app already has,** `gs://uma-platform-content/story/<book>/`: private, versioned, readable only through the owner guard. Every push is also the backup |
| AP57 | **Checks run where the format lives.** Each game keeps its format and its validator in its own repo, because the game reads the same code. `pnpm story:push` runs the book's own check first and uploads its report (`checks.json`: each file's hash, every finding, each item's layer and the book's counts). The app shows the report and never re-implements a game's rules. A push whose report is missing or stale is refused |
| AP58 | **Your verdicts are the app's.** `story/<book>/reviews.json`, written through the API with the object's generation as the precondition (AP10's way). One verdict an item (a story, an Uma's bible, an event, a relationship): liked, rework or question, and a note. `pnpm story:pull <book>` brings them to the writer, who reads them before the next layer (SB13, RS17) |
| AP59 | **One set of layer words:** placeholder, skeleton, bible, scripted, published. Each book maps its own layers onto them (uma-quest's outline sits between skeleton and bible). Every book opens on the cast by batch, each Uma showing her layer, so an unwritten story is a full placeholder, not a gap |
| AP60 | **One stage, two readers; the formats stay apart.** The shell's player (portraits, the text box, choices, the log, auto) plays a plain list of steps. Each book turns its own steps into that list: uma-quest's 15 kinds, the farm's 9, with its plays as cards. RS18's "a later shared format" is dropped: the games are going different ways |
| AP61 | **Reading before a push:** run locally, the platform API reads the drafts folders in place (`STORY_QUEST_DIR`, `STORY_FARM_DIR`, `STORY_CAST_DIR`) and writes verdicts there, so "edit a file, come back to the page" still works |
| AP62 | **Withdrawn (P150): the local sandboxes stay,** as the owner's authoring and review tools. As first written: the local sandboxes retire when their book is live, as the Studio's boards did (AP34) and the Album (AP23). Each game keeps its check as `pnpm story:check`; `pnpm stories` opens the local app. Until then both sandboxes keep working, and nothing waits on the app |

## The cast book

| Id | Call |
|---|---|
| AP63 | **The cast is the Ranker's.** The Cast book reads the Ranker's plan and profiles fresh on every load, as Character Art does (AP42): 100 Umas in ten batches, 76 characters and 24 sisters, each sister under her own name. A game's cast is a slice of it: uma-quest's is all 100; the farm's is its 20 |
| AP64 | **Pictures come from master data,** as Character Art shows them (face, bust, full body), and the bosses' from the Ranker's `ranker/assets/`. The two downloaded packs retire with the sandboxes, and no picture is copied into `story/` |
| AP65 | **The cast book holds what's true of an Uma in any world** (private, `story/cast/`). `people.json`: her personality (uma-quest's 43, each mapped to one of the eight face types) and a career card (her classic year and era, her field, the races that made her), each with a one-line reason and a source. `relationships.json`: the eight eras, the circles inside them, and the real relationships (a kind, one line, a weight, the fact and where it was checked). No game's world is in it |
| AP66 | **A game's relationships point at the cast book's.** A uma-quest relationship and a farm tie carry `from: <relationship id>` when they retell a real one, and `source: story` when the game invented it. The line, the strength and what it does in the game stay the game's own. A real fact is checked once |

## Publishing

How the farm's story reaches the game is settled in F56 and the notes F40 gained while the romance core was built:

| Step | What happens | Where |
|---|---|---|
| 1 | `pnpm story:release` validates `content/story/` and **refuses a pack where any cast Uma lacks her bible or her arrival scene**. Routes, pair conversations and the household file may be partial | uma-farm, local |
| 2 | It writes an index, `story.json`, and each file named by its hash. The index lists which events are scripted, so the game knows without loading every route | `content/story-release/` |
| 3 | `pnpm story:publish` uploads the hashed files, then the index | `gs://uma-farm-content` (your yes, its D60) |
| 4 | farm-api serves them behind the owner guard; the web checks each hash and keeps it on the device | `/api/content/story.json` |
| 5 | The go-live turns the romance on, with save v4 and the wipe. Later waves of routes are new pack versions, with no code change | F56 |

Two things follow for the farm's writer:
- **The go-live needs all 20 bibles and all 20 arrival scenes,** not the three pilot routes. So the arrival scenes are
  written with layer 2, ahead of the pilot.
- **F56 waits for the pack "on this Mac", and the drafts are on the Windows PC.** The review copy closes that gap.

| Id | Call |
|---|---|
| AP67 | **The Farm book shows the release without new access.** `pnpm story:publish` leaves a receipt in the platform's bucket (`story/farm/published.json`: the index it published). The Farm book compares it with the review copy: for each Uma, in the pack, changed since, or not shipped; and whether F56's gate holds. The platform never reads `gs://uma-farm-content` |
| AP68 | **The bucket is the bridge between machines.** `pnpm story:pull farm --drafts` brings the reviewed drafts to whichever machine publishes. It never overwrites a newer local file |

uma-quest's stories have no release yet (its ST9). When they do, F56's shape is the model: an index, hashed files,
partial stories allowed, a wave as a new version. That's a note for its session, not a packet.

## The mirror: uma-quest's planned tasks, and the farm's

| uma-quest planned | What it is | Shared part, to uma-platform | uma-quest keeps | The farm's mirror |
|---|---|---|---|---|
| **Q57**, the cast | The Ranker's 100 in the sandbox, a new pack, 80 placeholders, stories by batch | The cast from the Ranker, pictures from master data, the batch view (US1, US3) | The placeholder layer in its checks, and 80 placeholder bundles | **F58:** the farm's cast on the Ranker |
| **Q58**, tags | A story class (40), a personality (43), a story type (13) for every Uma | The personalities (US2) | The class, which gives her Way, and the story type | **F59:** the farm's tag sheet: a favourite line, a season, a festival and a loved gift, each with a reason, beside the calling each Uma already has |
| **Q59**, relationships | Eight eras, circles, 250–300 relationships | The eras, the circles and the real relationships (US2) | Its story relationships and crossings, pointing at the cast book's | **F59:** the farm's ties, pointing at the cast book's |
| **Q60**, counts | Every tag and relationship counted, then your read | The cast's counts (US2) | Its classes, Ways and story types counted in its report | **F60:** the farm's counts, your read and the balance |
| **Q54**, the tournament rewrite | Wave 1 rewritten on the tournament shape | — | All of it | None. The farm's like for like is F40's pilot |
| **Q55**, the world pack into the game | Town and dungeon names into the game's data | — | All of it | None. The farm's world reaches the game inside the story pack (F56) |

| Id | Call |
|---|---|
| AP69 | **Counts are a page in every book,** read from the book's own report. Cast: Umas per personality, face, era and circle, and every Uma ranked by her relationships. Quest: per class, Way and story type. Farm: per calling, favourite line, season, festival and loved gift, arrivals by kind, ties an Uma, pair conversations written, events scripted |
| AP70 | **The farm mirrors four of the six,** as the table says, sized for 20 Umas: three small packets, not four large ones. Tags come before the bibles, so you balance the favourite lines and the gifts on one screen before 20 bibles are written around them. The callings are balanced already: four Umas each |
| AP71 | **The farm's 20 stand, and their order is the Ranker's.** All 20 are in the ten tiers: the whole of T1, six of T2, and one each in T3, T4, T8 and T9. The Ranker's order is the authoring order and the priority its D44 asks for, now that the Studio's boards are retired. F58 re-checks the opening three and the pilot's three against it. The other 80 show in the Farm book as "not in the farm yet". A cast past 20 is the romance spec's call (RM5), and the sisters wait: discussion only |

## Who writes what

| Session | Repo it works in | Writes | Reads |
|---|---|---|---|
| **Uma Story** (this one) | uma-platform | The app, `story:push` and `story:pull` | — |
| **The cast session** | uma-platform | The Cast book: people and real relationships | The Ranker, public racing records, both games' written ties |
| **uma-quest's story session** | uma-quest | Bundles, the world pack, its tags and story relationships | The Cast book, your verdicts |
| **uma-farm's story session** | uma-farm | The world, the cast file, tags, ties, bibles, routes, pairs, the household | The Cast book, your verdicts |
| **Each game's main session** | its own | The game's code, and its release | The pulled drafts |

## What it costs

Nothing new is created and no access changes: the runtime account is already object admin on its own bucket (AP9).

| Piece | Size | Free tier | Cost a month |
|---|---|---|---|
| `story/` in `gs://uma-platform-content` | Under 1 MB of text today; under 50 MB with every old version | 5 GB-months, shared by every bucket on the billing account | **$0** |
| Writes | A few hundred objects a push | 5,000 Class A | **$0** |
| Reads | A few thousand a month | 50,000 Class B | **$0** |
| `platform-api` | A few thousand more requests | 2 million requests | **$0** |
| New buckets, accounts, grants | None | — | **$0** |

| Id | Call |
|---|---|
| AP72 | **Nothing new in the cloud:** text only in the existing bucket, pictures from what's already there. If the Farm book ever reads `gs://uma-farm-content` directly, that grant is asked for first, in one line |

## The check report

A book's own check writes `checks.json` at the root of its drafts folder (AP57). `pnpm story:push` refuses a push while
the report is older than a draft, and the app shows it. The shape, parsed strictly by the app
(`apps/api/src/apps/story/story.model.ts`):

```ts
interface Report {
  schemaVersion: 1
  book: 'cast' | 'quest' | 'farm'
  checkedAt: string                                 // an ISO date
  files: Record<string, string>                     // every draft the check read: its path and its sha256
  findings: { level: 'error' | 'todo' | 'note'; file: string; where: string; message: string }[]
  layers: Record<string, Layer>                     // an Uma's id, or an item's own id, and its layer
  counts: Record<string, Record<string, string[]>>  // a group, its labels, and the ids behind each
}
type Layer = 'placeholder' | 'skeleton' | 'outline' | 'bible' | 'scripted' | 'published'
```

- **A draft** is a `.json` or `.md` file on a lowercase path, outside `packs/`, `pack/`, `export/` and `images/`.
- **Four names at a book's root are the app's own:** `index.json` (what the last push holds), `checks.json`,
  `reviews.json` (your verdicts) and `published.json` (AP67).
- **`reviews.json`** is `{ schemaVersion: 1, items: { <item>: { status, note, updatedAt } } }`, the shape both sandboxes
  already write. An item is a draft's path, `path#part`, or an id.
- **A book may keep a `cast.json`** listing its Umas (`umas: [{ characterId }]`). The Cast page reads only the ids.

## As built (US1, P149)

| What | As built |
|---|---|
| The pages | `/story` (the three books' numbers); `/story/cast` (100 Umas in ten batches, a filter for each book, her sheet); `/story/quest` and `/story/farm` (Files: the drafts by folder, JSON as a tree, markdown as text, your verdict on each); `/story/cast/files` |
| The API | `GET /api/story`, `/api/story/summary`, `/api/story/cast`, `/api/story/<book>/index`, `/api/story/<book>/file?path=…`, and `PUT /api/story/<book>/reviews`, its only write |
| A verdict | Saved one item at a time. The server merges it into the book's file, so two devices never overwrite each other. This replaces the packet's whole-file save |
| The push | Text that changed only, then `index.json` last. Nothing is deleted in the bucket. A check report older than a draft refuses the push |
| The pull | Verdicts are kept in step both ways, three-way, so one you clear stays cleared. `--drafts` rebuilds a book on another machine and keeps any local file that differs |
| Run locally | The API reads the three drafts folders in place (AP61). Its dev command runs on Windows as well as the Mac |
| Shared code | The blob store moved out of the Ranker's folder to `apps/api/src/store/`. `check-sub-apps` also checks that a book never imports the other game's |
| Pictures | Faces from master data, by each Uma's default outfit on the Ranker |
| The first push | Quest 43 drafts, Farm 3 drafts, about 1 MB. The farm's were pulled back into an empty folder and matched by hash |

## The packets

| Id | What | Who | Size | Needs | State |
|---|---|---|---|---|---|
| US1 | The shell: the tile, the three books' homes, the store, `story:push` and `story:pull`, verdicts, the cast by batch, and a plain reader for every pushed file | Claude | L | Your go ✓ | **Done** (P149), live |
| [US2](../handoff/tasks/US2-cast-book.md) | The Cast book: 100 people, eras, circles, the real relationships, its pages and counts | Claude, the cast session | L | US1 ✓ | **Parked** (P150): uma-quest's Q58 and Q59 write this content, locally |
| [US3](../handoff/tasks/US3-quest-book.md) | The Quest book: uma-quest's sandbox pages moved here; its sandbox retires | Claude | L | US1 ✓ | **Parked** (P150) |
| [US4](../handoff/tasks/US4-farm-book.md) | The Farm book: uma-farm's sandbox pages moved here, with the release's state; its sandbox retires | Claude | L | US1 ✓ | **Parked** (P150) |
| uma-farm [F58](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F58-cast-on-the-ranker.md) | The farm's cast on the Ranker: its revision recorded, the order, the opening three and the pilot re-checked | uma-farm's story session | S | — | Written |
| uma-farm [F59](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F59-tags-and-ties.md) | The farm's tag sheet, and its ties pointing at uma-quest's real relationships | uma-farm's story session | M | F58; uma-quest's Q59 for the pointers | Written |
| uma-farm [F60](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F60-story-counts.md) | The farm's counts, your read, the balance | uma-farm's story session, then you | S | F59 | Written |
| uma-quest Q57–Q60 | As the owner directed them (its D50), every page in its sandbox; Q59's relationships carry an `id` for the farm (its D58) | uma-quest's story session | — | Your go there | As written |

**Order (P150, local first):** US1 is done and the site stops there. The work is in the games: the farm's F58 needs
nothing and can start today, then F59 and F60; uma-quest's Q57–Q60 on your go there.

## Your steps

| When | What |
|---|---|
| **Now** | Nothing here. The next steps are in the two story sessions: "Take F58" for the farm, "Take Q57" for uma-quest |
| After F58 | Read the farm's layer 1 in its sandbox: the world, the arrivals and the opening three |
| When you like | The go for uma-quest's Q57, as before |
| If you ever want it | [Uma Story](https://uma-platform.web.app/story) on your phone shows the pushed drafts; say so and US3 and US4 resume |
