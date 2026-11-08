# Uma sprites: the format (v1)

> **Status: 2026-11-07, the format every Uma sprite set is drawn, checked and published to (P91).** It is ChatGPT's
> experimental work as built, written down as the rule: H168's baseline in uma-rpg, the five-Uma batch and art set
> version 2, all private in `content/`. It replaces uma-rpg's
> [animation-spec.md](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/design/sprites/animation-spec.md)
> wherever the two differ (§14 lists each change), and it adds what uma-quest's planned work still needs: the field
> facings, `weary`, the emotes and the rival add-on. How a set moves from the roster to a release is
> [pipeline.md](pipeline.md). Visual page: [previews/pipeline.html](previews/pipeline.html).
>
> No names appear here: outfits are named by their stable ids, and names come from master data at run time.

## 1. What a sprite set is

A **sprite set** is one outfit's animation art at one **revision**. A **profile** says which actions a set must have.

| Profile | Who | Actions | Body frames | Face patches |
|---|---|---|---|---|
| **Traveler** | The 100 selected outfits (tiers SS, A1, A2) | Battle set, field set, `weary`, emotes | **118** | 7 |
| **Townsfolk** | One outfit for each of the 70 other characters | Key, turnaround, walk in four facings, emotes | **45** | 2 (blinks) |
| **Rival add-on** | A traveler who appears as a boss | Her fight actions facing right | **≈25** | — |

A set is **complete** when every action in its profile is drawn and passes every check (§11). Approval is separate: the
owner approves it in the Studio ([pipeline.md](pipeline.md) §4).

## 2. The cell

- **Working texture: 256 × 256 px a frame,** full colour, with a transparent background.
- **Logical cell: 64.** Games lay a frame out as a 64-unit cell. Four texels make one logical unit.
- **The foot point is (128, 240).** Every frame is placed by it, and a standing Uma's feet rest on row 240 in every frame
  not marked `air`. Rows 241–255 stay empty.
- **A clear border:** no opaque pixel in the outermost row or column.
- **Standing height:** about 208 px, ears and shoes included. A wide fallen pose may be scaled down to fit inside
  248 px. Standing poses keep the key frame's scale.
- **On the iPhone (DPR 3), one texel is one device pixel.** A cell draws at 85⅓ pt and a standing Uma at about 69 pt.
  The game never scales a sprite by a fraction. Depth comes from the scene's depth of field, not from shrinking sprites
  (uma-rpg HD4).

## 3. Facings

| Facing | Used for | Drawn as |
|---|---|---|
| **Battle** (three-quarter, turned to image-left) | Every fight action, walking left in the field, the key frame | The battle set |
| **Front** (toward the camera) | Walking down the screen, emotes, a speaker turned to the camera | The field set and the emotes |
| **Back** (away from the camera) | Walking up the screen | The field set |
| **Right** (three-quarter, turned to image-right) | Walking right; a rival on the foes' side | The field set and the rival add-on |

**Nothing is ever mirrored** (uma-rpg SA3, uma-quest DN25). Ornaments, parts and bows sit on one side, so every facing
is drawn. The four turnaround stills (front, back, left, right) are the reference for every facing, and they also serve
as the field's standing poses.

## 4. Layers

From back to front:

| # | Layer | Drawn by |
|---|---|---|
| 1 | Shadow | The game (a soft blob, or a cast shadow in a lit scene) |
| 2 | Held item behind, on frames where `hold` is `back` | Prop art (§9) |
| 3 | **Body** | The set: the frame itself, with the face as drawn |
| 4 | **Face patch**, on locked frames only (§5) | The set |
| 5 | Held item in front, on frames where `hold` is `front` | Prop art |
| 6 | **Hand crop:** the body's own pixels in the frame's `handOcclusion` box (14 × 14), drawn again over the handle so the item sits inside her fist | The set (a region of the body) |
| 7 | Effects: impacts, spells, light, damage numbers, emote bubbles | The game, with uma-art |

