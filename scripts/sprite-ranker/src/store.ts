import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { emptyRankings, parseRankings, reconcileRankings, type Rankings, type Uma } from './model.js'

export class ConflictError extends Error {}

/** Serial writes + revision checks prevent two browser tabs from silently overwriting each other. */
export class RankingStore {
  private pending: Promise<unknown> = Promise.resolve()
  constructor(private readonly path: string, private readonly umas: readonly Uma[]) {}

  async read(): Promise<Rankings> {
    try {
      return reconcileRankings(parseRankings(JSON.parse(await readFile(this.path, 'utf8')) as unknown), this.umas)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyRankings()
      throw error
    }
  }

  save(value: unknown): Promise<Rankings> {
    const requested = parseRankings(value)
    const write = this.pending.then(async () => {
      const current = await this.read()
      if (requested.revision !== current.revision) throw new ConflictError('Another tab changed the board. Reload before saving again.')
      const next = reconcileRankings({ ...requested, revision: current.revision + 1, updatedAt: new Date().toISOString() }, this.umas)
      await mkdir(dirname(this.path), { recursive: true })
      const temporary = `${this.path}.${process.pid}.tmp`
      try {
        await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
        await rename(temporary, this.path)
      } finally {
        await unlink(temporary).catch(() => undefined)
      }
      return next
    })
    this.pending = write.catch(() => undefined)
    return write
  }
}
