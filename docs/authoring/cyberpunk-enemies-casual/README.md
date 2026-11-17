# Uma Cyberpunk enemies in casual clothing

Use this packet to author each Uma Cyberpunk enemy **off duty, in everyday clothes**, and record the owner's approvals in
the local casual album. It is the enemy art's second cycle (P185): it follows the [enemy packet](../cyberpunk-enemies/README.md)
step for step, but its studies, approvals and album are its own, apart from the combat looks.
[Desktop page](../previews/cyberpunk-authoring.html) (every Cyberpunk cycle on one page).

**Names stay local (P179).** An enemy's id can be a franchise character's name, so this packet, its templates and the
album code name no enemy, faction or franchise. Every name lives in the local folder: the enemy baseline, each manifest
and the casual album's `album.json`.

## Start here

1. Read [AGENTS.md](../../../AGENTS.md), the latest [decisions](../../decisions.md) (P179, P182, P183, P185) and
   [workflow.md](workflow.md).
2. Read the enemy baseline, `content/authoring/character-universes/cyberpunk/enemies/brief.md`: the drawing style and adult
   model (§2.1), the colour roles (§2.3), each faction's kit (`<faction>/kit.md`) and the calls. The casual look keeps the
   style, the model, her identity and her accent; it drops the armour.
