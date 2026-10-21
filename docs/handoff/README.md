# Sibling apps: the packet queue

> The program view of every packet for the [sibling apps plan](../sibling/README.md), phases B to E
> ([phases.md](../sibling/phases.md)), across the three repos. Written 2026-10-16 after Phase A shipped (uma-kit
> 0.3.0 in both games). Start any worker, Claude or ChatGPT, with [master-prompt.md](master-prompt.md).

## How the queue works

- **Ids:** S, then the phase letter, then a number (SB1, SC3 …). They never collide with decision numbers (D, P) or
  uma-racer's T and A tasks.
- **One packet, one worker, one delivery.** Each packet stands alone. It says which repo it changes, what to read, the
  decisions already made, the steps, the checks, and how to deliver.
- **Where a packet lives:** in the repo it changes. The rows below link to it.
  - uma-platform's packets: [tasks/](tasks/).
  - uma-rpg's: `docs/handoff/tasks/`, in its [queue](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/handoff/README.md).
  - uma-racer's: `docs/handoff/tasks/`, in its [queue](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/README.md).
- **Who can take it:**
  - **Claude:** needs the owner's machine (private content, the GCP bucket) or a long refactor.
  - **Either:** ChatGPT or a Claude session.
- **Workers have full autonomy.** A worker follows the packet, decides what the packet leaves open (writing it under
  Decisions), verifies, delivers and **flags it done itself**.
- **Flagging done.** When every "Done when" item holds, the worker:
  1. deletes the packet file, and moves its row in that repo's queue to Done, with the merge commit;
  2. sets the row's **State** below to Done, with the commit:
     - a Claude session pushes that one-line change to uma-platform's `main`;
     - ChatGPT opens a one-line pull request, or says so in its reply, and the next Claude session updates it.
- **Blocked?** Write why in the packet's row (State: Blocked), and move to another ready packet. Never wait.

## Parallel tracks

The four tracks only meet where "Needs" says. A worker per track can run at the same time.

```
Album   SB2 ──► SB3 ──┬──► SB4 (rpg)   SB1 (faces) runs alongside and feeds SB3/SB4/SB6
                      └──► SB6 (racer)  SB5 (rpg battle busts) needs nothing: start any time
Work    SC1 ──┬──► SC3 (rpg engine) ──► SC4 (rpg screens)
              └──► SC5 (racer)
        SC1 + SB3 ──► SC2 (kit screens) ──► SC4, SC5
Places  SD1 ─┬──► SD3 (rpg)
        SD2 ─┴──► SD4 (racer)
Content SE1 (racer phase 5) ──► SE4 (racer)
        SE2 ──► SE3 (rpg), SE4 (racer)
Now     SA7 (racer: the plaza crowd, kit 0.3.0)
```

## The queue

