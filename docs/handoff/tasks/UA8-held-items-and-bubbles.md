# UA8 — Art (uma-art): ten held weapons and eight emote bubbles

**uma-platform `packages/art` · ChatGPT · M · Needs: — · Unblocks: uma-quest's Q9 and Q12 with real props (placeholders
work until then)**

## Why

Batch 1's sets hold six placeholder props. uma-quest's fights use uma-rpg's ten weapon kinds (DN20, DN21), and its
scenes need bubbles over a speaker's head. Props and bubbles are original, so they're uma-art, in git
([format.md](../../sprites/format.md) §9 and §7.4, CR14 and CR19).

## Context (read first)

- [format.md](../../sprites/format.md):
  - §9 (the held-item contract: the 128 px cell, `grip`, angle 0 pointing image-left, tomes at 0.55, the bow's nock);
  - §4 (layers and the hand crop) and §10 (style).
- The placeholders and their metadata in `content/authoring/sprites/shared/`, and their sources in batch 1's revisions.
- `packages/art/README.md` and your last uma-art packets (A05, H156), for releases and review sheets.
- uma-rpg's weapon list: `WEAPON_LABEL` in `packages/domain/src/economy/ranks.ts`.

## Decisions made

- **What to draw:**

  | Kind | Textures |
  |---|---|
  | Greatsword, Axe, Katana, Lance | 1 each |
  | Bow | 2: relaxed and drawn |
  | Fire, Blizzard, Thunder, Light and Dark Tomes | 2 each: closed and open, in the element's colours |
  | **Weapons, in all** | **16** |
  | Bubbles: `!`, `?`, `…`, `♪`, sweat drop, anger, heart, `zzz` | 1 each, 64 × 64 cells |

- **New uma-art families `held/` and `emote/`**, each with an atlas, as uma-art's other families have.
  - `held/<kind>` frames add `grip` {x, y}, `angle0` (`image-left`) and `scale` (1, or 0.55 for tomes). The drawn bow
    adds its nock.
  - `emote/<name>` frames add an `anchor`: the point that sits over the speaker's head.
- **The style matches the sprites, not the 32 px icons:** full colour, lit from the top front-left, clean antialiased
  edges, no glow (format.md §10). One look per kind, with no grade variants.
- **These families are authored, not drawn from code.** They're generated, and their masters and a deterministic export
  script are committed with them. That amends P35's "every asset from a generator script" for sprite-scale props only:
  the pixel families keep P35. Log it in this packet's P-decision.
- **The anchor test:** every prop is drawn in every batch-1 frame that shows it, at the frame's `grip` and angle, with
  the hand crop over it. It must sit in her hand without redrawing her. Use the batch-1 set from UA1 for the review
  sheets, and keep those sheets local: they show Uma art.
- **Release:** a uma-art minor, 2.22.0 if it's next. You publish it as usual. The placeholders stay in `content/` for
  the study's history.

## Do

1. Draw and export the 16 weapon textures and 8 bubbles. Write the two atlases, and add both families to uma-art's
   README.
2. Make the anchor-test sheets for the five Umas locally, plus native and 2× sheets of the props on dark, light and a
   battle backdrop, which can go in git: they're props only.
3. Release uma-art. Point the Studio's desk, or the batch viewer, at the released props.

## Done when

- uma-art's release lists `held/` and `emote/`, published.
- Every batch-1 grip frame holds its props without a redraw (the sheets).
- No Uma art is in uma-art.

## Deliver

A pull request, merged and published by you as usual (`feat(art): …`). Log a P-decision, including the P35 amendment
(from P94, after fetching `main`). Delete this packet and move UA8 to Done in [the handoff](../README.md), with the
release. uma-quest's first packet that draws the props pins this release.
