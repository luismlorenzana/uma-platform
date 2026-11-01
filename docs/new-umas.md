# Importing new Umas

How a new outfit gets from the original game into both games. Run it when a banner opens. It takes about five minutes of
machine time, and new outfits appear in the games on their next load, with no deploy. Run it from a clean `main`: the
checkout's `content/` and caches are the private inputs a release is built from (P31).

## At a glance

| # | Step | Command | What it does | Stops if |
|---|---|---|---|---|
| 1 | Check | `pnpm uma:check` | GameTora against the local release: every new record, and any file to save by hand. Changes nothing | Nothing new |
| 2 | Import | `pnpm uma:import` | Data, then all art with the windows, then step 3's report | A parser rejects a set |
| 3 | Review | `pnpm uma:report` | The local release against the published one, a completeness check, and `content/review/new-umas.png` | A required image is missing |
| 4 | Try the games | Local previews | Each game reads the local release through its dev tools | A game breaks |
| 5 | Upload | `pnpm release:publish -- --channel candidate` | Puts every file in the bucket and verifies it. Nothing live moves | The release fails verification |
| 6 | Go live | `pnpm release:publish` | Moves `latest`, which both games read | — |
| 7 | Undo, if needed | `pnpm release:publish -- --rollback <version>` | Moves `latest` back. Files are never deleted | — |

`pnpm release:publish -- --dry-run` shows the plan and the upload size at any point.

## Sources

| Site | What it gives | How | Rules |
|---|---|---|---|
| [GameTora data](https://gametora.com/data/manifests/umamusume.json) | Every record: characters, outfits, support cards, skills, races, tracks, scenarios, objectives | `pnpm data:import` reads the manifest and downloads changed datasets | The public JSON its own pages read. Cached by dataset version |
| `gametora.com/images/umamusume/characters/…` | Outfit stands and thumbnails | `pnpm assets:import`, from record ids ([sources.ts](../scripts/assets/src/sources.ts)) | At most 8 at a time, each fetched once |
| `media.gametora.com/umamusume/…` | Chibis (`characters/chibi/`), card art (`supports/full/`), skill icons (`skills/icon/`), scenario crests (`scenarios/hero/thumb/`) | Same | Same |
| `gametora.com/images/umamusume/supports/…` | Card icons | Same | Same |
| [Umamusume Wiki](https://umamusu.wiki) | A new character's school, gym, winter and casual stands (`Game_Asset_chara_stand_…`) | **By hand.** `pnpm uma:check` prints each file's page; save the image into `~/Documents/uma-content` | **Never fetched.** Its robots.txt closes `/w/`, where images sit, and it refuses scripted reads. The `File:` pages are open |
| The [game's news](https://umamusume.jp/news/) | When a banner opens | Read by a person | — |

**When a source moves.** GameTora moves images now and then: in 2026 it stopped adding `tex_support_card_<id>.png` and
`utx_ico_skill_<id>.png`, and 32 cards and 8 icons went quietly missing until `uma:report` listed them. If the report
shows a gap, open that record's page on GameTora, find the image its page uses, and change the one line in `sources.ts`.

The files stay out of git and off public hosts, like everything in `content/` (P6). A window derives from original art,
so it stays there too: it's a release family, not uma-art, and it's never published as a shareable page.

## What a new outfit gets

| Family | Comes from | Without it |
|---|---|---|
| `outfits` record, its skills and cards | GameTora | Not in the game |
| `outfit-icons`, `outfit-portraits` | GameTora | Required |
| `outfit-busts`, `outfit-faces` | Cut from the portrait; pin in `bust-crops.json` or `face-crops.json` | Required |
| `outfit-glass` | Baked from the bust; pin in `glass-pins.json` | Required |
| `outfit-chibis` | GameTora | Games show the icon |
| `character-dresses`, `character-faces` | The wiki, by hand; only for a new character | Games fall back |

## Step by step

**1. Check.** Read what `pnpm uma:check` lists. A row GameTora leaves incomplete is skipped with a warning, and the import
lists what pointed at it: both are reported rather than fatal, because games handle unknown ids. A new scenario is more
than a row: see step 4.

**2. Import.** Only new art downloads or bakes, so a banner's outfits cost seconds on top of re-encoding the families. A
changed `glass.py` rebakes everything, about 3.5 minutes.

**3. Review.** Open `content/review/new-umas.png`: portrait, bust, face, window, the window at list size, and the chibi,
one row an outfit.

| What's wrong | The fix |
|---|---|
| The bust misses her head | Pin it in `content/overrides/bust-crops.json` and rerun step 2 |
| The face is cut through with lead, or spreads into her hair | Pin it in `content/overrides/glass-pins.json`, then `pnpm assets:import -- --families=outfit-glass` |
| Tanned skin or very pale hair | The usual places the automatic read fails; the same pin fixes them |

The import names a face that looks misread: its sheet covers under 3% or over 20% of the window. It can't catch them all,
so look anyway.

**4. Try the games.**

- **uma-rpg:** run `pnpm --filter @rpg/domain test`: `template-release.test.ts` reads `content/release` and checks every
  outfit gets a template and no new skill's name clashes with the game's words. Then start `rpg-api` and `rpg-web`, which
  read it too, open the Stable, find the new outfit and open her profile. Her template and calling come from one rule over
  her aptitudes and growth, so a new outfit needs no hand work.
- **uma-racer:** `localContent()` in `scripts/overlays/src/local.ts` runs its adapter on the local release. Check it gives
  no warnings and the Uma count went up.
- **A new scenario** gives uma-rpg a continent, named after it, at its release order, five a tier. The sixteenth would
  open a fourth tier, shown as "Tier 4 locked" at the Scenario Gate, so decide what that means first. uma-racer's scenarios
  are its own list, so a new one is ignored there until that game adds it.

**5–6. Publish.** After `latest` moves, each game picks the release up on its next load. Files are immutable, so a re-run
uploads nothing new and a rollback only moves the pointer.

**Only if the schema moved:** a new record needs nothing, but a new art family or field needs a uma-data release and a pin
in each game that reads it. Parsers drop what they don't know, so a game on an older uma-data keeps working meanwhile.

## What isn't automated

| What | Why |
|---|---|
| Running it | The private inputs and the gcloud account are on one machine, and a banner is rare enough that a watcher would cost more than it saves |
| A new character's stands | The wiki doesn't allow scripted reads |
| The review | Only a look catches a bad face |

## The first run, 2026-11-01

From a release two weeks old it brought in 2 outfits, Duramente \[Claret Nosferatu\] and a new Daiwa Scarlet, with 3 support
cards, 29 skills and the Shuntaisai scenario. The whole import took 4 minutes 51 seconds, mostly the first bake of all 272
windows. Both new windows needed no pin. It found three things the old pipeline hid: the moved card art and skill icons
above, four outfits with no chibi, and a character with no birthday. Azuma, the Shuntaisai scenario's teacher, has none on
GameTora, so she's skipped (P82), and her two cards keep her name as text. A JP-only outfit can also arrive without an
English title, as Daiwa Scarlet's did: it shows the Japanese one until a later import brings the English.
