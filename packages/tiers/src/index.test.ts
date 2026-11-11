import { describe, expect, it } from 'vitest'
import {
  BOARDS, bestStyles, boardStats, buildCatalog, careerMath, defaultOutfit, emptyBoard, emptyLegacy, emptyProfiles, identities, leadOutfit, legacyCharacterTiers,
  migrateUmasBoard, move, ordered, outfitPick, parseBoard, parseEnemyImport, parseLegacy, parseLegacyUmasBoard, parseProfiles, place, playstyleCounts, playstyleOf,
  pools, profileProblems, profilesFromLegacy, rankedIdentities, seedBoards, setDefaultOutfit, setMember, setNote, setOut, setTier, shift, sisterId, tierPlan, tierStep,
  tiersOf, wayOf, type BoardId, type BoardState, type BoardStates, type EnemyUnit, type TierCatalog, type UmaCharacter, type UmaProfiles, type Way,
} from './index.js'

// Invented records only: no master data, no franchise names, no images.
const grades = { front: 'A', pace: 'B', late: 'C', end: 'G' }
const uma = (id: string, outfits: number[], ways: Way[] = []): UmaCharacter => ({
  id, name: `Runner ${id}`, face: null, portrait: null, before: null,
  outfits: outfits.map((o, i) => ({ id: o, title: `Look ${o}`, original: o % 100 === 1, way: ways[i] ?? 'front', strategy: grades, face: null, portrait: null, before: null })),
})
const unit = (id: string, franchise: EnemyUnit['franchise'], category: EnemyUnit['category'] = 'regular'): EnemyUnit => ({
  id, name: `Foe ${id}`, franchise, category, studyAvailable: false, images: {}, details: [], before: null,
})
const catalog: TierCatalog = {
  release: 'synthetic',
  umas: [uma('701', [70101, 70102, 70103], ['front', 'late', 'pace']), uma('702', [70201], ['pace']), uma('703', [70301], ['late-end']), uma('704', [70401, 70402])],
  enemies: [
    unit('al-a', 'azurlane', 'boss'), unit('al-b', 'azurlane', 'boss'), unit('al-c', 'azurlane', 'key'), unit('al-d', 'azurlane'),
    unit('gi-1', 'genshin', 'playable'), unit('gi-2', 'genshin', 'playable'), unit('ww-1', 'wuwa', 'playable'), unit('hsr-1', 'hsr', 'playable'), unit('zzz-1', 'zzz', 'playable'),
    unit('hi3-1', 'hi3', 'playable'), unit('hi3-2', 'hi3', 'playable'), unit('pgr-1', 'pgr', 'playable'), unit('nk-1', 'nikke'),
  ],
}
/** Runner 701's third look is her sister. */
const profiles: UmaProfiles = { ...emptyProfiles(), sisters: [{ outfitId: 70103, characterId: 701, name: 'Sister 701', relation: 'younger sister', age: 'an invented age', profile: 'Invented.' }] }
const empty = (): BoardStates => Object.fromEntries(BOARDS.map((b) => [b.id, emptyBoard(b.id)])) as BoardStates
const ids = (states: BoardStates, board: BoardId, p = profiles) => pools(catalog, states, p)[board].map((m) => m.id)

describe('the scales (P131)', () => {
  it('gives Playable Umas ten straight tiers and F, Uma NPCs SSS to F, every other board SS to F', () => {
    expect(tiersOf('umas').map((t) => t.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'F'])
    expect(tiersOf('npcs').map((t) => t.id)).toEqual(['SSS', 'SS', 'S', 'A', 'B', 'F'])
    expect(tiersOf('key-enemies').map((t) => t.id)).toEqual(['SS', 'S', 'A', 'B', 'F'])
  })
})