| Id | What | Repo | Who | Size | Needs | State |
|---|---|---|---|---|---|---|
| **Phase A follow-up** | | | | | | |
| [SA7](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SA7-plaza-crowd.md) | The plaza crowd in uma-racer (kit 0.3.0) | uma-racer | Either | S | — | Done (`9723a23`) |
| **Phase B: one Uma album** | | | | | | |
| SB2 | `uma-kit/roster`: the album engine, level rule, label, rows, preferences | uma-platform | Either | M | — | Done (`c518093`, 0.4.0) |
| SB3 | `uma-kit/album`: faces, busts, chrome, views, virtual grid, `UmaPicker` | uma-platform | Either | L | SB2 | Done (`5579b32`, 0.7.0) |
| SB4 | uma-rpg on the kit album: the Stable, six pickers, faces wherever an Uma is small | uma-rpg | Either | L | SB3 (SB1 for real faces) | Done (`b205b52`, uma-kit 0.7.1, uma-data 1.1.0; deployed `21b4fa9`) |
| SB5 | uma-rpg: busts on the battle stage, no chibis | uma-rpg | Either | S | — | Done (`11e39f9`, locally validated; [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39167185219)) |
| SB6 | uma-racer on the kit album, and busts in races | uma-racer | Either | L | SB3 (SB1 for real faces) | Done (`4885baf`, uma-kit 0.7.1; deployed green) |
| **Phase C: one work system** | | | | | | |
| SC1 | `@luismlorenzana/uma-work`: the shared engine, from uma-racer's | uma-platform | Claude | L | — | Done (`ed446b8`, 0.1.0) |
| SC2 | `uma-kit/work`: rows, queues, speed-up, recall, header, job sheet | uma-platform | Either | L | SC1, SB3 | Done (`fe7e30f`, uma-kit 0.8.0) |
| SC3 | uma-rpg on `uma-work`: kinds, save v22, the API | uma-rpg | Claude | L | SC1 | Done (`6063b95`) |
| SC4 | uma-rpg on `uma-kit/work`'s screens | uma-rpg | Either | M | SC2, SC3 | Done (`c8bded0`; [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39590331919)) |
| SC5 | uma-racer on `uma-work` and `uma-kit/work` | uma-racer | Either | L | SC1, SC2 | Done (`8967e24`, uma-kit 0.9.1, uma-work 0.1.0; production verified green) |
| **Phase D: places, profile and getting in** | | | | | | |
| SD1 | `@luismlorenzana/uma-server`: the NestJS auth guard | uma-platform | Either | M | — | Done (`1824879`, 0.1.0) |
| SD2 | `uma-kit/auth` and `uma-kit/places`: boot gates, Account, Warehouse, Exchange, profile | uma-platform | Either | L | — | Done (`b9247da`, 0.5.0) |
| SD3 | uma-rpg on SD1 and SD2 | uma-rpg | Either | M | SD1, SD2 | Done (`3ea66a4`) |
| [SD4](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SD4-racer-places.md) | uma-racer on SD1 and SD2 | uma-racer | Either | M | SD1, SD2 | Done (`7d2b757`) |
| **Phase E: platform plumbing** | | | | | | |
| [SE1](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SE1-racer-phase-5.md) | uma-racer's phase 5: uma-data and its art families; its own pipeline goes | uma-racer | Claude | L | — | Ready |
| SE2 | `uma-kit/content` and `uma-server/content`: art loading and the content proxy | uma-platform | Either | M | SD1 | Done (`5aaeb93`, kit 0.6.0, server 0.2.0) |
| SE3 | uma-rpg on SE2 | uma-rpg | Either | S | SE2 | Done (`18dbd4b`, uma-kit 0.9.1, uma-server 0.2.0; [production green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39633132807)) |
| SE4 | uma-racer on SE2 | uma-racer | Either | M | SE1, SE2 | Done (`ad15cf0`, [racer #123](https://github.com/luismlorenzana/uma-racer/pull/123); kit 0.9.0, [production verified green](https://github.com/luismlorenzana/uma-racer/actions/runs/39460142245)) |
| **Art authoring (briefed by the games, delivered here)** | | | | | | |
| A04 | Ten native tonic item icons in uma-art; [source brief](https://github.com/luismlorenzana/uma-racer/blob/1ed5b77d4f31c56def3549f444d93c1f4887d46c/docs/handoff/tasks/A04-tonic-icons.md) | uma-platform | ChatGPT | S | — | Done (`7ed5bce`, uma-art 2.10.0; racer pin/deploy and game-side packet retirement stay with its session) |
| H38 | The Rift's building, four front crests and eleven achievement badges in uma-art; [source brief](https://github.com/luismlorenzana/uma-rpg/blob/a550358/docs/handoff/tasks/H38-rift-art.md) | uma-platform | Claude | M | — | Done (uma-art 2.11.0; the uma-rpg Rift page pins it) |
| **Parked** | | | | | | |
| [SE5](tasks/SE5-shared-push.md) | Push shared (`uma-server/push`) | uma-platform, uma-rpg | — | M | The owner asks for push in uma-racer | Parked |

**Ready now:** SE1.

## Releases while packets run in parallel

Several packets release uma-kit; three create packages (`uma-work`, `uma-server`).
- A package change comes with a changeset: a minor for a new subpath or anything visible, a patch for a fix.
- **Right before merging,** fetch `main`, rebase, run `pnpm version-packages`, and push or merge. The release
  workflow publishes every unpublished version. If another packet took the version first, rebase and version again.
- A packet that needs another's release waits until the version is listed by
  `gh api /user/packages/npm/<package>/versions --jq '.[].name'`.
- **A new package** needs its Actions access granted to uma-rpg and uma-racer once, by the owner (Package settings →
  Manage Actions access → Read), or the games' CI can't install it. The packet says so in its delivery reply.

## Done

| Id | What | Commit |
|---|---|---|
| SE3 | uma-rpg on `uma-kit/content` 0.9.1 and `uma-server/content` 0.2.0, with its master adapter, private enemy allowlist, routes, cache rules and behavior retained (its D158); [production deployment green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39633132807) | `18dbd4b` ([rpg #28](https://github.com/luismlorenzana/uma-rpg/pull/28)) |
| SC4 | uma-rpg's 11 Wilds facilities and quick looks on `uma-kit/work` 0.9.1, with RPG rules, saves, recipes, targets and D144 pickers retained (its D157); [production deployment green](https://github.com/luismlorenzana/uma-rpg/actions/runs/39590331919) | `c8bded0` ([rpg #26](https://github.com/luismlorenzana/uma-rpg/pull/26)) |
| SC5 | uma-racer on `@luismlorenzana/uma-work` 0.1.0 and `uma-kit/work` 0.9.1, with Racer's rules, saves and planning retained (its D377); [local acceptance and production deployment green](https://github.com/luismlorenzana/uma-racer/blob/main/docs/research/sc5-work/README.md) | `8967e24` ([racer #124](https://github.com/luismlorenzana/uma-racer/pull/124)) |
| SA7 | The plaza crowd in uma-racer, uma-kit 0.3.0 (its D371) | `9723a23` (release `0737c9f`) |
| SC1 | `@luismlorenzana/uma-work` 0.1.0, one work engine for both games (P53) | `ed446b8` (release `29a37d5`) |
| SC2 | `uma-kit/work`, the shared work screens in uma-kit 0.8.0 (P61); [published release](https://github.com/luismlorenzana/uma-platform/actions/runs/39168986257), props and SC4/SC5 adoption notes in [the kit README](../../packages/kit/README.md#work-work); local racer proof at 390×844, scratch changes reverted | `fe7e30f` ([#33](https://github.com/luismlorenzana/uma-platform/pull/33)) |
| A04 | Ten original 32px tonic item icons in uma-art 2.10.0 (P62); [published release](https://github.com/luismlorenzana/uma-platform/actions/runs/39412839729), inline light/dark 1×/2×/4× and 16/24px chip previews in the code PR. All preceding art preserved; racer adoption is separate | `7ed5bce` ([#36](https://github.com/luismlorenzana/uma-platform/pull/36)) |
| SC3 | uma-rpg on `uma-work` 0.1.0: four kinds, save v22, Repeat and stopped queues (its D152) | `6063b95` |
| SD3 | uma-rpg on uma-kit 0.7.0 `/auth` and `/places` and uma-server 0.2.0 `/auth`: getting in, Account, Warehouse, Exchange, profile frame (its D153) | `3ea66a4` |
| SD4 | uma-racer on uma-kit 0.6.0 `/auth` and `/places` and uma-server 0.2.0 `/auth`: getting in, Account, Warehouse, Exchange, profile frame (its D372) | `7d2b757` (release `b20bb13`) |
| SD1 | `@luismlorenzana/uma-server` 0.1.0 with `/auth`, the shared API guard (P54) | `1824879` (release `09f6d52`) |
| SB2 | `uma-kit/roster`, the album engine and level rule, uma-kit 0.4.0 (P55) | `c518093` (release `f7f6e51`) |
| SB3 | `uma-kit/album`, the shared album screens, art primitives and Uma picker, uma-kit 0.7.0 (P58) | `5579b32` (0.7.0 tag) |
| SB6 | uma-racer on uma-kit 0.7.1: shared Stable/pickers, small faces and race busts (its D373); local acceptance under P60, [production deployment green](https://github.com/luismlorenzana/uma-racer/actions/runs/39145322463) | `4885baf` ([racer #120](https://github.com/luismlorenzana/uma-racer/pull/120)) |
| SD2 | `uma-kit/auth` and `uma-kit/places`, uma-kit 0.5.0 (P56) | `b9247da` (release `8b3e26b`) |
| SE2 | Shared content loading and proxy, uma-kit 0.6.0 and uma-server 0.2.0 (P57) | `5aaeb93` (release `8ad4354`) |
| SB1 | `outfit-faces`: a face crop per outfit in uma-data 1.1.0 | `516cb84` (release `11cf2ea880df`) |
