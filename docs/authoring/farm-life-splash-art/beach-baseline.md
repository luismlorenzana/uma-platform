# Farm Life beach baseline

The owner accepted this direction on 2026-11-16 (P187). It applies to every character's **beach** slot, including replacements of earlier beach scenes. The [version 1 spec](https://github.com/luismlorenzana/uma-art-authoring/blob/feat/initial-preview/docs/authoring/farm-life-splash-art/beach-spec.json) is the executable prompt source. The approved local staging baseline is the beach override in `content/authoring/character-universes/farm-life/splash-art/authoring-reference.json`; its exact image, prompt and approval stay private.

## Fixed scene

Use an opaque horizontal 16:9 illustration. The character is left of center on a raised-back wooden sunlounger, supported in a relaxed upright recline and facing the viewer at eye level. Both forearms rest on the armrests; her legs rest together toward the lower right, knees gently bent and both bare feet visible. Keep room above both ears and ornaments.

The lounger has an ivory/coral striped towel, under a cream/blush parasol. At left are a round wooden table, a glass vase of red hibiscus, citrus-mint lemonade, and a wicker basket with a striped towel. Small shells sit at lower right. Turquoise shallows lead to green hills, waterfront houses, sailboats, a harbour breakwater and a white lighthouse with a red roof. Use the established warm, softly shaded 2D illustration style and coherent contact shadows.

The tail passes **behind the character toward viewer-right**, the sea-facing far side of the lounger. Its root and upper length are hidden by her lower back, pelvis and cushion. A small section may peek beyond that far edge; the tail can be barely visible. The body/cushion overlaps its first visible strands. Keep the table/basket side free of tail hair. A visible connector across skin, an exposed attachment, an armrest tuft or a floating piece fails review. Check both the whole scene and a useful native detail; do not force more tail into view to prove it is attached.

## Variable character

Only the character changes: her own accepted adult proportions, face, expression, hair, ear ornaments, asymmetric accessories, exact bikini and tail markings. Use her own approved **full-body swimsuit base** and **Happy swimsuit portrait** as the two image inputs. Match the exact approved bikini rather than recoloring another character's. Inspect both inputs before generation. Do not import the baseline character's body, hair, palette or ornaments.

Describe the scene in a **fresh prompt** and regenerate from those two character inputs. An earlier beach render is not an edit target or image input. This avoids carrying a failed tail construction into the next attempt. Small subsequent edits require the owner's direction and their own numbered attempt, exact prompt, input records and review; they do not silently become the reusable baseline.

## Prepare and record

After `init` (or when resuming a study), run:

```text
pnpm -C ../uma-art-authoring study prepare-beach <character-key> <vNNN>
```

The command reads the character's owner-approved active collection, verifies the exact swimsuit and Happy portrait hashes, and creates **only** a new `beach/vNNN/prompt.txt` and `inputs.json` under her private study. It refuses an existing attempt or missing/unapproved references. It does not generate an image, select it, approve it or change an album. If a pilot has no per-character active collection, resolve that reference layout explicitly before using this command; do not substitute another character's files.

Send the exact prepared prompt and the two ordered reference paths to the session's built-in imagegen. Copy its output byte for byte into that attempt's `image.png`. In `generation.json`, retain `intent`, `sceneSpec`, `promptSha256` and the exact ordered `references` from `inputs.json`, plus the actual tool, output hash and dimensions. Retain the raw tool output. The normal study checker verifies the prepared prompt/spec/input record when that attempt is selected; it cannot judge tail anatomy or grant approval.

Keep this spec immutable for attempts that name its hash. A later owner-approved standard needs its own versioned spec and corresponding tooling; preserve the earlier prompt source and approvals.

## Earlier scenes

Create a sibling attempt from the character's own bikini base and Happy portrait. Show it for review before replacing the accepted scene. Approval belongs to exact bytes: keep the prior image, prompt, record and verdict. After explicit replacement approval, change only that character's beach row and album links, preserving the other eight scenes, every other character and publication markers. Existing approved legacy provenance remains valid; do not claim an older generation used this new spec.

Album replacement is local authoring. Publishing, release packing and game integration remain separate workflows.
