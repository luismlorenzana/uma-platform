# Uma sprites: authoring and publishing

> **Status: 2026-11-08. The plan for taking ChatGPT's sprite experiments into a pipeline (P91).** The owner likes the
> results: five complete battle sets at art set version 2. This page says:
> - what the experiments built;
> - what uma-quest's planned work still needs;
> - how a set goes from the roster to master data's private release;
> - the packets that build the pipeline: UA1–UA10, in [the handoff](../handoff/README.md#uma-sprites-the-pipeline-ua).
>
> The format each set follows is [format.md](format.md) (CR1–CR18). This page's calls are CR19–CR34. Visual page:
> [previews/pipeline.html](previews/pipeline.html). Outfits are named by id only; names come from master data.

## The short answer

- **The method works and stays as it is:**
  1. about six image-generation masters for each Uma;
  2. a deterministic export into frames, faces and an atlas;
  3. automatic checks;
  4. a viewer.

  Each Uma took about 5 minutes of generation waits, plus export and checks.
- **What makes it a pipeline:**
  - the tools move into git;
  - each outfit gets immutable revisions;
  - the owner approves at two recorded gates;
  - sets publish into master data's private release, the way busts and faces already do;
  - games load them by outfit id.
- **What uma-quest still needs** beyond the five battle sets:
  - the **field set**: walking and running in three more facings;
  - `weary`, and **six emotes**;
  - the **townsfolk** profile and the **rival** add-on;
  - **ten held weapons** and **emote bubbles** (uma-art).

  The traveler profile grows from 62 to **118 frames**.
- **The order:** the layout and the format first, then the tools, the Studio and the schema, then the first publish
  before uma-quest's Q6. Batch 1's missing actions are drawn at the same time, and from batch 2 every batch is a
  uma-quest wave.
- **Your part:** approve sets in the Studio, which also gives the go to publish them, and say yes to a backup bucket
  (UA6, about $0 a month).

## 1. What the experiments built

All of it is private, in uma-platform's ignored `content/`:

| Piece | Where it is now | State |
|---|---|---|
| The owner's roster: 272 outfits ranked, 100 selected (SS 40, A1 40, A2 20), 20 for each Way | `content/authoring/uma-art-roster.json` | Durable; the ranker writes it |
| Batch 1: 106801 (Warrior), 106701 (Healer), 112901 (Mage), 111501 (Summoner), 113401 (Spellblade) | `content/authoring/uma-sprites-v2/`, with v1 in `uma-sprites/` and the pointer in `uma-sprites-current.json` | 62 frames, 6 patches and 14 entries each, all checks passing; v2 re-authored 106801 and 112901's faces. **The five full traveler sets were approved on 2026-11-08 against all 635 runtime hashes** |
| The baseline study (106801 and 100701) | `content/review/sprite-baseline/` (546 MB of studies, rejected attempts and viewers) | H168 in uma-rpg: keys and turnarounds approved 2026-11-06, the full set pending |
| Sprite Studio: the ranker, the 100-outfit checklist and the animation desk | `content/review/sprite-ranker/`, at `http://127.0.0.1:4318` | Works, but it's in `content/`, so it isn't versioned |
| The export, the checks and the viewer | `export-full.cjs`, `verify.cjs`, `player.js`, `timeline.mjs`, and others, beside each study | Work, but each study has its own copy |
| Progress | `content/authoring/uma-sprite-progress.json` | 5 done, 95 queued |

**What the experiments settled:**
- the 256 px full-colour look;
- the face-only lock;
- six masters for each Uma: identity, locomotion, swing, cast, reactions, and arms with victory;
- reuse is fine where it's recorded;
- body-centred falls;
- one hand crop over each grip.

**What a pipeline still lacks:**

| Gap | Fixed by |
|---|---|
| No code in git: each study copies its scripts, and the Studio isn't versioned | UA2, UA3 |
| Versions are whole packs (v1, v2), while 100 outfits progress on their own | UA1 |
| Approvals live in prose and JSON flags, not tied to file hashes | UA1, UA3 |
| No backup: `content/` isn't in git and nothing copies it | UA6 |
| No schema, no release family, no publish: no game can load a set | UA4, UA5 |
| The profile covers fights only (§2) | UA7, UA8, UA10 |
| No rule for what's drawn next | §5 |

## 2. What uma-quest still needs

uma-quest's plan and campaign, packet by packet. "Have" means drawn and checked today.

| uma-quest step | What it shows | Have | Missing | Packet |
|---|---|---|---|---|
| **Q4, the stage** (Phase 2) | A stand-in Uma on the turned stage | — | Nothing: it uses stand-ins | — |
| **Q6, sprites in the engine** (Phase 2) | The leader and four followers in single file, walking every way (DN24, DN25); faces and blinks; scene tint | Battle facing: `walk`, `run`, `idle`, faces | **Walk and run facing front, back and right**; a loadable release | UA7; UA4 and UA5 |
| **Q9, the fight screen** (Phase 3) | Five Umas against foes, every fight event | The battle set ✓ | **Held weapons** for ten kinds (placeholders work for the slice); `weary` for carried HP (DN12); familiars at the new scale (the old two-pose pixel ones work until then) | UA8, UA7 |
| **Q11, the dungeon** (Phase 3) | Walking and Dash; chests; Springs; downed followers | — | The field set (Dash plays `run-*`). A downed follower walks greyed by the game, with no new art | UA7 |
| **Q12, the town and the story runner** (Phase 3) | Speakers walking, emoting and talking; townsfolk walking; portraits by the text box (CM17) | Portraits are master data's busts ✓ | **Six emotes; emote bubbles; townsfolk sets** for the slice's town | UA7, UA8, UA10 |
| **Phase 5, band 1** | Wave 1 complete; rival bosses facing right (CM27); band 1's townsfolk; the bestiary | — | Batch 1's full profile; the **rival add-on**; townsfolk batches; the bestiary (original foes, uma-quest's Phase 4 designs them) | UA7; UA9 onwards; later packets |
| **Phases 6 and 7** | Waves 2–20 | — | A batch a wave | UA9, repeated |

**Not missing:**
- **Portraits:** master data's busts and portraits serve the text box (CM17).
- **Talking:** the portrait marks who speaks.
- **Cheering:** that's `victory`.
- **Mirrored facings:** never used.
- **Normal maps:** not used. Scene tint comes first (uma-rpg HD10).

## 3. Where things live

**Character art is private** (CR19), because it derives from master data's art (P6). It's authored in `content/` and
published only to master data's private bucket: never to git, uma-art or a public host. **Prop art is original** and goes
to uma-art, which is in git and ChatGPT's: held weapons, emote bubbles, familiars, and any generic townsfolk who aren't
Umas.

```text
content/authoring/                        durable, gitignored, backed up (UA6)
  uma-art-roster.json                     the owner's selection (the ranker writes it)
  sprites/
    reviews.json                          the owner's gate decisions (the Studio writes it)
    progress.json                         generated from the folders and reviews; never hand-edited
    shared/                               placeholder props, until uma-art has them
    <outfitId>/
      current.json                        { "revision": 2 }: the revision the Studio and the publish use
      r<n>/                               one revision: written once, never changed
        atlas.json                        format.md §12
        identity.md                       the checklist (format.md §8)
        frames/  faces/                   native PNGs
        masters/                          the generation outputs the frames are cut from
        sources/                          inputs, rejected generations, corrections
        config.json                       cut boxes, offsets and alignments the export reads
        prompts.json                      every generation, its prompt and its wait
        verification.json                 the 14 checks (format.md §11)
        README.md                         findings: generations, rejections, reuse, minutes
content/review/                           disposable: studies, comparisons, scratch viewers
```

Git holds the generic side (CR23):
- the tools, under `scripts/sprites/` and `tools/studio/`;
- the format and this page;
- prompt templates without names (`scripts/sprites/templates/`);
- synthetic test fixtures.

Per-character prompts, cut configs and identity notes name the character, so they stay in `content/`.

## 4. Stages, gates and revisions

```text
Queued ─► Key drawn ─► [ Key gate ] ─► Drawn ─► Verified ─► [ Set gate ] ─► Published ─► In a game
              ▲            │ changes                 │ fails       │ changes
              └────────────┘                         └─► new revision ◄┘
```

| Stage | Means | Who |
|---|---|---|
| Queued | In the roster's scope, not started | — |
| Key drawn | The identity sheet: key, turnaround, checklist | ChatGPT |
| **Key gate** | You approve the identity sheet, or ask for changes with a note | You, in the Studio |
| Drawn | Every action in the profile drawn and exported | ChatGPT |
| Verified | All 14 checks pass against the revision's files | The tools |
| **Set gate** | You approve the batch's sets in the animation desk, or send changes for any one | You, in the Studio |
| Published | In a master-data release | ChatGPT (UA5 proves the path first) |
| In a game | A game draws it | The game |

- **Two gates, both in the Studio** (CR20): the key for each outfit, about a minute each, and the set for each batch of
  five, about ten minutes.
  - **Approve** records the revision and the hash of every file.
  - **Changes** records your note.
  - A changed file voids an approval, so nothing slips past a gate.
- **Approving a set is the go to publish it** (CR21). Sprites are additive and private, and no game changes behaviour
  until it draws them.
- **Revisions never change** (CR22).
  - A fix, a redraw or new actions make a new revision.
  - The new revision keeps every approved frame byte for byte (check 12), so you review only what's new.
  - A style change like version 2 is a new revision for the outfits it touches.
- **The Studio shows every outfit's stage,** with filters for tier, Way, stage and profile, as the checklist does now.

## 5. What gets drawn next

- **Travelers come in batches of five, one of each Way** (CR24):
  - in tier order, SS, then A1, then A2;
  - within a Way, the next undrawn outfit in the roster file's order;
  - never two outfits of one character in a batch.

  Each Way has 20 outfits, so the 100 are exactly **20 batches**: 8 SS, 8 A1 and 4 A2.
- **Batch N is uma-quest's wave N.** Each batch makes a whole party, so a wave's stories can start as soon as its art
  is approved.
  - **Batch 1** is the five drawn.
  - **Batch 2** by the rule: 108701 (Warrior), 113301 (Spellblade), 111001 (Mage), 111801 (Healer), 111401 (Summoner).
  - You can reorder the queue in the Studio, and the rule only fills the gaps.
- **Townsfolk** (CR25, P93): one set for each of the 70 characters with no selected outfit. Each uses her best-ranked
  outfit in the roster (B before F, then roster order).
  - They're drawn **ahead, in batches of ten**, so towns cast from a ready pool: T1 is UA10's three for uma-quest's
    slice town, and T2–T8 follow UA11's template (28 tier B, then 42 tier F).
  - A townsfolk batch follows each traveler batch, unless the Studio's queue says otherwise.
  - Each batch has one key review and one set review, like a traveler batch.
- **Rival add-ons** follow the chapters. Each is drawn when a written chapter first casts that traveler as a boss.

## 6. Tools

| Tool | What it does | Packet |
|---|---|---|
| `pnpm sprites:export <outfit>` | Cuts a revision's masters into frames, faces and the atlas from its `config.json`, deterministically | UA2 |
| `pnpm sprites:verify <outfit> \| --all` | The 14 checks; writes `verification.json` | UA2 |
| `pnpm sprites:repeat <outfit>` | A second export, compared byte for byte (check 14) | UA2 |
| `pnpm sprites:progress` | Rebuilds `progress.json` from the folders and `reviews.json` | UA2 |
| `pnpm studio` | Sprite Studio at `http://127.0.0.1:4318`: the ranker, the queue and checklist, the animation desk, both gates | UA3 |
| `pnpm sprites:pack` | Builds the `outfit-sprites` family from approved revisions | UA5 |
| `pnpm release:publish` | The existing publish, now with sprites | UA5 |
| `pnpm sprites:backup` | Copies `content/authoring/` to the backup bucket, never deleting | UA6 |

UA2's four commands are implemented in `scripts/sprites/` ([usage](../../scripts/sprites/README.md)). Existing sealed revisions use reconstructed export sidecars under `export-configs/<id>/rN.json`; fresh reports go under `reports/<id>/rN/`, preserving the original receipts. New revisions use config schema version 2 in place. Exports always target a separate directory. Check 13 compares the first standing contact with its facing still and requires a constant scale for the whole cycle.

They're TypeScript in git with Vitest on synthetic fixtures: invented shapes, never Uma art. They port the logic of
ChatGPT's scripts, which must give the same bytes for batch 1 (UA2's acceptance).

## 7. Publishing

- **The family `outfit-sprites`** (CR26, format.md §13):
  - one sprite set file per published outfit;
  - packed WebP pages;
  - a `sprites` map in the art index.

  It's available in uma-data 1.4.0 (UA4).
- **A sprite publish changes nothing else** (CR27). The new manifest carries every other file of the latest release
  byte for byte. A master-data refresh (GameTora) is its own publish, as today.
- **How games load a set** (CR28):
  - only when the outfit is on screen (her party, a scene, a rival fight);
  - through the game's own logged-in content proxy (`uma-server/content`);
  - cached in IndexedDB by `uma-kit/content`.

  A game draws whatever revision `latest` holds, and can pin a release to test.
- **Who publishes** (CR29): ChatGPT, from the owner's machine with the scoped gcloud command, as it does with uma-art.
  UA5's first publish is Claude's, to prove the path and write the steps down. If a ChatGPT session can't reach gcloud,
  it hands the publish to Claude.

## 8. Roles

| Who | Does |
|---|---|
| **You** | Rank the roster; approve keys and sets in the Studio; say yes to the backup bucket. Nothing else |
| **ChatGPT** | Draws, exports, verifies and publishes sets; draws uma-art props and publishes uma-art (art end to end, 2026-10-29) |
| **Claude or ChatGPT** | The tools, the Studio and the schema (UA2–UA4) |
| **Claude** | UA5's first publish and UA6's bucket, both on the owner's machine; uma-quest's side |

## 9. Volume and time

| Profile | Outfits | Frames each | Frames in all | Done | Generation masters each | Generation waits |
|---|---|---|---|---|---|---|
| Traveler | 100 | 118 | 11,800 | 310 (batch 1's battle sets) | ~10 (6 measured, plus ~4 for the field set, `weary` and emotes) | ~8 min each, **~13 h** |
| Townsfolk | 70 | 45 | 3,150 | — | ~4 | ~3 min each, ~3.5 h |
| Rival add-on | up to 65 | ≈25 | ≈1,600 | — | ~2 | ~1.5 min each, ~1.5 h |

- The measured base is from H168 and batch 1: 5–6 calls and 4.5–4.8 minutes of waits for each Uma's battle set.
- Export, checks and fixes come on top. Batch 1's README records them.
- **Your time:** about a minute a key, ten minutes a batch, and about 4 hours over all 20 batches.

## 10. What it costs

| Piece | Free tier | Expected | A month |
|---|---|---|---|
| Backup bucket `gs://uma-platform-authoring` (UA6), `us-central1`, versioned | 5 GB-months of Standard storage in US regions, shared by the billing account | ~0.2 GB now, ~4 GB with the full roster (~30 MB a traveler with masters, ~10 MB a townsfolk set) | **$0** now; at most about $0.08 if other buckets use the free 5 GB |
| Master-data bucket, sprite files added | The same | ~2–4 MB a traveler packed (UA5 measures it), ~0.3 GB at the full roster | $0 to $0.01 |
| Serving to the phone (quest-api's proxy) | 1 GB a month of Cloud Run egress in North America | A party's five sets once (~10–20 MB), then cached | $0 |
| Generation | ChatGPT's own tool | — | $0 in the cloud |

The owner approved UA6 on 2026-11-08. The private versioned authoring bucket now exists; it backs up authored inputs and decisions, excluding rebuildable downloaded models, binaries and dependency caches. See the measured size and restore instructions in [infra/README.md](../../infra/README.md).

## 11. The packets

All in uma-platform. Ids UA1–UA10 (they don't collide with D, P, S, H, Q, F or racer's A).

| Id | What | Who | Size | Needs |
|---|---|---|---|---|
| [UA1](../handoff/tasks/UA1-durable-layout.md) | The durable layout: batch 1 and the study moved into per-outfit revisions, `current.json`, `reviews.json`, regenerated progress; old packs kept, marked superseded | Either | S | — |
| UA2 (done) | `scripts/sprites` in git: export, the 14 checks, repeat and progress, tested; batch 1 reproduced byte for byte | Either | L | UA1 |
| [UA3](../handoff/tasks/UA3-sprite-studio.md) | Sprite Studio in git (`pnpm studio`): ranker, queue, animation desk, both gates writing `reviews.json` | Either | M | UA1 |
| [UA4](../handoff/tasks/UA4-sprites-schema.md) | uma-data 1.4.0: the `outfit-sprites` family, its parser, the art index's `sprites` map, synthetic fixtures | Either | M | — |
| [UA5](../handoff/tasks/UA5-pack-and-publish.md) | Pack and publish: `sprites:pack`, the sprite-only publish, the size decision, batch 1's first release | Claude | M | UA2, UA4; your set approval |
| [UA6](../handoff/tasks/UA6-authoring-backup.md) | The backup bucket and `sprites:backup` | Claude | S | **Your yes** |
| [UA7](../handoff/tasks/UA7-batch1-full-profile.md) | Art: batch 1's field set, `weary` and emotes, as a new revision each | ChatGPT | M | UA1 |
| [UA8](../handoff/tasks/UA8-held-items-and-bubbles.md) | Art, uma-art: ten held weapons and eight emote bubbles | ChatGPT | M | — |
| [UA9](../handoff/tasks/UA9-batch-2.md) | Art: batch 2 in the full traveler profile; the template for batches 3–20 | ChatGPT | L | UA2, UA3, UA7 |
| [UA10](../handoff/tasks/UA10-townsfolk-pilot.md) | Art: the townsfolk profile on three characters (batch T1), for uma-quest's slice town | ChatGPT | S | UA7 |
| [UA11](../handoff/tasks/UA11-townsfolk-batch.md) | Art: a townsfolk batch of ten; the template for T2–T8 | ChatGPT | M | UA10's set gate, UA2 |

**Later, written when their game step nears:**
- the rival add-on's first set, with uma-quest's Phase 5;
- familiars at the new scale, with Q9, if its measurement asks for them;
- the bestiary's foe format, with uma-quest's Phase 4 design.

```text
UA1 ──┬─► UA2 ──┬─► UA5 (first publish, after your set approval) ──► uma-quest Q6 loads it
      │         │
      ├─► UA3 ──┼─► UA9 (batch 2 …) ──► batches 3–20
      │         │
      └─► UA7 ──┴─► UA10
UA4 ─────────────► UA5
UA8 (uma-art) runs alongside;  UA6 (bucket) on your yes
```

**Before uma-quest's Q6** (its Phase 2): UA4 and UA5 publish batch 1, so Q6 loads real sets through master data rather
than files copied out of `content/`. UA7 adds the facings Q6 walks in.

## 12. Across the repos

- **uma-rpg's H168** closes when you approve batch 1's battle sets at the set gate. That's the full-set review it was
  waiting for. Its "format amendment" is format.md (CR30). uma-rpg's animation spec stays as history, marked
  superseded.
- **uma-quest** (its D5):
  - wave 1 is batch 1, which amends CM33's default list and CM34's 100703;
  - Q3 shrinks to moving the HD-2D research, because the sprite format now lives here;
  - Q6 loads sets from master data's `outfit-sprites` family;
  - a traveler joins the party menu once her set is published (DN1, CM1).
- **uma-rpg** draws no sprites while it's frozen (its D308). A later uma-rpg could read the same family by outfit id.

## 13. Risks

| Risk | What keeps it small |
|---|---|
| Losing `content/authoring/`, the masters and approvals behind every set | UA6's versioned bucket, which never deletes; masters kept in each revision |
| Style drift across 100 travelers and 20 batches | The key gate for each outfit; the version 2 face bar (format.md §5); batch 1 as the rendering reference in every prompt |
| A style change late in the rollout | A new revision for the outfits it touches; approved frames stay until then; the release keeps the old revision until the new one is approved |
| Release size on the phone | UA5 measures and picks the encoding; sets load only for Umas on screen, and stay cached |
| A sprite publish disturbs uma-rpg's live master data | The sprite-only publish carries every other file byte for byte; uma-data's old parsers ignore `sprites` |
| Names or art leaking into git | Atlases drop names (UA1); a private-content check in CI covers `scripts/sprites` and `tools/studio`; fixtures are synthetic |

## 14. Calls

| Id | Call |
|---|---|
| CR19 | Uma sprites are private: authored in `content/authoring/sprites/`, published only in master data's private release; props, bubbles, familiars and generic townsfolk are original and go to uma-art |
| CR20 | Two owner gates in the Studio: the key per outfit and the set per batch; each records the revision and its file hashes, so a changed file voids it |
| CR21 | Approving a set is the go to publish it |
| CR22 | Revisions are immutable folders; a fix or new actions make a new revision that keeps approved frames byte for byte, so the owner reviews only what's new |
| CR23 | The tools are generic code in git (`scripts/sprites`, `tools/studio`, prompt templates without names); per-character prompts, configs and identity notes stay in `content/` |
| CR24 | Batches of five, one per Way, in tier order then roster order, never two outfits of one character; 20 batches; batch N is uma-quest's wave N |
| CR25 | Townsfolk: one set for each of the 70 characters without a selected outfit, in her best-ranked outfit (B before F). **Amended by P93:** drawn ahead in batches of ten (T1–T8), one after each traveler batch |
| CR26 | The release family `outfit-sprites` in uma-data 1.4.0 (format.md §13) |
| CR27 | A sprite publish carries every other file of the latest release byte for byte |
| CR28 | Games load a set only while that Uma is on screen, through their own content proxy, cached; they draw the revision `latest` holds |
| CR29 | ChatGPT publishes sets as it publishes uma-art; UA5's first publish is Claude's; a session without gcloud hands it to Claude |
| CR30 | H168 closes at batch 1's set gate; format.md is its format amendment; uma-rpg's animation spec is marked superseded |
| CR31 | uma-quest's wave 1 is batch 1, Q3 shrinks to the HD-2D research, and Q6 loads from master data (uma-quest D5) |
| CR32 | A private, versioned backup bucket for `content/authoring/` that never deletes (UA6, on the owner's yes) |
| CR33 | Batch 1 becomes the full traveler profile (UA7) before batch 2, so batch 2 onwards is drawn to the whole profile at once |
| CR34 | The rival add-on, familiars and the foe format are written when their uma-quest step nears, not now |
