import { parseSet, type SetItems, type SetName } from '@luismlorenzana/uma-data'
import { describe, expect, it } from 'vitest'
import {
  syntheticCharacterCards,
  syntheticCharacters,
  syntheticObjectives,
  syntheticRaces,
  syntheticRacetracks,
  syntheticScenarios,
  syntheticSkills,
  syntheticSupportCards,
} from '../__fixtures__/synthetic'
import { normalizeSupportCards } from './cards'
import { normalizeCharacters } from './characters'
import { normalizeTracks } from './courses'
import { normalizeObjectives } from './objectives'
import { normalizeOutfits } from './outfits'
import { normalizeRaces } from './races'
import { normalizeScenarios } from './scenarios'
import { normalizeSkills } from './skills'

/** Every normalizer's output must pass the published parser unchanged. */
function expectValid<N extends SetName>(name: N, items: SetItems[N][]): void {
  expect(parseSet(name, JSON.parse(JSON.stringify({ set: name, items })) as unknown)).toEqual(items)
}

describe('normalizeCharacters', () => {
  it('maps identity, real-horse facts and per-server flags, with old and new GameTora field names', () => {
    const result = normalizeCharacters(syntheticCharacters)
    expectValid('characters', result.items)
    expect(result.items[0]).toEqual({
      id: 901,
      name: { ja: '試作スプリンター', en: 'Synthetic Sprinter', global: null },
      fullNameJa: null,
      colors: { main: 'EE6DCB', sub: 'FFDEF9' },
      fictional: false,
      realCounterpart: null,
      kind: 'uma',
      realHorseSex: 'male',
      birthday: { month: 4, day: 1, year: 2001 },
      heightCm: 160,
      threeSizes: { bust: 80, waist: 55, hip: 81 },
      playable: { jp: true, global: false, kr: null, tw: null },
      active: { jp: true, global: null, kr: null, tw: null },
      voiceActor: { ja: '試作 声優', en: 'Sample Voice' },
      realHorse: {
        activeYears: '2003-2004',
        country: 'jp',
        death: null,
        earnings: 1000,
        otherEarnings: [{ amount: 10, currency: 'HKD' }],
        races: 5,
        wins: 2,
        record: '2-1-1-1',
        winStats: [1, 0, 1, 0],
      },
    })
    expect(result.items[1]).toMatchObject({
      name: { ja: '試作ステイヤー', en: 'Synthetic Stayer' },
      fullNameJa: '試作 本名',
      kind: null,
      fictional: true,
      realCounterpart: { ja: '試作モデル', en: 'Sample Model', global: null },
      realHorseSex: 'female',
      heightCm: null,
      realHorse: null,
    })
    expect(result.warnings).toEqual(['Character 903 has invalid required fields and was skipped'])
  })
})

describe('normalizeOutfits', () => {
  it('keeps stats at every star level, percent growth, aptitudes and every skill list', () => {
    const result = normalizeOutfits(syntheticCharacterCards)
    expectValid('outfits', result.items)
    const [first, second] = result.items
    expect(first).toMatchObject({
      id: 9001,
      characterId: 901,
      costumeId: 9101,
      rarity: 3,
      variant: 'summer',
      premium: true,
      previewId: 9301,
      eventStatusIds: [4, 9],
      title: { ja: '[試作ダッシュ]', en: 'Prototype Dash', global: '[Prototype Dash]' },
      release: { jp: '2021-02-24', global: '2099-01-01', kr: null, tw: null },
      stats: {
        star1: null,
        star2: null,
        star3: { speed: 91, stamina: 192, power: 293, guts: 394, wit: 495 },
        star4: { speed: 96, stamina: 197, power: 298, guts: 399, wit: 500 },
        star5: { speed: 101, stamina: 202, power: 303, guts: 404, wit: 505 },
      },
      growthRatePercents: { speed: 10, stamina: 20, power: 30, guts: 40, wit: 50 },
      aptitudes: {
        surface: { turf: 'S', dirt: 'G' },
        distance: { sprint: 'A', mile: 'B', medium: 'C', long: 'D' },
        strategy: { front: 'E', pace: 'F', late: 'G', end: 'S' },
      },
      skills: {
        unique: [7001],
        innate: [7005, 7006],
        awakening: [7002, 7003],
        globalAwakening: [7003, 7004],
        event: [7007, 7008],
        evolutions: [{ from: 7003, to: 7009 }],
      },
    })
    expect(second).toMatchObject({
      rarity: 1,
      premium: false,
      previewId: null,
      eventStatusIds: [],
      title: { ja: '[耐久モデル]', en: 'Endurance Model', global: null },
      stats: { star1: { speed: 50, stamina: 40, power: 30, guts: 20, wit: 10 }, star2: { speed: 55 }, star3: { speed: 60 } },
      skills: { globalAwakening: null, event: [] },
    })
    expect(result.warnings).toEqual(['Outfit 9003 has invalid required fields and was skipped'])
  })
})

