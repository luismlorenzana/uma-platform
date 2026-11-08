# Sprite pipeline

Generic tools and nameless templates live here; all character inputs and outputs stay in ignored `content/`.
Set `UMA_CONTENT_DIR` to use a different private content directory. Commands run from the workspace root:

```sh
pnpm sprites:export <outfitId> [--revision N] [--out /temporary/output]
pnpm sprites:verify <outfitId> | --all
pnpm sprites:repeat [<outfitId>] [--revision N]
pnpm sprites:progress
pnpm sprites:pack [--measure] [--encoding lossless|lossy]
pnpm sprites:backup
```

`sprites:pack` (UA5, P100) writes master data's `outfit-sprites` family into `content/release/`: every outfit whose
current revision's set gate is approved against its present file hashes, and a reason for each one it skips. Frames
and face patches are trimmed to every visible pixel (the opaque `bounds` stay as metadata), identical images are
shared, and everything is shelf-packed on WebP pages of at most 4096 px with 2 px padding: lossy q90 with alpha
quality 100 by default (format.md §13). `--measure` prints both encodings' sizes and writes nothing. Publishing is
pipeline.md §7, "Publishing a batch".

Export always writes outside the immutable revision. Repeat exports into a fresh temporary directory, compares every
runtime byte against the revision and removes the temporary directory. A mismatch exits nonzero.
Verification runs fourteen pure checks on RGBA, metadata and recorded hashes; a fresh export supplies check 14.
Checks 8 use a configurable skin/glove palette; check 13 compares the first standing contact to the facing still and
requires a constant scale over the cycle. Bent knees and flight do not resize the head.

New revisions use `config.json` schemaVersion 2. `atlasText` preserves exact serialization. `outputs` maps each PNG
to a pinned source SHA-256 and optional binary-alpha preparation, rounded crop, transparent padding, Lanczos3 resize,
translation, breathing rig, face stamp, technical cleanup and final patch crop. `facingScales` records each cycle's
source scale. `handPalette` selects skin or glove. Native copies that cannot be reconstructed require a nonempty
`literal` reason and are listed in every export/repeat report. They are never silently counted as recuts.

Already sealed revisions retain their original config and verification receipt. Reconstructed configs are sidecars
at `content/authoring/sprites/export-configs/<id>/rN.json`; fresh reports go to `reports/<id>/rN/verification.json`.
Unapproved revisions get `verification.json` in place. This preserves all existing sealed revision files.
The tool never calls historical scripts in `content/review/`.

Progress is derived separately for 100 travelers and 70 townsfolk, with the two gates checked against current hashes.
The queue uses tier/roster order, one of each Way per traveler batch and no repeated character, with owner overrides
in `queue.json`. Townsfolk use the best-ranked outfit of each unselected character: three in T1, then ten per batch.
An optional `townsfolkOutfits` array selects a different outfit for an unselected character, without changing her
roster rank or adding another character slot. The townsfolk order then uses those chosen outfit ids. Choices reject
unknown outfits, traveler characters and multiple outfits of the same character; old queue files keep their defaults.
The compatibility progress path is regenerated alongside the canonical path.

Tests use invented shapes and temporary files. The private-content guard runs in CI; the character-name guard also
runs locally when a release exists. No PNG, WebP, character config or named prompt is tracked here.

Backup is additive and versioned, scoped to the personal gcloud configuration and platform project. It excludes
rebuildable downloaded models/binaries, `node_modules` and `.cache`, and never deletes destination objects.
See `infra/README.md` for restore and comparison steps.
