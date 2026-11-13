# The look: what AAA HD-2D takes, and how we get there

> **Status: 2026-11-13, research (P157).** The owner likes the gameplay and the HD-2D engine, but the look reads as
> "done by a 12-year-old in 1999". This page answers the owner's questions with sources, audits where the stage and the
> art stand today, and proposes a way to reach the quality of Octopath Traveler: a measured look-development slice
> first (LK1), with the owner's eye as the gate. Visual page: [previews/hd2d-quality.html](previews/hd2d-quality.html). **LK1 as built: [previews/lk1-slice.html](previews/lk1-slice.html)** (P161).
> Calls are LR1–LR14; the packets are LK0–LK4 in [the handoff](../handoff/README.md#the-look-lk).
>
> **2026-11-13, LK0's references are in (P158):** 12 frames, private, turned into [the look bible](bible.md) with the
> look measures' target ranges. The hero scene defaults to a town square by day with a tavern interior at night.

## The short answer

| The owner's question | Answer |
|---|---|
| **What's our potential and our limit, measured against Octopath?** | The hardware isn't the limit. Octopath ran at 720p (576p handheld) and 30 fps on a Switch, a GPU of about 0.39 TFLOPS docked. An iPhone 15 Pro's GPU is about 2.1 TFLOPS, five times that. The limits are elsewhere: the art we feed the stage, the stage's lighting and camera model, and how we judge quality |
| **Are we tied by the mobile and JavaScript engines?** | Not for the look. The shaders run on the GPU through Metal either way (WebGL 2 through ANGLE, WebGPU directly), and an HD-2D scene is light on draw calls, where JavaScript costs most. The real web limits are memory (Safari kills a page that holds too much, with no published cap), heat over a long session, WebGPU still being young on iOS 26, and no engine editor with baked lighting. All are workable for a diorama-sized scene |
| **Is it the textures, do they need very high resolution?** | No. Octopath's characters are small pixel sprites and its scenes render at 720p or less. Its richness comes from consistent pixel density, 3D volume, staged lighting, shadows and depth of field that blurs what isn't in focus. We draw *more* pixels than it does (one texel a device pixel on a 3× phone) and look worse |
| **How do we truly approach it?** | Like Square Enix did: set the target with references, prototype the look on one scene until it's right, measure it on the phone, and only then turn it into the pipeline. LK1 is that slice: one hero scene with a new lighting and camera path in uma-stage, the best assets we can source, judged side by side with the references by the owner |
| **"Claude can't tell the quality"** | True, and it's the first thing to fix. My checks are technical: seams, edges, sizes, byte-identical repeats. They say nothing about whether a scene looks good, and I passed code-drawn kits a trained eye would reject. From now on the owner's eye, against a reference set, is the gate, and my checks only catch measurable signs of a flat image (LR11–LR13) |
| **A full reference, and high-quality assets to import?** | Yes, both. A private reference library of the games we're aiming at, used in every look review; and an import pipeline for licensed packs, CC0 models and painted textures (glTF into the kit format). Licensed source files stay private, like the Uma art (LR9, LR10) |

## 1. What HD-2D actually is, from the people who made it

Octopath Traveler (2018, Unreal Engine 4) defined the style; Triangle Strategy, Live A Live, Octopath Traveler II and the
Dragon Quest HD-2D remakes followed. What its developers have said in talks and interviews:

| Layer | What Octopath does | Source |
|---|---|---|
| **The idea** | Late-SNES pixel art evolved as pixel art, not replaced by 3D. Characters are 2D sprites, backgrounds are 3D, which gives a miniature, diorama feel. Copying PS2-era 3D looked "old"; staying near SNES techniques looked "dated" | CEDEC+KYUSHU 2018 (Famitsu) |
| **2D, 2.5D or 3D, by size** | Smaller than a character: a 2D sprite (bottles, apples). Character-sized: 2.5D, 3D with no back (trees, grass, rocks, most nature). Larger: full 3D (crates, stalls, buildings). Barrels and sacks are 3D on their front half only | CEDEC+KYUSHU 2018; Square Enix 2023 |
| **Backgrounds** | Real 3D models with a shader chosen so surfaces don't read as flat textures stuck on polygons. The first low-poly angular models looked old and were replaced with modern ones. Pixel density kept consistent with the sprites | CEDEC+KYUSHU 2018; Unreal Fest East 2018 |
| **Lighting** | Restrained on pixel art, because the dots already hold painted light and shadow; realistic light made characters look like paper. Characters get a fixed, staged spotlight instead, and dungeon lanterns use the same idea. 2.5D objects take 3D lighting so they sit with the characters. Ambient light added so building shadows aren't black | CEDEC+KYUSHU 2018; Unreal Fest East 2018 |
| **Focus** | Pixels in the focal area stay crisp and the rest is blurred on purpose, so less detail elsewhere makes the whole frame feel more detailed, as in painting. They leaned on the soft look players remember from CRTs | CEDEC+KYUSHU 2018 |
| **Post-processing** | One post volume per scene: colour grading, bloom, depth of field with bokeh, lens flare, an ambient cubemap, vignette, a little chromatic aberration. Tuned per map and per scene; depth of field also moves in battles and events | Unreal Fest East 2018 (4Gamer) |
| **Camera and battle** | The camera sways a little during command input so the frame never feels static, locks at big moments, and big attacks are lit from below. Octopath II added varied camerawork and taller characters so every skill has its own animation | Unreal Fest East 2018; Octopath II interviews |
| **Process** | The look was prototyped in Maya (animated lights, shadows, depth of field) before UE4, and matching it in-engine took a lot of tuning. About 350 sprite images a character. Six programmers at peak, leaning on the engine | Unreal Fest East 2018 |
| **Budget** | 720p docked, about 576p handheld, 30 fps, on a Switch: about 0.39 TFLOPS docked and 0.16 handheld | Digital Foundry 2018 (reported); GPU databases |

**What it is not:** high-resolution textures, photorealism, or many polygons. It's a disciplined art direction, a
lighting and focus model built for pixel art, and per-scene tuning by artists.

## 2. Where we are: an honest audit

The same layers, for uma-stage today (`StageEngine` for uma-quest, `BandStage` for uma-farm) and the art it draws.

| Layer | Ours today | Gap |
|---|---|---|
| **Camera** | Orthographic, pitched 35°, one texel a device pixel (CR3) | No perspective, so no depth: everything reads as a flat tile map, and depth of field has nothing to work with |
| **Volume** | The kit's frames as quads: floors, upright walls, props as cards. No roofs or beams in depth, no 2.5D objects | Big |
| **Sprites** | `MeshBasicMaterial`: unlit, with a CPU colour tint; a soft circle for a shadow | No staged light, no rim, no shadow cast, so they look pasted on |
| **World lighting** | `MeshLambertMaterial` under a hemisphere light, one sun and four point lights; no shadow maps | No shadows, no ambient occlusion, no light shaping |
| **Post** | Tilt-shift as a screen-space blur (not by depth) and bloom at threshold 0.86 (nothing but white glows); no tone mapping or grading; the battery saver turns it all off | The post layer does almost nothing |
| **Atmosphere** | Linear fog; lamp flicker | No particles, light shafts, water surface, wind or ambient motion |
| **Environment art** | Painted kits (forest, Warrior town) seen top-down and evenly lit; nine kits drawn in code from shapes (P147) | The code-drawn kits are the "1999" look. The painted ones are rich but read as a flat tile map |
| **Characters** | Smooth, high-resolution sprites (a 256 px cell) beside environment art at another density and style | Two art styles on one screen |
| **Quality control** | Technical checks only; looks approved one kit at a time, without references | No one compares the frame with the target |

The forest kit's review capture
([assets/authored/kit-forest/review/room-1x.png](../../assets/authored/kit-forest/review/room-1x.png)) shows it: the
painting is good, but under even, unshadowed light with no depth it reads as a mobile tile map. The town kit's capture
([kit-town-mage/review/town-1x.png](../../assets/authored/kit-town-mage/review/town-1x.png)) shows the code-drawn kits
next to a stand-in figure.

## 3. Are we tied by mobile and JavaScript?

| Constraint | Reality | Verdict |
|---|---|---|
| **GPU power** | Octopath: 720p, 30 fps on ~0.39 TFLOPS. iPhone 15 Pro: ~2.1 TFLOPS. A 3× iPhone has 3.3× the pixels of 720p, so at native resolution it has about 1.6× Octopath's budget per pixel; rendering the 3D scene at about 2× density and upscaling (three.js r184 has FSR 1 and TAAU) with the interface at full density gives it several times that | Not a limit |
| **JavaScript** | Shaders run on the GPU, the same as native. JavaScript costs CPU per draw call, and a diorama is a few hundred | Not a limit at this scene size |
| **The graphics API** | WebGL 2 everywhere; WebGPU on by default since iOS 26, but its first releases have bugs (one engine turned it off on iOS 26.2). three.js r187, which we pin, runs its node materials and new post stack on WebGL 2 too, and has cascaded sun shadows (r186), clustered lights (r185) and bloom, depth of field and ambient occlusion passes | WebGL 2 now, WebGPU when it's steady. Not a limit |
| **Memory** | Safari kills a page under memory pressure; there's no published cap (forums report 256–500 MB of GPU memory on older devices) | A real limit: a budget per scene (LR6) |
| **Heat and battery** | A phone throttles under long load; Octopath targets 30 fps | Real: a 30 fps target out of battle, a saver tier |
| **Tooling** | Unreal gives artists baked light, a post volume editor and a material editor; we have code | Real: we build a small look-tuning tool (LK2) |
| **Download** | Every texture comes over the network | Real but managed: per-scene loading, cached (as the sprite sets are) |

**A native engine** (Unreal 5 as Octopath, Unity 6, Godot 4) would buy editor tooling and baked lighting, not better
pixels. It would cost a rewrite of the stage, the interface kit and three games' front ends, the shared TypeScript stack
and instant web deploys. Not now: only if LK1 shows the phone browser can't hold the target look (LR3).

## 4. Do textures need very high resolution?

No (LR4). The numbers:
- Octopath's sprites are small (about 32 px wide, by fan measures) and its 3D textures are pixel-art density; the
  frame renders at 720p or less.
- Our sprite cells are 256 px and every texel lands on a device pixel: more resolution than Octopath, and a worse look.
- What matters is *consistent* density (sprites and environment at one pixel scale), the value structure painted into
  the texture (clear light and shadow shapes), and the rendering layers in §1.

What we change instead: one pixel scale for the whole frame (a texel density the kit format records), 3D volume for
objects as big as a character or bigger, and render the 3D scene at a lower internal resolution, upscaled, which is
cheaper and softer, the CRT feel Octopath aimed for (LR5).

## 5. Can Claude tell the quality? The honest part

No, not on my own, and it cost us. What I check well: seams between tiles, edges touching a frame, sizes and anchors,
byte-identical repeats, colour consistency between variants. What I don't: whether a scene is beautiful, whether its
light reads, whether an object looks amateur. I can see an image and compare it with another; what I can't do is hold an
absolute bar without a target in front of me. So I optimised what I could measure and called the result done.

The fix (LR11–LR13):
1. **A reference library**, private, of the target games' frames (owner's captures or press material), tagged by scene
   type: town by day, forest, dungeon, night, battle, interior.
