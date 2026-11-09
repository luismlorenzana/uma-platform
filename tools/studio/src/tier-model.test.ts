import { describe, expect, it } from 'vitest'
import {
  BOARDS, bestStyles, boardStats, careerMath, emptyBoard, leadOutfit, move, ordered, parseBoard, place, playstyleCounts, playstyleOf, pools, seedBoards, setMember, setNote, setTier, setWay, tierPlan,
  type BoardId, type BoardStates, type EnemyUnit, type TierCatalog, type UmaCharacter, type Way,
} from './tier-model.js'

// Invented records only: no master data, no franchise names, no images.
const grades = { front: 'A', pace: 'B', late: 'C', end: 'G' }
const uma = (id: string, outfits: number[], ways: Way[] = []): UmaCharacter => ({
  id, name: `Runner ${id}`, face: null, portrait: null, lead: outfits[0]!,
  outfits: outfits.map((o, i) => ({ id: o, title: `Look ${o}`, original: o % 100 === 1, way: ways[i] ?? 'front', strategy: grades, face: null, portrait: null, before: null })),
})
const unit = (id: string, franchise: EnemyUnit['franchise'], category: EnemyUnit['category'] = 'regular'): EnemyUnit => ({
  id, name: `Foe ${id}`, franchise, category, studyAvailable: false, images: {}, details: [], before: null,
})
const catalog: TierCatalog = {
  release: 'synthetic',
  umas: [uma('701', [70101, 70102], ['front', 'late']), uma('702', [70201], ['pace']), uma('703', [70301], ['late-end']), uma('704', [70401, 70402, 70403])],
  enemies: [
    unit('al-a', 'azurlane', 'boss'), unit('al-b', 'azurlane', 'boss'), unit('al-c', 'azurlane', 'key'), unit('al-d', 'azurlane'),
    unit('gi-1', 'genshin', 'playable'), unit('gi-2', 'genshin', 'playable'), unit('ww-1', 'wuwa', 'playable'), unit('hsr-1', 'hsr', 'playable'), unit('zzz-1', 'zzz', 'playable'), unit('nk-1', 'nikke'),
  ],
}
const empty = (): BoardStates => Object.fromEntries(BOARDS.map((b) => [b.id, emptyBoard(b.id)])) as BoardStates
const ids = (states: BoardStates, board: BoardId) => pools(catalog, states)[board].map((m) => m.id)

describe('pools', () => {
  it('hands each board’s B, F and unranked down, and keeps its cast', () => {
    const states = empty()
    states.umas.entries = [{ id: '701', tier: 'SS', note: '' }, { id: '702', tier: 'A', note: '' }, { id: '703', tier: 'B', note: '' }]
    expect(ids(states, 'umas')).toEqual(['701', '702', '703', '704'])
    expect(ids(states, 'npcs')).toEqual(['703', '704'])
    expect(pools(catalog, states).npcs).toEqual([{ id: '703', via: 'umas', viaTier: 'B' }, { id: '704', via: 'umas', viaTier: null }])
  })
  it('puts the Azur Lane members on their board, every other Azur Lane unit on Key, and NIKKE on Regular', () => {
    const states = empty()
    states['azurlane-bosses'].members = ['al-a', 'al-b']
    states['azurlane-bosses'].entries = [{ id: 'al-a', tier: 'S', note: '' }, { id: 'al-b', tier: 'F', note: '' }]
    states['genshin-bosses'].entries = [{ id: 'gi-1', tier: 'SS', note: '' }]
    expect(ids(states, 'azurlane-bosses')).toEqual(['al-a', 'al-b'])
    expect(ids(states, 'genshin-bosses')).toEqual(['gi-1', 'gi-2'])
    expect(ids(states, 'key-enemies')).toEqual(['al-c', 'al-d', 'al-b', 'gi-2', 'ww-1', 'hsr-1', 'zzz-1'])
    states['key-enemies'].entries = [{ id: 'al-c', tier: 'A', note: '' }, { id: 'gi-2', tier: 'B', note: '' }]
    expect(ids(states, 'regular-enemies')).toEqual(['nk-1', 'al-d', 'al-b', 'gi-2', 'ww-1', 'hsr-1', 'zzz-1'])
  })
  it('ignores a tier on a board the entry has left', () => {
    const states = empty()
    states.umas.entries = [{ id: '701', tier: 'SS', note: '' }]
    states.npcs.entries = [{ id: '701', tier: 'S', note: 'kept for later' }]
    expect(boardStats(pools(catalog, states).npcs, states.npcs)).toMatchObject({ pool: 3, ranked: 0, cast: 0 })
  })
})