describe('pools', () => {
  it('puts every outfit on Playable Umas, and brings a character down to NPCs when none of her own outfits is ranked', () => {
    const states = empty()
    expect(ids(states, 'umas')).toEqual(['70101', '70102', '70103', '70201', '70301', '70401', '70402'])
    states.umas.entries = [{ id: '70102', tier: 'T3', note: '' }, { id: '70201', tier: 'T10', note: '' }]
    expect(ids(states, 'npcs')).toEqual(['703', '704'])
    // A sister's outfit ranks for the sister: her sister still comes down to NPCs.
    states.umas.entries = [{ id: '70103', tier: 'T1', note: '' }]
    expect(ids(states, 'npcs')).toEqual(['701', '702', '703', '704'])
    expect(pools(catalog, states, profiles).npcs[0]).toEqual({ id: '701', via: 'umas', viaTier: null })
  })
  it('puts the Azur Lane members on their board, every other Azur Lane unit on Key, and NIKKE on Regular', () => {
    const states = empty()
    states['azurlane-bosses'].members = ['al-a', 'al-b']
    states['azurlane-bosses'].entries = [{ id: 'al-a', tier: 'S', note: '' }, { id: 'al-b', tier: 'F', note: '' }]
    states['genshin-bosses'].entries = [{ id: 'gi-1', tier: 'SS', note: '' }]
    expect(ids(states, 'azurlane-bosses')).toEqual(['al-a', 'al-b'])
    expect(ids(states, 'key-enemies')).toEqual(['al-c', 'al-d', 'al-b', 'gi-2', 'ww-1', 'hsr-1', 'zzz-1', 'hi3-1', 'hi3-2', 'pgr-1'])
    states['key-enemies'].entries = [{ id: 'al-c', tier: 'A', note: '' }, { id: 'gi-2', tier: 'B', note: '' }]
    expect(ids(states, 'regular-enemies')).toEqual(['nk-1', 'al-d', 'al-b', 'gi-2', 'ww-1', 'hsr-1', 'zzz-1', 'hi3-1', 'hi3-2', 'pgr-1'])
  })
  it('takes a left-out unit off every board, and brings it back unranked', () => {
    const states = empty()
    states['hi3-bosses'] = setOut(setTier(states['hi3-bosses'], 'hi3-2', 'S'), 'hi3-2', true)
    expect(states['hi3-bosses']).toMatchObject({ entries: [], out: ['hi3-2'] })
    expect(ids(states, 'key-enemies')).not.toContain('hi3-2')
    states['hi3-bosses'] = setOut(states['hi3-bosses'], 'hi3-2', false)
    expect(ids(states, 'hi3-bosses')).toEqual(['hi3-1', 'hi3-2'])
  })
  it('counts every Playable tier as cast, and only SSS to A elsewhere', () => {
    const states = empty()
    states.umas.entries = [{ id: '70101', tier: 'T1', note: '' }, { id: '70201', tier: 'T10', note: '' }]
    expect(boardStats(pools(catalog, states, profiles).umas, states.umas)).toMatchObject({ pool: 7, ranked: 2, cast: 2, tiers: { T1: 1, T10: 1, T5: 0 } })
    states.npcs.entries = [{ id: '703', tier: 'SSS', note: '' }, { id: '704', tier: 'B', note: '' }]
    expect(boardStats(pools(catalog, states, profiles).npcs, states.npcs)).toMatchObject({ ranked: 2, cast: 1 })
  })
})

describe('tier F on Playable Umas (P133)', () => {
  it('is not a batch or the cast: her character still comes down to NPCs, and she sorts after the unranked', () => {
    const states = empty()
    states.umas.entries = [{ id: '70101', tier: 'F', note: '' }, { id: '70102', tier: 'F', note: '' }, { id: '70201', tier: 'T2', note: '' }]
    expect(boardStats(pools(catalog, states, profiles).umas, states.umas)).toMatchObject({ ranked: 3, cast: 1, tiers: { F: 2, T2: 1 } })
    expect(ids(states, 'npcs')).toEqual(['701', '703', '704'])
    expect(rankedIdentities(catalog, states, profiles).map((i) => `${i.id}:${i.tier ?? '-'}`)).toEqual(['702:T2', '703:-', '704:-', 's70103:-', '701:F'])
    const plan = tierPlan(catalog, states, profiles, 'x')
    expect(plan.careers.careers).toBe(1)
    expect(plan.identities.find((i) => i.id === '701')).toMatchObject({ tier: 'F', batch: null, notUsed: true })
    expect(plan.batches.flatMap((b) => b.outfits)).toEqual([70201])
    expect(plan.playableTiers.at(-1)).toBe('F')
  })
  it('takes F in a board file, and steps down into it from the bottom of T10', () => {
    const board = parseBoard({ ...emptyBoard('umas'), entries: [{ id: '70101', tier: 'T10', note: '' }, { id: '70201', tier: 'F', note: '' }] }, 'umas')
    expect(ordered(shift(board, '70101', 1, new Set(['70101', '70201'])), new Set(['70101', '70201'])).map((e) => `${e.id}:${e.tier}`)).toEqual(['70101:F', '70201:F'])
  })
})

