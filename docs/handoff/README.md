# Sibling apps: the packet queue

> The program view of every packet for the [sibling apps plan](../sibling/README.md), phases B to E
> ([phases.md](../sibling/phases.md)), across the three repos. Written 2026-10-16 after Phase A shipped (uma-kit
> 0.3.0 in both games). Start any worker, Claude or ChatGPT, with [master-prompt.md](master-prompt.md).

## How the queue works

- **Ids:** S, then the phase letter, then a number (SB1, SC3 …). They never collide with decision numbers (D, P) or
  uma-racer's T and A tasks.
- **One packet, one worker, one delivery.** Each packet stands alone. It says which repo it changes, what to read, the
  decisions already made, the steps, the checks, and how to deliver.
- **Where a packet lives:** in the repo it changes. The rows below link to it.
  - uma-platform's packets: [tasks/](tasks/).
  - uma-rpg's: `docs/handoff/tasks/`, in its [queue](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/handoff/README.md).
  - uma-racer's: `docs/handoff/tasks/`, in its [queue](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/README.md).
- **Who can take it:**
  - **Claude:** needs the owner's machine (private content, the GCP bucket) or a long refactor.
  - **Either:** ChatGPT or a Claude session.
- **Workers have full autonomy.** A worker follows the packet, decides what the packet leaves open (writing it under
  Decisions), verifies, delivers and **flags it done itself**.
- **Flagging done.** When every "Done when" item holds, the worker:
  1. deletes the packet file, and moves its row in that repo's queue to Done, with the merge commit;
  2. sets the row's **State** below to Done, with the commit:
     - a Claude session pushes that one-line change to uma-platform's `main`;
     - ChatGPT opens a one-line pull request, or says so in its reply, and the next Claude session updates it.
- **Blocked?** Write why in the packet's row (State: Blocked), and move to another ready packet. Never wait.

## Parallel tracks

The four tracks only meet where "Needs" says. A worker per track can run at the same time.

```
Album   SB2 ──► SB3 ──┬──► SB4 (rpg)   SB1 (faces) runs alongside and feeds SB3/SB4/SB6
                      └──► SB6 (racer)  SB5 (rpg battle busts) needs nothing: start any time
Work    SC1 ──┬──► SC3 (rpg engine) ──► SC4 (rpg screens)
              └──► SC5 (racer)
        SC1 + SB3 ──► SC2 (kit screens) ──► SC4, SC5
Places  SD1 ─┬──► SD3 (rpg)
        SD2 ─┴──► SD4 (racer)
Content SE1 (racer phase 5) ──► SE4 (racer)
        SE2 ──► SE3 (rpg), SE4 (racer)
Now     SA7 (racer: the plaza crowd, kit 0.3.0)
```

## The queue

