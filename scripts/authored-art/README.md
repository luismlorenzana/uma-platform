# Export authored original art

`pnpm art:props` regenerates the `held` and `emote` uma-art families from the committed original masters in
`assets/authored`. The pixel families still use `pnpm art:draw`, independently.

The config pins each source SHA-256, source grip/tail anchor, target anchor, display scale and drawn-bow nock.
The exporter uses one uniform fit, Lanczos3 sampling and transparent padding into 128px held cells or 64px emote
cells. It keeps legitimate thin strings and antialiased edges. Pixels below alpha 8 become transparent black;
there is no palette reduction, opaque-background removal, mirror or hand repainting.

Output: `packages/art/{held,emote}/atlas.{png,json}`. Metadata is local to each cell. Normal weapons attach their
grip at the frame's grip and angle; tomes use the other hand where present, upright at 0.55 scale. The drawn bow's
grip/nock pair maps to the two hands with a positive-determinant transform. `tools/studio/src/held-placement.ts`
provides the same transform for the viewer and attachment verification.

`pnpm --filter @uma-platform/authored-art run previews` writes props-only native/2× sheets on three backdrops.
Tests rebuild both runtime families byte for byte, validate counts/cells/anchors and freeze all 20 older atlas and
compact-stage files against the published 2.21 baseline. Only original art is read by these tests.
