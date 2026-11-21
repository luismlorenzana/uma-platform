import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { atomicJson, hash } from '@uma-platform/sprite-pipeline'
import { inside } from './catalog.js'
import type { Catalog } from './model.js'
import { ReviewConflict } from './review-store.js'

type Duo = [string, string]
type Scene = { hearts: number; place: string; opening: string }
type Character = { id: string; name: string; face: string | null }
const MAX_PARTNERS = 3
const NIGHT_BEATS = ['sitting', 'bedside', 'farewell', 'morning'] as const
const storyId = /^s?[1-9][0-9]*$/
const pairFilename = /^(s?[1-9][0-9]*)-(s?[1-9][0-9]*)\.json$/
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

// Farm's household keys order the underlying numeric IDs and keep sister IDs distinct.
function ordered(a: string, b: string): Duo {
  const order = Number(a.replace(/^s/, '')) - Number(b.replace(/^s/, '')) || a.localeCompare(b)
  return order <= 0 ? [a, b] : [b, a]
}

function readDuos(input: unknown, ids: ReadonlySet<string>): Duo[] {
  if (!Array.isArray(input)) throw new Error('Duos must be a list of pairs.')
  const keys = new Set<string>()
  const counts = new Map<string, number>()
  return input.map(pair => {
    const [a, b] = Array.isArray(pair) ? pair : []
    if (!Array.isArray(pair) || pair.length !== 2 || typeof a !== 'string' || typeof b !== 'string' || a === b || !ids.has(a) || !ids.has(b)) {
      throw new Error('Choose two different Umas from the playable Farm story cast.')
    }
    const duo = ordered(a, b)
    const key = duo.join(':')
    if (keys.has(key)) throw new Error('Each pair can be assigned once.')
    keys.add(key)
    for (const id of duo) {
      const count = (counts.get(id) ?? 0) + 1
      if (count > MAX_PARTNERS) throw new Error('Each Uma can have up to three duo partners.')
      counts.set(id, count)
    }
    return duo
  })
}

function scenePreviews(value: unknown, key: string): Scene[] {
  if (!record(value) || typeof value.a !== 'string' || typeof value.b !== 'string' ||
    ordered(value.a, value.b).join(':') !== key || !Array.isArray(value.levels)) return []
  return value.levels.flatMap(level => {
    if (!record(level) || typeof level.hearts !== 'number' || !Number.isInteger(level.hearts)) return []
    const steps = Array.isArray(level.steps) ? level.steps.filter(record) : []
    const opening = steps.map(step => typeof step.narrate === 'string' ? step.narrate : step.line)
      .find((line): line is string => typeof line === 'string' && line.trim().length > 0)
    return [{ hearts: level.hearts, place: typeof level.place === 'string' ? level.place : '', opening: opening ?? '' }]
  })
}

const optionalText = (path: string) => readFile(path, 'utf8').catch((error: NodeJS.ErrnoException) => {
  if (error.code === 'ENOENT') return null
  throw error
})
const pairList = (pairs: Duo[]) => pairs.map(pair => pair.join(':')).sort().join(',')
const nightCoverage = (value: unknown) => Object.fromEntries(Object.entries(record(value) ? value : {}).flatMap(([key, scripts]) =>
  record(scripts) ? [[key, Object.fromEntries(Object.entries(scripts).map(([id, script]) =>
    [id, NIGHT_BEATS.filter(beat => record(script) && typeof script[beat] === 'string' && script[beat].trim())]))]] : []))

export class FarmDuoStore {
  private pending: Promise<unknown> = Promise.resolve()
  constructor(private readonly root: string, private readonly catalog: Catalog, private readonly canonical: string,
    private readonly launchRoster: () => Promise<readonly string[]>) {}

