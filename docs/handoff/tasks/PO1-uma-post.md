# PO1 — `@luismlorenzana/uma-post` 0.1.0: the parcel format and the accept lists

**uma-platform's `packages/post` · Claude · M · Needs: uma-farm's F7 answered (its spec's §5; uma-farm took P107 as its D19) · Unblocks: uma-farm's
F10 (the Post and the sender), then each game's receiver, uma-quest's first**

> **Parked, 2026-11-08 (P109): the owner moved parcels to "later" (uma-farm D22). Build nothing until uma-farm asks
> again with the answers that touch its §5.** Written ahead the same day (P107) from uma-farm's draft spec. Step 1
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
- uma-quest's list, final: its [design spec part 5](https://github.com/luismlorenzana/uma-quest/blob/main/docs/design/spec/05-accept-list.md) (Q17, D26, SP57–SP61).
- `packages/work` (`@luismlorenzana/uma-work`): the package to copy for layout, ESM and CJS builds, `publishConfig`
  and the first Changesets release.

## Decisions made

- **The shape is FS27's** (§5.5): `POST_GAMES`, `PostGame`, `ParcelLine`, `Parcel` (`v: 1`), `ParcelState`,
  `RefusalReason`, `Accepted`, `AcceptList`, `ACCEPT_LISTS`, `parseParcel`, `checkParcel`, `capsLeft`, and the API
  shapes `ParcelsReply`, `ClaimsRequest` and `ClaimsReply`. Types and pure functions only: no fetch code, no network,
  no dependencies.
- **uma-quest's list is final** (its Q17, D26, SP57–SP61, 2026-11-08). It ships in 0.1.0 as uma-quest's list
  `version: 1`, unchanged from the interim list it agreed to in D19: `tonic` (Tonic) 10, `party-meal` (Party meal) 5,
  and `revive` (Revive) 3 a day, each item its own cap group. Nothing else is accepted (no materials, gold, gear or
  MP items). The items' effects are uma-quest's own and don't belong in `uma-post`.
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
   shape) to these decisions.
2. **Create `packages/post`** as `@luismlorenzana/uma-post`, copying `packages/work`'s layout and builds. Add its README
   (the format, the check order, how a game adds its list) and a desktop HTML page in `docs/post/` with a parcel's life
   and the lists.
3. **Write tests with synthetic parcels, no network:** every parse error; every refusal; caps across several lines of
   one group; `repeated-day` against claimed days; empty lists refusing everything; a round trip of a valid parcel; and
   a check that every list's items name a cap group it has.
4. **Release it** with a changeset (minor, 0.1.0), through the release workflow. Log the build's P-decision.
5. **Tell uma-farm's session** that F10 can pin it, and uma-quest's that its receiver will use it.

## Done when

- `@luismlorenzana/uma-post` 0.1.0 is published, with uma-quest's final list and the empty lists for uma-rpg and
  uma-racer.
- `pnpm lint`, `pnpm test` and `pnpm build` pass, and CI is green.
- uma-farm's F10 pins it. A parcel sent from the farm is checked by the same `checkParcel` on both sides.

## Deliver

Delete this packet and move it to Done in [the handoff](../README.md), with the release run. Update
[the new-apps brief](../../new-apps/README.md) and its page.
