# Uma Cyberpunk lieutenants: the workflow

The steps for one lieutenant's look, in order. The [README](README.md) has the look, the paths and the approval cycle;
the local enemy baseline (`enemies/brief.md`) has the style, the model, the ranks, the colour roles and the faction kits.

## 1. Find her

Open the lieutenants' cast album and take the next lieutenant in order (Tier 1 first, Uma by Uma). Her folder,
`cast/tier-<n>/<NN>-<uma>/<lieutenant>/`, already holds her `character.json` and her Ranker references. Note her boss
(the same Uma's, in the bosses' cast album) and her boss's approved looks: the faction reads from them.

## 2. A study

Make a new versioned folder inside hers, `v00N/`. Fill [the brief](templates/lieutenant-brief.md): what this study tries,
and from which inputs. One generation per image: the shared pilot-suit anchor first, then her face and art references;
nothing else. Save each output unchanged with the exact prompt beside it, and record each input and its hash in the
study's `manifest.json`. Change one main thing per revision; never overwrite an earlier image.

## 3. Review

The cast album shows each picture on her card as soon as it is saved (refresh the Local Art Gallery). Give the study its
own review page and show the owner, checking in this order: recognition (is she herself), her rank (clearly below her
boss), the faction read, the shared look beside her boss and the other lieutenants, then anatomy and hands.

## 4. Approval

Record the owner's verdict exactly, with the date and the precise scope. Copy each approved PNG byte for byte to
`approved/<faction>/<lieutenant>/<look>.png` and add its entry to `approved/manifest.json`: `id`, `character`, `faction`,
`unitId` (her `character.json`'s `id`, so her cast card shows it), `look`, `image`, `sha256`, `width`, `height`,
`approval: { status: "approved", by: "owner", date, scope }` and `source`. Keep a superseded look's entry under
`previousAssets`.

## 5. The albums

Run `pnpm -C ../uma-art-authoring albums cyberpunk`: the approved album shows the approved looks faction by faction, and her cast card badges
them Approved. A faction appears under its key until `approved/album.json`'s `factions` names it.

## 6. Publishing, on the owner's word

Claude publishes the lieutenants' looks with the bosses', `pnpm -C ../uma-art-authoring publish cyberpunk --enemies` (EA4, P201): Uma Enemy Art
shows each lieutenant in her faction under her own name, labelled Lieutenant, and the lieutenants' album gets its own
flags. An authoring session only approves.

## 7. Handoff

Update [the handoff](templates/handoff.md): each lieutenant's studies, verdicts and approved look, and the next one.

## Never

- Put a lieutenant look in `../approved/`, `../casual/`, the universe's `approved/` or `characters/`.
- Move or rename a cast folder by hand, or put an enemy, faction or franchise name in git.
- Overwrite an approved PNG, or change one after its approval.
- Publish, upload, back up or change cloud resources from an authoring session.
