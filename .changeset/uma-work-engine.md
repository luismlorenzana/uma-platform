---
'@luismlorenzana/uma-work': minor
---

New package: the one work engine both Uma games run (SC1, P53). uma-racer's engine, generalized: per-Uma work rows,
frozen per-item plans, a queue of 3 kept as `dropped` when it can't start, `last` for Repeat, settle on read, Speed
Tickets and Finish, Recall and building upgrades, with uma-rpg's `planRequirements`. Each game plugs in its kinds,
buildings (`buildingTable`), tickets, EXP, money and ledger through `WorkEnv`. Pure, with ESM and CJS builds.
