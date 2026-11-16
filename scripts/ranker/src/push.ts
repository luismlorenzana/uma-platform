// `pnpm ranker:push`: uploads the local copy to `gs://uma-platform-content/ranker/` (RK1, AP16, AP18). The boards and the
// profiles go only where the bucket has none: after the first push the bucket is the source of truth, and the Ranker
// edits it. The enemy catalog, the removed list, the imports of today's franchises and the hints are replaced with the
// local ones; images and archives are added, never replaced. A removed franchise's files (P195) are never sent.
// `--profiles` replaces the profiles too, but only over the exact version last pulled (Claude's authoring).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BOARDS, buildCatalog, emptyLegacy, IMPORTED, parseProfiles, profileProblems } from '@uma-platform/tiers'
import { gcloud, localRelease, mirror, releaseInputs, REMOTE } from './lib.js'

const local = (path: string) => resolve(mirror, path)
const has = (remote: string) => gcloud(['ls', remote], { allowFail: true }).trim() !== ''
const put = (path: string, args: string[] = []) => { gcloud(['cp', ...args, local(path), `${REMOTE}/${path}`]); console.log(`  ${path}`) }

if (!existsSync(local('boards'))) throw new Error(`Nothing to push: run pnpm ranker:seed first (${mirror}).`)
console.log(`Pushing ${mirror} → ${REMOTE}`)
for (const b of BOARDS) {
  const path = `boards/${b.id}.json`
  if (has(`${REMOTE}/${path}`)) console.log(`  ${path}: kept the bucket's (the live board)`)
  else put(path, ['--if-generation-match=0'])
}
if (process.argv.includes('--profiles')) {
  // Claude's authoring goes around the API, so it gets the API's checks here: it must fit the catalog, it takes the next
  // revision, and it replaces only the version pulled.
  const profiles = parseProfiles(JSON.parse(readFileSync(local('profiles.json'), 'utf8')) as unknown)
  const catalog = buildCatalog({ ...await releaseInputs(localRelease()), enemies: null, imports: [], legacy: emptyLegacy() })
  const problems = profileProblems(profiles, catalog)
  if (problems.length) throw new Error(`The profiles don't fit the catalog: ${problems.join(' ')}`)
  writeFileSync(local('profiles.json'), `${JSON.stringify({ ...profiles, revision: profiles.revision + 1, updatedAt: new Date().toISOString() }, null, 2)}\n`)
  const pulled = existsSync(local('.profiles-generation')) ? readFileSync(local('.profiles-generation'), 'utf8').trim() : '0'
  put('profiles.json', [`--if-generation-match=${pulled}`])
} else if (has(`${REMOTE}/profiles.json`)) console.log('  profiles.json: kept the bucket\'s (pass --profiles after a pull to replace it)')
else put('profiles.json', ['--if-generation-match=0'])
for (const path of ['legacy.json', 'catalog/enemies.json', 'catalog/removed.json', ...IMPORTED.map((f) => `imports/${f}.json`)]) if (existsSync(local(path))) put(path)
// Pictures: only the ones the private catalog and today's imports name (a removed franchise's never go up), new files only.
const named = new Set([local('catalog/enemies.json'), ...IMPORTED.map((f) => local(`imports/${f}.json`))].filter((p) => existsSync(p))
  .flatMap((p) => (JSON.parse(readFileSync(p, 'utf8')) as { units: { images: Record<string, string> }[] }).units.flatMap((u) => Object.values(u.images))))
const assets = existsSync(local('assets/enemies')) ? readdirSync(local('assets/enemies')).filter((f) => named.has(`assets/enemies/${f}`)) : []
if (assets.length) {
  gcloud(['cp', '--no-clobber', '--read-paths-from-stdin', `${REMOTE}/assets/enemies/`], { input: assets.map((f) => local(`assets/enemies/${f}`)).join('\n') })
  console.log(`  assets/enemies/ (${assets.length} files, new ones only)`)
}
if (existsSync(local('archive'))) { gcloud(['cp', '--recursive', '--no-clobber', local('archive'), `${REMOTE}/`]); console.log('  archive/ (new files only)') }
console.log('Done. The Ranker rebuilds its catalog on its next start, or from its Reload button.')
