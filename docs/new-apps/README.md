# uma-platform: what the new apps need

> **Status: 2026-11-08 (P97).** The requirements and the planned tasks uma-platform owes the two new apps: uma-quest's
> [first slice](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/first-slice.md) and uma-farm's [first playable farm](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/first-playable.md).
> **This doc is the brief a uma-platform session turns into packets**, keeping the ids here. Visual page:
> [previews/new-apps.html](previews/new-apps.html).
>
> It builds on P88–P96, [architecture.md](../architecture.md), the sprite [format](../sprites/format.md) and
> [pipeline](../sprites/pipeline.md), and the [change protocol](../change-protocol.md). It adds NA1–NA11.

## The short answer

- **Both apps run on what's here today,** except four things uma-quest's slice needs and one thing uma-farm's parcels
  need:

  | Task | What | Needed by |
  |---|---|---|
  | **UA5** | Batch 1's five sprite sets published in master data's `outfit-sprites` | uma-quest's Q6 |
  | **UA8** | Ten held weapons and eight emote bubbles in uma-art | Q9 and Q12 |
  | **UA10** | Three townsfolk, published with or after UA5 | Q12 |
  | **KL1** | uma-kit's landscape layout, a kit minor | uma-quest's Phase 5, not the slice |
  | **PO1** | `uma-post` 0.1.0, the parcel format and accept lists | uma-farm's F10 |

- **The games' art lands here too.** uma-quest's sessions write three ChatGPT packets: the forest kit (Q7), a town kit
  (Q15) and the slice's foes (Q16). uma-farm's writes one: the Forge and the Post (F9). ChatGPT ships them as uma-art
  releases, as the change protocol says.
- **Kits and foes are authored in full colour,** like UA8's props, so they match the sprites. P97 amends P35 for them
  (NA4).
- **In progress:** UA10 (ChatGPT), at the key gate for the owner's T1 picks (P104); UA8 shipped in uma-art 2.22.0. UA5 is done: batch 1 is in `latest` (release `4757517816a0`, P100).
- **Your steps:**
  - the townsfolk reviews (UA10);
  - the art reviews ChatGPT asks for.

## Where things stand

| Done | |
|---|---|
| The two apps' decisions | P88 (three apps in the `uma-rpg` project), P89 (uma-farm and parcels), P90 (three.js for uma-quest) |
| The sprite format and pipeline | P91–P93: [format.md](../sprites/format.md), [pipeline.md](../sprites/pipeline.md) |
| uma-data 1.4.0, the `outfit-sprites` family | UA4, P94 |
| The sprite tools in git | UA2, P95 |
| Batch 1 | Five travelers at 118 frames each, approved by you on 2026-11-08, published in release `4757517816a0` (UA5, P100) |
| The backup bucket | UA6, P96: complete; 2.39 GB live authored content, caches removed, 185-file restore byte-identical (P99) |
| Both apps' clouds | uma-quest's Q2 and uma-farm's F2, live in the `uma-rpg` project; both read master data |

## Requirements

Each requirement has an id, where it comes from, and the task that checks it.

### What it provides

| Id | Requirement | From | Checked by |
|---|---|---|---|
| R1 | Master data's `outfit-sprites` holds batch 1's five sets (106801, 106701, 112901, 111501, 113401) at their approved revisions, published sprite-only so every other release file carries over byte for byte | CR18, CR21, CR27 | UA5 |
| R2 | A traveler set is at most about 3 MB on its WebP pages (lossless if it fits, lossy q90 otherwise) | UA5 | UA5 |
| R3 | The client's `spriteSet` returns each published set with all 27 entries; games load a set only while that Uma is on screen | CR28, P94 | UA5 |
| R4 | uma-art's `held/` (16 weapon textures) and `emote/` (8 bubbles) families, with grips, angles and anchors | CR14, UA8 | UA8 |
| R5 | Three townsfolk sets (101401, 100103, 109701) in the townsfolk profile, published | CR25, P93, P104 | UA10 |
| R6 | uma-art families for uma-quest's kits (a biome kit, a town kit) to its kit spec, and for its foes to the contract its Q16 writes | uma-quest SL6–SL8 | Q7, Q15, Q16 |
| R7 | uma-art buildings and pieces for uma-farm's Forge and Post | FM9 | F9 |
| R8 | A uma-kit landscape layout for uma-quest, as a kit minor; uma-rpg and uma-racer unchanged | NG6, change protocol | KL1 |
| R9 | `@luismlorenzana/uma-post` 0.1.0: the parcel type, its parser, each game's accept list and daily caps, with tests | FM12, FM14, P89 | PO1 |
| R10 | `content/authoring/` backed up and restorable from `gs://uma-platform-authoring`, without model caches | P96 | UA6 |

