# Tier authoring: one local Studio, nine boards, and a career for every Uma

> **Status: 2026-11-09, the owner's direction (P113–P116), built as TA1; revised the same day (P117–P119).** The two
> local rankers (Umas by outfit, enemies by role) become one app with nine tier boards on one scale, a home with a
> dashboard, and a local import for four new franchises. The Uma boards keep the old board's playstyle grid (P117), and
> [franchises.md](franchises.md) ranks the franchises to add next. This page says what it is, why it stays on this machine, and what it sets up: every playable Uma
> gets a **career that fights at least three bosses**. Calls TS1–TS17. Visual page: [previews/tiers.html](previews/tiers.html).

## The short answer

- **One app, `pnpm studio`** (http://127.0.0.1:4318). The home has a tile for every board and sprite tool, then the
  numbers across all of them.
- **Nine boards, one scale: SS, S, A, B, F.** SS, S and A are a board's **cast**. B, F and unranked **leave** it and
  flow to the board below, so nothing is ever ranked twice by accident and nothing falls through.

  | Group | Board | Who is on it | Its leftovers go to |
  |---|---|---|---|
  | Umas | **Playable Umas** | Every Uma character with an outfit, ranked once for all her outfits | Uma NPCs |
  | | **Uma NPCs** | Every Uma outside Playable's SS, S and A | — |
  | Bosses | **Azur Lane bosses** | The Azur Lane units marked Boss on the old board | Key enemies |
  | | **Genshin Impact bosses** | Female characters, imported locally | Key enemies |
  | | **Wuthering Waves bosses** | Female resonators, imported locally | Key enemies |
  | | **Honkai: Star Rail bosses** | Female characters, imported locally | Key enemies |
  | | **Zenless Zone Zero bosses** | Female agents, imported locally | Key enemies |
  | Enemies | **Key enemies** | Every other Azur Lane unit, plus the boss boards' leftovers | Regular enemies |
  | | **Regular enemies** | Every NIKKE unit, plus Key's leftovers | — |

- **Umas are ranked per character**, not per outfit, **on the old board's playstyle grid**: tiers down, the five
  playstyles across. Each portrait carries a small count of her outfits.
- **Nothing was lost:** every board started from the old ones. SS stays SS, A1 became S, A2 became A, B and F stay.
- **It all stays local.** The boards and the plan live in the ignored `content/authoring/tiers/`, backed up with the rest
  of `content/authoring/` to the private bucket. Nothing is committed or published.

## Why local only

The owner's reasons, as the design follows them:

1. **It's taste, not data.** Who is playable, who is a boss and who comes first are the owner's calls. They change
   often while the games take shape, so they belong in a fast tool the owner drives, not in a release with a schema.
2. **The references are private.** Every portrait on these boards is original franchise art: Uma outfits from the local
   master release, and enemy portraits from the private catalog and the new imports. Like the Uma sprites (CR19), they
   never go in git, uma-art or a public URL. A local app over the ignored `content/` folder keeps them that way.
3. **Nothing ships from here directly.** The boards decide **what gets authored and in what order**. The authored art
   still goes through its own gates and releases (the sprite pipeline, uma-quest's enemy pipeline Q39). A tier is
   never a game rule.
4. **No cloud, no cost.** The Studio binds to loopback, writes JSON files atomically, and the existing backup covers
   them. There's no server, account or bill to run.
5. **One place to look.** Two rankers with two scales (SS/A1/A2/B/F per outfit; SS/A1/A2/B/F with Regular/Elite/Boss
   per enemy) became nine boards with one scale and one home, so the whole cast reads at a glance.

## Careers: why the boards are shaped this way

The owner wants **every Uma to have a career, a story mode where she fights her way through at least three bosses**,
and more where there are bosses to spare. The boards are cut to answer exactly the questions that design asks:

| A career needs | It comes from |
|---|---|
| The Uma herself | **Playable Umas**, SS, S and A: one career per character, whatever outfit she wears |
| The bosses she fights, at least three | The three **boss boards**, SS, S and A |
| Who escorts a boss and leads the groups | **Key enemies** |
| The random fights between bosses | **Regular enemies** |
| Her rivals, friends and the towns around her | **Uma NPCs** (and other playable Umas) |

**The recommended rule (P116):** a career draws its bosses from **its own tier first**. SS careers meet SS bosses, S
careers S bosses, and so on, so the first careers to ship need only the first bosses drawn. Every career has at least
three. Where a tier has more bosses than three per Uma, its careers grow to `ceil(bosses ÷ Umas)`, so every boss
authored gets fought. Where it has fewer, careers share bosses. The home's **Careers** panel computes this live.

At the boards' first state (P113's seed, before the owner ranks the two new boss boards):

| Tier | Playable Umas | Bosses (all three boards) | Bosses a career | Careers each boss appears in |
|---|---:|---:|---:|---:|
| SS | 40 | 41 | 3 | 2.9 |
| S | 19 | 6 | 3 | 9.5 |
| A | 6 | 5 | 3 | 3.6 |
| **All** | **65** | **52** | | **195 boss fights** |

For three bosses a career with no boss repeated, SS needs 120 bosses, S 57 and A 18: **195 in all, against 52 today.**
The 235 imported Genshin Impact, Wuthering Waves, Honkai: Star Rail and Zenless Zone Zero characters cover that gap. S needs them most: it has 19
careers and only six bosses so far. The table updates as the owner ranks.

## The boards

### One scale

| Tier | Means | On a board with a board below it |
|---|---|---|
| **SS** First cast | Author first | Stays |
| **S** Next wave | Right after the first cast | Stays |
| **A** Later wave | The last of this cast | Stays |
| **B** Alternative | Not in this cast; a good alternative | Flows down |
| **F** On file | Not in this cast; unlikely | Flows down |
| *unranked* | Not decided yet | Flows down |

Order within a tier is the authoring order. Drag a portrait onto another to put it just before, or press `[` and `]`.

### Per character, not per outfit (P114)

A career is a character's, so the playable board ranks characters. Her card shows every outfit with its Way and its
tier on the old outfit board, and the tier list shows her face with a count of her outfits. A character took **her best
outfit's tier** at the start: 135 characters, of which 65 are the playable cast (40 SS, 19 S, 6 A), with 133 outfits
between them.

**Playstyles stay as they were (P117).** The old board's five aptitude buckets, each with its calling, still split the
Uma boards:

| Playstyle | Calling | Her best running-style grades |
|---|---|---|
| Front / Front + Pace | Warrior | Front among the best; it wins every tie |
| Pure Pace | Spellblade | Pace alone at the top |
| Pace + Late | Mage | Pace tied with Late or End, no Front |
| Pure Late | Healer | Late alone at the top |
| Late + End | Summoner | End alone or tied with Late, no Front or Pace |

An outfit's playstyle comes from its grades, as before. A character's comes from her **lead outfit**: her best tier on
the old board, then her original outfit, then the lowest id. That reproduces the old SS exactly: eight a playstyle.
Five characters have outfits in two playstyles. Their card offers the two, and the pick saves on the Playable board.
Dropping one into the other column on the grid does the same. Both Uma boards draw the grid: tiers down, playstyles
across, each column with its cast and ranked counts. The card shows the outfit's four grades with the deciding ones
highlighted, and the home adds Playable Umas by playstyle. Today's cast: Warrior 13, Spellblade 14, Mage 14, Healer
12, Summoner 12.

**The sprite queue doesn't move yet.** The Uma sprite pipeline still reads the old outfit roster
(`uma-art-roster.json`), now frozen, because batches 1 and T1 are assigned from it and uma-quest's wave 1 plays them. The
switch to characters is **TA2**, below.

### The enemy boards

- **Azur Lane bosses** starts with the 53 units marked Boss on the old board (41 SS, 6 S, 5 A, 1 B). Its card can
  take a unit off the board, and Key's card can make an Azur Lane unit a boss.
- **Key enemies** got the old board's Azur Lane Elites with their tiers. The old Regulars sit unranked on Key, so they
  are on Regular with their old tiers. The *Old role* filter finds them, and **Rank the unranked shown as B or F** settles
  a filtered set in one undoable step.
- **Regular enemies** got every NIKKE unit and the old Azur Lane Regulars, each with its old tier.
- A unit ranked on two boards keeps both. Only the board it's on now counts.

### The new franchises (P115)

`pnpm tiers:import <genshin|wuwa|hsr|zzz>` reads each game's public character list and keeps the **female
characters**, the owner's baseline (P115, P118):

| | Source | Filter | Imported |
|---|---|---|---:|
| Genshin Impact | Project Amber (`gi.yatta.moe`) | Body type GIRL, LADY or LOLI; released | 82 |
| Wuthering Waves | Encore (`api.encore.moe`) | Playable resonators listed as female; the Rover once | 46 |
| Honkai: Star Rail | Project Yatta (`sr.yatta.moe`) and StarRailRes | Pronouns in each character's own stories, eight checked by hand by id; the Trailblazer once | 59 |
| Zenless Zone Zero | Enka's agent list (EnkaNetwork/API-docs) | The internal name says `Avatar_Female` | 48 |

Each gets a 128 px face, a 480 × 720 figure and a splash, cut the way uma-rpg's enemy release cuts Azur Lane and NIKKE,
as WebP beside them in `content/authoring/enemies/assets/`. The raw downloads stay in the ignored `.cache/` folder,
which the backup skips. To add anyone the lists don't have (a female boss who isn't playable, say), the owner drops her
images in `content/authoring/enemies/inbox/` with a line in `inbox/<franchise>.json`. The same command imports her.

