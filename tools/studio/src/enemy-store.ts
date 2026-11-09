import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { emptyEnemyRankings, exportEnemyPlan, parseEnemyRankings, type EnemyCatalog, type EnemyRankings } from './enemy-model.js'
import { ConflictError } from './store.js'

/** The canonical file is also the complete portable export; there is no second file to fall out of sync. */
export class EnemyRankingStore {
  private pending: Promise<unknown> = Promise.resolve()
  constructor(private readonly path: string, private readonly catalog: EnemyCatalog) {}
  async read(): Promise<EnemyRankings> {
    try { return parseEnemyRankings(JSON.parse(await readFile(this.path, 'utf8')) as unknown) }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyEnemyRankings(); throw error }
  }
  save(value: unknown): Promise<EnemyRankings> {
    const requested = parseEnemyRankings(value)
    const known = new Set(this.catalog.units.map(u => u.id))
    if (requested.rankings.some(r => !known.has(r.enemyId))) throw new Error('An imported enemy ID is not in this catalog. No changes were saved.')
    const write = this.pending.then(async () => {
      const current = await this.read()
      if (requested.revision !== current.revision) throw new ConflictError('Another tab changed the enemy board. Reload before saving again.')
      const next = { ...requested, revision: current.revision + 1, updatedAt: new Date().toISOString() }
      await mkdir(dirname(this.path), { recursive: true })
      const temporary = `${this.path}.${process.pid}.tmp`
      try {
        await writeFile(temporary, JSON.stringify(exportEnemyPlan(this.catalog, next), null, 2) + '\n', { mode: 0o600 })
        await rename(temporary, this.path)
      } finally { await unlink(temporary).catch(() => undefined) }
      return next
    })
    this.pending = write.catch(() => undefined)
    return write
  }
}
