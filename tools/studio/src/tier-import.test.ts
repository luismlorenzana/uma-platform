import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'
import { parseEnemyImport } from './tier-catalog.js'
import { BOARDS, type TierCatalog } from './tier-model.js'
import { encode, genshinCandidates, wuwaCandidates, type AmberAvatar, type EncoreDetail } from './tier-sources.js'
import { TierConflict, TierStore } from './tier-store.js'

// Invented records and generated pixels only.
const look = (id: number) => ({ id, title: `Look ${id}`, original: true, way: 'front' as const, face: null, portrait: null, before: null })
const catalog: TierCatalog = { release: 'synthetic', enemies: [],
  umas: [{ id: '701', name: 'Runner 701', face: null, portrait: null, outfits: [look(70101)] }, { id: '702', name: 'Runner 702', face: null, portrait: null, outfits: [look(70201)] }] }
const avatar = (id: number, name: string, bodyType: string, release = 1_600_000_000): AmberAvatar =>
  ({ id, rank: 4, name, element: 'Ice', weaponType: 'WEAPON_POLE', region: 'NORTHLAND', bodyType, icon: `UI_AvatarIcon_X${id}`, release })

describe('the Genshin Impact list', () => {
  it('keeps released female characters once, with their facts and three images', () => {
    const list = genshinCandidates([avatar(3, 'Tester', 'BOY'), avatar(1, 'Ilse', 'LADY'), avatar(2, 'Wren', 'LOLI'), avatar(4, 'Ilse', 'GIRL'), avatar(5, 'Later', 'GIRL', 4_000_000_000)], 2_000_000_000_000)
    expect(list.map((c) => c.name)).toEqual(['Ilse', 'Wren'])
    expect(list[0]).toMatchObject({ key: '1', category: 'playable', details: ['4★', 'Cryo', 'Polearm', 'Northland'] })
    expect(Object.keys(list[0]!.images)).toEqual(['face', 'art', 'splash'])
    expect(genshinCandidates([{ ...avatar(6, 'Blank', 'GIRL'), element: '', region: 'MAINACTOR' }], 2_000_000_000_000)[0]?.details).toEqual(['4★', 'Polearm'])
  })
})

describe('the Wuthering Waves list', () => {
  const detail = (Id: number, sex: string, more: Partial<EncoreDetail> = {}): EncoreDetail => ({ Id, RoleType: 1, IsTrial: false, favorRole: { Sex: { Content: sex } }, RoleHeadIconLarge: `https://x/api/resource/f${Id}.webp`, RolePortrait: `https://x/api/resource/p${Id}.webp`, ...more })
  it('keeps playable female resonators, the Rover once, and falls back to a skin preview for art', () => {
    const list = wuwaCandidates([
      { role: { Id: 2, Name: 'Rover: Frost', QualityId: 5 }, detail: detail(2, 'Female') },
      { role: { Id: 3, Name: 'Rover: Gale', QualityId: 5 }, detail: detail(3, 'Female') },
      { role: { Id: 4, Name: 'Odo', QualityId: 4 }, detail: detail(4, 'Male') },
      { role: { Id: 5, Name: 'Trial', QualityId: 4 }, detail: detail(5, 'Female', { IsTrial: true }) },
      { role: { Id: 6, Name: 'Mira', QualityId: 4, Element: { Name: 'Aero' } }, detail: detail(6, '', { RoleBody: 'FemaleS', Skins: [{ PreviewRoleCard: 'https://x/api/resource/s6.webp' }] }) },
    ])
    expect(list.map((c) => c.name)).toEqual(['Rover', 'Mira'])
    expect(list[1]).toMatchObject({ key: '6', details: ['4★', 'Aero'], images: { art: { url: 'https://x/resource/p6.webp', fallbacks: ['https://x/resource/s6.webp'] } } })
  })
})

describe('the image cuts', () => {
  it('cuts a face, a centre figure and a splash, never upscaling', async () => {
    const wide = await sharp({ create: { width: 900, height: 300, channels: 4, background: { r: 200, g: 80, b: 40, alpha: 1 } } }).png().toBuffer()
    const size = async (b: Buffer) => { const m = await sharp(b).metadata(); return [m.format, m.width, m.height] }
    expect(await size(await encode(wide, 'face'))).toEqual(['webp', 128, 128])
    expect(await size(await encode(wide, 'center-figure'))).toEqual(['webp', 200, 300])
    expect(await size(await encode(wide, 'splash'))).toEqual(['webp', 900, 300])
  })
})

describe('an import file', () => {
  const file = { schemaVersion: 1, kind: 'enemy-import', franchise: 'genshin', source: 'invented', filter: 'female characters', importedAt: '2026-01-01T00:00:00Z',
    units: [{ id: 'gi-1', name: 'Ilse', category: 'playable', details: ['4★'], images: { face: 'assets/enemies/gi-1-face.0123abcd.webp' } }] }
  it('accepts its own image paths only', () => {
    expect(parseEnemyImport(file).units[0]?.images.face).toBe('assets/enemies/gi-1-face.0123abcd.webp')
    for (const path of ['../x.webp', 'assets/enemies/gi-2-face.0123abcd.webp', 'assets/enemies/gi-1-face.png', '/abs/gi-1-face.0123abcd.webp']) {
      expect(() => parseEnemyImport({ ...file, units: [{ ...file.units[0], images: { face: path } }] })).toThrow()
    }
    expect(() => parseEnemyImport({ ...file, units: [{ ...file.units[0], id: 'ww-1' }] })).toThrow()
    expect(() => parseEnemyImport({ ...file, franchise: 'elsewhere' })).toThrow()
  })
})

describe('the tier store', () => {
  const dirs: string[] = []
  afterAll(async () => { for (const d of dirs) await rm(d, { recursive: true, force: true }) })
  it('seeds missing boards once, checks revisions, rejects unknown ids and rewrites the plan', async () => {
    const content = await mkdtemp(join(tmpdir(), 'tier-store-')); dirs.push(content)
    const store = new TierStore(content, catalog)
    expect(await store.ensure({ outfits: [{ outfitId: 70101, characterId: 701, tier: 'SS' }], enemies: [] })).toEqual(BOARDS.map((b) => b.id))
    const umas = await store.read('umas')
    expect(umas.entries).toEqual([{ id: '701', tier: 'SS', note: '' }])
    await writeFile(join(content, 'authoring/tiers/npcs.json'), JSON.stringify({ ...(await store.read('npcs')), entries: [{ id: '702', tier: 'S', note: '' }] }))
    expect(await store.ensure({ outfits: [], enemies: [] })).toEqual([])
    expect((await store.read('npcs')).entries).toHaveLength(1)
    const saved = await store.save('umas', { ...umas, entries: [{ id: '702', tier: 'A', note: '' }] })
    expect(saved.revision).toBe(umas.revision + 1)
    await expect(store.save('umas', umas)).rejects.toBeInstanceOf(TierConflict)
    await expect(store.save('umas', { ...saved, entries: [{ id: 'nobody', tier: 'A', note: '' }] })).rejects.toThrow(/not in the catalog/)
    const plan = JSON.parse(await readFile(join(content, 'authoring/tiers/plan.json'), 'utf8')) as { boards: { id: string; order: { id: string }[] }[] }
    expect(plan.boards.find((b) => b.id === 'umas')?.order.map((e) => e.id)).toEqual(['702'])
  })
})