describe('edits', () => {
  const base: BoardState = { ...emptyBoard('umas'), entries: [{ id: '70101', tier: 'T1', note: '' }, { id: '70201', tier: 'T1', note: 'n' }, { id: '70301', tier: 'T2', note: '' }] }
  const all = new Set(['70101', '70102', '70201', '70301', '70401'])
  const order = (s: BoardState) => ordered(s, all).map((e) => `${e.id}:${e.tier}`)
  it('sends a new tier to the end of that tier, and drops an unranked entry with no note', () => {
    expect(order(setTier(base, '70301', 'T1'))).toEqual(['70101:T1', '70201:T1', '70301:T1'])
    expect(setTier(base, '70101', null).entries.map((e) => e.id)).toEqual(['70201', '70301'])
    expect(setTier(base, '70201', null).entries.find((e) => e.id === '70201')).toEqual({ id: '70201', tier: null, note: 'n' })
    expect(setTier(base, '70101', 'T1')).toBe(base)
  })
  it('places before another entry, and moves within a tier', () => {
    expect(order(place(base, '70301', 'T1', '70101'))).toEqual(['70301:T1', '70101:T1', '70201:T1'])
    expect(order(move(base, '70201', -1, all))).toEqual(['70201:T1', '70101:T1', '70301:T2'])
    expect(move(base, '70101', -1, all)).toBe(base)
  })
  it('steps one place at a time across a tier’s edge, up and down (P131)', () => {
    // Up from the top of T2: the end of T1. Down from the end of T1: the start of T2.
    expect(order(shift(base, '70301', -1, all))).toEqual(['70101:T1', '70201:T1', '70301:T1'])
    expect(order(shift(base, '70201', 1, all))).toEqual(['70101:T1', '70201:T2', '70301:T2'])
    expect(order(shift(base, '70101', 1, all))).toEqual(['70201:T1', '70101:T1', '70301:T2'])
    // An empty tier is still a step: down from T2 lands in T3.
    expect(order(shift(base, '70301', 1, all))).toEqual(['70101:T1', '70201:T1', '70301:T3'])
    expect(shift(base, '70101', -1, all)).toBe(base)
    expect(shift(base, '70401', 1, all)).toBe(base)
    const bottom = setTier(base, '70401', 'F')
    expect(shift(bottom, '70401', 1, all)).toBe(bottom)
  })
  it('moves a whole tier up or down, landing next to the boundary', () => {
    expect(order(tierStep(base, '70101', 1, all))).toEqual(['70201:T1', '70101:T2', '70301:T2'])
    expect(order(tierStep(base, '70301', -1, all))).toEqual(['70101:T1', '70201:T1', '70301:T1'])
    expect(tierStep(base, '70101', -1, all)).toBe(base)
  })
  it('keeps notes on unranked entries, and adds or removes Azur Lane members', () => {
    expect(setNote(emptyBoard('npcs'), '704', 'a townsperson').entries).toEqual([{ id: '704', tier: null, note: 'a townsperson' }])
    const al = setMember({ ...emptyBoard('azurlane-bosses'), members: ['al-a'], entries: [{ id: 'al-a', tier: 'SS', note: '' }] }, 'al-a', false)
    expect(al).toMatchObject({ members: [], entries: [] })
    expect(setMember(al, 'al-c', true).members).toEqual(['al-c'])
  })
})

