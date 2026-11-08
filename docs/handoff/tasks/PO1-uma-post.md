# PO1 — `@luismlorenzana/uma-post` 0.1.0: the parcel format and the accept lists

**uma-platform's `packages/post` · Claude · M · Needs: uma-farm's F7 answered (its spec's §5) · Unblocks: uma-farm's
F10 (the Post and the sender), then each game's receiver, uma-quest's first**

> **Written ahead, 2026-11-08 (P107), from uma-farm's draft spec. Don't build it before the owner answers F7.** Step 1
> re-reads the spec's §5 after those answers and applies whatever they changed.

## Why

uma-farm's Forge makes other games' items, and they travel as **parcels, farm to game only** (P89). The farm packs and
sends; each game's API fetches its own parcels and claims them after the game's app adds the items. Both sides must
agree on one format and one check, and each game sets its own accept list and daily caps. That shared piece is
`uma-post`, built here before the first parcel (P89, uma-farm FM12 and FM14).

## Context (read first)

- [decisions.md](../../decisions.md) P89 (one-way parcels; no server writes into a save) and P107 (this packet's order).
- uma-farm's design spec: [§5, "Accept lists and caps" (FS22–FS27)](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/spec.md#5-accept-lists-and-caps-fs22fs27)
  and [§7, the queue (FS32)](https://github.com/luismlorenzana/uma-farm/blob/main/docs/design/spec.md#7-the-queue-fs32).
  §5.5 is the package's shape, as drafted.
- uma-quest's DN14 and D4 (its field items come from the farm) and its Q17, which settles uma-quest's own list later.
- `packages/work` (`@luismlorenzana/uma-work`): the package to copy for layout, ESM and CJS builds, `publishConfig`
  and the first Changesets release.

## Decisions made

- **The shape is FS27's** (§5.5): `POST_GAMES`, `PostGame`, `ParcelLine`, `Parcel` (`v: 1`), `ParcelState`,
  `RefusalReason`, `Accepted`, `AcceptList`, `ACCEPT_LISTS`, `parseParcel`, `checkParcel`, `capsLeft`, and the API
  shapes `ParcelsReply`, `ClaimsRequest` and `ClaimsReply`. Types and pure functions only: no fetch code, no network,
  no dependencies.
- **0.1.0 doesn't wait for uma-quest's Q17 (P107).** It carries uma-quest's list as uma-farm's FS24 proposes it
  (`tonic` 10, `party-meal` 5, `revive` 3 a day, each its own cap group), as **uma-quest's interim list** (`version:
  1`), once uma-quest's session agrees. Q17 confirms or changes it in a minor, and the list's version goes up.
  uma-quest's receiver comes after uma-farm's F10, so the interim list changes nothing in uma-quest before Q17.
- **Every game has a list from 0.1.0, so `ACCEPT_LISTS` stays a total record.** uma-rpg's and uma-racer's start empty
  (`version: 0`, no items, no caps). `checkParcel` refuses anything addressed to them as `unknown-item`, and the farm
  offers nothing for them. Their sessions add their lists (FS25, FS26) as minors: uma-rpg's after the owner's go,
  since uma-rpg is frozen.
- **The details FS27 leaves open, decided here:**
  - **Parcel id:** `p-` then 20 lowercase base32 characters (`a–z`, `2–7`), about 100 bits.
  - **`day`:** a real calendar date, `YYYY-MM-DD`. **`packedAt`:** an ISO 8601 UTC time.
  - **`items`:** at least one line, each item once, sorted by id. `qty` is a whole number from 1 to the item's group
    cap.
  - **`parseParcel` reads the shape only** and throws `ParcelParseError` naming the field. **`checkParcel` applies a
    list** and returns the first refusal, in this order: `wrong-game`, `unknown-item`, `repeated-item`, `bad-qty`,
    `over-cap`, then `repeated-day`.
  - **`repeated-day`** needs the days a game has already claimed, so `checkParcel` takes them as an optional third
    argument, `claimedDays?: ReadonlySet<string>`, an addition to FS27's signature.
  - **`capsLeft`** never goes below zero, and lines of one cap group count together.
- **Ids are each game's own** (FS23). The farm maps its Forge items to them; `uma-post` never names a farm item.

## Do

1. **Re-read uma-farm's spec §5 after the owner's F7 answers,** and apply what they changed (ids, caps, names, the
   shape) to these decisions. Ask uma-quest's session to confirm FS24's list as its interim list, if it hasn't yet.
2. **Create `packages/post`** as `@luismlorenzana/uma-post`, copying `packages/work`'s layout and builds. Add its README
   (the format, the check order, how a game adds its list) and a desktop HTML page in `docs/post/` with a parcel's life
   and the lists.
3. **Write tests with synthetic parcels, no network:** every parse error; every refusal; caps across several lines of
   one group; `repeated-day` against claimed days; empty lists refusing everything; a round trip of a valid parcel; and
   a check that every list's items name a cap group it has.
4. **Release it** with a changeset (minor, 0.1.0), through the release workflow. Log the build's P-decision.
5. **Tell uma-farm's session** that F10 can pin it, and uma-quest's that its receiver will use it.

## Done when

- `@luismlorenzana/uma-post` 0.1.0 is published, with uma-quest's interim list and the empty lists for uma-rpg and
  uma-racer.
- `pnpm lint`, `pnpm test` and `pnpm build` pass, and CI is green.
- uma-farm's F10 pins it. A parcel sent from the farm is checked by the same `checkParcel` on both sides.

## Deliver

Delete this packet and move it to Done in [the handoff](../README.md), with the release run. Update
[the new-apps brief](../../new-apps/README.md) and its page.