### How it must behave

| Id | Requirement | From | Checked by |
|---|---|---|---|
| N1 | No Uma art in uma-art or git; Uma sprites only in master data's private release | CR19, P6 | UA5, UA10 |
| N2 | Releases are semver minors; games pin exact versions; uma-art is ChatGPT's to publish; sprites after Claude's first publish are ChatGPT's too | P9, CR29 | every release |
| N3 | A sprite publish never changes any other release file; uma-rpg keeps working through it | CR27 | UA5 |
| N4 | Kit changes follow the change protocol ("Both apps"): a kit release, never a fork in a game | change protocol | KL1 |
| N5 | `uma-work` and `uma-kit/work` stay as they are for uma-farm; any change is a release both games take | FM5 | — |
| N6 | Every gcloud command scoped (`CLOUDSDK_ACTIVE_CONFIG_NAME=default`, the project named); the active account never changed | architecture.md | UA5, UA6 |
| N7 | Packages keep their tests; CI checks every push; no network in tests | architecture.md | every packet |

## Milestones

The milestones follow the apps' needs: what uma-quest's engine needs first, then its slice, then later work.

### M1 · For uma-quest's engine

Batch 1's sets are in master data before uma-quest's Q6 needs them, and the backup is whole.

| Id | Task | Who | Size | Needs | State |
|---|---|---|---|---|---|
| [UA5](#ua5) | **Batch 1 published**: `sprites:pack`, the sprite-only publish, the encoding decision, and batch 1's first release. | Done | M | UA2 ✓, UA4 ✓, your approval ✓ | Done (P100) |
| [UA6](#ua6) | **The backup, finished**: The first backup verified and a restore tested, with the model caches left out. | Done | S | the bucket ✓ | Done (P99) |

**Exit:**

- `latest` holds batch 1's five sets; the client's `spriteSet` returns each with all 27 entries
- uma-rpg's site and API behave as before
- The backup holds `content/authoring/` and restores, without model caches

### M2 · For uma-quest's slice

Props, bubbles, townsfolk and the slice's art, published, so uma-quest's fights and town draw real art.

| Id | Task | Who | Size | Needs | State |
|---|---|---|---|---|---|
| [UA8](#ua8) | **Weapons and bubbles**: Ten held weapons (16 textures) and eight emote bubbles in uma-art's new `held/` and `emote/` families. | ChatGPT | M | — | Done (2.22.0, P102) |
| [UA10](#ua10) | **Three townsfolk**: The townsfolk profile on 101401, 100103 and 109701 (owner-selected batch T1, P104). | ChatGPT | S | UA2 ✓ | Key gate |
| Q7 | **The forest kit** *(uma-quest)*: Written by uma-quest's session; ChatGPT draws it here and publishes a uma-art release. | ChatGPT | M | uma-quest's Q5 | Waiting |
| Q15 | **A town kit** *(uma-quest)*: The Warrior region's town kit, the same way. | ChatGPT | M | uma-quest's Q5 | Waiting |
| Q16 | **The slice's foes** *(uma-quest)*: Five foe bodies and the foe family's contract, the same way. | ChatGPT | M | uma-quest's Q8, Q5 | Waiting |

**Exit:**

- uma-art lists `held/` and `emote/`, published
- Three townsfolk sets are published
- The forest kit, the town kit and the slice's foes are uma-art releases

### M3 · For the next stretch

What uma-quest's Phase 5 needs: the landscape layout, wave 2's travelers and band 1's townsfolk.

| Id | Task | Who | Size | Needs | State |
|---|---|---|---|---|---|
| [KL1](#kl1) | **The landscape kit layout**: A uma-kit minor with a landscape layout for uma-quest: its frame, bars and sheets turned for a landscape stage, opt-in, so portrait games don't change. | Claude | M | uma-quest's Q4 ✓ | Released (uma-kit 0.18.0, P103) |
| [UA3](#ua3) | **Sprite Studio in git**: The review app in git (`pnpm studio`), with both gates writing `reviews.json`. | Done | M | UA1 ✓ | Done (P99) |
| [UA9](#ua9) | **Batch 2 (wave 2)**: Five more travelers at the full profile, published; the template for batches 3–20. | ChatGPT | L | UA2 ✓, UA3, UA7 ✓ | Waiting |
| [UA11](#ua11) | **Townsfolk T2 onward**: Townsfolk batches of ten, one after each traveler batch (P93). | ChatGPT | M | UA10's set gate, UA2 ✓ | Waiting |

**Exit:**

- A uma-kit minor with the landscape layout, adopted by uma-quest
- Batch 2 published (wave 2)
- Townsfolk T2 onward, in step with traveler batches

### M4 · For uma-farm's parcels

The parcel package, once both games' specs name their items.

| Id | Task | Who | Size | Needs | State |
|---|---|---|---|---|---|
| F9 | **The Forge and the Post** *(uma-farm)*: Written by uma-farm's session; ChatGPT draws it here and publishes a uma-art release. | ChatGPT | M | uma-farm's F7 | Later |
| [PO1](#po1) | **`uma-post` 0.1.0**: The parcel package: the parcel type and its parser, each game's accept list and daily caps, and their tests. | Claude | M | uma-farm's F7, uma-quest's Q17 | To write |

**Exit:**

- `uma-post` 0.1.0 published, with uma-quest's accept list
- uma-farm's F10 and uma-quest's receiver use it

## The tasks in detail

What each task delivers and how we know it's done. Existing packets are linked; KL1 and PO1 need packets written.

### UA5

**Batch 1 published** · Done · P100

Done 2026-11-08: master data's `latest` is release `4757517816a0`, with batch 1's five traveler sets. Lossy WebP q90
won on batch 1's numbers (1.34–1.66 MB a traveler, against 3.57–4.44 MB lossless); every other release file is carried
byte for byte, and uma-rpg loads the release unchanged. uma-quest's Q6 loads it: all five sets parse and play (walk,
run, field facings, turnarounds, blinks). Later batches follow
[pipeline.md](../sprites/pipeline.md) §7, "Publishing a batch".

**Delivers:**

- `sprites:pack` and `release:publish --sprites-only`, tested on a memory release
- The encoding chosen from batch 1's numbers
- A candidate publish, read back, then `latest`
- "Publishing a batch" in pipeline.md §7, so ChatGPT can publish the next ones
- UA10's three townsfolk in the same release if you've approved them by then

**Covers:** R1, R2, R3, N1, N3, N6

**Done when:**

- `latest` holds the five sets and `spriteSet` returns each
- The other release files match byte for byte
- uma-rpg is unaffected
- uma-quest's handoff is told that Q6 can load batch 1

### UA6

**The backup, finished** · Done · P99

The filtered backup completed on 2026-11-08 (P99): 6,508 live objects / 2,391,485,667 bytes,
2,404,753,077 bytes including noncurrent authored versions. The original unfiltered process and workers were stopped.
All observed model-cache generations and abandoned upload chunks were removed; deleted caches keep the default
seven-day soft-delete window before expiring. A restored revision matches all 185 files byte for byte.
`sprites:backup` excludes rebuildable model/binary and dependency caches; Studio gate saves queue it automatically.

**Covers:** R10, N6

**Done when:**

- The bucket holds `content/authoring/` without model caches
- A restore matches byte for byte
- Its storage stays inside the free 5 GB

### UA8

**Weapons and bubbles** · Done · P102

Delivered in uma-art 2.22.0: 16 held textures and eight bubbles, with source masters and deterministic export. Studio reads the package. Local attachment sheets cover all 6,480 grip-frame combinations without changing character art.

**Covers:** R4, N2, NA4

**Done when:**

- uma-art 2.22.0 (or the next minor) lists both families, published
- Every batch-1 grip frame holds its props without a redraw

### UA10

**Three townsfolk** · ChatGPT · S · Needs: UA2 ✓ · Key gate (P104)

The packet exists: [UA10](../handoff/tasks/UA10-townsfolk-pilot.md).

**Covers:** R5, N1

**Done when:**

- The three are approved and published (with UA5's release or the next)

### KL1

**The landscape kit layout** · Claude · M · Needs: uma-quest's Q4 ✓ · **Released** (uma-kit 0.18.0, P103)

Released 2026-11-08 from uma-quest's [request](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/kl1-request.md): `KitStage` puts the kit on a game's own stage, with the landscape sheet and frame. Review page: [kit/previews/landscape.html](../kit/previews/landscape.html). uma-rpg and uma-racer pass their checks on it and need no pin. What's left is uma-quest's, recorded in its D15: its first Phase 5 menu packet pins 0.18.0 and puts `KitStage` inside its `TurnedStage`; the slice keeps its own menus (SL10).

**Delivers:**

- The layout, opt-in by a kit option; uma-rpg's and uma-racer's portrait screens unchanged
- Its review page
- A kit minor release, pinned by uma-quest's next packet

**Covers:** R8, N2, N4

**Done when:**

- uma-quest draws a menu with it on the turned stage
- uma-rpg and uma-racer pass their checks on the new kit

**Notes for its packet:**

- uma-quest's Q4 writes the request as a "Both apps" change, from what its overlay needed
- Needed by uma-quest's Phase 5, not its slice (SL10)

### UA3

**Sprite Studio in git** · Done · P99

Delivered: `pnpm studio`, with queue overrides, full-profile previews and both hash-bound gates. Batch 2 can use it.

**Covers:** N7

**Done when:**

- Four pages and both previews serve locally; atomic decisions bind covered hashes and changed files invalidate approvals.

### UA9

**Batch 2 (wave 2)** · ChatGPT · L · Needs: UA2 ✓, UA3, UA7 ✓ · Waiting

The packet exists: [UA9](../handoff/tasks/UA9-batch-2.md). uma-quest needs it at its Phase 5, after the slice.

**Covers:** R1, R3

**Done when:**

- As in its packet

### UA11

**Townsfolk T2 onward** · ChatGPT · M · Needs: UA10's set gate, UA2 ✓ · Waiting

The template exists: [UA11](../handoff/tasks/UA11-townsfolk-batch.md).

**Covers:** R5

**Done when:**

- As in its template

### PO1

**`uma-post` 0.1.0** · Claude · M · Needs: uma-farm's F7, uma-quest's Q17 · To write

**Delivers:**

- `packages/post`: `Parcel`, `parseParcel`, the accept-list type, each game's list (uma-quest's first) and caps
- Tests with synthetic parcels, no network
- A first release, 0.1.0, through Changesets

**Covers:** R9, N2, N7

**Done when:**

- Published, and uma-farm's F10 and uma-quest's receiver both use it

**Notes for its packet:**

- uma-quest's accept list comes from its Q17 (DN14's tonic, party meal and revive), and the format from uma-farm's F7

## What the games owe here

| From | What | For | When |
|---|---|---|---|
| uma-quest | The kit spec (its Q5) | Q7's and Q15's uma-art families | M2 |
| uma-quest | The foe contract (its Q16) | The foe family | M2 |
| uma-quest | The landscape request (from its Q4) | KL1 | M3 |
| uma-quest | Its accept list (its Q17) | PO1 | M4 |
| uma-farm | The parcel format's needs (its F7) | PO1 | M4 |
| uma-farm | The Forge's art packet (its F9) | uma-art | M4 |

## The order

```
M1  UA5 (done) ──► uma-quest Q6           UA6 (done)
M2  UA8 (done, 2.22.0) ──► uma-quest Q9, Q12      UA10 (key gate) ──► uma-quest Q12
     uma-quest Q5 ──► Q7, Q15 (ChatGPT, uma-art)     uma-quest Q8 ──► Q16 (ChatGPT, uma-art)
M3  uma-quest Q4 ──► KL1 ──► uma-quest Phase 5     UA3 ──► UA9 (wave 2)     UA10 ──► UA11 (T2…)
M4  uma-farm F7 + uma-quest Q17 ──► PO1 ──► uma-farm F10 ──► uma-quest's receiver
```

## Your steps

| When | Step | State |
|---|---|---|
| When ChatGPT asks | The three townsfolk's key and set reviews (UA10) | Waiting |
| When ChatGPT asks | The looks of uma-quest's forest kit, town kit and foes | Waiting |
| When ChatGPT asks | Batch 2's key and set reviews (UA9), after the slice | Later |
| When ChatGPT asks | The Forge's look (uma-farm's F9) | Later |

## Risks

| Risk | What keeps it small |
|---|---|
| A sprite publish breaks uma-rpg's content | Sprite-only publishing carries every other file byte for byte, read back on `candidate` first (CR27) |
| uma-art grows a family a game can't draw | Each family's contract is written by the game that draws it (the kit spec, the foe contract) before ChatGPT starts |
| The kit's landscape layout changes the portrait games | It's opt-in by a kit option, checked by uma-rpg's and uma-racer's own tests (KL1) |
| The backup fills with caches | UA6 removes them and confirms the exclusions |

## For the session that writes the packets

- **Read first:** this doc, the two apps' docs ([first-slice](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/first-slice.md),
  [first-playable](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/first-playable.md)), [decisions.md](../decisions.md), the [handoff](../handoff/README.md),
  and the [change protocol](../change-protocol.md).
- **Write packets for KL1 and PO1** when their requests arrive (KL1 from uma-quest's Q4, PO1 from uma-farm's F7). UA8,
  UA10, UA9 and UA11 already have packets; UA3 and UA6 are complete (P99), and UA5 (P100).
- **Art packets come from the games:** uma-quest's Q7, Q15 and Q16, and uma-farm's F9. ChatGPT draws them here, merges
  and publishes the uma-art release, and logs each one's P-decision.
- **Decisions** go in [decisions.md](../decisions.md) from P99 (fetch `main` first).

## Calls

The platform's calls for the new apps. P97 logs them.

| Id | Call |
|---|---|
| NA1 | uma-platform's part in the new apps is four milestones: **M1** for uma-quest's engine (UA5, UA6), **M2** for its slice (UA8, UA10, and the games' art), **M3** for the next stretch (KL1, UA3, UA9, UA11), **M4** for uma-farm's parcels (PO1) |
| NA2 | UA5 comes first: batch 1 must be in master data before uma-quest's Q6, which runs on a stand-in until then |
| NA3 | The games' art follows the change protocol: each game's session writes the ChatGPT packet (Q7, Q15, Q16, F9), ChatGPT ships it as a uma-art release, and the game's first packet using it pins it |
| NA4 | Kits and foes are authored in full colour with masters and a deterministic export, like UA8's props, so they match the sprites. P97 amends P35 for them; the pixel families keep P35 |
| NA5 | Each new uma-art family's contract is written by the game that draws it: the kit spec in uma-quest's Q5, the foe contract in its Q16 |
| NA6 | uma-kit's landscape layout (KL1) is an opt-in kit minor, requested from uma-quest's Q4 and needed by its Phase 5; the slice draws its own few menus |
| NA7 | `uma-post` (PO1) waits for both specs: the format from uma-farm's F7 and uma-quest's accept list from its Q17 |
| NA8 | `uma-work` and `uma-kit/work` serve uma-farm unchanged (FM5); master data needs nothing new for either app beyond `outfit-sprites` |
| NA9 | UA6 finishes with the model caches removed from the bucket and a restore tested |
| NA10 | Wave 2 (UA9) and townsfolk T2 onward (UA11) follow the slice: uma-quest needs them at its Phase 5 |
| NA11 | Packets are written by uma-platform's session from this doc; KL1 and PO1 keep these ids |