  private async source(root: string, launch: readonly string[]) {
    const [castPath, householdPath] = await Promise.all([inside(root, 'cast.json'), inside(root, 'household.json')])
    const [castText, householdText, worldText] = await Promise.all([
      readFile(castPath, 'utf8'), readFile(householdPath, 'utf8'), optionalText(resolve(root, 'world.json')),
    ])
    const cast: unknown = JSON.parse(castText)
    const household: unknown = JSON.parse(householdText)
    if (!record(cast) || !Array.isArray(cast.umas) || !cast.umas.length) throw new Error('Farm cast.json has no Umas.')
    if (!record(household)) throw new Error('Farm household.json must be an object.')
    const outfits = new Map(this.catalog.umas.map(outfit => [String(outfit.id), outfit]))
    const names = new Map(this.catalog.umas.map(outfit => [String(outfit.characterId), outfit.name]))
    const roster: Character[] = cast.umas.map(uma => {
      if (!record(uma) || typeof uma.characterId !== 'string' || !storyId.test(uma.characterId)) throw new Error('Invalid Farm cast ID.')
      const id = uma.characterId
      const sister = id.startsWith('s')
      const outfit = outfits.get(sister ? id.slice(1) : String(uma.outfitId ?? ''))
      const name = typeof uma.name === 'string' && uma.name.trim() ? uma.name
        : sister && outfit ? `${outfit.name}’s sister` : names.get(id) ?? outfit?.name ?? `Uma ${id}`
      return { id, name, face: outfit?.face ?? null }
    })
    const ids = new Set(roster.map(uma => uma.id))
    if (ids.size !== roster.length) throw new Error('Farm cast IDs must be unique.')
    if (household.duoLines !== undefined && !record(household.duoLines)) throw new Error('Farm duoLines must be keyed by pair ID.')
    const world: unknown = worldText ? JSON.parse(worldText) : null
    const expansion = record(world) && Array.isArray(world.expansionCast) ? world.expansionCast : []
    const allowed = new Set([...launch, ...expansion.filter((id): id is string => typeof id === 'string' && ids.has(id))])
    if (launch.some(id => !ids.has(id))) throw new Error('Farm cast.json is missing members of the game’s launch roster.')
    const playable = roster.filter(uma => allowed.has(uma.id))
    return { stamp: hash(JSON.stringify([castText, householdText, worldText])), roster: playable, ids: new Set(playable.map(uma => uma.id)),
      household, householdPath, duos: readDuos(household.duos ?? [], ids), nights: nightCoverage(household.duoLines) }
  }

  private async draft() {
    const launch = await this.launchRoster()
    const canonical = await this.source(this.canonical, launch)
    const source = this.root === this.canonical ? canonical : await this.source(this.root, launch)
    const draftPath = resolve(this.root, 'duo-draft.json')
    const text = await optionalText(draftPath)
    const saved: unknown = text ? JSON.parse(text) : null
    if (saved !== null && (!record(saved) || typeof saved.base !== 'string')) throw new Error('Invalid Farm duo draft.')
    const duos = readDuos(record(saved) ? saved.duos : source.duos, canonical.ids)
    const base = record(saved) ? String(saved.base) : canonical.stamp
    return { canonical, source, draftPath, duos, base, stamp: hash(JSON.stringify([source.stamp, text, canonical.stamp])) }
  }

  async read() {
    const { stamp, canonical, base, duos } = await this.draft()
    const { roster, ids } = canonical
    const files = await readdir(resolve(this.canonical, 'pairs'), { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    const authored = await Promise.all(files.flatMap(file => {
      const match = file.isFile() && pairFilename.exec(file.name)
      if (!match || !match[1] || !match[2] || !ids.has(match[1]) || !ids.has(match[2])) return []
      const key = ordered(match[1], match[2]).join(':')
      return [inside(this.canonical, `pairs/${file.name}`).then(path => readFile(path, 'utf8'))
        .then(text => [key, scenePreviews(JSON.parse(text), key)] as const)
        .catch((error: unknown) => {
          if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === 'ENOENT') return [key, []] as const
          throw error
        })]
    }))
    return { stamp, roster, duos, base, canonicalStamp: canonical.stamp, draftPath: resolve(this.root, 'duo-draft.json'),
      canonicalPath: canonical.householdPath, differs: pairList(duos) !== pairList(canonical.duos),
      nights: canonical.nights, maxPartners: MAX_PARTNERS, nightBeats: NIGHT_BEATS,
      scenes: Object.fromEntries(authored.filter(([, scenes]) => scenes.length)) }
  }

  save(input: unknown) {
    const operation = this.pending.then(async () => {
      if (!record(input) || typeof input.stamp !== 'string') throw new Error('Reload Farm Duos before saving.')
      const current = await this.draft()
      if (current.stamp !== input.stamp) throw new ReviewConflict('Farm story files changed. Reload before saving.')
      const { canonical, draftPath, base } = current
      if (input.action === 'apply') {
        if (base !== canonical.stamp) throw new ReviewConflict(`Canonical story is now at ${canonical.stamp.slice(0, 12)}. Review the draft against it before applying.`)
        const keys = new Set(current.duos.map(duo => duo.join(':')))
        if (Object.keys(canonical.nights).some(key => !keys.has(key))) {
          throw new Error('A duo with a visit script must stay assigned. Move its script in the Story workspace before unpairing it.')
        }
        if (pairList(current.duos) !== pairList(canonical.duos)) {
          await atomicJson(canonical.householdPath, { ...canonical.household, duos: current.duos })
        }
        const launch = await this.launchRoster()
        const updated = await this.source(this.canonical, launch)
        await atomicJson(draftPath, { base: updated.stamp, duos: current.duos })
      } else {
        const duos = readDuos(input.duos, canonical.ids)
        await atomicJson(draftPath, { base: input.action === 'rebase' ? canonical.stamp : base, duos })
      }
      return this.read()
    })
    this.pending = operation.catch(() => undefined)
    return operation
  }
}
