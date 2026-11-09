# Q15 Warrior town kit

32 original full-colour assets for uma-quest's stone-and-timber Warrior town, following P97 and its
[kit contract](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/kits.md).
Built-in imagegen authored 33 masters in 3,455.030 summed seconds (calls overlap): 32 first passes and one door
correction. `door-v1.png` is retained as unused provenance; `door-v2.png` is the selected full-height door column.
Only original forest and town art was used as reference. No Uma art was input or output. `prompts.json` records
each prompt, reference, hash, selection and measured duration.

`config.json` pins the selected masters, frames and ground contacts. Cutouts fit uniformly and retain antialiasing;
unused transparent RGB is cleared. Full-surface fitting preserves facade framing, the risers' 16-texel kerb and
the stairs' four tread bands. Shared authored edge bands join all floor variants, walls, risers, roofs and the
building/window modules. Floors have weights 4:2:2:1. Props declare collision; the lantern has a warm radius-4
flickering light. Signs have bottom-middle anchors and compact 128×112 cells to sit below a one-storey eave.

```sh
pnpm art:kits kit-town-warrior
pnpm art:kits:previews kit-town-warrior
pnpm --filter @uma-platform/authored-art test
```

[The review](review/index.html) has native/2× light/dark asset sheets, a mixed floor, and one- and two-storey
buildings in a town assembled by Quest's actual `townGeometry` and `buildWorld`. Three original stand-ins show
scale. The Q5 test town maps its old `stall` and `flowers` stand-in names to this packet's `stall-1` and
`flower-box`, and adds five prop placements. The consumer must make that same name mapping when pinning.
Only the atlas and asset sheets are deterministic; the room captures are GPU-rendered acceptance evidence.

The repeat checks cover both kits, every shared edge pair, transparent margins, feet, sign anchors and 2px atlas
gaps. All 26 files published through uma-art 2.23.0 stay byte-identical. The package ships only the runtime atlas;
masters and reviews stay in the repo. Quest's game session owns the consumer pin and in-game acceptance.

The owner approved the full review for publication on 2026-11-08: “Approve the Warrior town kit”.
`qa.json` binds that approval to the runtime atlas hashes and records parser/builder evidence.
