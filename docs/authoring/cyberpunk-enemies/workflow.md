# Uma Cyberpunk enemy authoring: the workflow

The steps for one enemy look, in order. The [README](README.md) has the scope, the paths and the approval cycle; the local
baseline brief (`enemies/brief.md`) has the Standard, the kits and the calls.

## 1. Wire her

An enemy is wired before anyone draws her: her references copied byte for byte with their hashes, a variant brief and a
prompt draft, written by `enemies/tools/wire.py` from `picks.json` and the story's foes data. The story's data is the
source of truth for the Standard and the kits; if a kit reads wrong, the story session changes it and the tool copies it
in again.

## 2. A study

Make a new versioned folder inside her cast folder (`cast/tier-<n>/<NN>-<uma>/<boss>/v00N/`, P200; `pnpm art:cast` made it, with her references), where the bosses' cast album shows every picture as it is saved. Fill [the brief](templates/enemy-brief.md):
what this study tries, and from which inputs. One generation per image, from her references (face first, then art, then
splash) and one shared anchor, nothing else. Save each output unchanged and the exact prompt beside it; record each input
and its hash in the study's `manifest.json`. Change one main thing per revision; never overwrite an earlier image.

## 3. Review

Give the study its own review page and show the owner, checking in this order: recognition (is she herself), the shared
look (does she sit beside the crew and the other factions as one game), the faction read (base, trim, emblem,
silhouette), hers (accent, core light, motif), and anatomy and armour. Compare factions side by side when a round covers
several.

## 4. Approval

Record the owner's verdict exactly, with the date and the precise scope. Copy each approved PNG byte for byte into
`approved/<faction>/<enemy>/` and add its entry to `approved/manifest.json`: `id`, `character`, `faction`, `unitId`,
`look`, `image` (relative to `approved/`), `sha256`, `width`, `height` and
`approval: { status: "approved", by: "owner", date, scope }`. Keep a superseded look's entry under `previousAssets`
rather than deleting it. Update `approved/style-guide.md` when an approval sets a new shared baseline.

## 5. The enemy album

Run `pnpm art:albums cyberpunk`: the enemy album (`approved/review.html`) shows every approved look, faction by faction.
When a new faction gets its first approved look, add its name (and its place in the order) to `approved/album.json`'s
`factions`, and a caption for a new look to `looks`.

## 6. Publishing, on the owner's word

Approved looks publish to **Uma Enemy Art** (https://uma-platform.web.app/enemy-art, EA1, P183), the app's own section for
enemies, never Character Art. Claude runs `pnpm art:push cyberpunk --enemies --only <ids>` when the owner says which looks
go up: it sends each approved PNG byte for byte to `gs://uma-platform-content/enemy-art/cyberpunk/`, reads it back, writes
the index last and flags the looks in the enemy album. An authoring session only approves.

## 7. Handoff

Update [the handoff](templates/handoff.md): each enemy's studies, verdicts, approved looks and what is published, and the
next step in the baseline's order of work.

## Never

- Put an enemy look in the universe's `approved/` or `characters/`.
- Put an enemy, faction or franchise name in git.
- Overwrite an approved PNG, or change one after its approval.
- Publish, upload, back up or change cloud resources from an authoring session; publishing is Claude's, on the owner's word.
