import { describe, expect, it } from 'vitest'
import { parseArtIndex } from './art.js'
import { findReferenceIssues, MASTER_DATA_KEYS, parseSet } from './master.js'
import { MasterDataError } from './parse.js'
import { SET_NAMES } from './release.js'
import { syntheticArtIndex, syntheticMasterData } from './testing.js'

const roundTrip = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

describe('set parsers', () => {
  it('accept every synthetic set unchanged', () => {
    const data = syntheticMasterData()
    for (const name of SET_NAMES) {
      const items = data[MASTER_DATA_KEYS[name]]
      expect(parseSet(name, roundTrip({ set: name, items }))).toEqual(items)
    }
  })

  it('reject a file that holds a different set', () => {
    expect(() => parseSet('skills', { set: 'outfits', items: [] })).toThrow('skills.set: expected "skills"')
  })

  it('reject repeated ids', () => {
    const [outfit] = syntheticMasterData().outfits
    expect(() => parseSet('outfits', roundTrip({ set: 'outfits', items: [outfit, outfit] }))).toThrow(
      'outfits.items[1].id: expected a unique id (900101 repeats)',
    )
  })

  it('point at the bad field inside a record', () => {
    const data = syntheticMasterData()
    const outfit = { ...data.outfits[0]!, aptitudes: { ...data.outfits[0]!.aptitudes, surface: { turf: 'Z', dirt: 'A' } } }
    let error: unknown
    try {
      parseSet('outfits', roundTrip({ set: 'outfits', items: [outfit] }))
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(MasterDataError)
    expect((error as MasterDataError).path).toBe('outfits.items[0].aptitudes.surface.turf')
  })

  it('require fields that are present in schema 1.0 even when null', () => {
    const { realHorse: _dropped, ...character } = syntheticMasterData().characters[0]!
    expect(() => parseSet('characters', roundTrip({ set: 'characters', items: [character] }))).toThrow(
      'characters.items[0].realHorse: expected an object',
    )
  })

  it('pass records that carry fields from a newer minor version', () => {
    const [scenario] = syntheticMasterData().scenarios
    const newer = { ...scenario, addedLater: { anything: 1 } }
    expect(parseSet('scenarios', roundTrip({ set: 'scenarios', items: [newer] }))).toEqual([scenario])
  })
})

describe('parseArtIndex', () => {
  it('keeps known families and drops ones a newer release adds', () => {
    const index = syntheticArtIndex('atlases/outfit-icons-0.0000000000000000.webp', 'art/outfit-portraits/900101.aa.webp')
    const parsed = parseArtIndex(roundTrip({ ...index, images: { ...index.images, 'future-family': {} } }), 'art')
    expect(parsed).toEqual(index)
  })

  it('parses the additive per-outfit face family', () => {
    const index = syntheticArtIndex('atlases/a.webp', 'art/outfit-portraits/900101.aa.webp')
    index.images['outfit-faces'] = {
      '900101': { path: 'art/outfit-faces/900101.bb.webp', width: 192, height: 192 },
    }
    expect(parseArtIndex(roundTrip(index), 'art')).toEqual(index)
  })

  it('rejects a frame on a page the atlas lacks', () => {
    const index = syntheticArtIndex('atlases/a.webp', 'art/b.webp')
    index.atlases['outfit-icons']!.frames['900101']!.page = 1
    expect(() => parseArtIndex(roundTrip(index), 'art')).toThrow('art.atlases.outfit-icons.frames.900101.page')
  })
})

describe('findReferenceIssues', () => {
  it('finds nothing in a consistent dataset', () => {
    expect(findReferenceIssues(syntheticMasterData())).toEqual([])
  })

  it('lists ids that point outside the release', () => {
    const data = syntheticMasterData()
    data.outfits[0]!.skills.event.push(123456)
    data.races[0]!.courseId = 777
    expect(findReferenceIssues(data)).toEqual([
      { from: 'outfits[900101].skills', to: 'skills', id: 123456 },
      { from: 'races[990101].courseId', to: 'courses', id: 777 },
    ])
  })
})
