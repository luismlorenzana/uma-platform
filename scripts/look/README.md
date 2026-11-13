# The look measures

`pnpm look:measure -- <capture> …` (P157 LR12, P158): numbers that flag a flat, evenly lit, uniformly sharp frame,
read against the owner's private references. It measures every reference in `content/authoring/look/references.json`
and each capture given, at 640 px wide, and writes `content/authoring/look/measures.json` and the private side-by-side
`content/authoring/look/board.html` (the references are copyrighted frames: never in git).

| Measure | What it reads |
|---|---|
| Lightness mean, range | CIELAB L*: the frame's brightness and its p5–p95 contrast |
| Deep shadow, highlight share | The frame under L* 25 and over L* 85 |
| Chroma | Colourfulness, mean and 90th percentile |
| Warm light over cool shadow | b* of the brightest quarter minus the darkest quarter |
| Vignette | The outer tenth's lightness over the middle half's |
| Blurred share, focus band | Laplacian sharpness in 16 px blocks: the soft share, and the middle third against the top and bottom |
| Palette | 4-bit colours covering 90% of the frame |

They are proxies, not taste: the owner's eye against the references decides (LR13). The look bible
([docs/look/bible.md](../../docs/look/bible.md)) records the references' ranges.
