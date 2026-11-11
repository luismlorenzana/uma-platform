// `pnpm ranker:pull`: brings the live boards, profiles and plan from `gs://uma-platform-content/ranker/` to the local
// copy, and the plan to `content/authoring/tiers/plan.json`, where the local tools read it (RK1, AP17). It records the
// profiles' generation, so `ranker:push --profiles` can only replace the version pulled.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { content, gcloud, mirror, REMOTE } from './lib.js'

mkdirSync(resolve(mirror, 'boards'), { recursive: true })
gcloud(['cp', `${REMOTE}/boards/*.json`, `${resolve(mirror, 'boards')}/`])
gcloud(['cp', `${REMOTE}/profiles.json`, `${REMOTE}/plan.json`, `${mirror}/`])
const generation = gcloud(['objects', 'describe', `${REMOTE}/profiles.json`, '--format=value(generation)']).trim()
writeFileSync(resolve(mirror, '.profiles-generation'), `${generation}\n`)
mkdirSync(resolve(content, 'authoring/tiers'), { recursive: true })
copyFileSync(resolve(mirror, 'plan.json'), resolve(content, 'authoring/tiers/plan.json'))
console.log(`Pulled the live boards, profiles (generation ${generation}) and plan into ${mirror}; the plan is also at content/authoring/tiers/plan.json.`)
