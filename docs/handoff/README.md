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
  - **Claude:** needs the owner's machine (private content, the GCP bucket, the iOS Simulator) or a long refactor.
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
| [SB3](tasks/SB3-kit-album.md) | `uma-kit/album`: faces, busts, chrome, views, virtual grid, `UmaPicker` | uma-platform | Either | L | SB2 | Ready (uma-kit 0.4.0) |
| [SB4](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/handoff/tasks/SB4-rpg-album.md) | uma-rpg on the kit album: the Stable, six pickers, faces wherever an Uma is small | uma-rpg | Either | L | SB3 (SB1 for real faces) | Waiting |
| [SB5](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/handoff/tasks/SB5-rpg-battle-busts.md) | uma-rpg: busts on the battle stage, no chibis | uma-rpg | Either | S | — | Ready |
| [SB6](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SB6-racer-album.md) | uma-racer on the kit album, and busts in races | uma-racer | Either | L | SB3 (SB1 for real faces) | Waiting |
| **Phase C: one work system** | | | | | | |
| SC1 | `@luismlorenzana/uma-work`: the shared engine, from uma-racer's | uma-platform | Claude | L | — | Done (`ed446b8`, 0.1.0) |
| [SC2](tasks/SC2-kit-work.md) | `uma-kit/work`: rows, queues, speed-up, recall, header, job sheet | uma-platform | Either | L | SC1, SB3 | Waiting |
| [SC3](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/handoff/tasks/SC3-rpg-on-uma-work.md) | uma-rpg on `uma-work`: kinds, save v22, the API | uma-rpg | Claude | L | SC1 | Ready (uma-work 0.1.0) |
| [SC4](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/handoff/tasks/SC4-rpg-work-screens.md) | uma-rpg on `uma-kit/work`'s screens | uma-rpg | Either | M | SC2, SC3 | Waiting |
| [SC5](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SC5-racer-on-uma-work.md) | uma-racer on `uma-work` and `uma-kit/work` | uma-racer | Either | L | SC1, SC2 | Waiting |
| **Phase D: places, profile and getting in** | | | | | | |
| SD1 | `@luismlorenzana/uma-server`: the NestJS auth guard | uma-platform | Either | M | — | Done (`1824879`, 0.1.0) |
| SD2 | `uma-kit/auth` and `uma-kit/places`: boot gates, Account, Warehouse, Exchange, profile | uma-platform | Either | L | — | Done (`b9247da`, 0.5.0) |
| [SD3](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/handoff/tasks/SD3-rpg-places.md) | uma-rpg on SD1 and SD2 | uma-rpg | Either | M | SD1, SD2 | Ready (uma-server 0.1.0, uma-kit 0.5.0) |
| [SD4](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SD4-racer-places.md) | uma-racer on SD1 and SD2 | uma-racer | Either | M | SD1, SD2 | Ready (uma-server 0.1.0, uma-kit 0.5.0) |
| **Phase E: platform plumbing** | | | | | | |
| [SE1](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SE1-racer-phase-5.md) | uma-racer's phase 5: uma-data and its art families; its own pipeline goes | uma-racer | Claude | L | — | Ready |
| SE2 | `uma-kit/content` and `uma-server/content`: art loading and the content proxy | uma-platform | Either | M | SD1 | Done (`5aaeb93`, kit 0.6.0, server 0.2.0) |
| [SE3](https://github.com/luismlorenzana/uma-rpg/blob/main/docs/handoff/tasks/SE3-rpg-content.md) | uma-rpg on SE2 | uma-rpg | Either | S | SE2 | Ready (uma-kit 0.6.0, uma-server 0.2.0) |
| [SE4](https://github.com/luismlorenzana/uma-racer/blob/main/docs/handoff/tasks/SE4-racer-content.md) | uma-racer on SE2 | uma-racer | Either | M | SE1, SE2 | Waiting |
| **Parked** | | | | | | |
| [SE5](tasks/SE5-shared-push.md) | Push shared (`uma-server/push`) | uma-platform, uma-rpg | — | M | The owner asks for push in uma-racer | Parked |

**Ready now, in parallel:** SB3, SB5, SC3, SD3, SD4, SE1, SE3.

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
| SA7 | The plaza crowd in uma-racer, uma-kit 0.3.0 (its D371) | `9723a23` (release `0737c9f`) |
| SC1 | `@luismlorenzana/uma-work` 0.1.0, one work engine for both games (P53) | `ed446b8` (release `29a37d5`) |
| SD1 | `@luismlorenzana/uma-server` 0.1.0 with `/auth`, the shared API guard (P54) | `1824879` (release `09f6d52`) |
| SB2 | `uma-kit/roster`, the album engine and level rule, uma-kit 0.4.0 (P55) | `c518093` (release `f7f6e51`) |
| SD2 | `uma-kit/auth` and `uma-kit/places`, uma-kit 0.5.0 (P56) | `b9247da` (release `8b3e26b`) |
| SE2 | Shared content loading and proxy, uma-kit 0.6.0 and uma-server 0.2.0 (P57) | `5aaeb93` (release `8ad4354`) |
| SB1 | `outfit-faces`: a face crop per outfit in uma-data 1.1.0 | `516cb84` (release `11cf2ea880df`) |
