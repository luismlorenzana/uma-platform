import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { castOf, folderOf, prepareCast, rankerUnits, slugOf, type CharacterRecord } from './enemy-cast.js'

// An invented Ranker and cast: invented Umas, enemies, factions and picture bytes, never a real one (P200).
const folders: string[] = []
const temp = () => { const d = mkdtempSync(join(tmpdir(), 'cast-test-')); folders.push(d); return d }
afterEach(() => { for (const d of folders.splice(0)) rmSync(d, { recursive: true, force: true }) })
const put = (file: string, body: string | Buffer) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body) }
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

const member = (id: string, name: string, tier = 'S') => ({ id, name, franchise: 'invented', tier, fits: true })
function ranker(umas: unknown[]): string {
  const dir = temp()
  put(join(dir, 'plan.json'), JSON.stringify({ enemyCasts: { 'neon-city': {
    game: 'neon-city', revision: 7, updatedAt: '2026-01-02T00:00:00.000Z', factions: [{ id: 'f1', title: 'Faction 1', color: '#d9485f' }],
    tiers: [{ tier: 'T1', umas }, { tier: 'T2', umas: [{ uma: '9009', name: 'Rider Nine', order: 1, faction: null, boss: null, subBosses: [null, null, null] }] }],
  } } }))
  put(join(dir, 'catalog', 'enemies.json'), JSON.stringify({ units: [
    { id: 'foe-boss', name: 'Foe Boss', franchise: 'invented', images: { art: 'assets/enemies/foe-boss-art.aa.webp', face: 'assets/enemies/foe-boss-face.bb.webp' } },
    { id: 'foe-a', name: 'Foe A', franchise: 'invented', images: { art: 'assets/enemies/foe-a-art.cc.webp' } },
  ] }))
  put(join(dir, 'imports', 'other.json'), JSON.stringify({ franchise: 'other', units: [
    { id: 'foe-b', name: 'Foe B', images: { art: 'assets/enemies/foe-b-art.dd.webp', splash: 'assets/enemies/foe-b-splash.ee.webp' } },
    { id: 'foe-c', name: 'Foe C', images: { art: 'assets/enemies/foe-c-art.ff.webp' } },
  ] }))
  for (const f of ['foe-boss-art.aa', 'foe-boss-face.bb', 'foe-a-art.cc', 'foe-b-art.dd', 'foe-b-splash.ee', 'foe-c-art.ff']) put(join(dir, 'assets', 'enemies', `${f}.webp`), `invented picture ${f}`)
  return dir
}
const UMA = { uma: '9001', name: 'Rider One', order: 1, faction: 'f1', boss: member('foe-boss', 'Foe Boss', 'SS'), subBosses: [member('foe-a', 'Foe A'), member('foe-b', 'Foe B'), member('foe-c', 'Foe C')] }

