# LK1 — The look slice: one hero scene at the target quality

**uma-platform (uma-stage, the art tools, private authoring) · Claude, with art sourced or painted · L · Needs: LK0 (the
owner's references, the hero scene and the asset-pack answer) and the owner's go · Unblocks: LK2 (the pipeline), LK3
(each game's roll-out), or LK4 if the phone can't hold it**

## Why

The owner likes the gameplay and the HD-2D engine, but the look reads as 1999
([hd2d-quality.md](../../look/hd2d-quality.md), P157). The research says the gap is art direction, volume, staged light,
shadows, focus and per-scene post, not the phone or texture resolution. Square Enix found Octopath's look by prototyping
it before building the pipeline. This packet does the same: one scene, taken to the target, measured on the owner's
iPhone, judged beside the references. Nothing is rolled out until the owner says "this is the bar".

## Context (read first)

- [hd2d-quality.md](../../look/hd2d-quality.md) and [its page](../../look/previews/hd2d-quality.html): LR1–LR14.
- The owner's references in `content/authoring/look/` (LK0), tagged by scene type, and the hero scene they pick.
- uma-stage's [README](../../../packages/stage/README.md): `StageEngine`, `BandStage`, `Effects` (ST5's options), the
  kit and design formats, the sprite player.
- three.js r187 (pinned): node materials and `RenderPipeline` on WebGL 2, `SunLight` with cascaded shadows, clustered
  lights, the bloom, depth-of-field and ambient-occlusion passes, FSR 1 and TAAU upscaling.

## Decisions made

- **One hero scene**, recommended a town square by day with one interior, at the owner's pick (LK0).
- **A new, opt-in look path in uma-stage** (LR8): its own scene class beside `StageEngine` and `BandStage`, so no game
  changes until LK3. It reads today's designs plus the slice's assets.
- **The layers**, each switchable on the review page so the owner sees what each adds:
  1. a perspective camera with a narrow field of view and a lower pitch, a slight sway;
  2. volume by the size rule: 2D sprites below character size, 2.5D (no back) at character size, 3D above (LR1);
  3. staged character light (a fixed key from the camera's side, as Octopath's spotlight) and normal maps made from
     each sprite's outline, with a rim;
  4. sun shadows that follow sprite silhouettes (alpha-tested depth), contact shadows at the feet, ambient occlusion
     (baked into the 3D pieces, screen-space at half resolution on High);
  5. depth of field by depth with bokeh, the focus band on the party;
  6. bloom in HDR with a sensible threshold, tone mapping, a graded LUT per scene, vignette, a touch of chromatic
     aberration;
  7. height fog and light shafts; dust motes, leaves or embers; wind on foliage; a water surface if the scene has water;
  8. the 3D scene rendered at a lower internal resolution and upscaled; the interface at full density (LR5).
- **Assets** (LR9, LR10): the best available for the scene, in this order: licensed packs if the owner said yes, CC0
  shapes re-textured, AI-painted textures held to a one-page style guide written first, Blender volume scripted by
  Claude. One pixel scale across sprites and environment (LR4). Licensed sources in `content/authoring/licensed/`
  only, never in git or uma-art.
- **The target still first** (LR14): a Blender render of the hero scene, reviewed beside the references, before any
  engine work.
- **Budgets** (LR6): 30 fps sustained over ten minutes on the owner's iPhone, about 400 MB of GPU memory, a first load
  under about 15 MB. Device tiers High, Medium and Saver (LR7).
- **Look measures** (LR12) on every capture, against the references' measured ranges: luminance spread and contrast,
  saturation spread, share in shadow, share blurred, sprite against environment texel density, palette size,
  focus-band sharpness.

## Do

1. Write the one-page style guide from the references: palette families, light direction and temperature, pixel scale,
   what is 2D, 2.5D and 3D in this scene.
2. Make the target still in Blender. Ask for the owner's look review in one line, beside the references.
3. Source or make the scene's assets; record each one's origin and licence in a private manifest.
4. Build the look path and the layers, each switchable; the review page shows the scene, the layer toggles, the look
   measures and three references side by side.
5. Measure on the owner's iPhone (the owner opens one link): frame rate over ten minutes, memory, heat, per tier.
6. Ask for the owner's look review in one line, with the link.

## Done when

- The owner has judged the slice against the references: "this is the bar", or a list of what's missing (which is
  worked here before LK2).
- The budgets hold on the owner's iPhone, or the measurements say why not (then LK4 is weighed).
- Every asset's origin and licence is recorded; no licensed file or game frame is in git.

## Deliver

Commit to `main` with the review page under `docs/look/previews/`; a P-decision with the owner's verdict and the
measurements; mark LK1 done in [the handoff](../README.md#the-look-lk) and write LK2's packet from what the slice taught.
