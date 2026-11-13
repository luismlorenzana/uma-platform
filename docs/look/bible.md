# The look bible (v0): what the owner's references say

> **Status: 2026-11-13, v0 (P158), from LK0's first 12 references.** The owner chose 12 frames from Square Enix's HD-2D
> games: towns and a market by day, a port, a battle, a castle under a grade, and night streets and interiors. They are
> private (`content/authoring/look/refs/`, tagged in `references.json`, never in git). This page turns them into the
> target LK1 builds to: what each layer of the look does, and the ranges the look measures (LR12) read off them. The
> research is [hd2d-quality.md](hd2d-quality.md); the visual page is
> [previews/hd2d-quality.html](previews/hd2d-quality.html#bible); the private side-by-side is
> `content/authoring/look/board.html` (`pnpm look:measure -- <captures>` rebuilds it).

## The references

| Id | Scene | Light | What it shows |
|---|---|---|---|
| ref-01 | Town square | Day | A colosseum before a cobbled square: high perspective view, a market stall, statues, torches, a blurred roof in the foreground |
| ref-02 | Market | Day | A flower market under bunting: dense set dressing, heavy blur front and back, petals in the air |
| ref-03 | Terraced town | Day | Stairs and balustrades, teal roofs, light shafts from the right, haze |
| ref-04 | Village | Day | A shop beside terraced fields, soft overcast light, a dialogue box, a blurred roof in front |
| ref-05 | Port | Day | A galleon at a pier: sparkling water with bokeh, warm sun, deep shade under the boards |
| ref-06 | Battle | Day | A desert battle: big foes left, the party right, sun haze, layered rock behind |
| ref-07 | Castle | Graded | A castle under a heavy warm monochrome grade: the grade as storytelling |
| ref-08 | Throne room | Night | Candelabras, light shafts through tall windows, cool shadow and warm pools |
| ref-09 | Street | Night, rain | Wet cobbles with glints, lamps, a cool blue ambient, a dialogue box |
| ref-10 | Cliff village | Night | Torches and embers on dark timber, autumn foliage |
| ref-11 | Tavern | Night | Hanging lamps, gilded pillars, a patterned floor, a crowd |
| ref-12 | Desert town | Day | Stepped blocks, stairs and awnings from a tactical height, markers over units |

## The look, layer by layer

**1. Camera and framing.** A perspective camera, high (about 40–60° down; the tactical view higher), with a narrow field
of view: verticals converge only a little. The frame is built in three depths: a **foreground occluder** deliberately in
shot and blurred (roofs in ref-01 and ref-04, flowers in ref-02, an awning in ref-05), a **sharp middle** where the
characters stand, and a **soft background**. Characters are small, about a tenth of the frame's height.

**2. One pixel scale.** Everything shows the same chunky pixel grid: textures and sprites alike, about 3–5 screen pixels
a texel at 1080p. Characters are pixel art about 30 texels tall; bricks, cobbles, roof tiles and leaves are drawn at the
same scale, with 1-texel highlights on edges and dithered shading. Nothing is smooth at a different density.

**3. Volume.** Buildings are real 3D: a curved colosseum wall, roofs with thickness and overhang, stairs and balustrades
(ref-03), stepped cliffs (ref-07, ref-12). Trees, bushes and flower beds are 2.5D clusters of pixel cards. Ground
materials meet at kerbs and edging stones, never at a hard tile seam.

**4. Light by day.** One warm key light from high to the side; every object, character and statue casts a shadow on
the ground; creases and wall bases are darker (ambient occlusion); shadows go cool, highlights warm (ref-01, ref-02:
warm-over-cool +15 to +24). Light shafts and haze in the distance (ref-03).

**5. Light by night and inside.** A dark base (mean lightness 26–33) broken by warm pools from candles, lamps and
torches, each with a soft glow; a cool blue or teal ambient; shafts through windows (ref-08); glints on wet stone
(ref-09). The contrast is temperature as much as brightness.

**6. Colour and grade.** Saturated focal props (banners, flowers, fruit, carpets) against a more muted setting; a strong
vignette (edges about two-thirds as bright as the middle); a per-scene grade, as far as a full sepia for a story beat
(ref-07) or a dusty haze in battle (ref-06). Rich palettes: a frame needs about 200 four-bit colours to cover 90% of it.

**7. Focus.** Depth of field is always on: about 40% of every frame is soft, the middle band is about twice as sharp as
the top and bottom (the miniature look), and bright points turn into bokeh discs (ref-05's water).

**8. Set dressing.** Dense and lived in: stalls, crates, barrels, sacks, flowers, banners, bunting, benches, lamps,
statues, clustered rather than gridded. An empty tile is rare in a town.

**9. Atmosphere and motion.** Petals, embers, dust and leaves in the air; haze between depths; flickering fire; water
that sparkles. The frame is never still.

**10. The interface.** Few elements: a parchment dialogue box with a speech tail and a small name tab; a translucent
battle HUD. The world carries the frame.

## The target, measured

The look measures (LR12, `scripts/look`) on all 12 references, at 640 px wide, and on four of our review captures. Our
review captures include padding and blank bands that a game frame wouldn't, so their shadow, vignette and focus numbers
are rough; LK1 measures real game frames.

| Measure | References: min – median – max | Forest kit | Warrior town kit | Mage town kit (code) | Farm kit (phone) |
|---|---|---|---|---|---|
| Lightness range, p5–p95 (contrast) | 58 – **76** – 99 | **33** (below) | **37** (below) | 74 | **58** (below) |
| Palette, 4-bit colours for 90% | 82 – **214** – 431 | **45** (below) | **38** (below) | **29** (below) | 86 |
| Warm light over cool shadow (b*) | −4 – **10** – 24 | 32 (above) | 19 | 23 | **−19** (below) |
| Mean lightness | 23 – **33** – 58 | 31 | 32 | 54 | 50 |
| Chroma, mean | 10 – **23** – 37 | 22 | 16 | 19 | 26 |
| Blurred share | 0.08 – **0.43** – 0.82 | 0.27 | 0.51 | 0.34 | 0.61 |
| Focus band (middle over outer) | 0.8 – **2.0** – 3.4 | 1.3 | 1.6 | 6.6 (above) | 7.3 (above) |
| Vignette (edge over middle) | 0.37 – **0.66** – 1.22 | 0.54 | 0.50 | 0.83 | 1.20 |

**What the numbers say:** our frames are flat (half the references' contrast) and poor in colour (a fifth of their
palette), the two robust signals; the farm's light runs cold where the references run warm. The references' numbers
become LK1's acceptance ranges: contrast 60–99, palette 100 or more, warm-over-cool 0–24, a vignette under 0.9 and a
focus band of 1.5–3.5 on a town by day.

## What it means for LK1

| Layer | LK1 builds |
|---|---|
| Camera | Perspective, 40–55° down, a narrow field of view; a foreground occluder and a background layer in every hero shot |
| Pixel scale | One texel size for the frame: sprites and environment textures at the references' density, the 3D scene rendered low and upscaled |
| **Characters** | **A finding:** our Uma sprites stand about 210 texels tall and are painted smooth; the references' are about 30-texel pixel art. One scale is the look's first rule, so LK1 shows our sets beside a pixel pass of them (about 48–64 texels tall, a reduced palette, done by a tool from the approved sets, not redrawn) for the owner to choose |
| Volume | Buildings as 3D pieces with roofs and trims; trees, bushes and flowers as 2.5D clusters; edging between ground materials |
| Light | A warm key with silhouette shadows, ambient occlusion, cool shadows; night scenes with warm pools, glows and a cool ambient |
| Grade | Tone mapping, a per-scene LUT, a vignette, saturated focal props |
| Focus | Depth of field by depth with bokeh, the middle band sharp |
| Life | Particles, haze, flicker, a water surface; dense set dressing |
| Hero scene | **A town square by day** (ref-01, ref-02, ref-04 as targets) **with a tavern interior at night** (ref-11): the default, the owner may change it |
