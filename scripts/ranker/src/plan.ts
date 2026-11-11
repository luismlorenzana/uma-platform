// `pnpm ranker:plan`: rebuilds the bucket's `plan.json` the way the Ranker's `GET /api/ranker/plan` does, for a change
// that went around the API (Claude's `ranker:push --profiles`, P138). The catalog is built as the API builds it: the
// release (`content/release`, which must be the live one), plus the Ranker's own enemies, imports and hints from the
// bucket. The boards and profiles are the live ones. The plan replaces only the version it read, and lands in the local
// copy too.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  BOARDS, buildCatalog, emptyBoard, emptyLegacy, IMPORTED, parseBoard, parseEnemyCatalog, parseEnemyImport, parseLegacy, parseProfiles, tierPlan,
  type BoardId, type BoardState, type BoardStates, type EnemyImport,
} from '@uma-platform/tiers'
import { content, gcloud, localRelease, mirror, releaseInputs, REMOTE } from './lib.js'

const work = mkdtempSync(join(tmpdir(), 'ranker-plan-'))
try {
  // The bucket's side, as it is now: boards, profiles, the catalog files, and the plan's generation to replace.
  for (const dir of ['boards', 'catalog', 'imports']) mkdirSync(join(work, dir))
  gcloud(['cp', `${REMOTE}/boards/*.json`, `${join(work, 'boards')}/`])
  gcloud(['cp', `${REMOTE}/profiles.json`, `${work}/`])
  gcloud(['cp', `${REMOTE}/legacy.json`, `${work}/`], { allowFail: true })
  gcloud(['cp', `${REMOTE}/catalog/enemies.json`, `${join(work, 'catalog')}/`], { allowFail: true })
  gcloud(['cp', `${REMOTE}/imports/*.json`, `${join(work, 'imports')}/`], { allowFail: true })
  const generation = gcloud(['objects', 'describe', `${REMOTE}/plan.json`, '--format=value(generation)'], { allowFail: true }).trim() || '0'
  const read = (path: string): unknown => JSON.parse(readFileSync(join(work, path), 'utf8')) as unknown
  const optional = (path: string): unknown => (existsSync(join(work, path)) ? read(path) : null)

  const release = await releaseInputs(localRelease())
  const enemies = optional('catalog/enemies.json'), legacy = optional('legacy.json')
  const imports = IMPORTED.map((f) => optional(`imports/${f}.json`)).filter((v) => v !== null).map((v) => parseEnemyImport(v)) as EnemyImport[]
  const catalog = buildCatalog({ ...release, enemies: enemies === null ? null : parseEnemyCatalog(enemies), imports, legacy: legacy === null ? emptyLegacy() : parseLegacy(legacy) })
  const boards = Object.fromEntries(BOARDS.map((b): [BoardId, BoardState] => {
    const raw = optional(`boards/${b.id}.json`)
    return [b.id, raw === null ? emptyBoard(b.id) : parseBoard(raw, b.id)]
  })) as BoardStates
  const plan = tierPlan(catalog, boards, parseProfiles(read('profiles.json')), new Date().toISOString())

  const out = resolve(mirror, 'plan.json')
  writeFileSync(out, `${JSON.stringify(plan, null, 2)}\n`)
  writeFileSync(resolve(content, 'authoring/tiers/plan.json'), `${JSON.stringify(plan, null, 2)}\n`)
  gcloud(['cp', `--if-generation-match=${generation}`, out, `${REMOTE}/plan.json`])
  const umas = plan.identities.filter((i) => !i.notUsed)
  console.log(`Rebuilt the plan from release ${release.release}, profiles revision ${plan.profilesRevision}: ${umas.length} Umas in batches, ${umas.filter((i) => i.sister).length} of them sisters.`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
