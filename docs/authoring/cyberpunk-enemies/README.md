# Uma Cyberpunk enemy authoring

Use this packet to author Uma Cyberpunk's enemies and bosses, from the wired references to approved looks in the local
enemy album. It has the same shape as the [character packets](../cyberpunk-characters/README.md) but is a separate
initiative: enemy looks have their own folder, their own approvals and their own album, and they are never an Uma's look.
[Desktop page](../previews/cyberpunk-authoring.html) (both Cyberpunk cycles on one page).

**Names stay local (P179).** An enemy's id can be a franchise character's name, so this packet, the templates and the
album code name no enemy, faction or franchise. Every name lives in the local folder: the baseline brief, the picks, each
manifest and the album's `album.json`.

## Start here

1. Read [AGENTS.md](../../../AGENTS.md), the latest [decisions](../../decisions.md) (P179, P181, P182) and
   [workflow.md](workflow.md).
2. Read the local baseline, `content/authoring/character-universes/cyberpunk/enemies/brief.md`: the Standard (one look for
   every army), the faction kits, ranks, Holds, lights and roles, the method, the order of work and its calls (CE1–CE11).
   Its `README.md` lists every wired enemy, its kit and its references.
3. Open the baseline page (`enemies/review.html`) and the enemy album (`enemies/approved/review.html`), or
   `pnpm art:gallery` (http://127.0.0.1:4323) and the Cyberpunk card.
4. Copy [enemy-brief.md](templates/enemy-brief.md) into each study folder, and keep a [handoff.md](templates/handoff.md).

## Standard scope

| Part | Direction |
| --- | --- |
| The look | **The Standard:** the crew's Modular Frame 01 construction in Hardline Anime, the faction in base and trim, the enemy in her accent and her face, her power in her core light (the baseline brief §2) |
| Factions | One **kit** per franchise: colours, silhouette, helmet, mantle, variants and the five roles (`<faction>/kit.md`) |
| Image | One transparent RGBA PNG per look, **1024 × 1536**, neutral stance, eye level, visible hands, empty space around the figure |
| Approved baselines | The combat-station uniform (`enemies/approved/style-guide.md`) is the current shared suit for bosses |
| Order | The baseline brief §6: each wired enemy's boss look, one faction at a time; the six together; Holds and helmets; each faction's kit sheet; Regular bases; then the next enemies |

Combat sprites and battle keys are later work, drawn from the approved looks with their own checks.

## Local source of truth

Paths are relative to `content/authoring/character-universes/cyberpunk/enemies/`. They exist only on the owner's machine.

| Path | What |
| --- | --- |
| `brief.md`, `picks.json`, `references.json` | The baseline, the wired picks, every source image and its hash |
| `<faction>/kit.md`, `<faction>/<enemy>/` | A faction's kit; an enemy's variant brief, prompt draft and references (written by `tools/wire.py`) |
| `<faction>/<study>-v00N/` | One study: `brief.md`, `images/`, `prompts/`, `manifest.json`, its review page |
| `approved/manifest.json` | **The approval record:** each approved look with `id`, `character`, `faction`, `unitId`, `look`, `image`, `sha256`, `width`, `height`, `approval` |
| `approved/<faction>/<enemy>/` | The approved PNGs, byte for byte |
| `approved/album.json` | The enemy album's words: title, header, footer, faction names in their order, look captions |
| `approved/review.html` | The enemy album, built by `pnpm art:albums cyberpunk` |

## The approval cycle

```
study (v00N) ─► review page ─► owner's verdict ─► copied into approved/ + manifest entry ─► enemy album rebuilt
                 (per study)     (exact words,      (byte for byte, SHA-256,                 (pnpm art:albums cyberpunk)
                                  date, scope)        approval)
```

The cycle ends at **approved, locally**. Enemy looks have no publishing route yet (CE9): nothing is pushed, uploaded or
backed up. When the owner picks a destination, a publishing session builds it; until then the enemy album and the Local
Art Gallery show each approved look as **Not published**.

## Album

The enemy album groups the approved looks faction by faction, in `album.json`'s order, each card with the enemy's name,
the look's caption and the approval's date and scope. The code is generic and in git, `scripts/character-art/albums/
enemy-album.mjs` (P182); `pnpm art:albums cyberpunk --check` compares without writing. A new faction's looks appear under
its key until `album.json` names it.

## Never

- Put an enemy look in `../approved/` or `../characters/`: `art:push cyberpunk` would publish it as an Uma's look.
- Put an enemy, faction or franchise name in git, including this packet, a template or the album code.
- Overwrite an approved PNG, publish, refresh publication flags or change cloud resources from an authoring session.

## Starter request for another ChatGPT session

> Author Uma Cyberpunk enemy looks. Follow `docs/authoring/cyberpunk-enemies/README.md` and `workflow.md` in the
> uma-platform repo, and the local baseline `content/authoring/character-universes/cyberpunk/enemies/brief.md`. One study
> folder per round inside the faction; show me each round first; record my approvals exactly in `enemies/approved/`;
> rebuild the enemy album with `pnpm art:albums cyberpunk`. Don't publish.
