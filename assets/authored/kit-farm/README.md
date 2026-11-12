# F9 kit-farm (wave 1)

87 original full-colour frames for uma-farm's HD-2D farm, drawn by deterministic code in
[`scripts/kit-art`](../../../scripts/kit-art) (P147, uma-farm D66) to the
[kit-farm contract](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/kit-farm.md) (KF1–KF14) and
uma-quest's [kit format](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/kits.md). **The code is the
master** (P97): no painted sources, no image generation, no Uma or other original-game art as input.

```sh
pnpm art:kit-farm                                  # packages/art/kit-farm/atlas.png and atlas.json
pnpm --filter @uma-platform/kit-art review         # the sheets below
pnpm --filter @uma-platform/kit-art review:band    # opens a page that renders the sample band through uma-stage and saves it here
pnpm --filter @uma-platform/kit-art test
```

- **Ground (17):** grass, path, tilled, forest floor, water and paving floors that meet in any variant order (a shared
  edge band, each variant's own interior), and grass and bank risers whose top 16 texels are the lip.
- **Buildings (20):** the `plank` and `plaster` sets (walls, windows, a door each, the plank set's two-column door and
  the Shop's glazed door) and the `red`, `thatch`, `shingle` and `slate` roofs; every piece names its `set`.
- **Props (35):** trees, the Fields' and Fishery's pieces, the stations' pieces, the yard's stock, the Gate, fences,
  the stall and porch, the overgrown lot's weeds and brambles, decorations and the lantern (`light`). The mounted
  pieces (`mill-sails`, `chimney`, `flower-box`) are role `sign`, fixed at their `foot` (the sails at their hub, the
  box at its top).
- **Crops (15):** `crop-sprout`, `crop-growing`, `crop-withered` and the twelve ripe families (KF6).

The atlas keeps 2 texels between frames; floors, risers and building pieces have their edge texels copied one texel
into that gap, so a kit the stage scales down (fit-to-width on a 2× phone) never shows seams. The tests check every name,
role, size, set, foot, blocking and light against the contract and uma-stage's `parseKitAtlas`; every pixel of the shipped
atlas against the code; seams between every ordered pair of variants; clear prop margins (fences' rails run edge to
edge); and every earlier uma-art file byte for byte.

[The review](review/index.html): the sample band rendered by uma-stage's `BandStage`, the stand-in farm on a 2× phone by
day and night, the scale sheet with uma-quest's stand-in traveler, the crop families, the floors tiled in mixed order,
and every frame on light and dark. **The owner approves the look** (KF13).
