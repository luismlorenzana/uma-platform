# KL1 — uma-kit's landscape layout (a "Both apps" change)

**uma-platform, `packages/kit` · Claude · M · Needs: uma-quest's Q4 request ✓ · Unblocks: uma-quest's Phase 5 menus
(party, quest log, shop, inn)**

## Why

uma-quest draws on a turned landscape stage. uma-kit's sheets, safe areas, heights, drags and frame assume an upright
viewport, so its screens break there (the [request](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/kl1-request.md),
uma-quest D14). This packet makes the kit live inside a stage, as an opt-in kit minor, so uma-rpg's and uma-racer's
portrait screens don't change (NA6, R8, N4).

## Context (read first)

- The request: what broke (six pieces) and what's asked (seven points).
- uma-quest's stage as built: [stage.md](https://github.com/luismlorenzana/uma-quest/blob/main/docs/game/stage.md) and
  `apps/web/src/stage/turn.ts` (viewport (x, y) is stage (y, viewport width − x); insets as `--inset-*` on the box).
- The [change protocol](../../change-protocol.md); the kit's [README](../../../packages/kit/README.md).
- `packages/kit/src/ui/BottomSheet.tsx`, `src/shell/` (`AppFrame`, `AccountBar`, `BottomBar`, `PeekPanel`,
  `PlaceMenu`), `theme.css`'s `*-safe` utilities, `src/places/UpdateNotice.tsx`.

## Decisions made

- **`KitStage`** (`/ui`): an element the game puts inside its stage box. It fills the box, is a size container
  (`container-type: size`), holds the layer sheets portal into, and tells every kit piece the stage's `layout`
  (`landscape` or `portrait`) and `turn` (0, 90, 180 or 270, clockwise). The game sets nothing else; without a
  `KitStage`, nothing changes.
- **Portals:** `Sheet` portals into the stage's layer, falling back to `document.body` outside a stage.
- **Safe areas:** `pt-safe`, `pb-safe`, `pb-bar-safe` and `mb-bar-safe` read `var(--inset-*, env(safe-area-inset-*))`,
  with new `pl-safe` and `pr-safe`, and `UpdateNotice` does the same. A game that never sets the variables keeps
  `env()`.
- **Heights:** inside a stage, sheets size by the stage (`cqh`), not the viewport (`dvh`).
- **Drags:** inside a stage, the sheet's drag to close maps pointer movement through the turn, and so does the side
  panel's swipe. Outside, Motion's drag is untouched.
- **Landscape sheet:** from the right edge, the stage's full height, `min(26rem, 62cqw)` wide, the grab handle on its
  left edge, a drag or swipe to the right closing it; the same header, footer, Escape and close button.
- **Landscape frame:** `AppFrame` lays `top` out as a left rail and `bottom` as a right rail, so a game passes the same
  bars. `AccountBar` becomes the account rail (initial, chips, sync), with the Menu at its foot when given its new
  optional `menu`. `BottomBar` becomes the action rail (its tabs, Play raised toward the stage). The menu lives on the
  left rail in landscape, as asked. 44 pt targets throughout.
- **Unchanged:** portrait markup proven identical by snapshots of `AppFrame`, `AccountBar`, `BottomBar`, `BottomSheet`,
  `PeekPanel` and `PlaceMenu` taken before the change, plus uma-rpg's and uma-racer's own checks on the packed kit.
- **The review page:** an interactive page built from the kit itself: a phone held upright with the turned stage, the
  same stage upright, and the portrait frame for comparison. The sheet can be dragged on the turned stage.
- **Release:** uma-kit 0.18.0, a minor. uma-quest pins and adopts it in its Phase 5 packet. uma-rpg (frozen, D308) and
  uma-racer see no change and needn't pin it now.

## Do

1. Snapshot today's portrait markup of the six pieces (`legacy-kl1-*.html`), before any change.
2. `KitStage`, `useKitStage` and the pure `toStageDelta`; the theme's utilities; the six pieces; tests.
3. The review page; the kit README's "Landscape" section.
4. Pack the kit, install it in uma-rpg and uma-racer in temporary worktrees, run their checks and look at their dev
   servers at phone width.
5. A changeset, `pnpm version-packages`, push, watch the release.
6. Tell uma-quest's session the version and how to adopt it.

## Done when

- uma-kit 0.18.0 is published with the stage, the landscape sheet and frame, and the review page.
- The portrait snapshots match; uma-rpg's and uma-racer's checks pass on the new kit.
- uma-quest is told, and its adoption packet can pin 0.18.0.

## Deliver

Commit to `main` (`feat(kit): …`), a P-decision, the handoff's KL1 row Done with the version, the new-apps brief updated,
and this packet deleted.
