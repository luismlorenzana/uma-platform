# Uma Cyberpunk casual enemy looks: the workflow

The steps for one enemy's casual look, in order. The [README](README.md) has the look, the paths and the approval cycle;
the local enemy baseline (`enemies/brief.md`) has the style, the model, the colour roles and the faction kits.

## 1. Pick her

Only an enemy whose combat look the owner has approved: it is the likeness anchor. Note her approved combat-station PNG
and its SHA-256 from `enemies/approved/manifest.json`, her face and art references, her faction's kit, and her accent.

## 2. A study

Make a new versioned folder inside her casual cast folder, `casual/cast/tier-<n>/<NN>-<uma>/<boss>/v00N/` (P200), where the casual cast album shows every picture as it is saved. Fill [the brief](templates/casual-brief.md): what
she wears, what of her faction shows, and from which inputs. One generation per image: her approved combat look first
(likeness, proportions, rendering), then her face and art references, then the casual baseline once one is approved;
nothing else. Save each output unchanged with the exact prompt beside it, and record each input and its hash in the
study's `manifest.json`. Change one main thing per revision; never overwrite an earlier image.

## 3. Review

Give the study its own review page and show the owner, checking in this order: recognition (is she herself, as the combat
look draws her), off duty (no armour, helmet, weapon, emitter or Hold mark), her taste and accent, the one faction piece,
the shared look (style and framing beside the combat looks and the other casual looks), then anatomy and hands. Compare
her casual look and her combat look side by side.

## 4. Approval

Record the owner's verdict exactly, with the date and the precise scope. Copy each approved PNG byte for byte to
`casual/approved/<faction>/<enemy>/casual.png` (or `casual-<variant>.png` for a second casual look) and add its entry to
`casual/approved/manifest.json`: `id`, `character`, `faction`, `unitId`, `look` (`casual` for everyday clothes), `image` (relative to
`casual/approved/`), `sha256`, `width`, `height`, `approval: { status: "approved", by: "owner", date, scope }` and
`source` (the study's manifest). Keep a superseded look's entry under `previousAssets` rather than deleting it. The first
approval writes `casual/approved/style-guide.md`, the casual baseline.

## 5. The casual album

Run `pnpm art:albums cyberpunk`: the casual album (`casual/approved/review.html`) shows every approved casual look,
faction by faction. A faction appears under its key until `casual/approved/album.json`'s `factions` names it.

## 6. Publishing, on the owner's word

Claude publishes the casual looks with the armour looks, `pnpm art:push cyberpunk --enemies` (EA3, P186): Uma Enemy Art
shows each one first in her group, under her name, with a "Casual" label, and the casual album gets its own flags. An
authoring session only approves.

## 7. Handoff

Update [the handoff](templates/handoff.md): each enemy's studies, verdicts and approved casual look, and the next enemy.

## Never

- Put a casual look in `enemies/approved/`, the universe's `approved/` or `characters/`.
- Put an enemy, faction or franchise name in git.
- Overwrite an approved PNG, or change one after its approval.
- Publish, upload, back up or change cloud resources from an authoring session.