A body frame never contains a held item, a shadow, a floor, a glow or an effect.

## 5. Faces

- **The key frame is `idle` frame 0.** The atlas records its **head box** (head, ears and front hair) and its
  **face box** (both eyes and the mouth) in texels.
- **Face-only lock.** On a **locked** frame, the pixels inside the face box are the key's exactly, at the frame's
  `headOffset`. Hair, ears and ornaments outside it keep that pose's own drawing. This replaces the whole-head lock of
  uma-rpg SA5/SA6: stamping the whole head doubled a veil, and hands and hair need the head box's margins.
- **Locked frames in the battle set:** `idle`, `run`, `walk`, `cast`, `guard`, `thrust` and `shoot`, 35 frames, plus
  `weary`'s 4. Every other frame is **free** and keeps its own drawn face. The game never stamps a patch on a free frame.
- **Seven patches,** each a full copy of the face box drawn on the key's face, with its own alignment:

| Patch | Looks like | The game shows it for |
|---|---|---|
| (none) | The face as drawn | Default |
| `blink-half` | Lids half down | Blinks |
| `blink-closed` | Lids shut | Blinks |
| `focus` | Narrowed eyes, mouth set | Attacks, casts, guard, running |
| `pain` | Strained eyes, mouth open | Hurt (on a frame whose face is locked) |
| `joy` | Happy arcs, open smile | Victory (when it ends locked) |
| `shout` | Eyes wide, mouth open | Limit Break (when it ends locked) |
| `weary` | Heavy lids, mouth slack | `weary` idle (new) |

- **The game runs the blinks** (uma-rpg SA8): every 2.4–5 s at random, half for 60 ms, closed for 100 ms, half for
  60 ms, one blink in seven doubled. Blinks show only on locked frames with no other patch, in the battle facing.
- **The face definition of art set version 2 is the bar:** shaped lids and lashes, distinct whites, shaded irises,
  darker pupils and their own highlights, and mouths drawn as clear curves.
- **Other facings carry no patches** in v1. Front, back and right frames keep their drawn faces, and the game doesn't
  blink them. A front-facing patch set waits until a scene needs one.
- **Townsfolk carry only the two blink patches**, on their battle-facing walk and still.

## 6. Per-frame fields and events

Every frame in the atlas has the fields below. Positions are in texels inside the 256 cell.

| Field | On | What it is |
|---|---|---|
| `file` | Every frame | Its PNG in the revision folder (authoring) or its page rectangle (release) |
| `ms` | Timed frames | Its time at 1×. Turnaround stills have none |
| `headLocked` | Every frame | True on a locked frame (§5) |
| `headOffset` {x, y} | Locked frames | How far the key's face box moves in this frame. The patch goes there too |
| `grip` {x, y, angle} | Frames that show a held item | Her front hand's grip, and the item's direction: 0 points image-left, 90 up, 180 back, 270 down |
| `off` {x, y} | Frames that show a tome, a bow string or an off hand | Her other hand |
| `cast` {x, y} | `cast`, `limit` and the casting part of an act | Where her spell starts |
| `hold` | Every frame | `front`, `back` or `none`: where the held item draws |
| `air` | Every frame | True where her feet leave row 240 (run flight phases, `hop` 1, `surprise` 1) |
| `hit` {x, y} | Every frame | Where blows aimed at her land |
| `bounds` | Every frame | The opaque rectangle: left, right, top, bottom, width, height |
| `handOcclusion` {x, y, w, h} | Frames with a grip | The 14 × 14 hand crop (layer 6) |
| `view` | Turnaround stills | `front`, `back`, `left` or `right` |

**Events,** frame indices from 0 (uma-rpg SA10):
- `impact`: the frame her hit lands, where the game shows the impact and the damage number;
- `release`: the frame an arrow, spell or Limit Break leaves her;
- `hold` [from, to]: frames the game loops while it waits (a spell charging, a guard held, lying down, a pose held);
- `repeat` [from, to]: frames replayed once for each extra hit in one act.

