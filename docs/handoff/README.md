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

**Ready now:** UA10 (ChatGPT), for the new apps ([the new-apps brief](../new-apps/README.md), below). Batch 1 is published: master data's `latest` is `4757517816a0` (UA5, P100). UA2–UA8 are delivered, and KL1 is released in uma-kit 0.18.0 (P103) for uma-quest's Phase 5. PO1 waits for its requests (uma-farm's F7 and uma-quest's Q17). Other platform art and sibling packets are complete; A05 adoption belongs to Racer. SE5 stays parked.

## Uma sprites: the pipeline (UA)

Taking ChatGPT's sprite experiments into authoring and publishing ([pipeline.md](../sprites/pipeline.md), the format in
[format.md](../sprites/format.md), CR1–CR34, P91). Ids are UA, then a number. Batch art is private, in `content/`; props
and bubbles are uma-art.

| Id | What | Who | Size | Needs | State |
|---|---|---|---|---|---|
| UA5 | `sprites:pack`, the sprite-only publish, the encoding, batch 1's first release | Claude | M | UA2, UA4; the owner's set approval | Done (release `4757517816a0`, P100) |
| [UA9](tasks/UA9-batch-2.md) | Art: batch 2 in the full profile; the template for batches 3–20 | ChatGPT | L | UA2, UA3, UA7 (UA5 to publish) | **Ready after the slice** |
| [UA10](tasks/UA10-townsfolk-pilot.md) | Art: the townsfolk profile on three characters (batch T1), for uma-quest's slice town | ChatGPT | S | UA2 ✓ | **Ready** |
| [UA11](tasks/UA11-townsfolk-batch.md) | Art: a townsfolk batch of ten; the template for T2–T8 (P93) | ChatGPT | M | UA10's set gate, UA2 | After UA10, UA2 |

**Order:** UA1 and UA7 are complete, and the owner approved batch 1's full traveler sets on 2026-11-08 (`reviews.json`),
which closed uma-rpg's H168 (its D310). UA2 and UA4 are complete. UA3, UA5 and UA6 are complete; UA8 is complete; UA10 is ready. UA5 published batch 1 on 2026-11-08 (release `4757517816a0`),
so uma-quest's Q6 loads sprites from master data. UA10's townsfolk publish with a later release, by [pipeline.md](../sprites/pipeline.md) §7's "Publishing a batch". Townsfolk follow UA11's batches, one after each traveler batch (P93). Written later, when their uma-quest step nears: the
rival add-on, familiars at the new scale, and the bestiary's foe format (CR34).

## The new apps: what uma-quest and uma-farm need (NA)

The brief is [new-apps/README.md](../new-apps/README.md) (NA1–NA11, [page](../new-apps/previews/new-apps.html)): what
uma-quest's [first slice](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/first-slice.md) and
uma-farm's [first playable farm](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/first-playable.md)
need from here, in order. A uma-platform session writes the missing packets from it.

| Milestone | Id | What | Who | Size | Needs | State |
|---|---|---|---|---|---|---|
| M1, uma-quest's engine | UA5 | Batch 1 published in master data: release `4757517816a0` | Claude | M | UA2 ✓, UA4 ✓, approval ✓ | **Done** (P100); uma-quest's Q6 can load it |
| | UA6 | Backup complete: 2.39 GB live authored content, caches removed; 185-file restore byte-identical | Done | — | — | **Done** |
| M2, uma-quest's slice | UA8, UA10 | Weapons and bubbles; three townsfolk (above) | ChatGPT | M, S | — | UA8 done (2.22.0); UA10 ready before Q12 |
| | Q7, Q15, Q16 | uma-quest's art packets (forest kit, town kit, foes), written there, drawn here, released in uma-art | ChatGPT | M each | uma-quest's Q5, Q8 | Incoming |
| M3, the next stretch | KL1 | uma-kit's landscape layout, an opt-in kit minor ([request](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/kl1-request.md)) | Claude | M | uma-quest's Q4 ✓ | **Released** (uma-kit 0.18.0, P103); uma-quest adopts it in Phase 5 |
| | UA3, UA9, UA11 | The Studio in git; batch 2 (wave 2); townsfolk T2 onward (above) | Either, ChatGPT | M, L, M | — | After the slice |
| M4, uma-farm's parcels | PO1 | `uma-post` 0.1.0: the parcel format, accept lists and caps | Claude | M | uma-farm's F7, uma-quest's Q17 | To write |
| | F9 | uma-farm's art packet (the Forge and the Post), drawn here | ChatGPT | M | uma-farm's F7 | Incoming |

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
| KL1 | uma-kit 0.18.0: `KitStage` (portals, `cqh` heights, drags through the turn), `--inset-*` safe areas with `pl-safe`/`pr-safe`, the landscape sheet from the right edge, `AppFrame` rails (account and menu left, actions right), `PeekPanel` on a stage. Seven 0.17.0 markup snapshots unchanged; uma-rpg and uma-racer pass their checks on the packed kit (rpg 226.79 KB of 230). [Review page](../kit/previews/landscape.html). | This release · P103 |
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
