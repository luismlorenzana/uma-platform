# Farm Life splash art workflow

## 1. Start with the character's accepted art

Read [AGENTS.md](../../../AGENTS.md) and the [authoring packet](README.md). Initialize the study and fill the brief. If the study already exists, resume it: inspect its selected revisions, pending verdicts and handoff before starting more generations.

Under `content/authoring/character-universes/farm-life/`, check `characters/<key>/active-study.json` and the manifest it points to first. For a character in the shared pilot collection, use `approved/manifest.json` and `dialogue-portraits/manifest.json` with its approval record. Inspect the actual files and check the selected hashes. The six required outfits are **Spring, Swimsuit, Kimono, Wedding, Wedding Night, and Playful Pajamas**; the required expressions are Happy, Flustered, Loving and Tearful Joy. Prefer the outfit-specific approved dialogue composite for the scene's expression. If that combination is absent, the same character's approved expression on another look plus her exact approved full-body outfit can serve as two separate references. If a required outfit or expression itself is missing, use the [character workflow](../farm-life-characters/workflow.md) for that gap and keep the affected slots pending. Continue independent scenes with complete references.

Use the current nine approved Kitasan scenes under `content/authoring/character-universes/farm-life/splash-art/manifest.json` as a private visual baseline. Select her entries by character and order; use the [scene set](scene-set.json) to map the nine positions. The two older Loving wedding-night alternates (seated and full-body diagonal) and the portrait-format pajama study are historical, outside the final set. A pilot image supplies composition, environment or style only. The new character supplies her own facial structure, markings, natural adult proportions, accessories, palette and outfit.

## 2. Establish the scene look

Use [the prompt kit](prompt-kit.md) and the session's built-in image generation for each scene and edit. Read the installed imagegen skill when available, inspect every reference and label its role in the prompt. If facilities or private references are missing, report the gap; do not use an unapproved fallback or claim the full set is ready.

Start with **Greeting at the Farm** to check whether the approved character reads naturally in a setting. The pilot improved once she opened the gate and took a step, with fingers on the rail, grounded boots, matching shadows and light on the character and yard. Check the face at useful size before multiplying a drifted likeness across the set. If the owner requested a greeting review first, show it and wait for that art direction; otherwise proceed with the authorized candidate set.

All images are **complete horizontal 16:9 scenes**, with the character as the focus and softer supporting scenery. “More vertical” describes body placement *inside* that wide frame. A supported, near-frontal recline with a closer thigh crop is the default for both bed scenes. Preserve clear space above the ears rather than clipping them to make the character larger. Preserve the lighting and scene context across a paired shot. Stage the confession square to the viewer and make its second image an expression edit. Check the two bed scenes at the same scale: the framing can match, while the approved wedding-night and everyday pajama garments and accessories stay distinct.

## 3. Author and check the nine slots

Use [scene-set.json](scene-set.json) in its given order. The two pajama scenes are last; the two confession expressions and the two wedding-night beats are separate deliverables. Generate one image per scene. If a correction is needed, change the requested part and explicitly retain the accepted parts; keep numbered versions, exact prompts and records. Do not stretch the image to fit the canvas or crop ears and hands for convenience. If a deterministic resize or crop is needed, retain the raw output and document the transform before review. Inspect the saved PNGs and record the native or delivered dimensions honestly.

Before showing an image, check at full size and at a smaller reading size:

- The face, expression, adult model, outfit layers and asymmetric details match this character's accepted work.
- The camera and composition meet the slot, the face reads, and the requested pose has natural weight, hands and contact shadows.
- The canvas is landscape and near 16:9, the room or landscape fills it, and there are no unwanted extra people, text or borders. Both ears have headroom; full-figure scenes also include the footwear or bare feet. Check opacity before approval; game splash assets are solid scenes.
- The confession pair shares its composition with clearly different expressions; the wedding and wedding-night scenes are different occasions.
- The artifact is actually usable at the saved path, with its provenance and exact prompt.

Default to showing images during iterations. Generate a review page or integrate with the album only when requested or already authorized. Honor clear per-image or batch verdicts without asking again; a technical check alone is never an owner verdict. When a version changes, approval stays with its prior bytes. Keep approvals for unchanged scenes when the owner requests selective revisions, and explicitly record withdrawals without deleting their history.