## 7. The catalog

Times are milliseconds at 1×. The game scales them for 1×, 2× and 4× and for Skip.

### 7.1 The battle set: built, 14 entries, 62 frames

| Action | Frames | Times | Plays | Face | Held | Events |
|---|---|---|---|---|---|---|
| `idle` | 4 | 220 · 180 · 220 · 180 | Loop | Locked, blinks | `back` | — |
| `run` | 6 | 75 each | Loop | Locked, `focus` | `back` | Flight phases `air` |
| `walk` | 6 | 110 each | Loop | Locked, blinks | `back` | — |
| `hop` | 2 | 90 · 160 | Once | Free | `back` | Frame 1 `air` |
| `swing` | 6 | 160 · 90 · 60 · 140 · 120 · 160 | Once | Free | `back` → `front` | `impact` 3, `repeat` [2, 3] |
| `thrust` | 5 | 150 · 80 · 140 · 120 · 150 | Once | Locked, `focus` | `front` | `impact` 2, `repeat` [1, 2] |
| `shoot` | 5 | 150 · 200 · 60 · 120 · 150 | Once | Locked, `focus` | `front` | `release` 2 |
| `cast` | 6 | 140 · 140 · 160 · 160 · 90 · 180 | Once | Locked, `focus` | `front` | `hold` [2, 3], `release` 4 |
| `guard` | 3 | 120 · 400 · 140 | Once | Locked, `focus` | `front` | `hold` [1, 1] |
| `hurt` | 2 | 90 · 200 | Once | Free, own pain face | `none` | — |
| `down` | 3 | 120 · 140 · 600 | Once | Free, eyes shut | `none` | `hold` [2, 2]. Played backwards, it's a revive |
| `victory` | 6 | 140 · 140 · 160 · 160 · 400 · 400 | Once | Free, turns toward the viewer | `front` | `hold` [4, 5] |
| `limit` | 4 | 160 · 160 · 90 · 500 | Once | Free | `front` | `release` 2, `hold` [3, 3] |
| `turnaround` | 4 stills | — | — | Own faces | `none` | `view` per still |

**Reuse is allowed and recorded:** `idle`'s breathing may be a small rig of the key, `swing`'s two high phases may
share one correctly raised arm at two weapon angles, and `guard`'s recovery may be the key itself. The batch README
records every reuse.

### 7.2 The field set: new, 36 frames

| Action | Frames | Times | Plays | Face | Held |
|---|---|---|---|---|---|
| `walk-front`, `walk-back`, `walk-right` | 6 each | 110 each | Loop | Drawn | `back` (at rest, or hidden by her body facing back) |
| `run-front`, `run-back`, `run-right` | 6 each | 75 each | Loop | Drawn | `back` |

- Walking left in the field is the battle `walk` and `run`.
- **Standing in the field** is the turnaround still for that facing (left: the battle `idle`). The game may add a
  one-texel breathing bob. No new idle frames are drawn.
- Contact frames land on row 240. Run flight phases are `air`. A facing's standing height matches its turnaround still
  within 4 px (check 13).
- Dash in a dungeon (uma-quest DN26) plays `run-*`. Followers in single file (DN24) use the same actions.

### 7.3 `weary`: new, 4 frames

| Action | Frames | Times | Plays | Face | Held |
|---|---|---|---|---|---|
| `weary` | 4 | 260 · 220 · 260 · 220 | Loop | Locked, the `weary` patch | `back`, lowered |

This is the battle idle at low HP: shoulders down, slower breathing, the weapon lowered. uma-quest carries HP between
fights (DN12), so a hurt party starts its next fight weary. It was uma-rpg's "later" item (§6.3 there).

### 7.4 Emotes: new, 6 actions, 16 frames, front facing

