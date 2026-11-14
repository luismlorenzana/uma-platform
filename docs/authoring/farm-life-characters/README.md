# Farm Life character authoring

Use this packet to author a new adult Uma for the Farm Life Adventure, from identity references to a complete local wardrobe and reusable dialogue expressions. It records the method that produced the owner-approved pilot collection. A new session should be able to work from this packet and the local artifacts without the original chat.

The target is **the same quality and shared rendering style, with a distinct person and wardrobe**. Match the project's linework, shading, staging and asset behavior. Preserve the new character's own facial design, hair, markings, proportions, accessories and manner of expressing emotion. An existing character is a style reference, never a replacement identity.

## Start here

1. Read [AGENTS.md](../../../AGENTS.md), [architecture](../../architecture.md), the [roadmap](../../roadmap.md), the latest [decisions](../../decisions.md), and the current [handoff queue](../../handoff/README.md).
2. Read [workflow.md](workflow.md) for the complete process and review criteria.
3. Copy [character-brief.md](templates/character-brief.md) into the new character's **gitignored** study folder. Fill it from the owner's instructions and inspected references. Record unknowns rather than inventing traits.
4. Use [prompt-kit.md](prompt-kit.md) for the generation prompts and all sixteen expressions.
5. Follow [dialogue-portraits.md](dialogue-portraits.md) for cropping, masks, composition, integration and exact-pixel verification.
6. Keep a [handoff.md](templates/handoff.md) with paths, decisions, exact approval scope and the next action so another session can resume.

The generic method and blank templates belong in git. Reference images, character-specific descriptions from private sources, exact filled prompts, generated assets, reviews and approvals belong under `content/authoring/character-universes/`. Do not put private art or extracted master data into this documentation.

## Current accepted scope

Owner confirmed the current collection completely approved on **2026-11-14**. The two pilot characters each have twelve approved full-body looks and sixteen dialogue states per look: **24 full-body images, 24 neutral crops, 30 reusable non-neutral face layers, and 384 dialogue states**. New characters need their own review; the pilots' approval does not approve new art.

| Part | Direction |
| --- | --- |
| Character age | Adult women in their twenties; working art age **25**, preserving a youthful adult appearance |
| Illustration | Softly shaded 2D anime, delicate warm linework, gentle painterly cel shading, restrained fabric texture |
| Full-body staging | Frontal, upright, level shoulders and hips, balanced stance, both arms relaxed down, visible hands, complete ears-to-footwear silhouette |
| Background | Opaque warm ivory, soft neutral daylight, faint grounding shadow |
| Wardrobe | Spring, Summer, Fall, Winter, Swimsuit, Kimono, Dinner, Wedding, Farm Work, Garden Party, Playful Pajamas, Wedding Night |
| Dialogue | Literal **frontal waist-up crops** of approved full-body images; no separately redrawn neutral busts or slight side angles |
| Expressions | Ten core and six romance states, including Neutral; see the [expression table](prompt-kit.md#expression-directions) |
| Excluded | Original `pajamas` look is retired. Crying, Teasing, Smug, Embarrassed, Startled and Dreamy are **won't do** because they do not fit the game's direction |

For one new character with this scope, completion means **12 full-body looks + 12 neutral crops + 15 reusable face layers + 180 composed expression previews = 192 dialogue states**, with evidence and owner verdicts. Neutral is the crop alone; do not generate a sixteenth face overlay. Counts describe coverage, not a quota to reach by duplicating artwork.

## Local source of truth

Paths below are relative to the repository root. These files are private and absent from a fresh clone; inspect them on the owner's machine before authoring. Read current manifests before historical studies.

| Local path under `content/authoring/character-universes/` | Use |
| --- | --- |
| `brief.md` | Owner's current universe directions and publishing coordination |
| `farm-life/approved/manifest.json` and `style-guide.md` | Active full-body assets, exact hashes, approvals and shared visual direction |
| `farm-life/approved/review.html` | Current wardrobe and Dialogue Portraits gallery |
| `farm-life/dialogue-portraits/manifest.json` and `approval.json` | Current crop, face, mask, placement and approved-state records |
| `farm-life/dialogue-portraits/README.md` and `verification.json` | Current collection layout and verification claims |
| `farm-life/optional-expressions-status.json` | Closed optional-expression scope; do not requeue it |
| `farm-life/v006/setup.mjs` and `prompts/` | Successful outfit prompts with explicit identity, body and occasion reference roles |
| `farm-life/face-reuse-v001/active-export.json` and `patches/v004/` | Corrected pilot masks after the doubled-eyebrow failure |
| `farm-life/core-expressions-v001/` | Seven additional core faces per pilot character |
| `farm-life/romance-expressions-v001/` | Five additional romance faces per pilot character, with blush/tear guards |
| `farm-life/dialogue-portraits/build.mjs`, `viewer.mjs` and `verify.mjs` | Working composition, browser and verification implementations to study and adapt |

Historical `dialogue-v001`–`v003`, old mask versions, retired pajamas and superseded galleries are **not current design references**. Some are retained as provenance; some historical entry points redirect. The rejected optional study was deleted. Do not recreate it to complete an older checklist.

The existing local builders are study-specific, with hard-coded pilot names, counts and source folders. They are examples, not a ready-made new-character command. Do not run them expecting automatic discovery of a third character. The [integration section](dialogue-portraits.md#add-a-character-without-rebuilding-the-pilots) explains the adaptation and preservation requirements.

## Tools and ownership

Use the session's **built-in image generation** for raster authoring and edits. Read the installed `imagegen` skill and its current tool instructions; tool names and capabilities can vary by session. Inspect every local reference with the image-viewing tool before using it. Save one exact prompt and generation record per asset. Copy project outputs into the workspace before referencing them. Do not silently switch to an API/CLI workflow if built-in generation is unavailable.

Cropping, measured alignment, mask construction, compositing and review-sheet assembly are deterministic asset processing. The existing study uses Node and Sharp, available through `scripts/assets` dependencies after the repository's normal installation. Do not substitute code-drawn faces for authored expression edits.

This packet ends at a verified, reviewed **local** collection and a handoff. **The owner assigned current publishing to a separate Claude session. Do not publish, refresh publication flags, deploy or change cloud resources as part of this authoring task.** Preserve the publication markers when regenerating galleries and leave the generated publication files to the publishing tools. Later publishing follows [CA4/CA5](../../platform-app/README.md); it is a separate coordinated action, not an implied last step here.

## Starter request for another ChatGPT session

Replace the angle-bracket fields and send this together with the identity references:

```text
Author <character name> for the Farm Life Adventure using
docs/authoring/farm-life-characters/README.md and its linked workflow,
prompt kit, dialogue recipe and templates.

Identity references: <local paths or attached images>.
Character/story facts supplied by me: <facts, or unknown>.
Requested scope: <the standard twelve outfits and sixteen dialogue states,
or my explicit subset>.
Existing authorization/review preferences: <what to complete autonomously
and which design decisions I want to review first>.

Keep this character recognizable and visually distinct from the approved
cast while matching the shared art direction. Use her own approved anchor
for later outfits and expressions. Keep all character-specific artifacts
local under content/. Check existing approvals before requesting review.
Do not publish; the publishing session handles that separately.

Begin by inspecting the current local references and filling the character
brief. Make concrete art within the authorized scope, verify it, and leave
a complete local gallery and handoff. Do not mark new work owner approved
without my verdict.
```