describe('edits', () => {
  const base = { ...emptyBoard('umas'), entries: [{ id: '701', tier: 'SS' as const, note: '' }, { id: '702', tier: 'SS' as const, note: 'n' }, { id: '703', tier: 'S' as const, note: '' }] }
  const all = new Set(['701', '702', '703', '704'])
  it('sends a new tier to the end of that tier, and drops an unranked entry with no note', () => {
    expect(ordered(setTier(base, '703', 'SS'), all).map((e) => e.id)).toEqual(['701', '702', '703'])
    expect(setTier(base, '701', null).entries.map((e) => e.id)).toEqual(['702', '703'])
    expect(setTier(base, '702', null).entries.find((e) => e.id === '702')).toEqual({ id: '702', tier: null, note: 'n' })
    expect(setTier(base, '701', 'SS')).toBe(base)
  })
  it('places before another entry, and moves within a tier only', () => {
    expect(ordered(place(base, '703', 'SS', '701'), all).map((e) => e.id)).toEqual(['703', '701', '702'])
    expect(ordered(place(base, '704', 'S', null), all).map((e) => `${e.id}${e.tier}`)).toEqual(['701SS', '702SS', '703S', '704S'])
    expect(ordered(move(base, '702', -1, all), all).map((e) => e.id)).toEqual(['702', '701', '703'])
    expect(move(base, '701', -1, all)).toBe(base)
    expect(move(base, '703', -1, all)).toBe(base)
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
      { ...board, entries: [{ id: 'al-a', tier: 'A1', note: '' }] }, { ...board, entries: [{ id: '../x', tier: 'S', note: '' }] },
      { ...board, entries: [{ id: 'al-a', tier: 'S', note: '' }, { id: 'al-a', tier: 'B', note: '' }] },
    ]) expect(() => parseBoard(bad, 'azurlane-bosses')).toThrow()
    expect(() => parseBoard(emptyBoard('umas'), 'npcs')).toThrow()
  })
})

describe('seeding from the old boards', () => {
  it('ranks a character by her best outfit and maps A1 to S and A2 to A', () => {
    const states = seedBoards(catalog, {
      outfits: [{ outfitId: 70102, characterId: 701, tier: 'B' }, { outfitId: 70101, characterId: 701, tier: 'A1' }, { outfitId: 70201, characterId: 702, tier: 'A2' },
        { outfitId: 70401, characterId: 704, tier: 'F' }, { outfitId: 99901, characterId: 999, tier: 'SS' }],
      enemies: [],
    })
    expect(states.umas.entries).toEqual([{ id: '701', tier: 'S', note: '' }, { id: '702', tier: 'A', note: '' }, { id: '704', tier: 'F', note: '' }])
    expect(states.npcs.entries).toEqual([])
  })
  it('puts each enemy’s old tier and note on the board its old role points to', () => {
    const states = seedBoards(catalog, { outfits: [], enemies: [
      { enemyId: 'al-a', bucket: 'boss', tier: 'SS', note: 'lead' }, { enemyId: 'al-c', bucket: 'elite', tier: 'A1', note: '' },
      { enemyId: 'al-d', bucket: 'regular', tier: 'A2', note: '' }, { enemyId: 'nk-1', bucket: 'elite', tier: 'B', note: '' }, { enemyId: 'gone', bucket: 'boss', tier: 'SS', note: '' },
    ] })
    expect(states['azurlane-bosses']).toMatchObject({ members: ['al-a', 'al-b'], entries: [{ id: 'al-a', tier: 'SS', note: 'lead' }] })
    expect(states['key-enemies'].entries).toEqual([{ id: 'al-c', tier: 'S', note: '' }])
    expect(states['regular-enemies'].entries).toEqual([{ id: 'al-d', tier: 'A', note: '' }, { id: 'nk-1', tier: 'B', note: '' }])
    expect(ids(states, 'regular-enemies')).toContain('al-d')
  })
})