describe('normalizeSupportCards', () => {
  it('keeps every rarity with raw effect tables, unique effects and hints', () => {
    const result = normalizeSupportCards(syntheticSupportCards)
    expectValid('support-cards', result.items)
    expect(result.items.map((card) => card.id)).toEqual([9101, 9102])
    expect(result.items[0]).toMatchObject({
      type: 'wit',
      rarity: 3,
      obtain: 'story_event',
      characterName: { ja: '試作コーチA', en: 'Synthetic Coach A', global: null },
      title: { ja: '[計られた友情]', en: '[Measured Friendship]', global: null },
      effects: [
        { type: 1, values: [5, null, 10, null, null, null, null, null, null, null, null] },
        { type: 8, values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      ],
      uniqueEffect: {
        level: 30,
        description: 'Synthetic events happen more often',
        effects: [{ type: 8, value: 7, params: [] }, { type: 101, value: 80, params: [3, 2] }],
      },
      hints: {
        skillIds: [7201, 7202],
        others: [
          { type: 1, value: 2, minLevel: null },
          { type: 2, value: 3, minLevel: null },
          { type: 30, value: 4, minLevel: 30 },
        ],
      },
      eventSkillIds: [7299],
      globalEventSkillIds: [7203],
    })
    expect(result.items[1]).toMatchObject({ type: 'group', rarity: 1, characterName: { global: 'Synthetic Team' }, uniqueEffect: null })
    expect(result.warnings).toEqual([
      'Support card 9103 has invalid required fields and was skipped',
      '1 malformed support-card effect row(s) were skipped',
    ])
  })
})

describe('normalizeSkills', () => {
  it('keeps Japan and Global mechanics, evolutions, and inherited versions as their own records', () => {
    const result = normalizeSkills(syntheticSkills)
    expectValid('skills', result.items)
    const byId = new Map(result.items.map((skill) => [skill.id, skill]))
    expect(byId.get(7301)).toMatchObject({
      name: { ja: '白い試作', en: 'White Prototype', global: null },
      tags: ['run', 'sho'],
      versionIds: [7302],
      conditionGroups: [{ precondition: 'root_pre', condition: 'root_condition', baseTime: 30000, cooldown: null, effects: [{ type: 1, value: 10, target: null }] }],
      globalConditionGroups: null,
    })
    expect(byId.get(7302)?.unreleasedIn).toEqual(['kr', 'tw'])
    expect(byId.get(7305)).toMatchObject({
      name: { global: 'Global Unique' },
      globalIconId: 55,
      globalTags: ['run'],
      globalConditionGroups: [{ condition: 'localized_condition', cooldown: 300, timeScale: 2, effects: [{ type: 4, value: 50, target: 9, targetDetails: 1, valueScale: 2, additionalActivation: 1 }] }],
      inheritedSkillId: 7391,
      scenarioEventIds: [1],
      evolutions: [{ outfitId: 9001, scenarioId: null, skillIds: [7309] }, { outfitId: null, scenarioId: 2, skillIds: [7310] }],
    })
    expect(byId.get(7391)).toMatchObject({
      rarity: 1,
      name: { ja: '固有の試作', en: 'Localized Unique', global: 'Global Gene' },
      description: { global: 'An inherited unique.' },
      costSp: 200,
      iconId: 91,
      globalIconId: 92,
      parentSkillIds: [7305, 7306],
      globalConditionGroups: [{ condition: 'gene_global' }],
    })
    expect(byId.get(7309)).toMatchObject({
      evolvedFrom: { skillId: 7305, outfitId: 9001, scenarioId: null },
      evolutionRequirements: [[['stat', 2, 600]], [['e_skill', 'speed', 3], ['skills', [7301, 7302]], []]],
    })
    expect(result.warnings).toEqual([
      'Skill 7399 has invalid required fields and was skipped',
      'Unknown server code in skills: 1 (xx)',
    ])
  })
})

describe('normalizeScenarios', () => {
  it('keeps names, start times per server, caps and linked characters', () => {
    const result = normalizeScenarios(syntheticScenarios)
    expectValid('scenarios', result.items)
    expect(result.items[0]).toEqual({
      id: 2,
      order: 2,
      name: { ja: '試作カップ', en: 'Prototype Cup', global: null },
      globalFullName: null,
      startsAt: { jp: '2021-08-30T03:00:00.000Z', global: '2025-11-06T22:00:00.000Z', kr: null, tw: null },
      color: 'A1B2C3',
      hardCaps: [2000, 2000, 2000, 2000, 2000, 9999],
      stats: { speed: 100, stamina: 100, power: 100, guts: 100, wit: 600 },
      specialProgram: 0,
      linkedCharacters: [{ id: 12, characterId: 902, name: { ja: '試作トレーナー', en: 'Sample Trainer', global: null } }],
    })
    expect(result.items[1]).toMatchObject({ name: { global: 'Prototype Finale' }, globalFullName: 'The Test: Prototype Finale' })
    expect(result.warnings).toEqual(['Scenario 3 has invalid required fields and was skipped'])
  })
})

describe('normalizeRaces', () => {
  it('keeps every grade and venue with the original codes, and drops repeated rows', () => {
    const result = normalizeRaces(syntheticRaces)
    expectValid('races', result.items)
    expect(result.items.map((item) => item.id)).toEqual([8101, 8102, 8103])
    expect(result.items[0]).toMatchObject({
      familyId: 8801,
      name: { en: 'Synthetic Race 8101' },
      grade: 100,
      entries: 18,
      courseCode: 1,
      timeOfDay: 2,
      factor: { effect1: '試作○', effect2: 'speed' },
      programIds: ['1', '1_2'],
      unreleasedIn: ['global'],
    })
    expect(result.items[1]).toMatchObject({ name: { ja: '旧名レース' }, grade: 700, trackId: 10202, season: 5, didNotExist: 'pre_nar' })
    expect(result.items[2]!.alternatives).toEqual([
      { id: 8104, familyId: 8804, trackId: 10103, courseId: 8205, direction: 2, distance: null, entries: null, didNotExist: 'pre_nar' },
      { id: 8105, familyId: 8805, trackId: 10104, courseId: 8205, direction: 2, distance: 1400, entries: 14, didNotExist: null },
    ])
    expect(result.warnings).toEqual(['Race 8199 has invalid required fields and was skipped'])
  })
})

describe('normalizeTracks', () => {
  it('keeps full course geometry and names known venues', () => {
    const { tracks, courses } = normalizeTracks(syntheticRacetracks)
    expectValid('tracks', tracks.items)
    expectValid('courses', courses.items)
    expect(tracks.items).toEqual([
      { id: 10006, name: 'Tokyo', courseIds: [8201] },
      { id: 10203, name: null, courseIds: [] },
    ])
    expect(courses.items[0]).toMatchObject({
      id: 8201,
      trackId: 10006,
      distanceCategory: 2,
      length: 1600,
      slopes: [{ start: 900, end: 1000, slope: 150 }],
      spurtStart: { lap: 1, location: ['straight'], meters: 1066 },
      terrainChanges: [{ start: 100, terrain: 2 }],
    })
    expect(tracks.warnings).toEqual(['Track 10203 has no known venue name'])
    expect(courses.warnings).toEqual(['Course 8202 on track 10006 has invalid fields and was skipped'])
  })
})

describe('normalizeObjectives', () => {
  it('keeps every objective in career order with its race details', () => {
    const result = normalizeObjectives(syntheticObjectives)
    expectValid('objectives', result.items)
    expect(result.items).toHaveLength(1)
    const [entry] = result.items
    expect(entry!.objectives.map((objective) => objective.order)).toEqual([1, 5, 20])
    expect(entry!.objectives[0]!.races[0]).toMatchObject({ familyId: 9187, name: { ja: '旧名デビュー' }, grade: 900, nar: false })
    expect(entry!.objectives[1]!.races).toEqual([])
    expect(entry!.objectives[2]!.races[0]).toMatchObject({ familyId: 8802, nar: true, unreleasedIn: ['global'] })
    expect(result.warnings).toEqual(['Objectives skipped 1 malformed or repeated row(s)'])
  })
})
