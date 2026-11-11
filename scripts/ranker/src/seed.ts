// `pnpm ranker:seed`: builds the Ranker's local copy (`content/authoring/ranker/`) from the old files, once (RK1, P131):
// the old boards, the enemy catalog and imports with their images, the old rosters as hints, and Claude's profiles. It
// keeps the old per-character Playable Umas board in `archive/`. It refuses to replace boards already seeded unless
// given --force. Nothing it reads or writes goes in git.
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { BOARDS, IMPORTED, parseEnemyCatalog, parseEnemyImport, parseLegacyUmasBoard, type EnemyImport } from '@uma-platform/tiers'
import { content, localRelease, mirror, parseAuthored, releaseInputs, seedMirror } from './lib.js'

const force = process.argv.includes('--force')
const authoring = resolve(content, 'authoring')
const maybe = async (path: string): Promise<unknown | undefined> => {
  try { return JSON.parse(await readFile(path, 'utf8')) as unknown } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error }
}
const write = async (path: string, value: unknown) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }) }

const existing = await readdir(resolve(mirror, 'boards')).catch(() => [] as string[])
if (existing.length && !force) throw new Error(`${mirror}/boards already holds ${existing.length} boards. Pull the live ones instead, or pass --force to rebuild from the old files.`)

const oldBoards = Object.fromEntries((await Promise.all(BOARDS.filter((b) => b.id !== 'umas').map(async (b) => [b.id, await maybe(resolve(authoring, `tiers/${b.id}.json`))] as const))).filter(([, v]) => v !== undefined))
const oldUmasRaw = await maybe(resolve(authoring, 'tiers/umas.json'))
const oldUmas = oldUmasRaw === undefined ? null : parseLegacyUmasBoard(oldUmasRaw)
const roster = await maybe(resolve(authoring, 'uma-art-roster.json')) as { rankings?: { outfitId: number; characterId: number; tier: string }[] } | undefined
const enemyRoster = await maybe(resolve(authoring, 'enemy-art-roster.json')) as { rankings?: { enemyId: string; bucket: 'regular' | 'elite' | 'boss'; tier: string | null; note: string }[] } | undefined
const enemiesRaw = await maybe(resolve(authoring, 'enemies/catalog.json'))
const imports = (await Promise.all(IMPORTED.map(async (f) => { const v = await maybe(resolve(authoring, `enemies/imports/${f}.json`)); return v === undefined ? null : parseEnemyImport(v) }))).filter((i): i is EnemyImport => i !== null)
const authoredRaw = await maybe(resolve(mirror, 'profiles.json'))

const now = new Date().toISOString()
const out = seedMirror({
  release: await releaseInputs(localRelease()),
  enemies: enemiesRaw === undefined ? null : parseEnemyCatalog(enemiesRaw),
  imports, oldBoards, oldUmas,
  outfitRoster: (roster?.rankings ?? []).map((r) => ({ outfitId: r.outfitId, characterId: r.characterId, tier: r.tier })),
  enemyRoster: (enemyRoster?.rankings ?? []).map((r) => ({ enemyId: r.enemyId, bucket: r.bucket, tier: r.tier, note: r.note })),
  authored: authoredRaw === undefined ? null : parseAuthored(authoredRaw),
  now,
})

for (const b of BOARDS) await write(resolve(mirror, `boards/${b.id}.json`), out.boards[b.id])
if (oldUmasRaw !== undefined) await write(resolve(mirror, `archive/umas.v1.r${oldUmas!.revision}.json`), oldUmasRaw)
await write(resolve(mirror, 'profiles.json'), out.profiles)
await write(resolve(mirror, 'legacy.json'), out.legacy)
if (enemiesRaw !== undefined) await write(resolve(mirror, 'catalog/enemies.json'), enemiesRaw)
for (const i of imports) await write(resolve(mirror, `imports/${i.franchise}.json`), i)
let copied = 0
for (const path of out.images) {
  await mkdir(dirname(resolve(mirror, path)), { recursive: true })
  await copyFile(resolve(authoring, 'enemies', path), resolve(mirror, path)); copied++
}
await write(resolve(mirror, 'plan.json'), out.plan)

const umas = out.boards.umas.entries
console.log(`Seeded ${mirror}: ${BOARDS.length} boards (Playable Umas: ${umas.length} outfits on ${new Set(umas.map((e) => e.tier)).size} tiers), ` +
  `${out.profiles.sisters.length} sisters, ${Object.keys(out.profiles.characters).length} character picks, ${out.catalog.umas.length} Umas, ${out.catalog.enemies.length} enemies, ${copied} images.`)
if (out.dropped.length) console.log(`Dropped old default-outfit picks that are now sisters' outfits: ${out.dropped.join(', ')}`)
