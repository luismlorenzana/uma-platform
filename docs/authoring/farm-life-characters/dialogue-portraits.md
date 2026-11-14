# Reusable dialogue portraits

[Packet entry point](README.md) · [Workflow](workflow.md) · [Prompt kit](prompt-kit.md)

## Author the pieces; verify the compositions

The game-facing assets are **one neutral waist-up base per outfit, fifteen transparent expression face layers per character, and a placement/composition recipe**. The game draws the selected face over the selected base at runtime. Neutral uses the base alone. Each face belongs to one character; it is reused across that character's outfits, never across different characters.

This is the existing CA5 direction, not a proposed replacement pipeline. See [P169](../../decisions.md), [AP85–AP90](../../platform-app/README.md) and the implementation in `scripts/character-art/src/portraits.ts`. The publisher carries the pieces and the recipe; local flattened composites remain review and verification evidence. Do not deliver an opaque generated face square as an alpha layer, or assume the game should store all flattened outfit/expression permutations.

For one new character, twelve bases plus fifteen faces represent 192 states. Keep 180 flattened expression previews locally so the owner and verification scripts can inspect the exact intended result. Runtime composition reduces shipped duplication; it does **not** remove the need to check every outfit with every expression.

## Workspace and provenance

Use a fresh versioned study beneath the private universe folder, for example:

```text
content/authoring/character-universes/farm-life/
  characters/<character-key>/v001/
    character-brief.md
    handoff.md
    references/             # identity and style inputs, with role metadata
    prompts/                # exact submitted text, one file per asset
    generated/              # raw generation outputs and source-path records
    full-body/              # selected candidates, no false approval labels
    bases/                  # literal native outfit crops
    face-inputs/            # exact spring edit target and neutral reference
    faces/                  # versioned RGBA expression layers
    masks/                  # matching per-expression alpha masks
    composites/             # deterministic flattened QA previews
    review/                 # native detail and outfit overview sheets
    review.html
    manifest.json
    verification.json
    visual-review.json
```

This is a recommended study layout, not an installed generator scaffold. Write or adapt the required local scripts and record their commands. After owner selection, canonical full-body assets belong in `approved/<character-key>/`; canonical dialogue pieces and state records belong inside `dialogue-portraits/`. Retain local lineage when copying selected bytes. Do not move or rewrite the approved pilots just to make a new folder layout uniform.

Record relative paths, dimensions, hashes, ordered reference roles, prompts, source revisions, crop rectangles, face origins, masks, guard regions and review status. Use lowercase hyphenated keys. Display names and local keys are different fields; obtain any master-data mapping from actual local records rather than inventing an ID.

## Native crop and coordinate systems

All positions use top-left image coordinates, x to the right and y down. Distinguish:

1. The full-body canvas.
2. The bust crop rectangle on that canvas.
3. The face tile's origin **inside the bust**.
4. Feature guards **inside the face tile**.
5. Each outfit's measured face-placement translation relative to its character's spring base.

The accepted pilots have full-body PNGs of 1086 × 1448, busts of 525 × 700, and face layers of 224 × 224. Their spring tile origin is `(148, 140)` in the bust. Their full-body crop rectangles differ vertically; do not copy one pilot's crop onto another person. Read actual coordinates from the current private manifest.

Keep 525 × 700 busts and 224 × 224 faces for a new character joining this collection. Measure a crop and tile origin that fit her actual face, framing and identity. Do not resize her face to match a pilot. If those dimensions genuinely cannot accommodate her design, resolve the framing/format decision before bulk authoring; mixed dimensions are not silently compatible with the current collection reader.

Crop approved full-body art without resampling or repainting. Verify decoded RGBA pixels equal the source rectangle exactly; a PNG byte hash alone cannot prove a literal crop because encoder bytes may differ. Hash both source and crop as well. Display resizing in the gallery is fine; it does not change the native asset.

For a bust crop `(cx, cy)` and face origin `(fx, fy)`, the neutral face edit target comes from full-body `(cx + fx, cy + fy, 224, 224)`, or equivalently from the bust at `(fx, fy)`. Keep both lineage and coordinate systems explicit.

## Register generated source edits

Use the exact neutral tile as the expression edit target. The built-in generator may return a larger square; preserve that raw output, then downsample it once to the target tile size with a recorded kernel, as in the existing expression exporters. This does not add detail to the approved bust.

Compare unchanged context outside the intended expression mask to estimate any small integer translation of the generated result. The pilot exporters search ±4 pixels and reject a best match at the search boundary. All accepted pilot edits registered at zero offset. These are diagnostic precedents, not promises for a new face.

Do not register on the edited eyes or mouth, which are supposed to differ. Inspect residuals and the composed result; a low score or non-boundary result alone does not prove likeness. Reauthor an edit that changes head scale, angle or facial geometry. Do not quietly warp it into place.

Keep two measurements distinct: the **sample offset** used to read the generated edit into the face tile, and the **outfit placement** used to draw that finished tile on a particular bust. Save both. Registration changes sampling; it does not authorize altering approved base pixels.

## Masks must replace old and new features

