// `pnpm ranker:pull`: mirrors the live `gs://uma-platform-content/ranker/` into the local copy, so every local tool and
// session on this computer reads the same Ranker (RK1, AP17, P155): the boards, profiles and plan, and the catalog
// files the local app needs to show the same boards (the enemy catalog, the imports, the hints, the enemy pictures and
// the archive). The mirror is additive: a changed file is replaced by the bucket's, and nothing local is deleted. The
// plan is also copied to `content/authoring/tiers/plan.json`, where the sprite queue and the Story Sandboxes read it. It
// records the profiles' generation, so `ranker:push --profiles` can only replace the version pulled.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { content, gcloud, mirror, REMOTE } from './lib.js'

mkdirSync(mirror, { recursive: true })
gcloud(['rsync', REMOTE, mirror, '--recursive'])
const generation = gcloud(['objects', 'describe', `${REMOTE}/profiles.json`, '--format=value(generation)']).trim()
writeFileSync(resolve(mirror, '.profiles-generation'), `${generation}\n`)
mkdirSync(resolve(content, 'authoring/tiers'), { recursive: true })
copyFileSync(resolve(mirror, 'plan.json'), resolve(content, 'authoring/tiers/plan.json'))
console.log(`Mirrored the live Ranker (profiles generation ${generation}) into ${mirror}; the plan is also at content/authoring/tiers/plan.json.`)