| Action | Frames | Times | Plays | Events | For |
|---|---|---|---|---|---|
| `nod` | 3 | 120 · 160 · 120 | Once | — | Agreeing, greeting |
| `surprise` | 2 | 90 · 400 | Once | Frame 1 `air`, `hold` [1, 1] | A shock; the game adds the bubble |
| `laugh` | 3 | 140 · 140 · 140 | Loop | — | Laughing, teasing |
| `sad` | 2 | 200 · 600 | Once | `hold` [1, 1] | Head down |
| `angry` | 2 | 120 · 400 | Once | `hold` [1, 1] | Fists, a stamp |
| `wave` | 4 | 120 · 120 · 120 · 120 | Loop | — | Hello, goodbye |

- **The front facing only.** A scene turns a speaker to the camera before she emotes (uma-quest CM17's camera beats).
- **Bubbles are uma-art** and drawn by the game over her head: `!`, `?`, `…`, `♪`, a sweat drop, anger, a heart and
  `zzz`.
- **Cheering is `victory`.** Talking needs no art: the text box's portrait shows who speaks, and the game adds a small
  bob.
- No held item shows (`hold: none`).

### 7.5 The townsfolk profile: 45 frames

The key (1), `turnaround` (4), the battle `walk` (6) plus `walk-front`, `walk-back` and `walk-right` (18), and the six
emotes (16), with both blink patches. She has no fight, run or `weary` frames. Her key is a single battle-facing still:
standing, she shows it in the battle facing and the turnaround stills in the others.

### 7.6 The rival add-on: about 25 frames, facing right

For a traveler who appears as a chapter boss (uma-quest CM27): a rival stands on the foes' side, so she faces right.

| Action | Frames | Note |
|---|---|---|
| `idle-right` | 4 | Drawn faces: no patches, no blinks |
| Her weapon's action, facing right | 5–6 | `swing-right`, `thrust-right` or `shoot-right`, from her highest-level weapon |
| `cast-right` | 6 | Her skills |
| `hurt-right` | 2 | |
| `down-right` | 3 | |
| `limit-right` | 4 | |

Times and events are the battle set's. Her escorts are bestiary foes, not Umas, so only the rival herself needs the
add-on (uma-quest's Phase 4 may revise this). It's drawn only for travelers a written chapter casts as a boss.

### 7.7 The totals

| Group | Frames | Traveler | Townsfolk | Rival add-on |
|---|---|---|---|---|
| Battle set | 62 | ✓ | — | — |
| Field set | 36 | ✓ | 18 (walks only) | — |
| Key, battle `walk` and `turnaround` (townsfolk) | — | (in the battle set) | 11 | — |
| `weary` | 4 | ✓ | — | — |
| Emotes | 16 | ✓ | ✓ | — |
| Facing right | ≈25 | — | — | ✓ |
| **Total** | | **118** | **45** | **≈25** |

## 8. The key frame and the identity sheet

Every set starts with its **identity sheet**: the key frame (battle idle 0), the four turnaround stills and the
identity checklist. The owner approves it (the key gate) before anything else is drawn, and everything after is drawn
against it (uma-rpg SA18).

**The identity checklist** (`identity.md` in the revision) names:
- her ears, with any covers or ornaments, and which ear;
- her hair: colour, marks, bangs, length;
- her eye colour, and her headwear;
- every ornament, with **the side it sits on in each facing**;
- her outfit: colours, skirt, jacket, belt;
- her legwear, shoes and tail.

It is checked against the outfit's master-data portrait, bust and chibis, never against memory.

## 9. Held items

Held items are original prop art, so they're uma-art (in git, ChatGPT's), shared by every Uma.

- **Cell: 128 × 128,** transparent. Each has a `grip` point and points image-left at angle 0. The game moves the grip
  onto the frame's `grip` and rotates it by the frame's angle.
- **Tomes** draw at scale 0.55 at the frame's `off`. **A drawn bow's** nock follows `off`, and the game stretches its
  reach between the two anchors.
- **Ten kinds,** each with its action:

| Kind | Action | Art |
|---|---|---|
| Greatsword, Axe, Katana | `swing` | One each |
| Lance | `thrust` | One |
| Bow | `shoot` | Relaxed and drawn |
| Fire, Blizzard, Thunder, Light and Dark Tomes | `cast` | Closed and open, one per element's colours |

- **One look per kind** in v1. Grades show in menus, not in her hand.
- Until uma-art has them (packet UA8), the six placeholders in `content/authoring/sprites/shared/` stand in: a
  greatsword, a lance, two bows and two tomes.
- A katana's iai draw and an axe's overhead (uma-rpg §6.3) wait for a playtest that asks for them.

## 10. Style

- **Full colour,** drawn from the outfit's own master-data art, which is her identity. Party Dash and other games are
  style guides only; their frames are never copied.
- **Light from the top front-left,** with moderate shading, so a lit scene can tint her (uma-rpg HD10).
- **Clean antialiased edges** into transparency. There is no haze far from the silhouette, no glow, no shadow and no
  floor.
- **Proportions follow the key frame:** about three heads tall without the ears, at the standing height of §2.
- **No normal maps or lighting layers** in v1. A scene that needs them asks for a format change.

## 11. Checks

They run on every revision, and a failure means a fix or a redraw. The report is the revision's `verification.json`.

| # | Check |
|---|---|
| 1 | **Counts:** every action in the profile has its listed frames; every event points at a real frame |
| 2 | **Dimensions:** every frame is 256 × 256; a face patch is its face box's size |
| 3 | **Clear border:** no opaque pixel in the outer row or column |
| 4 | **Ground:** the lowest opaque row of every frame not marked `air` is 240; an `air` frame's is above it |
| 5 | **The approved stills are unchanged:** the key and turnaround match their approved hashes |
| 6 | **Face lock:** inside the face box, every locked frame matches the key exactly, at its `headOffset` |
| 7 | **Face boxes:** each sits inside its head box, and each patch inside the cell at every offset used |
| 8 | **Anchors:** every anchor is inside the cell; every `grip` and `off` has skin or glove pixels within 3 px |
| 9 | **Haze:** no faint alpha more than 3 px from the silhouette |
| 10 | **Specks:** no detached cluster of opaque pixels (alpha 128 or more) smaller than 4 texels |
| 11 | **Standing scale:** no grounded frame of `idle`, `walk`, `run`, `guard`, `cast`, `thrust` or `shoot` stands more than 4 texels taller than the key. Strides, lunges and crouches may dip lower |
| 12 | **Approved frames are kept:** a new revision's frames for already approved actions match them byte for byte |
| 13 | **Facings agree:** each field facing's standing height matches its turnaround still within 4 px |
| 14 | **Repeat:** a second export of the revision is byte for byte the same |

Checks 1–9 and 14 are what ChatGPT's `verify.cjs` runs today. Checks 10–13 are new and come with UA2; 10 and 11 were
run once by hand on batch 1 (P92).

## 12. The authoring atlas

One `atlas.json` per revision, the format version 1 that ChatGPT's sets already use, in texels:

```json
{
  "formatVersion": 1, "id": 106701, "revision": 2, "profile": "traveler", "combatType": "Healer",
  "cell": 256, "logicalCell": 64, "foot": { "x": 128, "y": 240 },
  "approvedKey": "key.png", "headLockScope": "face",
  "headBox": { "x": 80, "y": 31, "w": 96, "h": 105 }, "faceBox": { "x": 110, "y": 100, "w": 39, "h": 29 },
  "hit": { "x": 128, "y": 161 },
  "faces": { "focus": { "file": "faces/focus.png", "x": 110, "y": 100, "w": 39, "h": 29 } },
  "actions": {
    "cast": {
      "loop": false, "events": { "hold": [2, 3], "release": 4 },
      "frames": [{ "file": "frames/cast-2.png", "ms": 160, "headLocked": true, "headOffset": { "x": -1, "y": -2 },
        "grip": { "x": 90, "y": 124, "angle": 60 }, "off": { "x": 165, "y": 172 }, "cast": { "x": 90, "y": 124 },
        "hold": "front", "air": false, "hit": { "x": 128, "y": 161 },
        "bounds": { "left": 68, "right": 200, "top": 32, "bottom": 240, "width": 133, "height": 209 },
        "handOcclusion": { "x": 83, "y": 117, "w": 14, "h": 14 } }]
    }
  }
}
```

**Two additions to today's files:** `revision` and `profile`. An atlas keeps no name: names come from master data.
Today's atlases carry one, and the move into revisions (UA1) drops it.

## 13. The release family

Published sets travel in master data's private release as the art family **`outfit-sprites`**, keyed by outfit id
(packets UA4 and UA5):
- **One sprite set file a published outfit** (`files/art/outfit-sprites/<outfitId>.<hash16>.json`). It holds the atlas above,
  with each frame's `file` replaced by `{ page, x, y, w, h, dx, dy }`: its trimmed rectangle on a page, and the trim's
  offset inside the 256 cell. It also lists its pages and the revision.
- **Pages:** WebP, at most 4096 px a side, trimmed frames packed with 2 px of transparent padding
  (`files/atlases/outfit-sprites-<outfitId>-<n>.<hash16>.webp`).
- **The art index** gains a top-level `sprites` map: `{ <outfitId>: <path to its sprite set file> }`. Older clients
  ignore the key, so this is a minor version of uma-data.
- **Only approved revisions are published.** A published sprite set file never changes; a newer revision is a new file
  in a newer release.

**How `pnpm sprites:pack` builds it (UA5, P100):**
- **Trim:** each frame and face patch is cut to the rectangle of every pixel with any alpha, so the antialiased edge
  outside the opaque `bounds` is kept. `bounds` stays as the opaque rectangle (alpha ≥ 128); a turnaround still with
  none recorded gets it from its pixels, and `air` defaults to false.
- **Faces:** a patch's `place` is its untrimmed face box in the cell; its `dx`, `dy` are the trim's offset inside that
  box.
- **Shared pixels:** identical images (the key reused as a frame, a recorded reuse) are packed once, and their frames
  point at the same rectangle.
- **Packing:** shelf packing, tallest first, rows of a near-square width, deterministic. Each batch-1 traveler fits on
  one page of about 1,730–1,830 × 1,900–1,960 px.

**The encoding: lossy WebP, quality 90, alpha quality 100.** Batch 1's whole traveler sets (118 frames, 7 patches),
measured on 2026-11-08:

| Outfit | Lossless | Lossy q90 | PSNR (opaque pixels) | Alpha |
|---|---|---|---|---|
| 106701 r2 | 3.65 MB | **1.36 MB** | 35.5 dB | exact |
| 106801 r4 | 3.57 MB | **1.38 MB** | 33.8 dB | exact |
| 111501 r3 | 4.44 MB | **1.66 MB** | 32.6 dB | exact |
| 112901 r4 | 3.91 MB | **1.50 MB** | 34.6 dB | exact |
| 113401 r2 | 3.59 MB | **1.34 MB** | 36.0 dB | exact |

Lossless is over the 3 MB line for every traveler, so the rule picks lossy. The side-by-side at 1× and 2× (nearest
neighbour, lossless, lossy and the difference ×8, on each set's worst frame and its key) shows no visible difference;
the error sits in faint grain and in fully transparent pixels, which never draw. Lossy is 62% smaller: about 1.45 MB a
traveler, 7.2 MB for batch 1, ~145 MB for all 100. A set loads only while its Uma is on screen.

## 14. What changed from uma-rpg's animation spec

| uma-rpg call | Here |
|---|---|
| SA1 (two Umas for the sample) | Done. The batch-1 five replaced 100701, whose outfit is tiered F |
| SA2 (a 64 × 64 cell, ground 60) | **Replaced:** a 256 working texture, 64 logical, foot (128, 240) (§2) |
| SA3 (one facing, never mirrored) | Kept, and extended to four drawn facings (§3) |
| SA4 (six layers) | Kept, plus the hand crop as layer 6 (§4) |
| SA5, SA6 (face-only patches, a whole-head lock with 6 px of tolerance) | **Replaced:** the face-only lock, exact inside the face box (§5) |
| SA7, SA8 (six patches, game blinks) | Kept, plus `weary` (§5) |
| SA9, SA10 (anchors, events) | Kept, plus `bounds`, `handOcclusion` and `view` (§6) |
| SA11, SA12 (twelve fight actions, `walk`, `turnaround`) | Kept, as the battle set (§7.1) |
| SA13 (melee runs in and hops back) | Kept; it's the game's side |
| SA14 (weapons on their own layer) | Kept: ten kinds in uma-art (§9) |
| SA15 (32 colours, binary alpha) | **Replaced:** full colour, clean antialiasing (§10), per the owner's revision of 2026-11-06 |
| SA16 (no normal maps) | Kept |
| SA17 (ten checks) | **Replaced:** fourteen checks (§11) |
| SA18–SA20 (review, viewer, findings) | Moved into the pipeline: two gates, the Studio, and each batch's README |
| SA21 (a 35-frame production minimum) | **Dropped:** every traveler gets the full profile; the five sets show it's affordable |
| SA22 (all in `content/review/sprite-baseline/`) | **Replaced:** durable sets in `content/authoring/sprites/` ([pipeline.md](pipeline.md) §3) |
| SA23 (reduced motion) | Kept; it's the game's side |

## 15. Calls

| Id | Call |
|---|---|
| CR1 | A sprite set is one outfit's art at one revision. Three profiles say what it must have: traveler (118 frames), townsfolk (45), rival add-on (≈25) |
| CR2 | A 256 × 256 working texture, full colour, clean antialiased edges; logical cell 64; foot (128, 240); a clear border (replaces SA2 and SA15) |
| CR3 | On the iPhone one texel is one device pixel: a cell is 85⅓ pt, a standing Uma about 69 pt; no fractional scaling |
| CR4 | Four facings, all drawn: battle (three-quarter left), front, back and right (three-quarter right); nothing is mirrored |
| CR5 | Seven layers; the hand crop redraws her fist over the handle; the body holds no item, shadow, floor or glow |
| CR6 | The face-only lock: locked frames match the key exactly inside the face box; hair and ornaments keep each pose's drawing (replaces SA5 and SA6) |
| CR7 | Seven patches: the six of SA7 plus `weary`; the game runs blinks, in the battle facing only; other facings carry no patches in v1 |
| CR8 | Per-frame fields as built, plus `bounds`, `handOcclusion` and `view`; events `impact`, `release`, `hold`, `repeat` |
| CR9 | The battle set is the built 14 entries and 62 frames, with recorded reuse allowed |
| CR10 | The field set: walk and run facing front, back and right, 36 frames; standing in the field uses the turnaround stills |
| CR11 | `weary`, a 4-frame low-HP idle with its patch, joins the traveler profile, because uma-quest carries HP between fights |
| CR12 | Six front-facing emotes, 16 frames: `nod`, `surprise`, `laugh`, `sad`, `angry`, `wave`. Bubbles are uma-art, cheering is `victory`, and there's no talk patch |
| CR13 | The rival add-on: her fight actions facing right (about 25 frames), only for travelers cast as bosses; escorts are bestiary foes, not Umas |
| CR14 | Ten held-item kinds in uma-art, 128 px cells with a grip and an angle, one look per kind; the six placeholders stand in until then |
| CR15 | Every set opens with its identity sheet (key, turnaround, checklist with each ornament's side per facing), approved before anything else is drawn |
| CR16 | Fourteen automatic checks on every revision; 10 (specks), 11 (standing scale), 12 (approved frames kept) and 13 (facings agree) are new (P92) |
| CR17 | The authoring atlas is today's format version 1, plus `revision` and `profile`, without names |
| CR18 | The release family `outfit-sprites`: one sprite set file an outfit, trimmed frames packed on WebP pages, and a `sprites` map in the art index (a uma-data minor) |