The earlier interactive proof showed both the neutral eyebrows and the expression eyebrows. The fix was an **opaque union of the original and new feature envelopes**, with feathering outside those envelopes. Painting new eyebrows over an incompletely covered neutral face reproduces the defect at runtime too.

Build a mask specific to the new character. Start with measured face/skin coverage and fully opaque windows for both old and new eyebrows, eyes and mouth. Include lower eye marks when the eyes close, a larger laughing/yawning mouth, and each expression's blush or tear effects. Keep surrounding hair, jaw, accessories, collar and background out of the replaced area as far as the actual feature geometry allows. Do not copy rectangular coordinates from another character as a universal face mask.

The accepted pilot guard windows, in their 224-pixel tiles, are useful only as an implementation example:

| Region | x | y | width | height |
| --- | ---: | ---: | ---: | ---: |
| Viewer-left eyebrow | 45 | 40 | 63 | 35 |
| Viewer-right eyebrow | 114 | 40 | 64 | 35 |
| Viewer-left eye | 47 | 66 | 61 | 46 |
| Viewer-right eye | 114 | 66 | 62 | 46 |
| Mouth | 89 | 120 | 49 | 34 |

In the pilot exporter, each guard is alpha 255 throughout; a four-pixel smoothstep feather extends **outside** it, combined with the accepted face mask using the maximum alpha. All array writes must be clipped to the tile's bounds when adapting this algorithm. Inspect visible skin/hair edges rather than assuming any rectangle is safe.

Flustered needs cheek and nose blush coverage. Tearful Joy needs the small lower-eye tear-bead regions. Preserve each expression's mask instead of reducing everything to one generic oval. Check the raw edit against the final composition at native size; effects that disappear only after export usually indicate clipped mask coverage.

The saved face is straight-alpha RGBA: sampled expression RGB plus the saved mask alpha. The saved mask has the same alpha values as the face layer. Do not flatten either onto ivory, double-apply the mask in the game, use an additive blend, or leave full neutral marks beneath partly transparent feature pixels.

## Deterministic composition contract

For each face pixel at `(u, v)`, draw at bust `(position.x + u, position.y + v)`. With `a = faceAlpha / 255`, for each RGB byte:

```text
out = round(base × (1 − a) + face × a)
```

Preserve the base alpha; the current neutral busts are opaque. Pixels outside the tile or with face alpha zero are exactly the base. Neutral is the base alone. Use no scaling, rotation or mirroring in this contract.

For an opaque guard pixel (`a = 1`), final RGB must equal the expression RGB exactly. That is the useful guarantee that neutral brows, eyes and mouth are actually replaced. Feather only the outer transition. The recipe operates on decoded color-channel bytes; a different color-space blend or resampling mode in the game may produce a different result and must be verified by the consuming app.

Flattened local preview PNGs are the reference results for the recipe. A browser or game renderer is not proven correct merely because it uses a familiar source-over operation. Check its alpha handling, pixel placement, texture filtering and color behavior against known reference states during runtime integration. That integration is the game's task; the authoring session supplies the pieces, positions and expected results.

## Fit each outfit on its neutral face

Compare each outfit's **neutral** face against that character's spring neutral. Determine an integer placement translation and use the same placement for all expressions on that outfit. The pilots needed shifts of at most one pixel; that result applies to them, not every future character.

Search a bounded translation range, inspect eye spacing and feature alignment, then record the selected position. A diagnostic scale search can reveal an inconsistent source model, but do not apply scale silently. If one outfit has a materially different face shape, eye spacing or head angle, correct the candidate outfit art or return to its review before expanding its expressions. A hairstyle covering a different facial region may need explicit mask/occlusion review rather than a larger arbitrary skin patch.

Keep the final approved face PNG bytes unchanged across every outfit. Placement belongs to the outfit/state recipe, not to a separately regenerated face. The manifest records actual positions; avoid assuming `(148, 140)` for a new character or every outfit.

## Revise one outfit after face approval

When the owner requests album inclusion of a revised outfit, retain its exact selected full-body bytes. Make its new literal neutral crop, measure placement against the accepted spring face, and compose the fifteen existing face layers. Check native feature details, opaque replacement guards, outside-mask pixels and nearby straps, earrings, necklines or sheer layers. A clothing revision does not by itself require new facial-expression art.

Keep unchanged sources, faces, masks and previews at their existing paths where practical. Use fresh paths for changed derivatives, preserve earlier candidate files, and replace the active outfit's references throughout the album and recipe only after verification. Retain existing approvals and record the new master verdict and derivative checks separately, honoring the actual scope of the owner's verdict. Remove superseded variant keys from active selectors once a final outfit is chosen. Reuse the current viewer rather than creating a new site for each design iteration.

## Add a character without rebuilding the pilots

The current private builders are hard-coded studies. For example, `dialogue-portraits/build.mjs` names two characters, assumes specific historical sources and asserts 24 bases, 30 faces and 384 states. `viewer.mjs` also contains pilot defaults and fixed explanatory counts. A search-and-replace of the character name is not a safe integration.