describe('careers and the plan', () => {
  it('gives every career at least three bosses, more when a tier has bosses to spare', () => {
    const states = empty()
    states.umas.entries = [{ id: '701', tier: 'SS', note: '' }, { id: '702', tier: 'S', note: '' }]
    states['azurlane-bosses'].members = ['al-a', 'al-b']
    states['azurlane-bosses'].entries = [{ id: 'al-a', tier: 'SS', note: '' }, { id: 'al-b', tier: 'SS', note: '' }]
    states['genshin-bosses'].entries = [{ id: 'gi-1', tier: 'SS', note: '' }, { id: 'gi-2', tier: 'SS', note: '' }]
    const all = pools(catalog, states), stats = Object.fromEntries(BOARDS.map((b) => [b.id, boardStats(all[b.id], states[b.id])])) as Parameters<typeof careerMath>[0]
    const careers = careerMath(stats)
    expect(careers.tiers[0]).toEqual({ tier: 'SS', umas: 1, bosses: 4, bossesPerCareer: 4, careersPerBoss: 1 })
    expect(careers.tiers[1]).toEqual({ tier: 'S', umas: 1, bosses: 0, bossesPerCareer: 3, careersPerBoss: null })
    expect(careers.fights).toBe(7)
    const plan = tierPlan(catalog, states, '2026-01-01T00:00:00.000Z')
    expect(plan.boards.find((b) => b.id === 'umas')?.order).toEqual([
      expect.objectContaining({ order: 1, id: '701', tier: 'SS', name: 'Runner 701', outfits: [70101, 70102] }), expect.objectContaining({ order: 2, id: '702', tier: 'S' }),
    ])
    expect(plan.boards.find((b) => b.id === 'npcs')?.unranked.map((e) => e.id)).toEqual(['703', '704'])
  })
})

describe('playstyles', () => {
  it('reads a playstyle from the best running-style grades, ties included', () => {
    expect(bestStyles({ front: 'A', pace: 'S', late: 'S', end: 'B' })).toEqual(['pace', 'late'])
  })
  it('leads with her best old tier, then her original outfit, then the lowest id', () => {
    const o = (id: number, before: 'SS' | 'B' | null, original = false) => ({ ...uma('9', [id]).outfits[0]!, original, before })
    expect(leadOutfit([o(90102, 'B'), o(90103, 'SS'), o(90101, null, true)])?.id).toBe(90103)
    expect(leadOutfit([o(90102, null), o(90101, null, true)])?.id).toBe(90101)
    expect(leadOutfit([o(90103, null), o(90102, null)])?.id).toBe(90102)
  })
  it('takes her lead outfit’s playstyle unless the owner picks another of hers, on either board', () => {
    const states = empty(), runner = catalog.umas[0]!
    expect(playstyleOf(runner, states)).toBe('front')
    states.umas = setWay(states.umas, runner, 'late')
    expect(states.umas.entries).toEqual([{ id: '701', tier: null, note: '', way: 'late' }])
    expect(playstyleOf(runner, states)).toBe('late')
    expect(setWay(states.umas, runner, 'pace-late')).not.toBe(states.umas)
    expect(playstyleOf(runner, { umas: setWay(states.umas, runner, 'pace-late') })).toBe('front')
    states.umas = setTier(states.umas, '701', 'B')
    expect(states.umas.entries).toEqual([{ id: '701', tier: 'B', note: '', way: 'late' }])
    expect(setWay(setTier(states.umas, '701', null), runner, 'front').entries).toEqual([])
    expect(playstyleCounts(catalog, states).npcs.unranked).toMatchObject({ late: 1, front: 1, pace: 1, 'late-end': 1 })
    expect(() => parseBoard({ ...emptyBoard('npcs'), entries: [{ id: '701', tier: null, note: '', way: 'late' }] }, 'npcs')).toThrow()
    expect(() => parseBoard({ ...emptyBoard('umas'), entries: [{ id: '701', tier: null, note: '', way: 'magic' }] }, 'umas')).toThrow()
  })
})
