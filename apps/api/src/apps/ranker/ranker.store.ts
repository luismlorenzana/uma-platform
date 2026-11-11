// The Ranker's state (RK1, AP16): one file a board, the profiles and the plan, in the store. A save names the revision it
// started from; a different stored revision, or another save landing between the read and the write, is a conflict the
// page resolves by reloading that board. Every save rewrites the plan.
import {
  BOARDS, emptyBoard, emptyProfiles, outfitIndex, parseBoard, parseProfiles, profileProblems, tierPlan,
  type BoardId, type BoardState, type BoardStates, type TierCatalog, type UmaProfiles,
} from '@uma-platform/tiers'
import { ABSENT, type BlobStore } from './blob-store'

export class RankerConflict extends Error {
  constructor(readonly current: unknown) { super('This changed since it was loaded. Reload it before saving.') }
}
export class RankerInvalid extends Error {}

const encoder = new TextEncoder(), decoder = new TextDecoder()
const json = (value: unknown) => encoder.encode(`${JSON.stringify(value, null, 2)}\n`)
const parse = (bytes: Uint8Array): unknown => JSON.parse(decoder.decode(bytes)) as unknown

export const boardPath = (id: BoardId) => `boards/${id}.json`
export const PROFILES = 'profiles.json'
export const PLAN = 'plan.json'

/** Ids a board's entries may name: outfits on Playable Umas, characters on Uma NPCs, units elsewhere (AP16). */
function knownIds(board: BoardId, catalog: TierCatalog): Set<string> {
  if (board === 'umas') return new Set([...outfitIndex(catalog).keys()].map(String))
  if (board === 'npcs') return new Set(catalog.umas.map((u) => u.id))
  return new Set(catalog.enemies.map((u) => u.id))
}

export class RankerStore {
  constructor(private readonly blobs: BlobStore, private readonly now: () => Date = () => new Date()) {}

  async board(id: BoardId): Promise<{ state: BoardState; generation: string }> {
    const blob = await this.blobs.read(boardPath(id))
    return blob ? { state: parseBoard(parse(blob.bytes), id), generation: blob.generation } : { state: emptyBoard(id), generation: ABSENT }
  }
  async boards(): Promise<BoardStates> {
    return Object.fromEntries(await Promise.all(BOARDS.map(async (b) => [b.id, (await this.board(b.id)).state] as const))) as BoardStates
  }
  async profiles(): Promise<{ profiles: UmaProfiles; generation: string }> {
    const blob = await this.blobs.read(PROFILES)
    return blob ? { profiles: parseProfiles(parse(blob.bytes)), generation: blob.generation } : { profiles: emptyProfiles(), generation: ABSENT }
  }

  /** Saves a board the page edited from `value.revision`; the stored copy gets the next revision. */
  async saveBoard(id: BoardId, value: unknown, catalog: TierCatalog): Promise<BoardState> {
    let requested: BoardState
    try { requested = parseBoard(value, id) } catch (error) { throw new RankerInvalid((error as Error).message) }
    const ids = knownIds(id, catalog), units = new Map(catalog.enemies.map((u) => [u.id, u]))
    if (requested.entries.some((e) => !ids.has(e.id))) throw new RankerInvalid('An entry names something this board doesn’t rank. No changes were saved.')
    if (requested.members?.some((m) => units.get(m)?.franchise !== 'azurlane')) throw new RankerInvalid('Only Azur Lane units can be Azur Lane bosses.')
    const franchise = BOARDS.find((b) => b.id === id)?.franchise
    if (requested.out?.some((m) => units.get(m)?.franchise !== franchise)) throw new RankerInvalid('Only this board’s own units can be left out.')
    const current = await this.board(id)
    if (current.state.revision !== requested.revision) throw new RankerConflict(current.state)
    const saved: BoardState = { ...requested, revision: requested.revision + 1, updatedAt: this.now().toISOString() }
    if (await this.blobs.write(boardPath(id), json(saved), current.generation) === null) throw new RankerConflict((await this.board(id)).state)
    return saved
  }

  /** Saves the profiles edited from `value.revision` (the owner's default-outfit picks; the sisters are Claude's). */
  async saveProfiles(value: unknown, catalog: TierCatalog): Promise<UmaProfiles> {
    let requested: UmaProfiles
    try { requested = parseProfiles(value) } catch (error) { throw new RankerInvalid((error as Error).message) }
    const problems = profileProblems(requested, catalog)
    if (problems.length) throw new RankerInvalid(problems.join(' '))
    const current = await this.profiles()
    if (current.profiles.revision !== requested.revision) throw new RankerConflict(current.profiles)
    const saved: UmaProfiles = { ...requested, revision: requested.revision + 1, updatedAt: this.now().toISOString() }
    if (await this.blobs.write(PROFILES, json(saved), current.generation) === null) throw new RankerConflict((await this.profiles()).profiles)
    return saved
  }

  /** The plan from what's stored now; written back so local tools can pull it. A lost race just means a newer plan. */
  async writePlan(catalog: TierCatalog): Promise<ReturnType<typeof tierPlan>> {
    const plan = tierPlan(catalog, await this.boards(), (await this.profiles()).profiles, this.now().toISOString())
    const current = await this.blobs.read(PLAN)
    await this.blobs.write(PLAN, json(plan), current?.generation ?? ABSENT)
    return plan
  }
}
