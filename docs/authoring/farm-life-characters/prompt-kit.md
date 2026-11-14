# Prompt kit

[Packet entry point](README.md) · [Workflow](workflow.md) · [Dialogue recipe](dialogue-portraits.md)

These are structured starting prompts. Replace every placeholder from the completed private character brief, remove irrelevant reference roles, and save the **exact submitted text** with each output. Do not reuse a pilot's name, palette, hair, silhouette or anatomy in the new character's prompt by accident.

## Generation discipline

Use the installed imagegen skill and built-in image-generation tool. Inspect local input images first, then supply the actual paths or conversation references supported by that session's tool. Each input must have a clear role in the prompt. Do not claim to supply a mask, exact output dimensions or another control the tool does not support.

Use one call per distinct full-body outfit or facial expression. Preserve raw outputs and record the tool's actual saved path, workspace copy, dimensions, exact prompt, ordered references, revision and status. Save batch metadata incrementally. If generation stops or a usage limit interrupts work, resume missing jobs from disk rather than regenerating accepted outputs. A request for multiple assets does not imply permission to switch to a CLI/API generator.

## A. First spring anchor for a new character

```text
Use case: stylized-concept
Asset type: full-body character and default spring outfit for the Farm Life
Adventure, a cozy rural-life adventure and dating simulator.

Input roles:
Image 1 is the NEW CHARACTER'S identity reference: use it for her recognizable
face, eye colors and shape, hair, markings, ears, tail and signature accessories.
Image 2 is an EXISTING APPROVED FARM LIFE illustration: use it ONLY for
rendering style, neutral staging, lighting, framing and background.
Preserve the new character's own identity and proportions. Do not borrow the
other woman's face, hairstyle, body shape, signature palette or outfit design.

Character identity: <precise visible anchors and viewer-side placements>.
Character facts supplied by the owner: <relevant confirmed facts only>.
The alternate-universe character is an ADULT WOMAN AGE 25, with a youthful
adult appearance and natural adult proportions. A retired racing career does
not make her elderly. <Any owner-specified age overrides this working age.>

Style: softly shaded 2D anime illustration, delicate warm linework, gentle
painterly cel shading, restrained fabric texture and soft neutral daylight.

Composition: ONE complete full-body figure, horse-ear tips through footwear
soles, eye-level straight-on front view. Head upright and facing forward,
shoulders and hips level, weight balanced, feet comfortably slightly apart.
BOTH ARMS relaxed down beside the body, hands visible, no held object or
gesture, no contrapposto. Calm relaxed closed-mouth face and forward gaze.
Preserve her own silhouette and proportions. Generous complete-silhouette
margins; 3:4 portrait framing consistent with the project, target 1086 × 1448.

Spring outfit: <individual silhouette, layers, construction, fabrics, palette
distribution, motifs, closure and footwear from her wardrobe plan>.
Clothes naturally accommodate the tail.

Background: opaque warm ivory studio backdrop and faint grounding shadow.
No scenery, extra character, inset view, text, label, logo, watermark or border.

Output: one complete spring character concept for local review.
```

If a project style reference is unavailable, the prose style direction can start a candidate, but record that the visual comparison is missing. Do not pretend an unseen existing image was used.

## B. Another outfit for an established character

```text
Use case: identity-preserve
Asset type: a new full-body outfit for the owner's established Farm Life
character, <name>, an adult woman age <working age>.

Input roles:
Image 1 is THIS SAME CHARACTER'S accepted spring art, the primary edit target
for face, hair, head accessories, pose, framing, lighting and drawing style.
Image 2, if supplied, is HER OWN accepted swimsuit: body proportions only.
Image 3, if supplied, is HER OWN <occasion image>: <specific accessory or
construction continuity role>. No other character is an identity reference.

Change the clothing to the design below. Preserve her exact established face,
eye shape and colors, hair and markings, ears, tail, accessory sides, youthful
adult appearance, body proportions and rendering. Keep the same softly shaded
2D illustration, fine warm lines, gentle shading and restrained textile detail.

Identity anchors: <her anchors, never copied from a pilot's prompt>.

Composition: same frontal full-body neutral model pose as Image 1; upright
forward-facing head, level shoulders and hips, balanced stance, both arms
relaxed down, visible natural hands, calm closed-mouth face and forward gaze.
Same 3:4 framing, comparable head position and figure scale, complete ears,
hair, tail, hem and footwear inside the canvas. Soft neutral daylight, opaque
warm ivory backdrop and faint grounding shadow.

Requested outfit: <key and occasion>.
Design: <silhouette, neckline, sleeves, waist, length, layers, material,
fastenings, motif placement, palette proportions and footwear>.
Distinctive design choices: <how it differs structurally from her other looks
and the existing cast's same-occasion looks>.
Retain <specific identity accessories>; adapt <only explicitly allowed items>.
Garments accommodate the tail. Keep facial features unobstructed.

One complete character only. No props in hands, scene, labels, text, border,
multiple views or change of head angle. Output one outfit concept for review.
```

