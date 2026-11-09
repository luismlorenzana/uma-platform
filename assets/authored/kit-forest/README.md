# Q7 forest kit

37 original full-colour assets, authored with the built-in imagegen tool to uma-quest's
[kit contract](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/kits.md), following P97.
No Uma or other original-game art was used as input. `prompts.json` records each prompt, original reference master,
source SHA-256 and call duration: 37 successful calls, 3,037.301 seconds summed (calls overlap).

`config.json` pins the selected masters and ground contacts. The exporter crops and uniformly fits cutouts, retains
antialiasing and clears unused transparent RGB. Texture export resamples to the contract's cells, blends opposing
edge bands, and makes variants share their role's authored border. It never draws replacement artwork or mirrors it.
Floors have weights 4:2:2:1. Props declare collision, foot anchors and the lantern, spring and waystone lights.

```sh
pnpm art:kits kit-forest
pnpm art:kits:previews kit-forest
pnpm --filter @uma-platform/authored-art test
```

The repeat test checks the shipped atlas byte for byte, every ordered floor/wall/riser pair's seams, transparent
cutout margins, ground contacts, 2px atlas separation and all 24 previously published art files.

Open [the review](review/index.html) for light/dark sheets, native/2× assembled rooms, the scale stand-in and battle
set. Room captures use uma-quest's actual `roomGeometry` and `buildWorld`, with three additional tree placements;
only the atlas export and asset sheets are deterministic. The runtime package contains `atlas.png` and `atlas.json`,
not these masters or review sheets. uma-quest's consuming packet owns pinning the release and in-game acceptance.

The owner approved this kit for uma-art publication on 2026-11-08: “Approve the forest kit”.
`qa.json` binds that approval to the runtime atlas hashes and records parser/builder evidence.
