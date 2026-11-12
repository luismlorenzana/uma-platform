# ST2 — `uma-stage` 0.2.0: the farm's openings, opt-in

**uma-platform `packages/stage` · Claude · L · Needs: ST1 shipped and the owner's go after checking it · Unblocks:
uma-farm's F11 · From uma-farm's
[F57](https://github.com/luismlorenzana/uma-farm/blob/main/docs/handoff/tasks/F57-uma-stage.md), release 2**

## Why

The farm's stage differs from uma-quest's: portrait and unturned, a farm kit and design, taps, walkers and standees, a
cap on live sprite sets, and the seasons as light. Each arrives as an **option** of the shared package, so uma-quest's
scenes don't change (no forks).

## Context (read first)

- F57's asks 4–13 and its "Done when"; uma-farm's [kit-farm.md](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/kit-farm.md)
  (KF1–KF14, the kit contract) and [hd2d-farm.md](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/hd2d-farm.md)
  (FR3–FR14).
- ST1's package as shipped, and uma-kit's `KitStage` (`layout: 'portrait'`).

## Decisions made

1. **Everything is opt-in:** a game that passes no new option gets 0.1.0's behaviour. uma-quest pins 0.2.0 with no code
   change and plays as before.
2. **The openings, one test each** (F57's asks): a portrait unturned layout read from `KitStage`'s `layout`; the kit
   format's third kind `farm` with its `KIT_REQUIRED` (kit-farm.md §6 wave 1), a `set` on building pieces, `door`
   frames 128 or 256 wide, mounted `sign` pieces placed by the design; `parseFarmDesign` (up to 9 × 48 tiles with
   heights, buildings with `walls`, `roof`, `storeys`, `door` and `mounts`, props, markers `place`, `slot`, `gate`,
   `path`, `lot`); a vertical-pan camera that glides and settles on a band, pixel-snapped; tap picking on either layout;
   grid path-finding walkers at a walk or a run; standees for outfits with no sprite set; a cap of 8 live sprite sets,
   nearest the camera first; a live colour grade and light the game sets per scene.
3. **The review sample:** a portrait stand-in farm band from a stand-in `farm` kit, with a building from sets, a mounted
   piece, a two-column door, a tap that picks a slot, a standee walking a path, and a second season's grade, viewed at
   phone width. uma-quest's test room is unchanged.
4. **Lean:** the new parts stay in the lazy stage chunk; uma-farm's main JS stays ≤ 180 KB gzip.

## Do

1. Build the openings with their tests and the sample; update the README (options, the two layouts, the formats).
2. Release 0.2.0 (changeset `minor`), read it back, pin uma-quest (unchanged behaviour, its checks and test room).
3. Log the P-decision; message uma-farm's main session with the version and the new options; check back with the owner.

## Done when

F57's "Done when" for release 2 holds: every opening tested, the sample shows its six things, uma-quest unchanged on
0.2.0, uma-rpg and uma-racer untouched.
