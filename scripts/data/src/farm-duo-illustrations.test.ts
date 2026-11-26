import { describe, expect, it } from 'vitest'
import { planFarmDuoArt } from './farm-duo-illustrations'
import type { UniverseArtEntry, UniverseArtIndex } from './illustrations'

const members = [
  { id: '900101', role: 'character' as const, characterId: 900101 },
  { id: 's900201', role: 'character' as const, characterId: 900102, outfitId: 900201 },
]
const pair = { id: 'farm-900101-s900201', members }
function look(suffix: string): UniverseArtEntry {
  return {
    id: `duo-${pair.id}-pjm01-${suffix}`, character: 'Aster and Beryl', outfit: 'duo', title: 'Night by the stove',
    path: 'images/duo.png', bytes: 48, sha256: '0'.repeat(64), width: 16, height: 9,
    kind: 'splash', category: 'duo-splash', duo: pair, approvedOn: '2026-11-01',
  }
}
function index(looks: UniverseArtEntry[]): UniverseArtIndex {
  return { schemaVersion: 1, kind: 'universe-art', universe: 'farm-life', revision: 1, looks }
}

describe('Farm duo night art', () => {
  it('packs a shared couch and both bedtime sequences for the exact cast identities', () => {
    const planned = planFarmDuoArt(index(['couch', 'bed-recline', 'bed-kiss', 'bed-kneel', 'bed-crawl-kiss'].map(look)))
    expect(planned.map(({ pose }) => pose)).toEqual(['couch', 'recline', 'kiss', 'kneel', 'crawl-kiss'])
    expect(planned[0]?.people).toEqual([
      { id: '900101', characterId: 900101 },
      { id: 's900201', characterId: 900102, outfitId: 900201 },
    ])
  })

  it('rejects a couch illustration claimed twice or filed against another pair', () => {
    const couch = look('couch')
    expect(() => planFarmDuoArt(index([couch, couch]))).toThrow('duplicate pose')
    expect(() => planFarmDuoArt(index([{ ...couch, duo: { ...pair, id: 'farm-900101-900102' } }]))).toThrow('two cast identities')
  })
})
