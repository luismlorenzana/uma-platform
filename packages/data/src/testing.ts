// Test helpers for games and this repo: small synthetic master records (invented names and values in the right
// shape, never copied from real data) and an in-memory release. Imported as `@luismlorenzana/uma-data/testing`.

import type { ArtIndex } from './art.js'
import type { ReleaseSource } from './client.js'
import { ReleaseSourceError } from './client.js'
import { MASTER_DATA_KEYS, type MasterData } from './master.js'
import {
  releasePaths,
  releaseVersion,
  sha256Hex,
  SCHEMA_MAJOR,
  SET_NAMES,
  type ReleaseChannel,
  type ReleaseFile,
  type ReleaseManifest,
  type SetName,
} from './release.js'

const stats = (base: number) => ({ speed: base, stamina: base + 1, power: base + 2, guts: base + 3, wit: base + 4 })
const text = (en: string) => ({ ja: `${en}（試作）`, en, global: null })

/** A fresh copy of a tiny, internally consistent synthetic master dataset. */
export function syntheticMasterData(): MasterData {
  return {
    characters: [
      {
        id: 9001,
        name: text('Synthetic Sprinter'),
        fullNameJa: null,
        colors: { main: 'EE6DCB', sub: 'FFDEF9' },
        fictional: false,
        realCounterpart: null,
        kind: 'uma',
        realHorseSex: 'female',
        birthday: { month: 4, day: 1, year: 2001 },
        heightCm: 160,
        threeSizes: { bust: 80, waist: 55, hip: 80 },
        playable: { jp: true, global: true, kr: null, tw: null },
        active: { jp: true, global: true, kr: null, tw: null },
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
      },
      {
        id: 9002,
        name: text('Synthetic Coach'),
        fullNameJa: '試作 コーチ',
        colors: null,
        fictional: true,
        realCounterpart: text('Sample Counterpart'),
        kind: 'human',
        realHorseSex: null,
        birthday: { month: 12, day: 31, year: null },
        heightCm: null,
        threeSizes: null,
        playable: { jp: false, global: null, kr: null, tw: null },
        active: { jp: true, global: null, kr: null, tw: null },
        voiceActor: { ja: null, en: null },
        realHorse: null,
      },
    ],
    outfits: [
      {
        id: 900101,
        characterId: 9001,
        costumeId: 900101,
        talentGroupId: 900101,
        rarity: 3,
        variant: null,
        obtain: 'gacha',
        premium: false,
        previewId: null,
        eventStatusIds: [4, 9],
        title: { ja: '[試作ドレス]', en: 'Prototype Dress', global: '[Prototype Dress]' },
        release: { jp: '2099-01-01', global: '2099-06-01', kr: null, tw: null },
        stats: { star1: null, star2: null, star3: stats(80), star4: stats(90), star5: stats(100) },
        growthRatePercents: { speed: 10, stamina: 0, power: 10, guts: 0, wit: 10 },
        aptitudes: {
          surface: { turf: 'A', dirt: 'G' },
          distance: { sprint: 'A', mile: 'B', medium: 'C', long: 'D' },
          strategy: { front: 'A', pace: 'B', late: 'E', end: 'G' },
        },
        skills: {
          unique: [990001],
          innate: [990010],
          awakening: [990010, 990020],
          globalAwakening: null,
          event: [990010],
          evolutions: [{ from: 990020, to: 990030 }],
        },
      },
    ],
    supportCards: [
      {
        id: 99001,
        characterId: 9002,
        characterName: text('Synthetic Coach'),
        title: { ja: '[試作の約束]', en: '[Prototype Promise]', global: null },
        type: 'wit',
        rarity: 3,
        obtain: 'gacha',
        release: { jp: '2099-02-01', global: null, kr: null, tw: null },
        effects: [{ type: 1, values: [5, null, 10, null, null, null, 15, null, null, null, 20] }],
        uniqueEffect: { level: 30, description: null, effects: [{ type: 8, value: 5, params: [] }] },
        hints: { skillIds: [990010], others: [{ type: 1, value: 2, minLevel: null }] },
        eventSkillIds: [990020],
        globalEventSkillIds: null,
      },
    ],
    skills: [
      skill(990001, 5, 'Prototype Finale', { inheritedSkillId: 990002 }),
      skill(990002, 1, 'Prototype Finale', { parentSkillIds: [990001] }),
      skill(990010, 1, 'Prototype Corners ○', { versionIds: [990020] }),
      skill(990020, 2, 'Prototype Corner Ace', {
        versionIds: [990010],
        evolutions: [{ outfitId: 900101, scenarioId: null, skillIds: [990030] }],
      }),
      skill(990030, 6, 'Evolved Corner Ace', {
        evolvedFrom: { skillId: 990020, outfitId: 900101, scenarioId: null },
        evolutionRequirements: [[['stat', 1, 600]]],
      }),
    ],
    scenarios: [
      {
        id: 99,
        order: 1,
        name: { ja: '試作シナリオ', en: 'Prototype Cup', global: 'Prototype Cup' },
        globalFullName: 'The Test: Prototype Cup',
        startsAt: { jp: '2099-01-01T04:00:00.000Z', global: null, kr: null, tw: null },
        color: 'A1B2C3',
        hardCaps: [2000, 2000, 2000, 2000, 2000, 9999],
        stats: stats(100),
        specialProgram: 0,
        linkedCharacters: [{ id: 1, characterId: 9002, name: text('Synthetic Coach') }],
      },
    ],
    races: [
      {
        id: 990101,
        familyId: 9901,
        name: text('Prototype Stakes'),
        grade: 100,
        group: 1,
        terrain: 1,
        distance: 1600,
        direction: 2,
        trackId: 99001,
        courseId: 990011,
        courseCode: 1,
        season: 1,
        timeOfDay: 2,
        entries: 16,
        bannerId: 9901,
        factor: { effect1: '試作○', effect2: 'speed' },
        programIds: ['1'],
        alternatives: [],
        didNotExist: null,
        unreleasedIn: ['kr', 'tw'],
      },
    ],
    tracks: [{ id: 99001, name: 'Prototype Park', courseIds: [990011] }],
    courses: [
      {
        id: 990011,
        trackId: 99001,
        terrain: 1,
        distanceCategory: 2,
        length: 1600,
        turn: 2,
        inout: 1,
        corners: [{ start: 400, end: 700, number: 3 }],
        straights: [{ start: 0, end: 400, frontType: 2 }],
        slopes: [{ start: 1000, end: 1200, slope: 150 }],
        phases: [
          { id: 0, start: 0, end: 266 },
          { id: 1, start: 266, end: 1066 },
          { id: 2, start: 1066, end: 1333 },
          { id: 3, start: 1333, end: 1600 },
        ],
        laps: [{ lap: 1, start: 0, end: 1600 }],
        noMansLand: [],
        overlaps: [],
        positionKeepEnd: 666,
        spurtStart: { lap: 1, location: ['straight'], meters: 1066 },
        statThresholds: [1, 3],
        terrainChanges: [],
      },
    ],
    objectives: [
      {
        id: 9901,
        characterId: 9001,
        objectives: [
          {
            order: 1,
            turn: 12,
            conditionId: 1,
            conditionType: 1,
            conditionValue: 0,
            conditionValue2: 0,
            raceChoice: 0,
            raceChoiceDetails: 0,
            raceType: 0,
            targetType: 1,
            races: [
              {
                familyId: 9901,
                name: text('Prototype Stakes'),
                grade: 100,
                group: 1,
                terrain: 1,
                distance: 1600,
                trackId: 99001,
                iconId: 9901,
                fansGained: 1000,
                fansNeeded: 0,
                nar: false,
                unreleasedIn: [],
              },
            ],
          },
        ],
      },
    ],
  }
}