| Id | What | Repo | Who | Size | Needs | State |
|---|---|---|---|---|---|---|
| **Phase A follow-up** | | | | | | |
| [SA7](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SA7-plaza-crowd.md) | The plaza crowd in uma-racer (kit 0.3.0) | uma-racer | Either | S | — | Done (`9723a23`) |
| **Phase B: one Uma album** | | | | | | |
| SB2 | `uma-kit/roster`: the album engine, level rule, label, rows, preferences | uma-platform | Either | M | — | Done (`c518093`, 0.4.0) |
| SB3 | `uma-kit/album`: faces, busts, chrome, views, virtual grid, `UmaPicker` | uma-platform | Either | L | SB2 | Done (`5579b32`, 0.7.0) |
| SB4 | uma-rpg on the kit album: the Stable, six pickers, faces wherever an Uma is small | uma-rpg | Either | L | SB3 (SB1 for real faces) | Done (`b205b52`, uma-kit 0.7.1, uma-data 1.1.0; deployed `21b4fa9`) |
| SB5 | uma-rpg: busts on the battle stage, no chibis | uma-rpg | Either | S | — | Done (`11e39f9`, locally validated; [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39167185219)) |
| SB6 | uma-racer on the kit album, and busts in races | uma-racer | Either | L | SB3 (SB1 for real faces) | Done (`4885baf`, uma-kit 0.7.1; deployed green) |
| **Phase C: one work system** | | | | | | |
| SC1 | `@luismlorenzana/uma-work`: the shared engine, from uma-racer's | uma-platform | Claude | L | — | Done (`ed446b8`, 0.1.0) |
| SC2 | `uma-kit/work`: rows, queues, speed-up, recall, header, job sheet | uma-platform | Either | L | SC1, SB3 | Done (`fe7e30f`, uma-kit 0.8.0) |
| SC3 | uma-rpg on `uma-work`: kinds, save v22, the API | uma-rpg | Claude | L | SC1 | Done (`6063b95`) |
| SC4 | uma-rpg on `uma-kit/work`'s screens | uma-rpg | Either | M | SC2, SC3 | Done (`c8bded0`; [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39590331919)) |
| SC5 | uma-racer on `uma-work` and `uma-kit/work` | uma-racer | Either | L | SC1, SC2 | Done (`8967e24`, uma-kit 0.9.1, uma-work 0.1.0; production verified green) |
| **Phase D: places, profile and getting in** | | | | | | |
| SD1 | `@luismlorenzana/uma-server`: the NestJS auth guard | uma-platform | Either | M | — | Done (`1824879`, 0.1.0) |
| SD2 | `uma-kit/auth` and `uma-kit/places`: boot gates, Account, Warehouse, Exchange, profile | uma-platform | Either | L | — | Done (`b9247da`, 0.5.0) |
| SD3 | uma-rpg on SD1 and SD2 | uma-rpg | Either | M | SD1, SD2 | Done (`3ea66a4`) |
| [SD4](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SD4-racer-places.md) | uma-racer on SD1 and SD2 | uma-racer | Either | M | SD1, SD2 | Done (`7d2b757`) |
| **Phase E: platform plumbing** | | | | | | |
| SE1 | uma-racer's phase 5: uma-data and its art families; its own pipeline goes | uma-racer | Claude | L | — | Done (`efd36c4`, [racer #122](https://github.com/luismlorenzana/uma-racer/pull/122); cleanup `9370e0a`, [#128](https://github.com/luismlorenzana/uma-racer/pull/128); [production verified green](https://github.com/luismlorenzana/uma-racer/actions/runs/39636290115)) |
| SE2 | `uma-kit/content` and `uma-server/content`: art loading and the content proxy | uma-platform | Either | M | SD1 | Done (`5aaeb93`, kit 0.6.0, server 0.2.0) |
| SE3 | uma-rpg on SE2 | uma-rpg | Either | S | SE2 | Done (`18dbd4b`, uma-kit 0.9.1, uma-server 0.2.0; [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39633132807)) |
| SE4 | uma-racer on SE2 | uma-racer | Either | M | SE1, SE2 | Done (`ad15cf0`, [racer #123](https://github.com/luismlorenzana/uma-racer/pull/123); kit 0.9.0, [production verified green](https://github.com/luismlorenzana/uma-racer/actions/runs/39460142245)) |
| **Shared components (briefed by the games, delivered here)** | | | | | | |
| H118 | Compact `ProfileFrame`, accessible progress and a worker-face callback; [source brief](https://github.com/luismlorenzana/uma-rpg/blob/d48ed935f38e403ca49024de21bd88ce3f8d9ea4/docs/handoff/tasks/H118-kit-compact-profile-frame.md) | uma-platform, uma-rpg | ChatGPT | S | — | Done (`5662009`, [kit #62](https://github.com/luismlorenzana/uma-platform/pull/62), uma-kit 0.16.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/41116447663)); [RPG pin #84](https://github.com/luismlorenzana/uma-rpg/pull/84). H119/H124 own opting in; Racer needs no pin yet |
| **Art authoring (briefed by the games, delivered here)** | | | | | | |
| A05 | Card Ticket and Training Yard Fatigue/Rest marks; [source brief](https://github.com/luismlorenzana/uma-racer/blob/25aac67d09f1a6e1d8967bf3b5eb57dde5f9fd69/docs/handoff/tasks/A05-card-ticket-and-yard-marks.md) | uma-platform | ChatGPT | S | — | Done (`3e23261`, [art #70](https://github.com/luismlorenzana/uma-platform/pull/70), uma-art 2.21.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/42071645010)); Racer owns its pin, deployment and source-packet closeout |
| H156 | Three collections buildings: Gallery, Trials and Drills; [source brief](https://github.com/luismlorenzana/uma-rpg/blob/685ba15c11e2289f7ee1e4a9cd38fcb29f32127a/docs/handoff/tasks/H156-collections-buildings-art.md) | uma-platform | ChatGPT | S | H141 | Done (`9323162`, [art #67](https://github.com/luismlorenzana/uma-platform/pull/67), uma-art 2.20.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/41908742455)); RPG adoption H158 Done (`e7d5d7e`, [RPG #100](https://github.com/luismlorenzana/uma-rpg/pull/100), [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/41950893931)) |
| H141 | Five star crests and eight stat marks; [source brief](https://github.com/luismlorenzana/uma-rpg/blob/82b0e723d2deaf63b7822cc245e3b7ac207f3cf5/docs/handoff/tasks/H141-star-crests-art.md) | uma-platform | ChatGPT | S | — | Done (`b612403`, [art #64](https://github.com/luismlorenzana/uma-platform/pull/64), uma-art 2.19.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/41880067892)); RPG adoption H144 Done (`5017f41`, [RPG #88](https://github.com/luismlorenzana/uma-rpg/pull/88), [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/41906774018)) |
| H138 | Five base-class family emblems redrawn in place, and the RPG pin | uma-platform, uma-rpg | ChatGPT | S | — | Done (`9dc40f3`, [art #60](https://github.com/luismlorenzana/uma-platform/pull/60), uma-art 2.18.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/41099542585)); [RPG pin #83](https://github.com/luismlorenzana/uma-rpg/pull/83) |
| H135 | The Healer Sanctum's original temple, appended to the buildings atlas | uma-platform | ChatGPT | S | — | Done (`bab58c3`, [#58](https://github.com/luismlorenzana/uma-platform/pull/58), uma-art 2.17.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/40978750402)); RPG adoption: H133 or its first later adopter |
| H127 | Seven Classes v3 emblems: five Tier 0 and two mirrored hybrids | uma-platform | ChatGPT | S | — | Done (`45bdebb`, [#56](https://github.com/luismlorenzana/uma-platform/pull/56), uma-art 2.16.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/40932890896)); RPG adoption: H120 |
| H113 | Five trade workbenches and Weapon, Tome and Charm Forges; [source brief](https://github.com/luismlorenzana/uma-rpg/blob/675e76216936dfca8e10de083472e2ce7f9cc316/docs/handoff/tasks/H113-art-wilds-trios.md) | uma-platform | ChatGPT | M | — | Done (`84cc80f`, [#52](https://github.com/luismlorenzana/uma-platform/pull/52), uma-art 2.14.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/40506089104)) |
| A04 | Ten native tonic item icons in uma-art; [source brief](https://github.com/luismlorenzana/uma-racer/blob/1ed5b77d4f31c56def3549f444d93c1f4887d46c/docs/handoff/tasks/A04-tonic-icons.md) | uma-platform | ChatGPT | S | — | Done (`7ed5bce`, uma-art 2.10.0; Racer adoption `be16a6d`, [racer #127](https://github.com/luismlorenzana/uma-racer/pull/127); [production verified green](https://github.com/luismlorenzana/uma-racer/actions/runs/39633395549)) |
| H38 | The Rift's building, four front crests and eleven achievement badges in uma-art; [source brief](https://github.com/luismlorenzana/uma-rpg/blob/a550358/docs/handoff/tasks/H38-rift-art.md) | uma-platform | Claude | M | — | Done (`e3da022`, uma-art 2.11.0; the uma-rpg Rift page pins it) |
| H54 | The Paladin's class emblem in uma-art (no new building: the Paladin Bastion draws `knights-bastion`); [source brief](https://github.com/luismlorenzana/uma-rpg/blob/5dd9f08/docs/handoff/tasks/H54-paladin-emblem-art.md) | uma-platform | Claude | S | — | Done (`8c5c359`, [#45](https://github.com/luismlorenzana/uma-platform/pull/45), uma-art 2.12.0; uma-rpg's H59 pins it) |
| H73 | Weapon Gem, Armor Fittings, Accessory Setting and Branch Gem icons in uma-art; [source brief](https://github.com/luismlorenzana/uma-rpg/blob/3b5b68efe72e3ac234c572f36a7eeb92eabc41bf/docs/handoff/tasks/H73-made-item-icons-art.md) | uma-platform | ChatGPT | M | — | Done (`64c3a15`, [#49](https://github.com/luismlorenzana/uma-platform/pull/49), uma-art 2.13.0; [published](https://github.com/luismlorenzana/uma-platform/actions/runs/40200573898)) |
| **Parked** | | | | | | |
| [SE5](tasks/SE5-shared-push.md) | Push shared (`uma-server/push`) | uma-platform, uma-rpg | — | M | The owner asks for push in uma-racer | Parked |
| [PO1](tasks/PO1-uma-post.md) | `uma-post` 0.1.0, the parcel format and accept lists (P107) | uma-platform | — | M | uma-farm asks again (its D22) | Parked (P109) |

**Art delivery:** UA10 and UA12 are complete: three townsfolk and five travelers with dedicated left walk/run cycles are approved and published in master-data `latest`, release `7c34dbe2c8de` (P108). Q7’s forest and Q15’s Warrior town kits are approved in uma-art 2.23.0/2.24.0 (P110/P111); the next art priority is the foes (Q16); UA9 and UA11 follow the slice. UA2–UA8 are delivered, and KL1 is released in uma-kit 0.18.0 (P103). PO1’s packet is written ahead and waits for uma-farm’s F7 answers (P107). Other platform art and sibling packets are complete; A05 adoption belongs to Racer. SE5 stays parked.

## Uma sprites: the pipeline (UA)

Taking ChatGPT's sprite experiments into authoring and publishing ([pipeline.md](../sprites/pipeline.md), the format in
[format.md](../sprites/format.md), CR1–CR34, P91). Ids are UA, then a number. Batch art is private, in `content/`; props
and bubbles are uma-art.

| Id | What | Who | Size | Needs | State |
|---|---|---|---|---|---|
| UA5 | `sprites:pack`, the sprite-only publish, the encoding, batch 1's first release | Claude | M | UA2, UA4; the owner's set approval | Done (release `4757517816a0`, P100) |
| [UA9](tasks/UA9-batch-2.md) | Art: batch 2 in the full profile (130 frames since P105); the template for batches 3–20 | ChatGPT | L | UA2, UA3, UA7 (UA5 to publish) | **Ready after the slice** |
| [UA11](tasks/UA11-townsfolk-batch.md) | Art: a townsfolk batch of ten; the template for T2–T8 (P93) | ChatGPT | M | UA10 ✓, UA2 ✓ | After the slice and the next traveler batch |

**Order:** UA1–UA8, UA10 and UA12 are complete. UA5 first published batch 1 in `4757517816a0` (P100). After the owner’s feedback, P105 added independent left field cycles, and release `7c34dbe2c8de` now holds all five at 130 frames plus T1’s three townsfolk at 45 frames (P108).

**For uma-quest:** Q6’s existing loader receives the new traveler revisions through `latest`; its D17 already plays `walk-left` and `run-left` and stands left on the left turnaround. No pin is needed. Q12 can cast townsfolk outfits 101401, 100103 and 109701. Every non-sprite master-data file is unchanged.

UA9 and UA11 follow the playable slice; townsfolk batches follow traveler batches (P93). Later art packets cover the rival add-on, familiars at the new scale and the bestiary’s full foe format (CR34).

## The new apps: what uma-quest and uma-farm need (NA)

The brief is [new-apps/README.md](../new-apps/README.md) (NA1–NA11, [page](../new-apps/previews/new-apps.html)): what
uma-quest's [first slice](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/first-slice.md) and
uma-farm's [first playable farm](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/first-playable.md)
need from here, in order. A uma-platform session writes the missing packets from it.

| Milestone | Id | What | Who | Size | Needs | State |
|---|---|---|---|---|---|---|
| M1, uma-quest's engine | UA5 | Batch 1 published in master data: release `4757517816a0` | Claude | M | UA2 ✓, UA4 ✓, approval ✓ | **Done** (P100); uma-quest's Q6 loads it: all five sets parse and play (walk, run, field facings, turnarounds, blinks) |
| | UA6 | Backup complete: 2.39 GB live authored content, caches removed; 185-file restore byte-identical | Done | — | — | **Done** |
| M2, uma-quest's slice | UA8, UA10 | Weapons and bubbles; three townsfolk (above) | ChatGPT | M, S | — | UA8 done (2.22.0); UA10 done (`7c34dbe2c8de`, P108) |
| | Q7, Q15, Q16 | uma-quest's art packets ([forest kit](https://github.com/luismlorenzana/uma-platform/blob/main/assets/authored/kit-forest/README.md), [town kit](https://github.com/luismlorenzana/uma-platform/blob/main/assets/authored/kit-town-warrior/README.md), [foes](https://github.com/luismlorenzana/uma-quest/blob/main/docs/handoff/tasks/Q16-slice-foes.md)), written there, drawn here, released in uma-art | ChatGPT | M each | uma-quest's Q5 ✓, Q8 ✓ | Q7 done (2.23.0, P110); Q15 done (2.24.0, P111); Q16 ready (in uma-quest) |
| uma-quest's enemies and kits (P126) | Q16 A | [The baseline enemies' records](https://github.com/luismlorenzana/uma-quest/blob/main/docs/handoff/tasks/Q16-baseline-enemies.md), part A: the enemy-key format and master data, before ChatGPT draws part B | Claude | M | uma-quest's D33 review ✓ | **Ready, next** |
| | Q39 (+ TA4) | [The enemy pipeline](https://github.com/luismlorenzana/uma-quest/blob/main/docs/handoff/tasks/Q39-enemy-pipeline.md): tools, docs and batch templates | Claude | M | Q16 | Waits on Q16 |
| | Q16 B, Q34, Q46 | The enemies and adult keys, drawn | ChatGPT | L | Q16 A; Q39 for Q34 | ChatGPT's character queue |
| | Q32, Q33 | The four town kits and four biome kits (painted) | ChatGPT | L each | Q15 ✓, Q7 ✓ | After ChatGPT's character work (uma-quest D49) |
| M3, the next stretch | KL1 | uma-kit's landscape layout, an opt-in kit minor ([request](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/kl1-request.md)) | Claude | M | uma-quest's Q4 ✓ | **Released** (uma-kit 0.18.0, P103); recorded in uma-quest's D15: its first Phase 5 menu packet pins it, KitStage inside its TurnedStage |
| | UA3, UA9, UA11 | The Studio in git; batch 2 (wave 2); townsfolk T2 onward (above) | Either, ChatGPT | M, L, M | — | After the slice |
| M4, uma-farm's parcels | [PO1](tasks/PO1-uma-post.md) | `uma-post` 0.1.0: the parcel format, accept lists and caps (P107) | Claude | M | uma-farm asks again | **Parked** (P109: the owner moved parcels to later, uma-farm D22) |
| | F9 | uma-farm's `kit-farm` (painted, M7), drawn here | ChatGPT, after its character work | M | uma-farm's F16 | On hold (uma-farm D20) |
| uma-farm's art (P126) | F25 A, F29 A | [M4's](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F25-art-m4.md) and [M5's](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F29-art-m5.md) pixel art: buildings, marks, goods, animal icons, story items, tool tints; drawn in `scripts/pixel-art`, published here | Claude | S–M, M | F29 A: after uma-farm's romance spec (F41) | **F25 A done** (uma-art 2.25.0, `f0d119f`, `83ee2b6`, `77e9001`, [release](https://github.com/luismlorenzana/uma-platform/actions/runs/43068430302), P132; uma-farm D49); F29 A waits |
| | F25 B, F29 B | The farm cast's seven busts (`cast` atlas) | ChatGPT | M | F25 B first | Ready (F25 B) |

## Tier authoring (TA)

One local Studio with nine boards on one scale ([authoring/tiers.md](../authoring/tiers.md), TS1–TS17,
[page](../authoring/previews/tiers.html), P113–P119); the next franchises are ranked in
[authoring/franchises.md](../authoring/franchises.md). The boards decide what gets authored and in what order; their one
output is the private `content/authoring/tiers/plan.json`.

| Id | What | Who | Size | Needs | State |
|---|---|---|---|---|---|
| TA1 | The Studio's home and seven boards, the per-character Uma board, the Genshin Impact and Wuthering Waves imports | Claude | L | — | **Done** (P113–P115) |
| [TA2](tasks/TA2-sprite-queue-characters.md) | The sprite queue reads Playable Umas and Uma NPCs instead of the frozen outfit roster | Claude | M | The owner's NPC ranking | Queued |
| TA3 | uma-quest's careers: a career a character, at least three bosses from the boss boards (P116) | uma-quest's session | M | — | Requested |
| TA4 | Q39's `enemies:candidates` reads the plan's boss, Key and Regular boards | Claude (with Q39, P126) | S | Q39 | With Q39 |
| TA6 | The next boss franchise, one packet each: Arknights: Endfield next ([ranked](../authoring/franchises.md)); Honkai Impact 3rd and Punishing: Gray Raven are built (TA1++) | Claude | M | The owner's pick | Waiting on the pick |

## The Uma Platform app (SH, RK, CA)

One signed-in site, `uma-platform.web.app`, in the `uma-rpg` project, with sub-apps behind tiles
([platform-app/README.md](../platform-app/README.md), AP1–AP24, [page](../platform-app/previews/platform-app.html),
P127–P131; [infrastructure](../platform-app/infrastructure.md)). SH1, SH2 and RK1 are done; CA1 is next; RK2 follows the owner's ranking.

| Id | What | Who | Size | Needs | State |
|---|---|---|---|---|---|
| SH1 | The app, local: `apps/web`, `apps/api`, the home tiles, the master data proxy, `packages/tiers`, the private-content check | Claude | M | — | **Done** (P130) |
| SH2 | The cloud and the deploy: `infra/bootstrap.sh`, `deploy-app.yml`, isolation checks, live at https://uma-platform.web.app | Claude | M | SH1 ✓, the owner's go ✓, the owner's console entries ✓ | **Done** (P130) |
| RK1 | Uma Ranker: every board online, Playable Umas per outfit on ten tiers (one art batch each), sisters, the bucket store, `ranker:seed`, `ranker:push`, `ranker:pull`, the Studio's boards retired | Claude | L | SH2 ✓ | **Done** (P131) |
| RK2 | The pass after the owner's ranking: lock the ten batches as the art queue, revisit the sisters, TA2 reads the plan (AP36) | Claude | M | RK1 ✓, the owner's ranking | After the ranking |
| [CA1](tasks/CA1-character-art.md) | Uma Character Art: uma-quest's Album moved here, laid out by the Ranker's batches | Claude | M | SH2 ✓, RK1 ✓ | Ready |
| CA2 | Chibi sprite sets, support card art, adult sets' inputs and source-art releases | Claude | M | CA1 | Written after CA1 |
| — | uma-quest: `/album` becomes a link to Character Art, its Album code goes | uma-quest's session | S | CA1 live | Requested then |
| GA1–GA3, PB1 | Quest, Farm and Platform Art; Publish from private authoring | Claude | — | The owner's ask | Later |

## Releases while packets run in parallel

Several packets release uma-kit; three create packages (`uma-work`, `uma-server`).
- A package change comes with a changeset: a minor for a new subpath or anything visible, a patch for a fix.
- **Right before merging,** fetch `main`, rebase, run `pnpm version-packages`, and push or merge. The release
  workflow publishes every unpublished version. If another packet took the version first, rebase and version again.
- A packet that needs another's release waits until the version is listed by
  `gh api /user/packages/npm/<package>/versions --jq '.[].name'`.
- **A new package** needs its Actions access granted to uma-rpg and uma-racer once, by the owner (Package settings →
  Manage Actions access → Read), or the games' CI can't install it. The packet says so in its delivery reply.

## Done

| Id | What | Commit |
|---|---|---|
| RK1+ | **The Ranker's polish:** Umas per tier on the board and the home; F on Playable Umas (not used, collapsed, key F); eleven more sisters in the live profiles (22 in all; Royce and Royce has one outfit); numbers-only landing pages. [Design](../platform-app/README.md) AP37–AP40 | P133 |
| RK1 | **Uma Ranker, live** at https://uma-platform.web.app/ranker: every board from `gs://uma-platform-content/ranker/`; Playable Umas per outfit on T1–T10 (one art batch each), one place or a whole tier up and down; 11 sisters in the private profiles; the old cast of 60 spread six a tier; the plan's schema 2 (identities, batches) for Character Art; `ranker:seed`, `ranker:push`, `ranker:pull`; the Studio's boards retired to links. [Design](../platform-app/README.md) AP25–AP36 | `af100ab`, `97f2be7`; deploy run [43064470175](https://github.com/luismlorenzana/uma-platform/actions/runs/43064470175) |
| SH1, SH2 | **The Uma Platform app, live** at https://uma-platform.web.app: `apps/web` and `apps/api` copied from uma-quest at `47ca16d` on uma-kit's shell and sign-in, a tile home, the master data proxy, `packages/tiers` shared with the Studio, checks for private content, sub-app boundaries and the Hosting site; `infra/bootstrap.sh` made the pieces in `uma-rpg` (run twice, nothing new the second time), `deploy-app.yml` deploys on app changes; isolation checked; CI runs tests one package at a time. [Design](../platform-app/README.md), [infrastructure](../platform-app/infrastructure.md) | `96c9393`, `9549f33`, `ae51b07`; deploy run [43051193940](https://github.com/luismlorenzana/uma-platform/actions/runs/43051193940) |
| TA1++++ | **A default outfit for each Uma with two or more**: locked in on her card or with `D`, saved on Playable Umas for both Uma boards; it sets her portrait, the outfit her card opens on and her playstyle, and the plan's `defaultOutfit` for TA2. [Tiers](../authoring/tiers.md). | `a88aa7e`, [CI](https://github.com/luismlorenzana/uma-platform/actions/runs/43034124193) · P125 |
| TA1+++ | **SSS and plain tier rows on the Uma boards**: Playable Umas and Uma NPCs rank SSS, SS, S, A, B, F in the same rows as every board, without the playstyle grid; her playstyle stays on her card, in the filter and in the plan. Every other board keeps SS to F, and SSS Umas' careers meet SS bosses. Playable Umas kept its ranks. [Tiers](../authoring/tiers.md). | `ab32f81`, [CI](https://github.com/luismlorenzana/uma-platform/actions/runs/42949270888); `d32ecdb`, [CI](https://github.com/luismlorenzana/uma-platform/actions/runs/42950767257) · P122–P124 |
| TA1++ | **Honkai Impact 3rd and Punishing: Gray Raven boss boards, unfiltered, and Left out**: 111 battlesuits and 86 frames from their wikis' MediaWiki APIs, one card each, with the valkyrie or construct, rank and type or class on the card. Any imported unit can be left out of every board from its card or its board's Left out row, and comes back when ranked or dragged. Eleven boards. [Tiers](../authoring/tiers.md), [franchises](../authoring/franchises.md). | `f6fe07c`, [CI](https://github.com/luismlorenzana/uma-platform/actions/runs/42676846736) · P120–P121 |
| TA1+ | **Playstyles and two more boss boards**: the Uma boards draw the old outfit board's playstyle grid again (tiers down, the five playstyles across), with the outfit's grades on the card, a lead-outfit rule that keeps the old SS at eight a playstyle, and a pick for the five characters whose outfits span two. Honkai: Star Rail (59) and Zenless Zone Zero (48) boss boards, and the next franchises ranked. [Franchises](../authoring/franchises.md), [page](../authoring/previews/franchises.html). | `b2d4d76`, [CI](https://github.com/luismlorenzana/uma-platform/actions/runs/42661611413) · P117–P119 |
| TA1 | **Tier authoring**: `pnpm studio` opens a home (a tile for each of seven boards and five sprite tools, then the numbers) and one board page for all seven, on one scale, SS, S, A, B, F, with leftovers flowing down. Umas per character (65 in the cast, 133 outfits), enemies on Azur Lane bosses, Key and Regular from their old roles, and 82 Genshin Impact and 46 Wuthering Waves characters imported locally. [Doc](../authoring/tiers.md), [page](../authoring/previews/tiers.html). | `1164fae`, [CI](https://github.com/luismlorenzana/uma-platform/actions/runs/42655245432) · P113–P116 |
| KF1 | uma-kit **0.19.0**, from uma-farm's F18 (its D31): the raised disc draws its `badge` (top-right, on the ring) and an optional `glow` (pulsing, still under reduced motion), portrait and landscape; `WorkProvider`'s `formatDuration(ms, 'left' \| 'length' \| 'ago')` words every work-screen duration. 0.17.0 portrait and H118 work snapshots unchanged; uma-rpg (226.97 KB of 230) and uma-racer (150.53 KB of 180) pass their checks on the packed kit. [Review page](../kit/previews/raised-and-durations.html). | `02e126c`, [published](https://github.com/luismlorenzana/uma-platform/actions/runs/42631418022) · P112 |
| Q15 | uma-art **2.24.0**: 32 original Warrior town frames on one 2048px page, 33 retained masters/prompts, reproducible export and native/2× sheets plus actual Quest town captures. Owner approved; parser and builder pass. All 26 previous runtime files unchanged. Quest’s consumer pins it and maps `stall`/`flowers` to `stall-1`/`flower-box`. | P111 · this PR |
| Q7 | uma-art **2.23.0**: 37 original forest frames on one 2048px page, pinned masters/prompts, deterministic export, native/2× room and battle reviews. Owner approved; Quest parser and builder pass. All 24 prior art files unchanged. Quest’s consumer pins it. | P110 · this PR |
| UA10, UA12 | Release **`7c34dbe2c8de`** is `latest`, after explicit approval, candidate verification and promoted read-back. Three townsfolk r4: 101401, 100103, 109701, each 45 frames / 2 patches / 12 actions. Five travelers: 106801 r5, 106701 r3, 112901 r5, 111501 r4, 113401 r3, each 130 / 7 / 29 with drawn left walk/run. All 14 checks and 839 repeat files pass; 630 old traveler PNGs and 1,133 parent files remain exact. 3,168 prior release files carried unchanged; 17 uploaded files (10,679,955 bytes). RPG site/health unchanged. Private approvals and publication records backed up. | P108 · this PR |
| KL1 | uma-kit 0.18.0: `KitStage` (portals, `cqh` heights, drags through the turn), `--inset-*` safe areas with `pl-safe`/`pr-safe`, the landscape sheet from the right edge, `AppFrame` rails (account and menu left, actions right), `PeekPanel` on a stage. Seven 0.17.0 markup snapshots unchanged; uma-rpg and uma-racer pass their checks on the packed kit (rpg 226.79 KB of 230). [Review page](../kit/previews/landscape.html). | `aeba59a`, [published](https://github.com/luismlorenzana/uma-platform/actions/runs/42514140209) · P103 |
| UA8 | Original held/emote families in uma-art **2.22.0**: 16 weapon textures and eight bubbles, authored masters and reproducible export; native/2× reviews. 6,480 local attachment checks, no grip drift, exact bow nock placement, all 635 character files unchanged. Studio gallery, desk and scene use the package. All 20 old atlas files unchanged; 24 built-in imagegen calls, 1,431.569 seconds summed. | P102 · this PR |
| UA5 | `pnpm sprites:pack` (approved-only, trimmed to visible pixels, shared images, shelf-packed WebP, deterministic), `release:publish -- --sprites-only` (on the published `latest`, every other file carried byte for byte), `--promote`, `release:check`. Encoding lossy q90/alpha 100: 1.34–1.66 MB a traveler, against 3.57–4.44 MB lossless. Release **`4757517816a0`**: 3,158 files carried, 11 added; candidate read back, then `latest`; uma-rpg unchanged (its uma-data 1.3.0 loads it identically). Steps in pipeline.md §7. | `f77ac77` · P100 |
| UA3 | Versioned local Studio: ranker, traveler/townsfolk queue with drag overrides, full action desk and field/scene previews, atomic key/set gates with SHA-256 and stale-write protection; automatic serialized backups. 18 Studio tests plus 22 pipeline/privacy checks pass; all pages reviewed locally. Existing approvals and all sealed art remain unchanged. | `544465a` ([#77](https://github.com/luismlorenzana/uma-platform/pull/77)) · P99 |
| UA6 | `gs://uma-platform-authoring`: private, versioned, uniform access and public access prevention; filtered backup succeeds, 6,508 live objects / 2,391,485,667 bytes; all-version authored bytes 2,404,753,077. Restored 106801 r4: 185/185 files byte-identical. Cache versions and abandoned upload chunks removed; default soft-delete expiry retained. | `544465a` ([#77](https://github.com/luismlorenzana/uma-platform/pull/77)) · P99 |
| UA2 | Versioned export, 14 pure checks, repeat, progress, templates and privacy guards. All 15 revisions repeat **1,335/1,335 files**; 70 explicit literals across history, five in current batch. Current five pass all checks; **635/635 files** repeat; all 2,032 sealed revision files unchanged. Progress: 5/100 travelers, 0/70 townsfolk. | `ed2d8c0` ([#76](https://github.com/luismlorenzana/uma-platform/pull/76)) |
| UA4 | uma-data 1.4.0: optional sprite index, packed-set types/parser, verified client loader and synthetic memory fixtures; backwards compatible, rejection tests. | `aa46c2c` ([#75](https://github.com/luismlorenzana/uma-platform/pull/75)) |
| UA7 | Five private full traveler revisions: 106801 r4, 106701 r2, 112901 r4, 111501 r3 and 113401 r2; 118 frames/7 patches/27 actions each (590 body PNGs, 35 patches, five keys and five atlases; 635 runtime files). Added 280 frames and five weary patches in 893 new revision files. **16 successful built-in imagegen calls, 1,328.461 seconds summed call duration** (overlapping calls); prompts, waits, raw masters and unused alternatives retained privately. All 14 checks pass, **635/635 repeat files** match byte for byte, **345/345 approved PNGs** and approved action metadata are preserved, and all 1,139 older revision files are unchanged. Each cycle's standing reference matches its facing still within 4 px and all six poses keep one scale; flight/stride poses retain their drawn proportions. Field single-file/four-facing and two-character emote proofs checked in an 844×390 DPR3 phone frame; Studio shows 5/100 full profiles, all 641 served runtime/prop files match disk. Keys and earlier battle approval carried forward by hash; full traveler sets approved 2026-11-08 against all 635 runtime hashes. No publish, roster edits or cloud changes. | Private content; this docs-only PR |
| UA1 | Five private outfit folders, ten revisions (seven unchanged imports + three P92 fixes), 620 body frames, 60 patches, 10 keys/atlases, 130 historical strips and six shared props; 976 PNGs including sources. All **580/580 imported native PNGs match pack SHA-256** (zero mismatches); fresh master recut repeats **350/350 current runtime files** byte for byte. 106801 r3 removes 2+2+1 opaque speck pixels; 111501 r2 removes one; 112901 r3 removes one and scales walk 1–5 uniformly about (128,240) from top rows 23/25/25/24/25 to 33 (height 208), preserving the exact key face and transforming anchors/crops. Every unlisted parent file is byte-identical. Current battle checks 1–11/14 pass; full traveler coverage remains UA7. Old packs (apart from README lines), roster and old pointer preserved; At UA1 delivery the current key/set gates were pending; battle approval followed on 2026-11-08 and full traveler approval is recorded under UA7. Review app launched; no publish. | Private content; this docs-only PR |
| A05 | Native 16px Card Ticket and 24px Fatigue sweat-drop/Rest towel marks (P87), appended on the 120×244 UI sheet. All 58 earlier records/pixels, 18 other atlas files and 94 preview PNGs frozen; real-background native/2×/4× review, full checks and 499-file repeat-generation proof passed. [Uma-art 2.21.0 published](https://github.com/luismlorenzana/uma-platform/actions/runs/42071645010); Racer owns pinning, replacing stand-ins, deployment and deleting its A05 brief. | `3e23261` ([art #70](https://github.com/luismlorenzana/uma-platform/pull/70)) |
| H156 | Three native 48px collections buildings (P86), appended in the last cells on the unchanged 288×432 sheet; all 51 older records and cutouts, 18 other atlas files and 90 dedicated previews frozen. Native/2× review, glow/edge/motif guards and ≥25% silhouette differences passed, with full platform checks. [Uma-art 2.20.0 published](https://github.com/luismlorenzana/uma-platform/actions/runs/41908742455); H158 owns the RPG pin. | `9323162` ([art #67](https://github.com/luismlorenzana/uma-platform/pull/67)) |
| H141 | Thirteen native star/stat icons (P80), appended on the 120×220 UI atlas with all 45 earlier records and pixels, 89 older preview PNGs and the other 18 atlas files frozen. Native/2×/4× white, dark and night-sky review; all platform checks passed. [Uma-art 2.19.0 published](https://github.com/luismlorenzana/uma-platform/actions/runs/41880067892); H144 owns the RPG pin. | `b612403` ([art #64](https://github.com/luismlorenzana/uma-platform/pull/64)) |
| H118 | Compact profile header, accessible progress in either size, and optional slot/peek face doors (P79), uma-kit 0.16.0 [published](https://github.com/luismlorenzana/uma-platform/actions/runs/41116447663). Four pre-change markup baselines, both games' uncached full checks, unchanged Racer header and four native RPG size/theme measurements (64px header, tab bar at 144px); temporary game wiring reverted. RPG's pin keeps its current display until H119/H124. | `5662009` ([kit #62](https://github.com/luismlorenzana/uma-platform/pull/62)); [RPG pin #84](https://github.com/luismlorenzana/uma-rpg/pull/84) |
| H138 | Five native 24px base-class family motifs replace only the authorised cells (P78), with all 45 records and every other pixel frozen; native/2×/4× white/dark sheets and actual RPG Classes-sheet acceptance at 390×844 and 375×667 in both themes. Uma-art 2.18.0 is [published](https://github.com/luismlorenzana/uma-platform/actions/runs/41099542585); RPG's pin, D262 and packet closeout are in [#83](https://github.com/luismlorenzana/uma-rpg/pull/83). | `9dc40f3` ([art #60](https://github.com/luismlorenzana/uma-platform/pull/60)); [RPG #83](https://github.com/luismlorenzana/uma-rpg/pull/83) |
| H135 | The Healer Sanctum's native 48px open temple (P77), 51 buildings on the unchanged 288×432 sheet, all 50 earlier records and pixels frozen, with the 2× keep/temple/chapel review; [uma-art 2.17.0 published](https://github.com/luismlorenzana/uma-platform/actions/runs/40978750402). RPG adoption belongs to H133 or the first later adopter. | `bab58c3` ([#58](https://github.com/luismlorenzana/uma-platform/pull/58)) |
| H127 | Seven Classes v3 emblems (P76), the 45-frame 120×164 UI sheet, old records/pixels and preview bytes frozen, native/2×/4× tree-order sheets; [uma-art 2.16.0 published](https://github.com/luismlorenzana/uma-platform/actions/runs/40932890896). H120 owns the RPG pin. | `45bdebb` ([#56](https://github.com/luismlorenzana/uma-platform/pull/56)) |
| H113 | The Wilds' trios: eight native 48px buildings, all 42 prior frames frozen, a fifteen-place preview at 1.5× and connected review roads (P73), uma-art 2.14.0; [published release](https://github.com/luismlorenzana/uma-platform/actions/runs/40506089104). RPG adoption belongs to H114. | `84cc80f` ([#52](https://github.com/luismlorenzana/uma-platform/pull/52)) |
| SE1 | uma-racer's master-data/art migration and retirement of 2,076 old generated objects, with both live overlays preserved; [acceptance and production verification](https://github.com/luismlorenzana/uma-racer/blob/main/docs/research/se1-master-data/README.md) | `efd36c4` ([racer #122](https://github.com/luismlorenzana/uma-racer/pull/122)); cleanup `9370e0a` ([#128](https://github.com/luismlorenzana/uma-racer/pull/128)) |
| SE3 | uma-rpg on `uma-kit/content` 0.9.1 and `uma-server/content` 0.2.0, with its master adapter, private enemy allowlist, routes, cache rules and behavior retained (its D158); [production deployment green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39633132807) | `18dbd4b` ([rpg #28](https://github.com/luismlorenzana/uma-rpg/pull/28)) |
| SC4 | uma-rpg's 11 Wilds facilities and quick looks on `uma-kit/work` 0.9.1, with RPG rules, saves, recipes, targets and D144 pickers retained (its D157); [production deployment green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39590331919) | `c8bded0` ([rpg #26](https://github.com/luismlorenzana/uma-rpg/pull/26)) |
| SC5 | uma-racer on `@luismlorenzana/uma-work` 0.1.0 and `uma-kit/work` 0.9.1, with Racer's rules, saves and planning retained (its D377); [local acceptance and production deployment green](https://github.com/luismlorenzana/uma-racer/blob/main/docs/research/sc5-work/README.md) | `8967e24` ([racer #124](https://github.com/luismlorenzana/uma-racer/pull/124)) |
| SA7 | The plaza crowd in uma-racer, uma-kit 0.3.0 (its D371) | `9723a23` (release `0737c9f`) |
| SC1 | `@luismlorenzana/uma-work` 0.1.0, one work engine for both games (P53) | `ed446b8` (release `29a37d5`) |
| SC2 | `uma-kit/work`, the shared work screens in uma-kit 0.8.0 (P61); [published release](https://github.com/luismlorenzana/uma-platform/actions/runs/39168986257), props and SC4/SC5 adoption notes in [the kit README](../../packages/kit/README.md#work-work); local racer proof at 390×844, scratch changes reverted | `fe7e30f` ([#33](https://github.com/luismlorenzana/uma-platform/pull/33)) |
| A04 | Ten original 32px tonic item icons in uma-art 2.10.0 (P62); [published release](https://github.com/luismlorenzana/uma-platform/actions/runs/39412839729). Racer pins and renders all ten with light/dark phone-width acceptance and a verified production deployment | `7ed5bce` ([#36](https://github.com/luismlorenzana/uma-platform/pull/36)); Racer `be16a6d` ([racer #127](https://github.com/luismlorenzana/uma-racer/pull/127)) |
| H73 | Thirty-one original made-item icons in uma-art 2.13.0 (P72), with all 2.12.0 item pixels frozen and native/2×/4× review sheets; [published release](https://github.com/luismlorenzana/uma-platform/actions/runs/40200573898) | `64c3a15` ([#49](https://github.com/luismlorenzana/uma-platform/pull/49)) |
| SC3 | uma-rpg on `uma-work` 0.1.0: four kinds, save v22, Repeat and stopped queues (its D152) | `6063b95` |
| SD3 | uma-rpg on uma-kit 0.7.0 `/auth` and `/places` and uma-server 0.2.0 `/auth`: getting in, Account, Warehouse, Exchange, profile frame (its D153) | `3ea66a4` |
| SD4 | uma-racer on uma-kit 0.6.0 `/auth` and `/places` and uma-server 0.2.0 `/auth`: getting in, Account, Warehouse, Exchange, profile frame (its D372) | `7d2b757` (release `b20bb13`) |
| SD1 | `@luismlorenzana/uma-server` 0.1.0 with `/auth`, the shared API guard (P54) | `1824879` (release `09f6d52`) |
| SB2 | `uma-kit/roster`, the album engine and level rule, uma-kit 0.4.0 (P55) | `c518093` (release `f7f6e51`) |
| SB3 | `uma-kit/album`, the shared album screens, art primitives and Uma picker, uma-kit 0.7.0 (P58) | `5579b32` (0.7.0 tag) |
| SB6 | uma-racer on uma-kit 0.7.1: shared Stable/pickers, small faces and race busts (its D373); local acceptance under P60, [production deployment green](https://github.com/luismlorenzana/uma-racer/actions/runs/39145322463) | `4885baf` ([racer #120](https://github.com/luismlorenzana/uma-racer/pull/120)) |
| SD2 | `uma-kit/auth` and `uma-kit/places`, uma-kit 0.5.0 (P56) | `b9247da` (release `8b3e26b`) |
| SE2 | Shared content loading and proxy, uma-kit 0.6.0 and uma-server 0.2.0 (P57) | `5aaeb93` (release `8ad4354`) |
| SB1 | `outfit-faces`: a face crop per outfit in uma-data 1.1.0 | `516cb84` (release `11cf2ea880df`) |