When creating the character's first swimsuit there is no accepted swimsuit reference yet; omit Image 2. Establish the adult proportions from her accepted spring model and owner-supplied references. Do not invent an unavailable input or use someone else's proportions.

## C. Facial-expression edit

```text
Use case: identity-preserve
Asset type: reusable facial-expression edit for existing softly shaded 2D
Farm Life dialogue art.

The supplied square is an EXACT NATIVE CROP of this character's accepted
neutral spring art. It is the EDIT TARGET, not a loose style reference.

Change only the requested expression IN PLACE. Preserve face position and
scale, frontal head angle, eye spacing and eye socket sizes, nose position,
face outline and jaw, every surrounding hair strand and accessory, neck,
collar, background, fine warm linework, colors and shading. Do not zoom,
reframe, tilt or turn the head, age the face or sharpen the rendering style.

Character: <name, adult age, own visible identity anchors and eye colors>.
Expression manner: <confirmed character-specific intensity and restraint>.
Requested expression: <one direction from the table below>.

Modify brows, eyelids, pupils, mouth and only the specified blush or tears.
Fully replace the original neutral eye, brow and mouth marks. Keep all new
features and effects inside the original facial area. An eye glance must not
turn the head. No hands, props, external symbols or extra panels.

Output one edited square with the same composition and opaque source
background. No labels, text or border. This source edit will be registered
and masked deterministically into a transparent reusable face layer.
```

The generator's square output is **not yet the game-ready face piece**. It includes context from hair, background and clothing. Export the registered expression through its saved alpha mask using the [dialogue recipe](dialogue-portraits.md). Retain the raw edit for provenance. The resulting RGBA layer replaces features when drawn over the neutral bust.

## Expression directions

Use these sixteen accepted keys. Adapt intensity to confirmed characterization while keeping each state readable. The descriptions constrain the facial change; they do not authorize a new head pose or a new face design.

| Key | Eyes and brows | Mouth, marks and distinction |
| --- | --- | --- |
| `neutral` | Open, relaxed, forward | The unchanged accepted crop; calm closed mouth, no generated overlay |
| `happy` | Bright, slightly narrowed by the smile | Warm naturally sized open smile; clear happiness without changing eye size |
| `laughing` | Both eyes closed in upward smiling curves, relaxed raised brows | Open laughing mouth; livelier than Happy, not a giant distorted mouth |
| `surprised` | Open wide within the original sockets, brows raised | Small round open “oh”; ordinary surprise, no tiny-pupil alarm or jolt mark |
| `thinking` | Small aside/upward eye glance, one brow subtly raised | Small pursed or off-center closed mouth; head stays frontal |
| `sad` | Lowered gaze/lids, inner brows raised and pinched | Small downturned mouth; restrained sadness without tear streams |
| `angry` | Narrowed eyes and lowered tense brows | Firm frown or restrained clenched mouth; preserve identity and avoid a comic rage face |
| `worried` | Uneasy gaze and gently raised inner brows | Small wavering closed mouth; anxiety rather than Angry or Sad; no external sweat effect needed |
| `determined` | Focused forward eyes, brows set | Firm small confident smile; resolve without an angry scowl or smug smirk |
| `pouting` | Slightly averted pupils, lowered brows | Small pushed-out lips or restrained puffed cheek; playful annoyance without moving the jaw outline substantially |
| `shy` | Slight down/aside glance, softly uncertain brows | Small closed smile and light blush; head remains upright |
| `tender` | Open attentive eyes with relaxed upper lids | Small warm closed smile, faint blush; more open-eyed and less blushed than Loving |
| `flustered` | Wider eyes, slightly averted pupils, raised pinched brows | Small wavering closed mouth, deep cheek/nose blush; stronger romantic shock than Shy, no steam/sweat symbols |
| `loving` | Affectionate half-lidded forward gaze, relaxed brows | Gentle closed smile, visible warm blush; calmer than Flustered, awake rather than Sleepy |
| `tearful-joy` | Bright open wet eyes, gentle inner-brow lift | Warm open smile and small beads at lower outer eye corners, inside face outline; happiness through tears, no long streams |
| `sleepy` | Very heavy almost-closed lids with small iris slivers | Tiny oval yawn or drowsy mouth; relaxed, distinct from Loving's closed affectionate smile and Laughing's closed-eye curves |

The six optional extras—Crying, Teasing, Smug, Embarrassed, Startled and Dreamy—are **won't do**. Do not use this table as a reason to add them, their effects or near-duplicate replacements.

## D. Targeted revision

Retain the original prompt and output; write a new revision prompt. State the failed observation and one intended correction, followed by the invariants that must remain fixed. For example:

```text
Edit target: <the selected same-character candidate>.
Supporting identity anchor: <her accepted spring or exact neutral face crop>.
Correct <specific observed problem>. Preserve <all already accepted details>.
Do not change <face geometry, rendering, head angle, other garment elements>.
Keep the existing composition and background. Output one revised image.
```

An eyebrow-coverage or clipped-blush problem may be an export-mask problem rather than bad generated art. Compare the raw source with the masked preview before spending another generation. Change the mask in a new export version when the source is already correct, and rerun the relevant checks.
