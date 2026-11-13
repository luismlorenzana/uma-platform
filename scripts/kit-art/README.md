# kit-art: HD-2D kits drawn in code

Claude's full-colour kits for the Uma games' HD-2D stage (P147): a small deterministic painter and the drawings it makes,
exported as uma-art families. **The code is the master** (P97): no painted sources, no image generation, no Uma art.

| Kit | For | Frames | Decision |
|---|---|---|---|
| `kit-farm` | uma-farm F9, wave 1 | 87 | P148 |
| `kit-town-spellblade`, `-mage`, `-summoner`, `-healer` | uma-quest Q32 | 32 each, the Warrior town kit's | P151 |
| `kit-meadow`, `kit-ruins`, `kit-marsh`, `kit-coast` | uma-quest Q33 | 29 each, the forest kit's roles | P151 |

```sh
pnpm art:kit-farm                                  # packages/art/kit-farm
pnpm art:code-kits                                 # every kit
pnpm --filter @uma-platform/kit-art review         # kit-farm's sheets
pnpm --filter @uma-platform/kit-art review:kits    # the town and biome kits' sheets and pages
pnpm --filter @uma-platform/kit-art review:band    # a page that renders kit-farm's band through BandStage and saves it
pnpm --filter @uma-platform/kit-art review:scenes  # a page that renders each town and biome through StageEngine and saves it
pnpm --filter @uma-platform/kit-art test
```

- `src/paint.ts`: a float canvas filling signed-distance shapes with antialiased edges, in layers (`over`, `atop`,
  `multiply`, `screen`); `src/noise.ts`: seeded tileable value noise and Worley cells; `src/form.ts`: form shading lit
  from the top front-left, foliage, wood, leaves, fruit.
- `src/common/surfaces.ts`: floors whose variants share their edge band, flagstones, stone courses, boards, walls,
  risers with their 16-texel lip, stairs, roofs and water.
- `src/farm/`, `src/town/` (one drawing set, four region styles), `src/biome/` (four biomes and their fight sets).
- `src/atlas.ts` packs a kit tallest first, 2 texels apart, extruding tiling pieces one texel into the gap;
  `src/png.ts` writes kit-farm plainly (its bytes are frozen) and later kits with row filters (uma-quest's 3 MB budget).

The tests check every kit against its contract and uma-stage's `parseKitAtlas`, every shipped pixel against the code,
seams between every pair of variants that can meet, clear prop margins, page size, and every earlier uma-art file.
