---
"@luismlorenzana/uma-stage": patch
---

The farm's stand-in kit moves into its own module (`standInFarmAtlas`, `drawStandInFarm`, `standInFarmKit`), so a game
that never draws a farm doesn't carry it: uma-quest's stage chunk is +0.66 KB gzip over 0.1.0 instead of +4.04.
`standInKitAtlas` and `standInKit` take `'biome' | 'town'` again, as in 0.1.0; `pixelTexture` is exported.