function skill(id: number, rarity: number, name: string, extra: Partial<MasterData['skills'][number]> = {}) {
  return {
    id,
    rarity,
    name: text(name),
    description: text(`${name} helps a little.`),
    costSp: rarity <= 2 ? 100 : null,
    iconId: 10000 + rarity,
    activation: 1,
    tags: ['run'],
    conditionGroups: [
      {
        precondition: null,
        condition: 'phase==1',
        baseTime: 30000,
        cooldown: null,
        timeScale: null,
        effects: [{ type: 27, value: 1500, target: null, targetDetails: null, valueScale: null, additionalActivation: null }],
      },
    ],
    globalConditionGroups: null,
    globalIconId: null,
    globalTags: null,
    inheritedSkillId: null,
    parentSkillIds: [],
    versionIds: [],
    evolutions: [],
    evolvedFrom: null,
    evolutionRequirements: [],
    scenarioEventIds: [],
    unreleasedIn: [],
    ...extra,
  }
}

/** A synthetic art index pointing at the given file paths (all must be in the release). */
export function syntheticArtIndex(pagePath: string, imagePath: string): ArtIndex {
  return {
    atlases: {
      'outfit-icons': {
        frameWidth: 128,
        frameHeight: 128,
        pages: [{ path: pagePath, width: 132, height: 132 }],
        frames: { '900101': { page: 0, x: 2, y: 2, width: 128, height: 128 } },
      },
    },
    images: { 'outfit-portraits': { '900101': { path: imagePath, width: 400, height: 512 } } },
  }
}

