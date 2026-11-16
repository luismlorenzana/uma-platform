# Uma Cyberpunk enemies: the lieutenants

Use this packet to author the **lieutenants**: the three enemies who serve each boss, cast against each Uma in the Ranker
(the cast page's Sub-bosses). It is the enemy art's third app (P200), beside the bosses' armour looks
([enemy packet](../cyberpunk-enemies/README.md)) and their casual looks ([casual packet](../cyberpunk-enemies-casual/README.md)):
its own studies, approvals and album. Nothing is authored yet.
[Desktop page](../previews/cyberpunk-authoring.html) (every Cyberpunk cycle on one page).

**Names stay local (P179).** A lieutenant's id can be a franchise character's name, so this packet, its templates and the
album code name no enemy, faction or franchise. Every name lives in the local folders: each `character.json`, each
manifest and the albums' `album.json`.

## Start here

1. Read [AGENTS.md](../../../AGENTS.md), the latest [decisions](../../decisions.md) (P179, P183, P191, P200) and
   [workflow.md](workflow.md).
2. Read the enemy baseline, `content/authoring/character-universes/cyberpunk/enemies/brief.md`: the drawing style and
   adult model, the colour roles, the ranks (a lieutenant is a **Key** or **Regular**, never a Boss) and the faction kits.
3. Open the lieutenants' cast album (`enemies/lieutenants/cast/review.html`, or `pnpm art:gallery` and the Cyberpunk
   card): every lieutenant cast, by tier and Uma, with her Ranker references and anything already authored.
4. Copy [lieutenant-brief.md](templates/lieutenant-brief.md) into each study folder, and keep a
   [handoff.md](templates/handoff.md).

## The look

| Part | Direction |
| --- | --- |
| Who | A lieutenant cast against an Uma: her `character.json` names her, the Uma she opposes, her tier and faction (Faction 1–5 until the owner names them), and her references |
| Base | **The pilot suit**, as for the bosses (P191): the shared combat-station construction in her own colours, the first look of every lieutenant. A default: the owner's first lieutenant approval can change it |
| Rank | Below her boss: the baseline's Key or Regular marks (helmet, rank bars), never the boss's mantle or signature weapon |
| Her colours | Her accent from her source outfit; her faction in base and trim, as the kits say |
| Style | The baseline's drawing style and adult model, the same framing as the bosses, so a boss and her lieutenants stand together |
| Image | One transparent RGBA PNG, **1024 × 1536**, full body, neutral stance, straight on at eye level, visible hands |
| Order | Tier 1 first, Uma by Uma, as the cast album lists them; her boss's approved look is the anchor for the faction's read |

## Local source of truth

Paths are relative to `content/authoring/character-universes/cyberpunk/enemies/lieutenants/`. They exist only on the
owner's machine.

| Path | What |
| --- | --- |
| `cast/tier-<n>/<NN>-<uma>/<lieutenant>/` | **Her folder:** `character.json`, `references/` (the Ranker's art, face and splash, byte for byte), and her studies |
| `cast/…/<lieutenant>/v00N/` | One study: `brief.md`, `images/`, `prompts/`, `manifest.json`, its review page |
| `cast/review.html` | The lieutenants' cast album: every cast lieutenant and every picture in her folder, newest first |
| `cast/album.json` | The cast album's words |
| `approved/manifest.json` | **The approval record:** each approved look with `id`, `character`, `faction`, `unitId`, `look`, `image`, `sha256`, `width`, `height`, `approval`, `source` |
| `approved/<faction>/<lieutenant>/` | The approved PNGs, byte for byte |
| `approved/review.html`, `approved/album.json` | The approved album and its words |

## The approval cycle

```
her folder ─► study (v00N) ─► cast album ─► owner's verdict ─► copied into approved/ ─► approved album rebuilt
(art:cast)     (one main       (shows each    (exact words,      + manifest entry           (pnpm art:albums
               change a round)  picture)       date, scope)       (byte for byte, SHA-256)    cyberpunk)
```

An authoring session ends at **approved, locally**. Publishing to Uma Enemy Art comes later (EA4): each lieutenant shown
with the boss she serves, published by Claude on the owner's word. Nothing here is backed up.

## The cast folders

`pnpm art:cast cyberpunk` (Claude's) reads the Ranker's cast and keeps every app's folders in step: a new character gets
her folder and references, a character cast against another Uma moves with all her work, a changed Ranker picture is
refreshed, and nobody's folder is ever deleted. Put every study inside her folder; the cast album finds it there.

## Never

- Put a lieutenant look in `../approved/` (the bosses), `../casual/` or the universe's `approved/` (the crew).
- Rename or move a cast folder by hand: the next `art:cast` puts it back where the cast says.
- Put an enemy, faction or franchise name in git, including this packet, a template or the album code.
- Overwrite an approved PNG, publish, refresh publication flags or change cloud resources from an authoring session.

## Starter request for another ChatGPT session

> Author Uma Cyberpunk's lieutenants. Follow `docs/authoring/cyberpunk-enemies-lieutenants/README.md` and `workflow.md`
> in the uma-platform repo, the local enemy baseline `content/authoring/character-universes/cyberpunk/enemies/brief.md` and
> `enemies/lieutenants/README.md`. Start with Tier 1, Uma by Uma: one study folder per round inside each lieutenant's own
> folder, `enemies/lieutenants/cast/tier-<n>/<NN>-<uma>/<lieutenant>/`; show me each round first; record my approvals
> exactly in `enemies/lieutenants/approved/`; rebuild the albums with `pnpm art:albums cyberpunk`. Don't publish.