describe('files', () => {
  it('round-trips a board and rejects malformed ones', () => {
    const board = { ...emptyBoard('azurlane-bosses'), members: ['al-a'], entries: [{ id: 'al-a', tier: 'S', note: '' }] }
    expect(parseBoard(JSON.parse(JSON.stringify(board)) as unknown, 'azurlane-bosses')).toEqual(board)
    for (const bad of [
      { ...board, schemaVersion: 2 }, { ...board, board: 'elsewhere' }, { ...board, revision: -1 }, { ...board, members: undefined },
      { ...board, entries: [{ id: 'al-a', tier: 'T1', note: '' }] }, { ...board, entries: [{ id: '../x', tier: 'S', note: '' }] },
      { ...board, entries: [{ id: 'al-a', tier: 'S', note: '' }, { id: 'al-a', tier: 'B', note: '' }] },
    ]) expect(() => parseBoard(bad, 'azurlane-bosses')).toThrow()
    expect(() => parseBoard({ ...emptyBoard('genshin-bosses'), entries: [{ id: 'gi-1', tier: 'SSS', note: '' }] })).toThrow(/Uma NPCs only/)
  })
  it('takes Playable Umas as schema 2, outfit ids and T1 to T10 only', () => {
    const board = { ...emptyBoard('umas'), entries: [{ id: '70101', tier: 'T4', note: 'x' }] }
    expect(parseBoard(JSON.parse(JSON.stringify(board)) as unknown, 'umas')).toEqual(board)
    expect(() => parseBoard({ ...board, schemaVersion: 1 }, 'umas')).toThrow(/schemaVersion 2/)
    expect(() => parseBoard({ ...board, entries: [{ id: '70101', tier: 'SS', note: '' }] }, 'umas')).toThrow(/T1 to T10/)
    expect(() => parseBoard({ ...board, entries: [{ id: 'gi-1', tier: 'T1', note: '' }] }, 'umas')).toThrow()
    expect(() => parseBoard({ ...board, entries: [{ id: '70101', tier: 'T1', note: '', outfit: 70101 }] }, 'umas')).toThrow()
  })
  it('round-trips profiles and rejects malformed ones', () => {
    const p = { ...profiles, characters: { '704': { defaultOutfit: 70402, way: 'late' as const } } }
    expect(parseProfiles(JSON.parse(JSON.stringify(p)) as unknown)).toEqual(p)
    expect(() => parseProfiles({ ...p, sisters: [...p.sisters, p.sisters[0]] })).toThrow(/unique/)
    expect(() => parseProfiles({ ...p, characters: { x: {} } })).toThrow()
    expect(profileProblems(p, catalog)).toEqual([])
    expect(profileProblems({ ...p, characters: { '701': { defaultOutfit: 70103 } } }, catalog)).toEqual(['Character 701: default outfit 70103 belongs to a sister.'])
    expect(profileProblems({ ...p, sisters: [{ ...p.sisters[0]!, characterId: 702 }] }, catalog)).toHaveLength(1)
  })
  it('reads the franchise imports’ own image paths only', () => {
    const imported = { schemaVersion: 1, kind: 'enemy-import', franchise: 'genshin', source: 's', filter: 'f', importedAt: '2026-01-01', units: [{ id: 'gi-1', name: 'A', category: 'playable', details: [], images: { face: 'assets/enemies/gi-1-face.0a1b2c3d.webp' } }] }
    expect(parseEnemyImport(imported).units[0]?.images.face).toBe('assets/enemies/gi-1-face.0a1b2c3d.webp')
    expect(() => parseEnemyImport({ ...imported, units: [{ ...imported.units[0], images: { face: '../secret.webp' } }] })).toThrow()
  })
})

describe('identities and profiles (P131)', () => {
  it('makes a sister her own identity, with her outfit off her sister’s list', () => {
    const list = identities(catalog, profiles)
    expect(list.map((i) => i.id)).toEqual(['701', '702', '703', '704', sisterId(70103)])
    expect(list[0]!.outfits.map((o) => o.id)).toEqual([70101, 70102])
    expect(list[4]).toMatchObject({ name: 'Sister 701', characterId: '701', defaultOutfit: 70103, outfits: [{ id: 70103 }] })
  })
  it('locks in a default outfit of her own, never a sister’s, and her playstyle follows it', () => {
    const runner = catalog.umas[0]!
    expect(defaultOutfit(runner, profiles)?.id).toBe(70101)
    expect(setDefaultOutfit(profiles, runner, 70103)).toBe(profiles)
    const picked = setDefaultOutfit(profiles, runner, 70102)
    expect(picked.characters['701']).toEqual({ defaultOutfit: 70102 })
    expect([defaultOutfit(runner, picked)?.id, outfitPick(runner, picked), playstyleOf(runner, picked)]).toEqual([70102, 70102, 'late'])
    expect(playstyleOf(runner, { ...picked, characters: { '701': { defaultOutfit: 70102, way: 'front' } } })).toBe('front')
    // A playstyle only a sister's outfit has isn't hers to pick.
    expect(playstyleOf(runner, { ...picked, characters: { '701': { defaultOutfit: 70102, way: 'pace' } } })).toBe('late')
  })
  it('orders identities by their best-ranked outfit, then the unranked by name', () => {
    const states = empty()
    states.umas.entries = [{ id: '70301', tier: 'T1', note: '' }, { id: '70103', tier: 'T1', note: '' }, { id: '70102', tier: 'T2', note: '' }, { id: '70101', tier: 'T5', note: '' }]
    const ranked = rankedIdentities(catalog, states, profiles)
    expect(ranked.map((i) => `${i.id}:${i.tier ?? '-'}`)).toEqual(['703:T1', 's70103:T1', '701:T2', '702:-', '704:-'])
    expect(ranked[2]!.ranked).toEqual([{ outfitId: 70102, tier: 'T2', order: 3 }, { outfitId: 70101, tier: 'T5', order: 4 }])
  })
})