3. Open the casual album (`enemies/casual/approved/review.html`) and the enemy album (`enemies/approved/review.html`) for
   her approved combat looks, or `pnpm art:gallery` (http://127.0.0.1:4323) and the Cyberpunk card.
4. Copy [casual-brief.md](templates/casual-brief.md) into each study folder, and keep a [handoff.md](templates/handoff.md).

## The casual look

| Part | Direction |
| --- | --- |
| Who | An enemy whose combat look is approved: her approved combat-station look is the likeness anchor (her face, proportions and rendering as this game draws her) |
| Base | **Her pilot suit** (P186, P191): the suit each boss wears as her combat-station look is the base of both enemy cycles, so it is in this album and the enemy album alike, with the same id, picture and approval. Every casual look starts from it, as every armour look does. Uma Enemy Art shows it once, labelled Base |
| What she wears | Then everyday clothes for the game's city, off duty: no armour plates, helmet, mantle, weapon, core emitter or Hold mark. Her own taste, read from her source outfit |
| Her colours | Her **accent** leads the outfit. Her faction shows in **one small piece** only (a trim colour, a lining, an emblem pin), so her side still reads, in **her cast faction's colour** from her `character.json` (Faction 1–5, P193, P204): the Ranker's factions replace the story's. Her light, if at all, in one small accessory |
| Style | The baseline's drawing style and adult model (§2.1), the same as her combat looks, so the two sit side by side |
| Image | One transparent RGBA PNG, **1024 × 1536**, full body, neutral stance, straight on at eye level, visible hands, the same framing and scale as the combat looks |
| Baseline | The **first owner-approved everyday-clothes look sets the casual baseline** (`casual/approved/style-guide.md`): rendering, framing, how much of the faction shows. Later looks use it as the shared anchor |
| Order | The enemies with approved combat looks, one a faction, then the next as their combat looks are approved |

## Local source of truth

Paths are relative to `content/authoring/character-universes/cyberpunk/enemies/`. They exist only on the owner's machine.

| Path | What |
| --- | --- |
| `brief.md`, `<faction>/kit.md` | The enemy baseline and the faction kits, shared with the combat looks |
| `approved/<faction>/<enemy>/` | Her approved combat looks: the likeness anchor |
| `casual/README.md`, `casual/handoff.md` | The casual cycle's local notes and its handoff |
| `casual/cast/tier-<n>/<NN>-<uma>/<boss>/` | **Her folder** (P200): `character.json`, `references/` (the Ranker's pictures of her), and her casual studies, `v00N/`; `casual/cast/review.html` is the casual cast album |
| `casual/cast/…/<boss>/v00N/` | One study: `brief.md`, `images/`, `prompts/`, `manifest.json`, its review page |
| `casual/approved/manifest.json` | **The approval record:** each approved casual look with `id`, `character`, `faction`, `unitId`, `look` (the outfit's key: `combat-station` for the pilot suits, `casual` for everyday clothes), `image`, `sha256`, `width`, `height`, `approval`, `source` |
| `casual/approved/<faction>/<enemy>/casual.png` | The approved PNGs, byte for byte |
| `casual/approved/album.json` | The casual album's words: title, header, footer, `noun`, `empty`, faction names in their order, look captions |
| `casual/approved/review.html` | The casual album, built by `pnpm art:albums cyberpunk` |

## The approval cycle

```
her approved ─► study (v00N) ─► review page ─► owner's verdict ─► copied into casual/approved/ ─► casual album rebuilt
combat look      (one main         (per study)    (exact words,      + manifest entry               (pnpm art:albums
(the anchor)      change a round)                  date, scope)       (byte for byte, SHA-256)        cyberpunk)
```

An authoring session ends at **approved, locally**. Publishing is Claude's, on the owner's word: `pnpm art:push cyberpunk
--enemies` sends the casual looks with the armour looks (EA3, P186), and Uma Enemy Art shows each one first in her group,
under her name, with a "Casual" label. The casual album and the Local Art Gallery then show it as **Published**. Nothing
here is backed up.

## Album

The casual album is the enemy album's code (`scripts/character-art/albums/enemy-album.mjs`, P182) run on the casual
collection (P185): the approved looks faction by faction, in `album.json`'s order, each card with the enemy's name, the
look's caption and the approval's date and scope. `pnpm art:albums cyberpunk --check` compares without writing.

## Never

- Put a casual look in `enemies/approved/` (the combat looks: `art:push --enemies` would publish it there), the universe's
  `approved/` or `characters/` (an Uma's looks).
- Put an enemy, faction or franchise name in git, including this packet, a template or the album code.
- Overwrite an approved PNG, publish, refresh publication flags or change cloud resources from an authoring session.

## Starter request for another ChatGPT session

Updated for the cast folders (P200, P204). Paste it as the session's first message; it names no enemy.

```text
You're the authoring session for Uma Cyberpunk's bosses in casual clothing, the second enemy art cycle (uma-platform
P185). You work on the owner's Windows PC in the uma-platform repo (C:\Users\luism\workspace\uma-platform). You draw and
record approvals; Claude publishes.

Read first, in this order:
1. AGENTS.md, then docs/decisions.md: P179, P182, P185, P186, P191, P193, P200, P201 and P204.
2. The packet: docs/authoring/cyberpunk-enemies-casual/README.md, workflow.md, templates/casual-brief.md and
   templates/handoff.md.
3. The local files (private, this machine only), under content/authoring/character-universes/cyberpunk/enemies/:
   brief.md (the drawing style and adult model §2.1, the colour roles §2.3), casual/README.md,
   casual/approved/manifest.json and album.json, and approved/manifest.json (her approved combat looks).

Where things stand:
- 50 bosses are cast in the Ranker (Tiers 1-5, one per Uma). Each has a casual folder,
  casual/cast/tier-<n>/<NN>-<uma>/<boss>/, with character.json (who she is, the Uma she opposes, her tier and her cast
  faction) and references/ (her Ranker art, face and splash).
- Four of them have an approved pilot suit (look "combat-station" in casual/approved/manifest.json): the base of every
  casual look and the likeness anchor. No everyday-clothes look is approved yet, so there is no casual baseline
  (casual/approved/style-guide.md) yet.
- The Local Art Gallery, http://127.0.0.1:4323, Cyberpunk, "casual cast album", shows every picture you save on a refresh.
  If it isn't running, ask me and Claude starts it.

What to do:
1. Start with those four bosses, in the cast album's order (Tier 1 first). Match each by unitId = character.json "id".
   The first everyday-clothes look I approve becomes the casual baseline: write casual/approved/style-guide.md then.
2. Each round is a new study folder, v00N/, inside her casual cast folder. Fill the brief template. One generation per
   image, from her approved pilot suit first, then her face and art references, then the casual baseline once there is
   one. Save each output unchanged with its exact prompt beside it, and record every input and its SHA-256 in the
   study's manifest.json. One main change a round; never overwrite an earlier image.
3. The look: a 1024 x 1536 transparent RGBA PNG, full body, neutral stance, straight on at eye level, visible hands, the
   same framing and scale as her pilot suit. Everyday clothes for the game's city, in her own taste; her accent leads. No
   armour, helmet, mantle, weapon, core emitter or Hold mark. Her faction shows in one small piece only (a trim, a lining
   or a pin), in her cast faction's colour from character.json (Faction 1-5): the Ranker's factions replace the story's.
4. Show me each round (its review page, with the image beside her pilot suit) and wait for my verdict.
5. On my approval: record my exact words, the date and the scope; copy the PNG byte for byte to
   casual/approved/<faction>/<boss>/casual.png, using the faction key her pilot suit's entry already uses; add its entry
   to casual/approved/manifest.json (look "casual", with sha256, width, height, approval and source); then rebuild the
   albums with pnpm art:albums cyberpunk.
6. Keep casual/handoff.md current: each boss's studies, verdicts and approved look, and the next boss.
7. After the four, go on with the next cast boss whose pilot suit is approved; tell me when none is left, since the
   bosses' own cycle approves the pilot suits.

Never: put a casual look in enemies/approved/, the universe's approved/ or characters/; put an enemy, faction or
franchise name in git; overwrite or edit an approved PNG; publish, upload, back up, run art:push or change anything in
the cloud. Publishing is Claude's, on my word.
```
