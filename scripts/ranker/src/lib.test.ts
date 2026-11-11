import { describe, expect, it } from 'vitest'
import { gcloudCommand, seedMirror, type SeedInputs } from './lib.js'

describe('starting gcloud', () => {
  it('runs gcloud directly on macOS and Linux', () => {
    expect(gcloudCommand(['storage', 'cp', 'a', 'gs://b/c'], 'darwin')).toEqual({ file: 'gcloud', args: ['storage', 'cp', 'a', 'gs://b/c'], shell: false })
  })
  it('runs gcloud.cmd through the shell on Windows, every argument quoted', () => {
    expect(gcloudCommand(['storage', 'objects', 'describe', 'gs://b/p.json', '--format=value(generation)'], 'win32'))
      .toEqual({ file: 'gcloud.cmd', args: ['"storage"', '"objects"', '"describe"', '"gs://b/p.json"', '"--format=value(generation)"'], shell: true })
    expect(() => gcloudCommand(['a"b'], 'win32')).toThrow(/quote/)
  })
})

// Invented records only.
const strategy = { front: 'A', pace: 'B', late: 'C', end: 'D' } as never
const outfit = (id: number, characterId: number, variant: string | null) => ({ id, characterId, title: { ja: 'j', en: `Look ${id}`, global: null }, variant, aptitudes: { strategy } as never })
const input = (over: Partial<SeedInputs> = {}): SeedInputs => ({
  release: {
    release: 'synthetic', art: null,
    characters: [{ id: 701, name: { ja: 'j', en: 'Runner 701', global: null } }, { id: 702, name: { ja: 'j', en: 'Runner 702', global: null } }],
    outfits: [outfit(70101, 701, null), outfit(70102, 701, 'new_year'), outfit(70201, 702, null)],
  },
  enemies: null, imports: [],
  oldBoards: { npcs: { schemaVersion: 1, kind: 'tier-board', board: 'npcs', revision: 9, updatedAt: null, entries: [{ id: '702', tier: 'S', note: '' }] } },
  oldUmas: { revision: 102, updatedAt: null, entries: [{ id: '701', tier: 'SS', note: 'lead', outfit: 70102 }, { id: '702', tier: 'B', note: '' }] },
  outfitRoster: [{ outfitId: 70101, characterId: 701, tier: 'A1' }], enemyRoster: [],
  authored: { schemaVersion: 1, kind: 'uma-profiles', revision: 1, updatedAt: '2026-11-11T00:00:00.000Z', characters: {},
    sisters: [{ outfitId: 70102, characterId: 701, name: 'Sister 701', relation: 'younger sister', age: 'an invented age', profile: 'Invented.' }] },
  now: '2026-11-11T12:00:00.000Z', ...over,
})

describe('seeding the Ranker (P131)', () => {
  it('keeps the lettered boards, moves Playable Umas to outfits, and drops an old pick that is now a sister’s', () => {
    const out = seedMirror(input())
    expect(out.boards.npcs).toMatchObject({ revision: 9, entries: [{ id: '702', tier: 'S' }] })
    // 701's old pick, 70102, is her sister now: she leads with her own lead outfit, and the pick is said to be dropped.
    expect(out.boards.umas.entries).toEqual([{ id: '70101', tier: 'T1', note: 'lead' }])
    expect(out.dropped).toEqual(['701:70102'])
    expect(out.profiles.sisters).toHaveLength(1)
    expect(out.legacy.characters).toEqual([{ characterId: 701, tier: 'SS' }, { characterId: 702, tier: 'B' }])
    expect(out.plan.identities.map((i) => i.id)).toEqual(['701', '702', 's70102'])
    expect(out.catalog.umas[0]!.before).toBe('SS')
  })
  it('lets an authored pick win over an old one, and stops on a sister who doesn’t fit', () => {
    const authored = { ...input().authored!, sisters: [], characters: { '701': { defaultOutfit: 70102 } } }
    expect(seedMirror(input({ authored })).profiles.characters).toEqual({ '701': { defaultOutfit: 70102 } })
    expect(() => seedMirror(input({ authored: { ...input().authored!, sisters: [{ ...input().authored!.sisters[0]!, characterId: 702 }] } }))).toThrow(/sisters don't fit/)
  })
})