describe('moving the old boards (P131)', () => {
  const old = parseLegacyUmasBoard({ schemaVersion: 1, kind: 'tier-board', board: 'umas', revision: 102, updatedAt: '2026-11-11T00:00:00.000Z', entries: [
    { id: '702', tier: 'SS', note: '' }, { id: '701', tier: 'SSS', note: 'lead', outfit: 70102 }, { id: '704', tier: 'B', note: '', way: 'front' }, { id: '703', tier: 'S', note: '' },
  ] })
  it('moves the picks into the profiles', () => {
    expect(profilesFromLegacy(old, profiles).characters).toEqual({ '701': { defaultOutfit: 70102 }, '704': { way: 'front' } })
    expect(legacyCharacterTiers(old)).toEqual([{ characterId: 701, tier: 'SSS' }, { characterId: 702, tier: 'SS' }, { characterId: 703, tier: 'S' }, { characterId: 704, tier: 'B' }])
  })
  it('spreads the old cast over the ten tiers as each one’s default outfit, keeping notes, and leaves B and F to NPCs', () => {
    const moved = migrateUmasBoard(catalog, old, profilesFromLegacy(old, profiles), '2026-11-11T00:00:00.000Z')
    expect(moved).toMatchObject({ schemaVersion: 2, board: 'umas', revision: 1 })
    expect(moved.entries).toEqual([{ id: '70102', tier: 'T1', note: 'lead' }, { id: '70201', tier: 'T4', note: '' }, { id: '70301', tier: 'T7', note: '' }])
    expect(parseBoard(moved, 'umas')).toEqual(moved)
  })
  it('starts the enemy boards from the old enemy roster', () => {
    const states = seedBoards(catalog, { enemies: [{ enemyId: 'al-a', bucket: 'boss', tier: 'SS', note: 'lead' }, { enemyId: 'al-c', bucket: 'elite', tier: 'A1', note: '' }, { enemyId: 'nk-1', bucket: 'elite', tier: 'B', note: '' }] })
    expect(states['azurlane-bosses']).toMatchObject({ members: ['al-a', 'al-b'], entries: [{ id: 'al-a', tier: 'SS', note: 'lead' }] })
    expect(states['key-enemies'].entries).toEqual([{ id: 'al-c', tier: 'S', note: '' }])
    expect(states['regular-enemies'].entries).toEqual([{ id: 'nk-1', tier: 'B', note: '' }])
    expect(states.umas).toEqual(emptyBoard('umas'))
  })
})