export interface MemoryRelease {
  manifest: ReleaseManifest
  channel: ReleaseChannel
  /** Every object by bucket path. */
  objects: Map<string, Uint8Array>
}

const encoder = new TextEncoder()

async function addFile(files: ReleaseFile[], objects: Map<string, Uint8Array>, path: string, bytes: Uint8Array) {
  const sha256 = await sha256Hex(bytes)
  files.push({ path, bytes: bytes.byteLength, sha256 })
  objects.set(releasePaths.file(path), bytes)
  return sha256
}

/**
 * Builds a complete release in memory, laid out like the bucket: files, the manifest, and the `latest` channel.
 * `extraFiles` (e.g. fake WebP bytes) are listed in the manifest; pass `art` to include an art index.
 */
export async function buildMemoryRelease(
  data: MasterData = syntheticMasterData(),
  options: { art?: ArtIndex; extraFiles?: Record<string, Uint8Array>; createdAt?: string } = {},
): Promise<MemoryRelease> {
  const objects = new Map<string, Uint8Array>()
  const files: ReleaseFile[] = []
  const sets = {} as Record<SetName, string>
  for (const name of SET_NAMES) {
    const items = [...data[MASTER_DATA_KEYS[name]]].sort((left, right) => left.id - right.id)
    const bytes = encoder.encode(JSON.stringify({ set: name, items }))
    const hash = await sha256Hex(bytes)
    sets[name] = `data/${name}.${hash.slice(0, 16)}.json`
    await addFile(files, objects, sets[name], bytes)
  }
  for (const [path, bytes] of Object.entries(options.extraFiles ?? {})) await addFile(files, objects, path, bytes)
  let art: string | null = null
  if (options.art) {
    const bytes = encoder.encode(JSON.stringify(options.art))
    art = `data/art.${(await sha256Hex(bytes)).slice(0, 16)}.json`
    await addFile(files, objects, art, bytes)
  }
  files.sort((left, right) => left.path.localeCompare(right.path))
  const version = await releaseVersion(files.map((file) => file.sha256))
  const createdAt = options.createdAt ?? '2099-01-01T00:00:00.000Z'
  const manifest: ReleaseManifest = {
    schemaMajor: SCHEMA_MAJOR,
    schemaVersion: `${SCHEMA_MAJOR}.0.0`,
    version,
    createdAt,
    sources: { 'synthetic/test': '1' },
    sets,
    art,
    files,
  }
  const channel: ReleaseChannel = {
    schemaMajor: SCHEMA_MAJOR,
    channel: 'latest',
    version,
    manifest: releasePaths.manifest(version),
    updatedAt: createdAt,
  }
  objects.set(releasePaths.manifest(version), encoder.encode(JSON.stringify(manifest)))
  objects.set(releasePaths.channel('latest'), encoder.encode(JSON.stringify(channel)))
  return { manifest, channel, objects }
}

/** A release source over an in-memory object map, e.g. from `buildMemoryRelease`. */
export function createMemorySource(objects: ReadonlyMap<string, Uint8Array>): ReleaseSource {
  return {
    async read(path) {
      const bytes = objects.get(path)
      if (!bytes) throw new ReleaseSourceError(path, 404, `No object at ${path}`)
      return bytes
    },
  }
}