## 4. Record a selected version

`init` places a `study.json` with all slots and a null `selected` field in each. Save each attempt under `<study>/<scene-id>/vNNN/` with:

| File | What goes in it |
| --- | --- |
| `image.png` | The saved rendered image. Retain prior attempts in sibling version folders. |
| `prompt.txt` | The exact prompt actually sent. |
| `generation.json` | The tool, reference roles and hashes, output hash and any edit lineage. |

For the current review selection, fill `selected` in that scene's `study.json` entry. Copy the PNG's actual SHA-256 and dimensions. Before review, leave `approval: null`. Example with placeholders:

```json
{
  "revision": "v001",
  "sha256": "<64 lowercase hex digits>",
  "width": 1672,
  "height": 941,
  "approval": null
}
```

Record an approval as `{"status":"approved","by":"owner","on":"YYYY-MM-DD","imageSha256":"<same hash>","basis":"<owner verdict and its scope>"}`. Save dated verdicts for replaced or withdrawn versions in the study handoff or in a separate private review log before changing `selected`. When choosing a new version set its approval to null until selected by the owner.

Minimum `generation.json` (add notes, parent IDs or transform details as needed):

```json
{
  "tool": "built-in image_gen",
  "references": [
    {
      "role": "identity and wardrobe",
      "path": "content/authoring/character-universes/farm-life/approved/<character>/<look>.png",
      "sha256": "<reference file SHA-256>"
    }
  ],
  "outputSha256": "<image.png SHA-256>"
}
```

List every image used, including edit targets and optional surroundings. Keep private copies under `content/` when a reference would otherwise disappear; use repository-relative forward-slash paths in this record. Run `check <character-key>` to verify complete selected coverage, image hashes, PNG dimensions, prompts and reference records. Run `check <character-key> --approved` after the owner approves the full set. Run `review <character-key>` to write an HTML page with the currently selected scenes and their actual approval status; it also works with a partial selection. See the [entry point](README.md) for command prefixes. The checker verifies file and record consistency, not likeness or the truth of a recorded owner verdict.

## 5. Hand off or add to the local album

Fill [the handoff](templates/handoff.md) and link the images or review page. A complete candidate set can be delivered while owner approvals or album inclusion are pending. For an approved set, record exact scene IDs, outfits, runtime moments and hashes.

When the owner asks for shared local album inclusion, append the authorized approved scenes to the existing `content/authoring/character-universes/farm-life/splash-art/manifest.json` (P175/AP92). Copy the approved PNGs byte for byte under a character-specific directory inside `splash-art/images/` so filenames cannot collide; store prompt and record copies in similarly separated folders. Each asset needs a stable lowercase `id`, the display name in `character`, `title`, dialogue `outfit` key, integer `order`, relative `image` path, `sha256`, `width`, `height`, and the owner `approval` object. Keep the original nine entries and order intact, append the new character in her slot order, and set `character` on each row; the old top-level character field cannot identify a mixed manifest. The publisher already prefixes splash IDs by character; don't rename existing IDs to match the new template.

**The ignored pilot's `splash-art/build.mjs` and `viewer.mjs` hard-code Kitasan's nine images.** Do not run the pilot importer for a second character: it would reconstruct the pilot-only manifest. If merging into the existing tab, adapt the local viewer to group the shared manifest by character and read the new asset counts, preserving the existing tab, outfit and dialogue galleries, and both gallery publication blocks. Run the shared gallery build only after making it multi-character-safe. Verify the old and new scenes and links through `pnpm art:gallery` on the owner's machine. Preserve every old approval, source image, publication flag file, and approved asset path. The standalone study review is available before any shared change.

Publication and game hookup are separate. Don't run `art:push`, refresh publication flags, pack a release or change cloud resources as part of this authoring pass. Handoff the character name, scene IDs and the scene set's moment mapping to the delivery session; the [illustrations format](../../sprites/illustrations.md) explains the private moments map and game release. P177 keeps the working folder out of backup. Keep all filled briefs, prompts, images and records in gitignored `content/`; commit only generic workflow, templates and tooling.