describe('careers and the plan', () => {
  it('gives every ranked identity a career of at least three bosses, more when bosses are plenty', () => {
    expect(careerMath(2, [{ pool: 9, ranked: 9, unranked: 0, cast: 9, tiers: {} }])).toEqual({ careers: 2, bosses: 9, bossesPerCareer: 5, fights: 10, careersPerBoss: 1.1 })
    expect(careerMath(4, [{ pool: 2, ranked: 2, unranked: 0, cast: 2, tiers: {} }])).toMatchObject({ bossesPerCareer: 3, fights: 12, careersPerBoss: 6 })
    expect(careerMath(0, [])).toMatchObject({ careers: 0, bossesPerCareer: 0, careersPerBoss: null })
  })
  it('writes each outfit with its identity and batch, the identities in ranking order, and the ten batches', () => {
    const states = empty()
    states.umas.entries = [{ id: '70103', tier: 'T1', note: '' }, { id: '70101', tier: 'T1', note: 'x' }, { id: '70201', tier: 'T3', note: '' }]
    states['genshin-bosses'].entries = [{ id: 'gi-1', tier: 'SS', note: '' }]
    const plan = tierPlan(catalog, states, profiles, '2026-01-01T00:00:00.000Z')
    expect(plan).toMatchObject({ schemaVersion: 2, umaTiers: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'] })
    const playable = plan.boards.find((b) => b.id === 'umas')!
    expect(playable.order[0]).toMatchObject({ order: 1, id: '70103', tier: 'T1', batch: 1, name: 'Sister 701', identity: 's70103', sister: true, characterId: 701, playstyle: 'pace' })
    expect(playable.order[2]).toMatchObject({ id: '70201', batch: 3, name: 'Runner 702', sister: false })
    expect(plan.identities.slice(0, 3).map((i) => `${i.id}:${i.batch}`)).toEqual(['s70103:1', '701:1', '702:3'])
    expect(plan.identities[0]).toMatchObject({ sister: { relation: 'younger sister', age: 'an invented age' } })
    expect(plan.batches.slice(0, 3)).toEqual([{ batch: 1, tier: 'T1', outfits: [70103, 70101] }, { batch: 2, tier: 'T2', outfits: [] }, { batch: 3, tier: 'T3', outfits: [70201] }])
    expect(plan.careers).toMatchObject({ careers: 3, bosses: 1, bossesPerCareer: 3 })
    expect(plan.boards.find((b) => b.id === 'npcs')!.unranked.map((e) => e.id)).toEqual(['703', '704'])
    expect(playstyleCounts(catalog, states, profiles).umas.T1).toMatchObject({ front: 1, pace: 1 })
    states['pgr-bosses'] = setOut(states['pgr-bosses'], 'pgr-1', true)
    expect(tierPlan(catalog, states, profiles, 'x').boards.find((b) => b.id === 'pgr-bosses')).toMatchObject({ leftOut: [{ id: 'pgr-1', name: 'Foe pgr-1' }] })
  })
})

describe('the catalog', () => {
  it('builds characters from the release with their outfits original first, and enemies from the catalog and imports', () => {
    const legacy = { ...emptyLegacy(), outfits: [{ outfitId: 90102, characterId: 901, tier: 'A1' }], characters: [{ characterId: 901, tier: 'SS' as const }] }
    const built = buildCatalog({
      release: 'r1',
      characters: [{ id: 901, name: { ja: 'J', en: 'Runner 901', global: null } }],
      outfits: [
        { id: 90102, characterId: 901, title: { ja: 'j', en: 'Second', global: null }, variant: 'summer', aptitudes: { strategy: { front: 'G', pace: 'A', late: 'A', end: 'B' } } as never },
        { id: 90101, characterId: 901, title: { ja: 'j', en: 'First', global: null }, variant: null, aptitudes: { strategy: { front: 'A', pace: 'B', late: 'C', end: 'D' } } as never },
      ],
      art: { atlases: {}, images: { 'outfit-faces': { '90101': { path: 'art/outfit-faces/90101.0a1b2c3d.webp', width: 192, height: 192 } } } } as never,
      enemies: null, imports: [], legacy: parseLegacy(JSON.parse(JSON.stringify(legacy)) as unknown),
    })
    expect(built.umas).toEqual([expect.objectContaining({ id: '901', name: 'Runner 901', before: 'SS', face: 'art/outfit-faces/90101.0a1b2c3d.webp' })])
    expect(built.umas[0]!.outfits.map((o) => [o.id, o.way, o.before])).toEqual([[90101, 'front', null], [90102, 'pace-late', 'S']])
    expect(leadOutfit(built.umas[0]!.outfits)?.id).toBe(90102)
  })
  it('reads a playstyle from the best running-style grades, ties included', () => {
    expect(bestStyles({ front: 'A', pace: 'S', late: 'S', end: 'B' })).toEqual(['pace', 'late'])
    expect(wayOf({ front: 'B', pace: 'B', late: 'A', end: 'A' })).toBe('late-end')
  })
})
