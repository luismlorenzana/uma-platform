# Uma Cyberpunk character authoring: the workflow

The steps for one character, in order. The [README](README.md) has the scope, the paths and the approval cycle.

## 1. Brief and references

Fill [the brief](templates/character-brief.md) in `characters/<key>/`. Use the owner's references only: an original game
render for her identity, and the approved pilots for the standard. Copy each reference in byte for byte and record its
SHA-256 in `references.json`. Note what to keep (face, hair, markings, ears, tail, signature colours) and what changes
(the wardrobe). Don't infer personality from appearance.

## 2. Street, from the original

Author Street first, from her original reference, in the standard's staging and size. One generation per candidate;
save the exact prompt beside each image and the raw output untouched. Show the owner the candidates side by side with the
approved pilots' Street looks for scale and rendering.

## 3. The other four, from her approved Street

Once Street is approved, author Quarters, Ship operating and Combat armor from **her approved Street**, one look per
call, keeping her identity and proportions. Then Helmeted combat armor from **her approved armor**, keeping the shared
Helmet 01 geometry (compact shell, central ridge, smoked visor, cheek and chin plates, two armored ear housings) and
varying only paint and visor accent.

## 4. Review pages

Each version folder gets a review page: every candidate at full size, its prompt, its source, and what changed since the
last round. Keep earlier versions; a revision is a new version folder, never an overwrite.

## 5. Approval

Record the owner's verdict exactly, with the date and the precise scope (which images, which version). In that version's
`manifest.json`, list her approved looks under `fullBodyAssets` with their SHA-256 and size and the approval. Set
`active-study.json` to `{ "activeVersion": "v00N", "ownerApproved": true, … }`. Technical checks never imply approval.

## 6. Her album

Write `characters/<key>/<version>/album.json` with her album's words and run `pnpm -C ../uma-art-authoring albums cyberpunk`. Check the page
in the Local Art Gallery (`pnpm -C ../uma-art-authoring gallery`). Her looks also appear on the Cyberpunk card of its front page.

## 7. Handoff

Update [the handoff](templates/handoff.md): what is authored, approved and pending, where each file is, and the next
step. Publishing is a separate session's job and happens only when the owner asks.

## Never

- Put an enemy look in `approved/` or `characters/`.
- Overwrite an approved PNG, or change one after its approval (its hash would no longer match).
- Put a reference, prompt, image, approval or album word in git, or copy this folder to a bucket by hand.
- Publish, refresh publication flags or change cloud resources from an authoring session.
