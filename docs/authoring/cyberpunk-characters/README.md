# Uma Cyberpunk character authoring

Use this packet to author an Uma for Uma Cyberpunk, from identity references to an approved wardrobe in the local album,
ready for the owner to have it published. It follows the same shape as the
[Farm Life character packet](../farm-life-characters/README.md) but is a separate initiative: its own look, its own
collection, its own album and its own approvals. [Desktop page](../previews/cyberpunk-authoring.html) (every Cyberpunk
cycle on one page).

The target is **the approved Cyberpunk standard with a distinct person**: the same Hardline Anime rendering, staging and
wardrobe roles as the approved pilots, with the new Uma's own face, hair, markings, ears, tail and colours.

## Start here

1. Read [AGENTS.md](../../../AGENTS.md), the latest [decisions](../../decisions.md) (P162, P174, P181, P182) and
   [workflow.md](workflow.md).
2. Read the local visual standard, `content/authoring/character-universes/cyberpunk/approved/style-guide.md`, and open the
   approved album (`cyberpunk/approved/review.html`, or `pnpm art:gallery`, http://127.0.0.1:4323).
3. Open `cyberpunk/cast/review.html` for the playable crew in Ranker order. Use the existing `brief.md` and
   `character.json` from her **gitignored** folder, `content/authoring/character-universes/cyberpunk/characters/<key>/`.
   Fill the brief from the owner's instructions and the inspected references. Use the
   [character brief template](templates/character-brief.md) if the folder has no brief yet.
4. Keep a [handoff.md](templates/handoff.md) there, so another session can resume without chat history.

The method, the templates and the album code are in git. References, filled briefs and prompts, generated images,
reviews, approvals and every album's words are private and stay under `content/`, which is gitignored and never backed up
(P165).

## Standard scope

| Part | Direction |
| --- | --- |
| Character age | Adult women in their twenties; working art age **25** |
| Illustration | **Hardline Anime**: confident dark ink, tapered line weight, precise hair and garment construction, strong angular cel shadows, bright flat signature colours, controlled material highlights |
| Staging | Neutral straight-on full body: upright head, level shoulders and pelvis, weight even, feet slightly apart, arms relaxed down and clear of the torso, hands visible |
| Image | One transparent RGBA PNG per look, **1024 × 1536**, complete ears-to-footwear framing, no embedded names or titles |
| Wardrobe | **Street** (investigation), **Quarters** (ship living quarters), **Ship operating** (pilot suit), **Combat armor** (Modular Frame 01), **Helmeted combat armor** (Frame 01 with the shared Helmet 01) |
| Order | Street first, from the original reference; the other four from her approved Street; the helmeted look from her approved armor, keeping the shared helmet geometry |

One character's completion is **five approved full-body looks**. Dialogue portraits, combat keys and splash art are later
initiatives; they get their own packets when the owner asks.

## Local source of truth

Paths are relative to `content/authoring/character-universes/cyberpunk/`. They exist only on the owner's machine.

| Path | What |
| --- | --- |
| `approved/` | The pilots' approved collection: `manifest.json` (approvals bound to each PNG's SHA-256), `style-guide.md`, `album.json` (the album's words), `review.html` (built) |
| `cast/` | The playable crew's reference and work album, grouped by Ranker tier. The Local Art Gallery renders it from the character folders on refresh, and `pnpm art:albums cyberpunk` writes a standalone copy |
| `characters/<key>/` | One character's collection. `character.json` records her Ranker place and the original ranked outfit references from master data, with SHA-256. `references/` holds the images. Keep authored work in `v001/`, `v002/` … and the approved version pointer in `active-study.json` |
| `characters/<key>/<version>/album.json` | Her own album's words; `pnpm art:albums cyberpunk` builds her `review.html` |
| `enemies/` | The enemy initiative: [its own packet](../cyberpunk-enemies/README.md). Never put an enemy look in `approved/` or `characters/`: `art:push` would publish it as an Uma's look |

## The approval cycle

```
author a version ─► review page ─► owner's verdict ─► approved in her manifest ─► her album rebuilt ─► published on the owner's word
   (v001, v002…)      (per study)     (exact words,      (approval + SHA-256,      (pnpm art:albums)     (pnpm art:push cyberpunk,
                                       date, scope)        active-study.json)                              by the publishing session)
```

1. **Author** each version in a new folder; never overwrite an earlier PNG.
2. **Review:** a study page for the owner with each candidate, its exact prompt and what changed.
3. **Approve:** record the owner's verdict exactly (words, date, scope) in that version's `manifest.json`, under
   `fullBodyAssets`, each with `id`, `character`, `outfit`, `image`, `width`, `height`, `sha256` and
   `approval: { status: "approved", by: "owner", date, evidence }`. Point `active-study.json` at it with
   `ownerApproved: true`.
4. **Album:** `pnpm art:albums cyberpunk` builds her album from her manifest and her `album.json`.
5. **Publish:** a separate session publishes, only when the owner asks (`pnpm art:push cyberpunk --only <ids>`); the
   approval in a manifest is not the go. The publish flags then show on her album.

## Album pages

The album code is generic and lives in git, `scripts/character-art/albums/` (P181, P182). It names no character: every
word a page shows is in its `album.json`. A character with only looks gets a **looks-only** album (her outfits, no tabs).
To start hers, copy the shape of an existing `album.json` (title, eyebrow, heading, intro, summary, links, outfitsNote,
leadOutfit, approvedVersions, footer) and change its words. `pnpm art:albums cyberpunk --check` compares without writing.

## Starter request for another ChatGPT session

> Author a new Uma for Uma Cyberpunk. Follow `docs/authoring/cyberpunk-characters/README.md` and `workflow.md` in the
> uma-platform repo, and the local style guide in `content/authoring/character-universes/cyberpunk/approved/`. Work in
> `content/authoring/character-universes/cyberpunk/characters/<key>/`, one version folder per round. Show me each round
> first; record my approvals exactly; build her album with `pnpm art:albums cyberpunk`. Don't publish.