## What's saved

| File (all in the ignored `content/authoring/`) | What it is |
|---|---|
| `tiers/<board>.json` | One board: its entries (`id`, `tier`, `note`) in authoring order, and its revision. Azur Lane bosses also has `members`. |
| `tiers/plan.json` | **The plan the later tools read**: every board in authoring order with names, Ways or franchises, where each entry came from, and the career numbers. Rewritten on every save. |
| `enemies/imports/<franchise>.json` | A local import: its source, filter and units. |
| `uma-art-roster.json`, `enemy-art-roster.json` | The old boards, **frozen**. The sprite queue still reads the first until TA2; the second is history. |

Writes are atomic, serialized and revision-checked per board, so two tabs on different boards never collide.

## What this sets up next

These are the later decisions this work directs. Each is a packet or a request, in this order:

| Id | What | Where | Who |
|---|---|---|---|
| **TA2** | **The sprite queue reads Playable Umas.** Traveler batches follow the character tiers; batches already assigned (1, T1) stay. A recommended outfit pick: her best-ranked outfit first (CM28 already uses it as her look as a boss); the rest follow in tier order. Townsfolk batches follow **Uma NPCs** instead of B-before-F. | uma-platform | Claude, after the owner ranks NPCs |
| **TA3** | **uma-quest's careers.** The campaign (CM1–CM36) turns on travelers being outfits and on 325 chapter bosses. This direction makes a career a character's, with at least three bosses from the boss boards (TS10). uma-quest revises its calls in its own repo, with this page as the brief. | uma-quest | uma-quest's session |
| **TA4** | **Q39 reads the plan.** `enemies:candidates` offers Boss slots from the five boss boards, Key from Key enemies and Regular from Regular enemies, in their authoring order. EN1's subjects grow from NIKKE and Azur Lane to all four franchises. | uma-quest, uma-platform | ChatGPT (Q39) |
| TA5 | More imports when the owner wants them: male characters, or non-playable bosses through the inbox. | uma-platform | Claude |
| TA6 | **The next franchise:** [franchises.md](franchises.md) ranks them; Arknights: Endfield, Punishing: Gray Raven and Honkai Impact 3rd come first. One packet a franchise, on the owner's pick. | uma-platform | Claude |

