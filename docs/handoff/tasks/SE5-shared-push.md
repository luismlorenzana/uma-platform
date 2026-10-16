# SE5 — Push shared (`uma-server/push` and a kit client): parked

**uma-platform and uma-rpg · Claude · M · Parked until the owner asks for push in uma-racer (uma-racer D336).**

## Why it's parked

Only uma-rpg has push today. uma-racer's D336 adds it only if the owner asks after playing. Extracting it now would
give a package one user, which platform P11 ("extract on second use") rules out.

## When the owner asks

1. **Server:** move uma-rpg's `apps/api/src/push/` into `@luismlorenzana/uma-server/push`:
   - `push.controller.ts`, `push.module.ts`, `push.repository.ts`, `push.sender.ts`, `push.service.ts` with its test;
   - `scheduler.guard.ts`, the Cloud Scheduler OIDC guard.

   It becomes `PushModule.forRoot({ vapidKeys, schedulerEmail, audience, repository, workDone })`, where `workDone`
   reads finish times from `@luismlorenzana/uma-work` state (SC1). Each game supplies how to read its saves.
2. **Web:** move uma-rpg's `apps/web/src/push/push.ts` and `NotificationsCard.tsx` into `uma-kit/push`, with
   `push-sw.js`'s notification and badge handling documented for each game's service worker.
3. **Adopt:** uma-rpg on both, unchanged in behaviour; uma-racer on both, with its own words and its own Cloud
   Scheduler job (an infra step in its project; follow its `docs/game/architecture.md`).
4. **Done when** both games send "Work done", tapping opens the place, and the app badge counts ready slots, checked on
   the owner's phone. Log P- and D-decisions.

Until then, nothing to do.
