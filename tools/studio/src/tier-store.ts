import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { BOARDS, emptyBoard, parseBoard, seedBoards, tierPlan, type BoardId, type BoardState, type BoardStates, type LegacyBoards, type TierCatalog } from './tier-model.js'

export class TierConflict extends Error {}

async function atomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary, path)
  } finally { await unlink(temporary).catch(() => undefined) }
}

/**
 * `content/authoring/tiers/<board>.json`, one file a board so two tabs on different boards never conflict. Writes are
 * serialized with a revision check; every save rewrites `plan.json`, the complete plan the later tools read.
 */
export class TierStore {
  private pending: Promise<unknown> = Promise.resolve()
  readonly folder: string
  constructor(content: string, private readonly catalog: TierCatalog) { this.folder = resolve(content, 'authoring/tiers') }

  private file(board: BoardId): string { return resolve(this.folder, `${board}.json`) }
  async read(board: BoardId): Promise<BoardState> {
    try { return parseBoard(JSON.parse(await readFile(this.file(board), 'utf8')) as unknown, board) }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyBoard(board); throw error }
  }
  async readAll(): Promise<BoardStates> {
    return Object.fromEntries(await Promise.all(BOARDS.map(async (b) => [b.id, await this.read(b.id)] as const))) as BoardStates
  }
  /** Writes each missing board from the old boards (P113), once; a board already on disk is never touched. */
  async ensure(legacy: LegacyBoards): Promise<BoardId[]> {
    const seeded: BoardId[] = []
    const work = this.pending.then(async () => {
      const seed = seedBoards(this.catalog, legacy)
      for (const b of BOARDS) {
        try { await readFile(this.file(b.id)) } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
          await atomic(this.file(b.id), { ...seed[b.id], updatedAt: new Date().toISOString() }); seeded.push(b.id)
        }
      }
      await this.writePlan()
    })
    this.pending = work.catch(() => undefined)
    await work
    return seeded
  }
  async writePlan(): Promise<void> { await atomic(resolve(this.folder, 'plan.json'), tierPlan(this.catalog, await this.readAll(), new Date().toISOString())) }
  plan = async () => tierPlan(this.catalog, await this.readAll(), new Date().toISOString())

  async save(board: BoardId, value: unknown): Promise<BoardState> {
    const requested = parseBoard(value, board)
    const known = new Set([...this.catalog.umas.map((u) => u.id), ...this.catalog.enemies.map((u) => u.id)])
    if (requested.entries.some((e) => !known.has(e.id)) || requested.members?.some((m) => !known.has(m)) || requested.out?.some((m) => !known.has(m))) {
      throw new Error('An id in this board is not in the catalog. No changes were saved.')
    }
    const write = this.pending.then(async () => {
      const current = await this.read(board)
      if (requested.revision !== current.revision) throw new TierConflict('Another tab changed this board. Reload before saving again.')
      const next = { ...requested, revision: current.revision + 1, updatedAt: new Date().toISOString() }
      await atomic(this.file(board), next)
      await this.writePlan()
      return next
    })
    this.pending = write.catch(() => undefined)
    return write
  }
}