describe('the enemy cast (P200)', () => {
  it('reads the plan’s cast, Umas with a boss only, and every unit’s pictures from the catalog and the imports', () => {
    const dir = ranker([UMA])
    const cast = castOf(JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8')), 'neon-city')
    expect(cast.umas.map((u) => [u.name, u.tier, u.faction?.title, u.boss?.name, u.lieutenants.map((l) => l.name)])).toEqual([['Rider One', 'T1', 'Faction 1', 'Foe Boss', ['Foe A', 'Foe B', 'Foe C']]])
    const units = rankerUnits(dir)
    expect([units.get('foe-b')?.franchise, Object.keys(units.get('foe-b')!.images)]).toEqual(['other', ['art', 'splash']])
    expect(folderOf(cast.umas[0]!, cast.umas[0]!.boss!)).toBe('cast/tier-1/01-rider-one/foe-boss')
    expect([slugOf('Ego (Elysia)', 'x'), slugOf('Ægir', 'x'), slugOf('…', 'unit-1')]).toEqual(['ego-elysia', 'gir', 'unit-1'])
    expect(() => castOf({}, 'neon-city')).toThrow(/no enemy cast/)
  })

  it('gives each app its characters, each with her references byte for byte and her record; again, it changes nothing', () => {
    const dir = ranker([UMA]), u = temp()
    const reports = prepareCast(u, 'neon-city', { ranker: dir })
    expect(reports.map((r) => [r.app, r.characters, r.created.length])).toEqual([['bosses', 1, 1], ['casual', 1, 1], ['lieutenants', 3, 3]])
    const boss = join(u, 'enemies', 'cast', 'tier-1', '01-rider-one', 'foe-boss')
    expect(readFileSync(join(boss, 'references', 'art.webp'))).toEqual(readFileSync(join(dir, 'assets', 'enemies', 'foe-boss-art.aa.webp')))
    const record = JSON.parse(readFileSync(join(boss, 'character.json'), 'utf8')) as CharacterRecord
    expect(record).toMatchObject({ kind: 'enemy-cast-character', app: 'bosses', role: 'boss', id: 'foe-boss', name: 'Foe Boss', rankerTier: 'SS', uma: { name: 'Rider One', tier: 'T1', order: 1 }, faction: { title: 'Faction 1' }, castRevision: 7 })
    expect(record.references.map((r) => [r.kind, r.file, r.sha256])).toEqual([['art', 'references/art.webp', sha(Buffer.from('invented picture foe-boss-art.aa'))], ['face', 'references/face.webp', sha(Buffer.from('invented picture foe-boss-face.bb'))]])
    expect(existsSync(join(u, 'enemies', 'casual', 'cast', 'tier-1', '01-rider-one', 'foe-boss', 'references', 'art.webp'))).toBe(true)
    expect(existsSync(join(u, 'enemies', 'lieutenants', 'cast', 'tier-1', '01-rider-one', 'foe-b', 'references', 'splash.webp'))).toBe(true)
    // Each app's album words, once.
    expect(JSON.parse(readFileSync(join(u, 'enemies', 'lieutenants', 'cast', 'album.json'), 'utf8'))).toMatchObject({ kind: 'cast-album', noun: 'lieutenant', plural: 'lieutenants' })
    expect(prepareCast(u, 'neon-city', { ranker: dir }).map((r) => [r.created.length, r.unchanged])).toEqual([[0, 1], [0, 1], [0, 3]])
  })

  it('moves a re-cast character with her work, refreshes a changed reference, keeps one no longer cast, and writes nothing on a dry run', () => {
    const dir = ranker([UMA]), u = temp()
    prepareCast(u, 'neon-city', { ranker: dir })
    const old = join(u, 'enemies', 'lieutenants', 'cast', 'tier-1', '01-rider-one', 'foe-c')
    put(join(old, 'v001', 'images', 'study.png'), 'her work')
    // Foe C now serves another Uma; Foe A leaves the cast; Foe B's art changes.
    const two = { uma: '9002', name: 'Rider Two', order: 2, faction: 'f1', boss: member('foe-boss-2', 'Foe Boss Two', 'SS'), subBosses: [member('foe-c', 'Foe C')] }
    const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'))
    plan.enemyCasts['neon-city'].tiers[0].umas = [{ ...UMA, subBosses: [member('foe-b', 'Foe B')] }, two]
    writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan))
    writeFileSync(join(dir, 'assets', 'enemies', 'foe-b-art.dd.webp'), 'a new invented picture')
    const dry = prepareCast(u, 'neon-city', { ranker: dir, dryRun: true })
    expect(dry[2]!.moved).toEqual(['cast/tier-1/01-rider-one/foe-c → cast/tier-1/02-rider-two/foe-c'])
    expect(existsSync(join(old, 'v001', 'images', 'study.png'))).toBe(true)
    const r = prepareCast(u, 'neon-city', { ranker: dir })[2]!
    expect(r.moved).toHaveLength(1)
    expect(readFileSync(join(u, 'enemies', 'lieutenants', 'cast', 'tier-1', '02-rider-two', 'foe-c', 'v001', 'images', 'study.png'), 'utf8')).toBe('her work')
    expect(r.references).toEqual(['cast/tier-1/01-rider-one/foe-b/references/art.webp'])
    expect(r.leftover).toEqual(['foe-a (cast/tier-1/01-rider-one/foe-a): no longer cast here; her folder stays'])
    expect(existsSync(join(u, 'enemies', 'lieutenants', 'cast', 'tier-1', '01-rider-one', 'foe-a', 'character.json'))).toBe(true)
    // A boss the Ranker has no pictures of is reported, never half-made.
    expect(prepareCast(u, 'neon-city', { ranker: dir })[0]!.missing).toEqual(['foe-boss-2: no pictures in the Ranker'])
  })
})
