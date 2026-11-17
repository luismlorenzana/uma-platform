# Farm Life splash art authoring

Use this packet in a new ChatGPT session to author the **nine Farm Life event illustrations for a character with an approved wardrobe and dialogue expressions**. It records what worked in the first approved set. The new character's art supplies her identity, outfits and expressions; the pilot scenes supply staging and world continuity.

- [Workflow](workflow.md): find references, author, review, verify and hand off a set.
- [Prompt kit](prompt-kit.md): reusable generation and revision prompts.
- [Locked beach baseline](beach-baseline.md) and [prompt spec](https://github.com/luismlorenzana/uma-art-authoring/blob/feat/initial-preview/docs/authoring/farm-life-splash-art/beach-spec.json): the shared lounger/harbour composition, mostly hidden viewer-right tail, and fresh generation from each character's own approved bikini base and Happy portrait.
- [Scene set](scene-set.json): ordered slots, outfit and expression keys, and runtime moments. Master data takes each published scene's moment from it (her scene's id, else her outfit's next slot, P203), so keep the scene ids and outfits as the set has them.
- [Scene brief](templates/brief.md) and [handoff](templates/handoff.md): copy and fill under the character's private working folder.
- [Character authoring](../farm-life-characters/README.md): use first when the character lacks the approved references.

From the repository root, with Node 22:

```text
pnpm -C ../uma-art-authoring study init "<Character Name>"
pnpm -C ../uma-art-authoring study prepare-beach <character-key> <vNNN>
pnpm -C ../uma-art-authoring study check <character-key>
pnpm -C ../uma-art-authoring study check <character-key> --approved
```

`init` creates a resumable study under `content/authoring/splash-art/farm-life/<character-key>/`. `prepare-beach` creates a new private prompt/input attempt from the locked spec and verifies her approved references; it preserves all selections. The checks verify the full set, source hashes, dimensions and provenance; `--approved` also requires recorded owner approval for every selected image. These commands do not generate images, change the shared album, upload or publish. See [the workflow](workflow.md#4-record-a-selected-version) for the record format.

**Lean default:** generate one scene at a time, save its PNG/prompt/provenance as soon as it finishes, inspect that image and deliver direct links to the individual PNGs. No combined raster, contact sheet, giant overview image, review website or album rebuild is required for a draft pass. Use `review <character-key>` only when the owner requests a review page. Compose only the approved portrait references actually needed by the scene; do not pre-export an entire outfit/expression library. Keep technical checking and visual review focused on the new or revised scenes.

## Paste into a new session

Open the `uma-platform` workspace and use a session with built-in image generation and access to the private authoring files.

```text
Author the standard nine Farm Life splash illustrations for <Character Name>.
Start with docs/authoring/farm-life-splash-art/README.md and follow its
workflow, scene set and prompt kit.

My character art is at <approved wardrobe and dialogue manifest paths, or
discover them from the active study>. Character-specific notes: <optional>.

Use her own approved outfit and expression references. Use Kitasan's final
approved splashes to match staging and settings, never as identity or wardrobe
references. Keep every canvas horizontal 16:9, with both pajama scenes last.
Run the complete set as drafts, starting with an in-scene likeness check on
Greeting at the Farm. Prepare the beach slot with the locked beach-baseline.md
method and prepare-beach command: fresh generation from her own approved bikini
base and Happy portrait, tail mostly hidden behind her toward viewer-right.
Save each version, exact prompt and provenance locally.
Link each candidate PNG directly and record my verdicts on the exact versions
I select. Do not render a combined sheet or giant overview image.
<Optional: show me the greeting first and wait for my art direction.>

Default to image-only design iterations. Make a review page or update the local
album when I ask or authorize it here. Leave any publication or game integration
to the separate delivery workflow. Preserve existing approved characters.
```
