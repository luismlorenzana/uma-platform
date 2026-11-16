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
| What she wears | Everyday clothes for the game's city, off duty: no armour plates, helmet, mantle, weapon, core emitter or Hold mark. Her own taste, read from her source outfit |
| Her colours | Her **accent** leads the outfit. Her faction shows in **one small piece** only (a trim colour, a lining, an emblem pin), so her side still reads. Her light, if at all, in one small accessory |
| Style | The baseline's drawing style and adult model (§2.1), the same as her combat looks, so the two sit side by side |
| Image | One transparent RGBA PNG, **1024 × 1536**, full body, neutral stance, straight on at eye level, visible hands, the same framing and scale as the combat looks |
| Baseline | The **first owner-approved casual look sets the casual baseline** (`casual/approved/style-guide.md`): rendering, framing, how much of the faction shows. Later looks use it as the shared anchor |
| Order | The enemies with approved combat looks, one a faction, then the next as their combat looks are approved |

## Local source of truth

Paths are relative to `content/authoring/character-universes/cyberpunk/enemies/`. They exist only on the owner's machine.

| Path | What |
| --- | --- |
| `brief.md`, `<faction>/kit.md` | The enemy baseline and the faction kits, shared with the combat looks |
| `approved/<faction>/<enemy>/` | Her approved combat looks: the likeness anchor |
| `casual/README.md`, `casual/handoff.md` | The casual cycle's local notes and its handoff |
| `casual/<faction>/<enemy>-casual-v00N/` | One study: `brief.md`, `images/`, `prompts/`, `manifest.json`, its review page |
| `casual/approved/manifest.json` | **The approval record:** each approved casual look with `id`, `character`, `faction`, `unitId`, `look: "casual"`, `image`, `sha256`, `width`, `height`, `approval`, `source` |
| `casual/approved/<faction>/<enemy>/casual.png` | The approved PNGs, byte for byte |
| `casual/approved/album.json` | The casual album's words: title, header, footer, `noun`, `empty`, faction names in their order, look captions |
| `casual/approved/review.html` | The casual album, built by `pnpm art:albums cyberpunk` |

## The approval cycle

```
her approved ─► study (v00N) ─► review page ─► owner's verdict ─► copied into casual/approved/ ─► casual album rebuilt
combat look      (one main         (per study)    (exact words,      + manifest entry               (pnpm art:albums
(the anchor)      change a round)                  date, scope)       (byte for byte, SHA-256)        cyberpunk)
```

An authoring session ends at **approved, locally**. Publishing to Uma Enemy Art comes later (EA3): the casual looks will
show as each enemy's own look beside her combat looks, published by Claude on the owner's word. Until then the casual
album and the Local Art Gallery show them as **Not published**. Nothing here is backed up.

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

> Author Uma Cyberpunk enemies in casual clothing. Follow `docs/authoring/cyberpunk-enemies-casual/README.md` and
> `workflow.md` in the uma-platform repo, the local enemy baseline `content/authoring/character-universes/cyberpunk/enemies/brief.md`
> and `enemies/casual/README.md`. Start with the enemies whose combat looks are approved, one study folder per round inside
> `enemies/casual/<faction>/`; show me each round first; record my approvals exactly in `enemies/casual/approved/`; rebuild
> the casual album with `pnpm art:albums cyberpunk`. Don't publish.