2. **Every look review is side by side:** our frame next to two or three references of the same scene type, at phone
   scale. The owner decides. I compare relatively, which I do far better than absolutely.
3. **Look measures** run on every capture and are compared with the references' ranges: luminance spread and contrast,
   saturation spread, the share of the frame in shadow, the share blurred by depth of field, texel density of sprites
   against the environment, palette size, sharpness inside the focus band. They catch "flat, evenly lit, uniformly sharp"
   before the owner sees it. They aren't taste.
4. **Nothing visual ships unapproved:** a kit or a look change goes to a game only after the owner's look approval
   against the references (today the code kits were released before review).
5. **Prototype the target as a still first**, as Octopath did in Maya: a Blender render of the hero scene shows the goal
   before any engine work.

## 6. Importing high-quality assets

| Source | Fits HD-2D? | Licence | Cost | Use it for |
|---|---|---|---|---|
| **Licensed packs** (itch.io, Unity Asset Store, others) | Some 3D pixel-art and 16-bit packs; few true HD-2D | Unity's standard licence allows use in another engine when the asset is built into the game and not redistributed; itch.io per pack | $5–$60 a pack | Environment pieces at quality, quickly |
| **CC0 models** (Kenney, Quaternius) | Stylised low poly, not pixel art | CC0, no attribution | Free | Shapes to re-texture: houses, props, rocks |
| **CC0 textures and HDRIs** (Poly Haven) | Photoreal: clashes as-is | CC0 | Free | Light probes and reference only |
| **AI-painted textures** (ChatGPT's images, the local Draw Things lab) | Yes, when held to a style guide | Ours | Free | Textures for re-textured models, trims, decals, at volume |
| **Blender, scripted by Claude** | Yes: low-poly buildings, roofs, trims, baked ambient occlusion | Ours | Free | Building volume to the kit's grid, at scale |
| **Code-drawn shapes** (today's kits, P147) | No, for environments | Ours | Free | Interface marks and icons only |

**Where it lives (LR10):** licensed source files stay private (`content/authoring/licensed/`, backed up) and reach the
games only as built kits in master data's private release, as the Uma sprites do, never in git or uma-art. CC0 and
our own art can stay in uma-art. The import path: glTF (three.js reads it natively) and textures, through Blender for
clean-up, into a kit format version 2 that records the 2D, 2.5D or 3D kind and the texel density.

## 7. The approach

| Packet | What | Who | Exit |
|---|---|---|---|
| **LK0** | The target: 15–30 reference frames, the hero scene picked (recommended: a town square by day with one interior), and a yes or no on buying asset packs | The owner, about an hour | References in `content/authoring/look/` |
| **LK1** | **The look slice.** One hero scene to the target in a new, opt-in uma-stage look path: a perspective camera with a narrow field of view; volume by the 2D/2.5D/3D rule; staged character light and normal maps made from each sprite's outline; sun shadows that follow sprite silhouettes, contact shadows and ambient occlusion; depth of field by depth; bloom in HDR; tone mapping and a graded LUT; vignette; fog and light shafts; dust and leaves; wind on foliage; a water surface. Assets: the best we can source (§6). Measured on the owner's iPhone over ten minutes: frame rate, memory, heat. A review page beside the references | Claude (stage, pipeline, Blender scripts), art sourced or painted | The owner says "this is the bar", or what's missing |
| **LK2** | The pipeline from the slice: kit format v2 (kind, texel density, glTF pieces), the importer, sprite normal maps in the sprite pipeline, the look measures, and a look-tuning page (sliders per scene, saved as data) | Claude | Tests; a second scene made by the pipeline matches the slice |
| **LK3** | Roll-out by the change protocol, each game opt-in: uma-quest's towns and dungeons, then uma-farm's band, then uma-cyberpunk's board | Each game's session, uma-stage minors here | Each game's own look review |
| **LK4** | Only if LK1 fails on the phone: the same slice in a native engine (Godot 4 or Unity), with the same assets | Claude | A side-by-side with LK1 |

**Device tiers (LR7):** *High* (iPhone 13 and later): everything, 30 fps exploring and 60 in battle where it holds.
*Medium:* half-resolution depth of field and ambient occlusion, no light shafts. *Saver:* no post layer, baked shadows,
as today.

**Budgets (LR6):** 30 fps sustained over ten minutes on the owner's iPhone; at most about 400 MB of GPU memory a scene;
a scene's first load under about 15 MB, cached after.

## 8. What it costs

| Item | Cost |
|---|---|
| Asset packs, if the owner says yes | $5–$60 each; a slice needs perhaps two or three |
| Storage for licensed sources and built kits | The existing private buckets (`uma-platform-authoring`, `uma-platform-master-data`): a few hundred MB, cents a month within the free tier's terms already in use |
| New cloud resources | None |
| Claude's time | LK1 is large (a week of sessions or more); LK2 medium; LK3 per game |

## 9. Calls

| Id | Call |
|---|---|
| LR1 | HD-2D's quality comes from art direction, the 2D/2.5D/3D object rule, staged lighting, shadows, depth-of-field focus and per-scene post tuning, not from texture resolution or polygon counts |
| LR2 | The phone's GPU is not the limit: an iPhone 15 Pro has about five times the GPU of the Switch Octopath ran on |
| LR3 | Stay on the web stack (three.js r187, WebGL 2, WebGPU later); a native engine only if LK1 fails on the phone |
| LR4 | No high-resolution textures: one consistent pixel scale across sprites and environment instead |
| LR5 | Render the 3D scene at a lower internal resolution and upscale; the interface stays sharp. Retires CR3's one texel a device pixel for the look path |
| LR6 | Budgets: 30 fps over ten minutes, about 400 MB of GPU memory and a first load under about 15 MB a scene |
| LR7 | Three device tiers: High, Medium, Saver |
| LR8 | The look path is a new, opt-in uma-stage path; today's stage keeps working until each game moves |
| LR9 | Assets from licensed packs, CC0 models, AI-painted textures and Claude-scripted Blender volume; code-drawn shapes only for interface marks (proposes amending P147 for environments). **Amended by P159:** no paid packs ever; Claude authors the kits from references, with free CC0 kits as reference and raw material |
| LR10 | Licensed source files stay private and reach games only through master data's private release; CC0 and our own art may go to uma-art |
| LR11 | A private reference library of target frames, tagged by scene type, used in every look review |
| LR12 | Look measures on every capture, compared with the references' ranges: they flag flat images, they don't judge taste |
| LR13 | Nothing visual reaches a game without the owner's look approval against the references |
| LR14 | Prototype the target as a still first (a Blender render), then match it in the engine |

## Sources

- Octopath Traveler talks and interviews: [Famitsu on CEDEC+KYUSHU 2018](https://www.famitsu.com/news/201906/07169244.html),
  [4Gamer on Unreal Fest East 2018](https://business.4gamer.net/article/1810/18101801/),
  [AUTOMATON on Unreal Fest East 2018](https://automaton-media.com/devlog/report/20181023-78326/),
  [i-mezzo on Square Enix's 2023 HD-2D video](https://www.i-mezzo.net/log/2023/03/02230617.html/78571/),
  [Square Enix: the birth and evolution of HD-2D](https://www.jp.square-enix.com/presents/info/20230302003533.html),
  [Unreal Engine spotlight](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true),
  [Nintendo Everything on Octopath II](https://nintendoeverything.com/octopath-traveler-ii-devs-on-the-games-evolved-use-of-hd-2d-and-more/),
  [Nintendo Life on Octopath II](https://www.nintendolife.com/news/2022/10/octopath-traveler-ii-devs-aimed-to-make-its-hd-2d-visuals-picture-perfect),
  [Wikipedia: HD-2D](https://en.wikipedia.org/wiki/HD-2D).
- Performance: [Digital Foundry's 2018 analysis, as reported](https://www.nintendolife.com/news/2018/07/video_octopath_traveler_earns_digital_foundryrs_respect_for_blending_old_with_new),
  [Switch GPU figures](https://www.gpu-monkey.com/en/benchmark-nvidia_tegra_x1_maxwell__nintendo_switch_gpu-fp32),
  [A17 Pro against the Switch](https://www.cpu-monkey.com/en/compare_cpu-nintendo_switch-vs-apple_a17_pro) (third-party
  databases; theoretical peaks).
- The web platform: [gpuweb implementation status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status),
  [Safari 26 ships WebGPU](https://app.cinevva.com/news/2025-09-15-safari-webgpu),
  [three.js in 2026, r183–r187](https://www.utsubo.com/blog/threejs-2026-what-changed),
  [three.js releases](https://github.com/mrdoob/three.js/releases),
  [Apple forums on browser memory](https://developer.apple.com/forums/thread/741624),
  [WebKit bug 300782](https://bugs.webkit.org/show_bug.cgi?id=300782).
- Technique: [an HD-2D pipeline on DX12](https://dev.to/gaurav_de/creating-an-hd-2d-rendering-pipeline-on-dx12-205k)
  (deferred sprites, normal maps, silhouette shadows, contact shadows, bokeh, ACES),
  [pixel-art normal maps from outlines](https://www.spritecook.ai/blog/pixel-art-normal-maps-from-outline),
  [normal-map generation for pixel art](https://arxiv.org/pdf/2212.09692).
- Assets and licences: [Unity: Asset Store assets in other engines](https://support.unity.com/hc/en-us/articles/34387186019988-Can-I-use-assets-from-the-Asset-Store-with-other-engines),
  [Asset Store terms](https://unity.com/legal/as-terms), [free 3D sources and licences](https://app.cinevva.com/guides/sketchfab-polyhaven-kenney),
  [itch.io pixel-art packs](https://itch.io/game-assets/tag-asset-pack/tag-pixel-art).