## The calls

| Id | Call |
|---|---|
| TS1 | **One local Studio** (`pnpm studio`, loopback only) with a home: a tile for each of the nine boards and five sprite tools, then a dashboard: the cast of each board, every board by tier, the career math and the sources |
| TS2 | **One scale for every board: SS, S, A, B, F.** SS, S and A are the cast; B, F and unranked flow to the board below |
| TS3 | **The boards and their order:** Playable Umas → Uma NPCs; Azur Lane, Genshin Impact, Wuthering Waves, Honkai: Star Rail and Zenless Zone Zero bosses → Key enemies → Regular enemies (+ NIKKE) |
| TS4 | **Umas are ranked per character**; the tier list shows each face with her outfit count, and her card shows every outfit |
| TS5 | **The first state keeps every old call:** a character takes her best outfit's tier; SS→SS, A1→S, A2→A, B→B, F→F; enemies keep tier and note on the board their old role points to |
| TS6 | **Azur Lane bosses is a curated list** (the old Boss role); a card can add or remove a unit |
| TS7 | **The new franchises are imported locally, female characters only to start,** from public character lists, with uma-rpg's enemy cuts; owner images go through an inbox |
| TS8 | **Everything stays private and local:** `content/authoring/` only, the existing backup, no git, no uma-art, no URL |
| TS9 | **`tiers/plan.json` is the one output** the later tools read; each board's file is the state |
| TS10 | **A career fights at least three bosses,** from its own tier first; a tier with bosses to spare lengthens its careers |
| TS11 | **The old outfit roster freezes** as the sprite queue's input until TA2; the old enemy roster is history |
| TS12 | Drag and drop, earlier and later, notes, undo, keyboard ranking, a filtered bulk B or F, and board import and export |
| TS13 | The two old rankers are retired: `/` is the home, `/enemies` leads there |
| TS14 | **Tiers are authoring order, never game rules.** A game reads what was authored and released, not the boards |
| TS15 | **The Uma boards keep the old playstyle grid** (P117): tiers down, the five playstyles across, the outfit's grades on the card, and the home's playstyle table |
| TS16 | **A character's playstyle is her lead outfit's** (best old tier, then original, then lowest id), unless the owner picks another of her outfits' playstyles |
| TS17 | **Honkai: Star Rail and Zenless Zone Zero are boss boards** (P118); [franchises.md](franchises.md) ranks the next (P119) |