1. Snapshot current active manifests, approval records and all approved asset hashes before editing shared local builders or collections. Coordinate with the publishing session so it reads a complete stable revision, not half-written manifests.
2. Complete the new character in a separate versioned study. Do not copy the pilots' owner approval into it.
3. Adapt the local build inputs to explicit per-character source records, crop geometry, face origins, masks and measured positions. Remove assumptions that every character's face came from a pilot-only historical folder. Derive counts from the configured characters, outfits and expressions; retain explicit coverage assertions.
4. Add new full-body records to `approved/manifest.json` only for the exact selected outputs the owner approved. Preserve existing records and bytes. Add the character and pieces to the dialogue manifest; merge owner-approved new states into the approval record after their verdict. Retain old per-state hash bindings and approval evidence.
5. Use new versioned asset paths. Verify before writing and refuse to overwrite approved PNGs with different bytes. Build new gallery/manifest files to temporary siblings and switch them only after validation; preserve a recoverable prior revision. Do not clear approvals to make a rebuild pass.
6. Adapt the viewer, sheet builder and verifier to enumerate the expanded manifest, including the new character and every current outfit/expression. Preserve existing publication marker blocks and generated flag files. Do not run publishing or status tools during this authoring handoff.
7. Recheck every old approved asset against its snapshot. Only the intended new records and files should be added. Show the new character's local review, then deliver the stable revision to the publishing session.

With three characters on the standard twelve-outfit/sixteen-state scope, totals become **36 full-body looks, 36 neutral crops, 45 faces and 576 dialogue states**. These totals are a sanity check, not a license to manufacture approvals or remove differing future scopes.

## Manifest and approval fields

Inspect the current files before extending them. These are the key relationships in the existing private authoring contract, not a replacement JSON document to overwrite the collection with:

| Record | Fields to preserve or add |
| --- | --- |
| Full-body asset | `id`, display `character`, `outfit`, `image`, `prompt`, dimensions, `sha256`, `promptSha256`, source version/paths, owner `approval` evidence |
| Dialogue collection | `characterNames` keyed by character slug, current `outfits`, ordered `expressions` with Neutral first, `retiredOutfits`, `faces`, `assets`, revision/status and evidence paths |
| Face | `character`, `expression`, `file`, `sha256`, `mask`, `maskSha256`, `guards`, `prompt`, `source`, approval status |
| Outfit base | `character` key and display `name`, `outfit`, `sourceImage`, `sourceSha256`, `crop`, `base`, `baseSha256`, dimensions, measured `position`/translation, neutral approval status, `outputs` |
| Output state | `expression`, flattened QA `image`, its `sha256`, `face`/`faceSha256`, `mask`, `position`, scale 1, rotation 0, review/owner status and outside-change evidence |
| Owner approval | `status: approved`, `by: owner`, date, scope and verdict evidence; each approved outfit's `baseSha256`, and each approved output's expression, `sha256`, `faceSha256` and `position` |

Keep `approval.json` limited to states actually approved by the owner; candidate states may live in a separate study or remain explicitly unapproved. Do not make a global status imply approval for newly appended states. The current publisher validates approved-state hash bindings and builds its own public recipe from the pieces; do not hand-edit that published index.

## Verification and review

Run meaningful checks on the assets and behavior, not only assertions that counts match:

- Source files, exact prompts, masks, PNG dimensions and recorded SHA-256 values exist and agree.
- Every neutral base equals its recorded source rectangle pixel for pixel.
- Each character has exactly the authorized outfit/expression coverage, with no retired pajamas or closed optional extras.
- A face's RGB/alpha and its mask remain the same bytes across that character's outfits; face alpha equals saved mask alpha.
- All old/new feature guards are fully opaque, including necessary blush/tear areas; final guard RGB equals face RGB.
- Every flattened preview reconstructs exactly from its recorded base, face and position under the blend contract; outside-mask changed pixels are zero.
- Layer placement is in bounds and explicitly recorded; no hidden scaling, rotation or mirroring.
- Existing approved masters, bases, faces, masks and state hash bindings remain unchanged after integration.
- Gallery character/outfit/expression selectors, reference modes, links, masks and displayed statuses point to the correct files. Test both the standalone view and the embedded dialogue tab after a shared viewer change.
- Inspect every outfit's overview and native face-detail sheet, plus the new character beside original identity and style references. Review at 240, 300 and native 525-pixel bust widths.

Record visual review separately from pixel checks. Exact composition cannot prove attractive anatomy, likeness, wardrobe variety or story suitability. A simulated DOM test can verify gallery state wiring but is not an observed browser-rendering test; say which was actually done.

Sharp permits only one effective resize in a pipeline; an earlier resize can be superseded. When making a 2× diagnostic of a downsampled source, first materialize the 224-pixel buffer, then resize that buffer for display. Otherwise a misleading high-resolution source comparison can hide a clipping problem in the actual native layer.

Use `pnpm art:gallery` to serve the private authoring folder locally at `http://127.0.0.1:4323` when needed. Reuse the existing server if it is already running. Keep pages usable from disk with relative asset links or embedded metadata rather than relying on file-URL JSON fetches. Do not claim a queued browser-opening command means the rendered result was inspected.
