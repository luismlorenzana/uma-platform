# SB1 — `outfit-faces`: a face crop per outfit in uma-data

**uma-platform · Claude (needs the private portraits and the GCP bucket) · M · Needs: nothing · Unblocks: real faces in
SB3, SB4 and SB6 (they fall back to icons until then).**

## Why

The owner wants face crops wherever an Uma is small (2026-10-16): the 5-column Stable, every picker, workers in the
Wilds and on the Farm, the Hub's pips, party and hall seats. The bust (head and shoulders, 256 px) is too wide for a
68 pt tile. The crop is per outfit, not per character, so two outfits of one Uma still look different in a list of 268.

## Context (read first)

- `docs/sibling/phases.md` § Phase B, rows "Face tile" and "Bust", and the Art note.
- `scripts/assets/README.md`: the families, `pnpm assets:import -- --families=…`, `pnpm assets:bust-sheet`, and the
  crop overrides in `content/overrides/bust-crops.json` (`{ "<outfitId>": { "cx", "top", "size" } }`).
- `scripts/assets/src/art.ts`: `ArtFamily`, the per-family config (`outfit-busts` is `maxSize 256`, `source:
  'outfit-portraits'`), and `encodeBust`, which is where the bust crop happens.
- `scripts/assets/src/bust-sheet.ts`: the review sheets in `content/review/`.
- `scripts/assets/src/atlas.ts` and `layout.ts`: atlas families (128 px frames on a 132 px grid, WebP pages up to
  4096 px).
- `packages/data/src`: where art families are typed and parsed for games (`grep -rn "outfit-busts" packages/data/src`).
- `docs/master-data.md` and `docs/racer-mapping.md`: how games read art families.
- `content/` is **gitignored**: portraits, review sheets and the release never go in git.

## Decisions made

- **Family name:** `outfit-faces`, keyed by outfit id like `outfit-busts`.
- **Source:** `outfit-portraits`, the same source as the busts, so faces and busts always match.
- **Crop:** a square around the face.
  - **Default box:** derived from the outfit's bust crop. Same `cx`; `size` is about 0.5 of the bust's; `top` is the
    bust's `top` plus a small margin. Tune the two constants on the review sheet until most faces fill 60–75% of the
    square, eyes a little above the middle.
  - **Outliers** (tall hats, ears out of frame, turned heads) go in a new `content/overrides/face-crops.json`, with the
    same shape as `bust-crops.json`.
- **Size and packing:**
  - Faces render up to about 72 pt, which is 216 px on a 3× phone. Use 192 px frames.
  - If the atlas writer can take a per-family frame size, make `outfit-faces` an atlas family, like `outfit-icons`.
    That gives one request for the whole Stable.
  - If it can't without a rewrite, ship per-record 192 px WebP files, like `outfit-busts`, and note it under Decisions.
- **Additive only:** no existing family, frame or file changes.

## Do

1. **Add the family** to `ArtFamily` and its config, with the crop as decided. Make the crop a pure function with unit
   tests: a default box, an override, and clamping at the image's edges.
2. **Add the review sheet:** `pnpm assets:face-sheet`, or a `--family=outfit-faces` flag on the bust sheet. It shows
   every face at 72 pt-equivalent with its outfit id, writing to `content/review/`.
3. **Run and review.** Run the import for `outfit-faces` only. Look at every sheet page yourself, and add overrides
   until no face is cut off or tiny. Re-run until clean.
4. **Types for games:** add `outfit-faces` wherever `packages/data` names image families, so `imagePath(art,
   'outfit-faces', id)`-style lookups type-check in the games. That's a minor changeset for `@luismlorenzana/uma-data`.
5. **Publish** the master data release with the new family (`pnpm release:publish`, see `docs/master-data.md`). Move
   the `latest` channel as that doc says, so both games' APIs serve it.
6. **Document it** in `scripts/assets/README.md` (the family, the override file, the sheet command) and
   `docs/master-data.md` (the family list). Log a P-decision.

## Done when

- [ ] `pnpm lint && pnpm test && pnpm build` pass in uma-platform. The crop function has tests.
- [ ] The published release's art index lists `outfit-faces` for every outfit that has a portrait. Check it with the
      release client, or by fetching the index the way `docs/master-data.md` shows.
- [ ] You looked at every review sheet page; overrides cover the outliers.
- [ ] `git status` shows no files from `content/`, and no portrait or crop image anywhere in the diff.
- [ ] uma-data's new version is published, if its types changed (the queue README's release steps).
- [ ] The P-decision is logged.

## Deliver

- Claude: commit to `main` (`feat(assets): outfit-faces, a face crop per outfit (SB1)`), then publish the release.
- Reply with the release id, the uma-data version, and two or three cropped faces described in words (never attach
  original-game images to a pull request or a public page).
- Flag it done as the queue README says. SB3, SB4 and SB6 switch from icons to faces when this lands.
