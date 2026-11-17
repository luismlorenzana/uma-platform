# Farm Life splash prompt kit

Fill the brackets privately. The [scene set](scene-set.json) supplies per-scene action, lighting, wardrobe and expression. Keep a copy of the **exact filled prompt** and the roles and hashes of the images actually used for each attempt.

For **beach**, use the [locked baseline](beach-baseline.md) and `prepare-beach` command instead of filling the generic scene prompt below. [beach-spec.json](https://github.com/luismlorenzana/uma-art-authoring/blob/feat/initial-preview/docs/authoring/farm-life-splash-art/beach-spec.json) is its one prompt source: only the character name is filled automatically; her actual identity, proportions, bikini and markings come from her own approved references. Use exactly the two prepared inputs, with no existing beach render. Copy `intent`, `sceneSpec`, `promptSha256` and `references` into the generation record. Tail root and upper length stay hidden behind her toward viewer-right; limited visibility is preferable to an exposed or floating attachment.

## New scene

```text
Use case: illustration-story
Asset: one complete widescreen event illustration for Farm Life.
Canvas: horizontal 16:9 landscape. Paint the full environment edge to edge.
Input 1: [this character's approved full-body outfit], primary reference for
identity, adult proportions, exact wardrobe, and accessory placement.
Input 2: [this character's approved expression portrait], primary reference
for the face and [expression]. Keep her face shape, eye spacing and markings.
Input 3, if useful: [approved scene or environment reference], composition,
location and lighting only. Do not borrow any other person's face or costume.

Scene: [location, season, time, light and story beat].
Pose and crop: [action, camera angle and included body landmarks]. Make her
the focus. Keep both ear tips clear of the upper edge; leave at least a small
margin above them. If full figure, keep both feet and the silhouette in frame.
For a cropped recline, her body runs mostly up and down inside the horizontal
room. Her head and shoulders rest against pillows, face nearly frontal and
gaze toward the viewer. Crop around the upper thighs; show the wider room.

Identity and wardrobe: [same-character invariants and exact visible wardrobe
construction, colors, trim and accessory sides]. Keep her adult model.
Expression: [approved expression traits]; adapt the lighting and gaze only
as required by the story beat.
Rendering: soft 2D anime, warm fine linework, painterly cel shading, restrained
fabric texture. Match environmental light on her face, clothes and setting.
Ground hands, feet or body in the scene with natural contact and shadows.
Only the named character; no lettering, UI, watermarks or borders.
```

## Expression-only variant

```text
Input 1 is the existing scene and edit target. Input 2 is this character's
approved [expression] portrait, for her expression only. Change the facial
expression in place: [eyelids, gaze, brows, mouth, and blush or tears].
Preserve the jaw, eye spacing, face position, head angle, hair, outfit, hands,
pose, lighting and background from image 1. Keep the wide original frame.
Relight the expression naturally within the scene.
```

Use this for the second confession. Check the pair side by side for unintended changes; a generative edit is not a guarantee of pixel identity. For a framing or pose correction, explicitly name the elements to recompose and all other elements to retain. If likeness has drifted, go back to the approved wardrobe and facial references rather than treating a draft as the new identity.

| Expression | Features to check against this character's own portrait |
| --- | --- |
| Happy | Recognizable warm smile and engaged eyes; intensity follows the character. |
| Flustered | More open eyes, raised or pinched brows, cheek and nose blush, small wavering closed mouth. A glance can move the pupils without turning the face. |
| Loving | Half-lidded affectionate gaze, relaxed brows, closed smile and soft blush. |
| Tearful Joy | Bright eyes, small beads at the lower outer eye corners and a joyful smile. Avoid a sad face or long tear trails. |
