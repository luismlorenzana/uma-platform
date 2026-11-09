import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseEnemyCatalog, type EnemyCatalog } from './enemy-model.js'

export async function loadEnemyCatalog(content: string): Promise<EnemyCatalog> {
  try { return parseEnemyCatalog(JSON.parse(await readFile(resolve(content, 'authoring/enemies/catalog.json'), 'utf8')) as unknown) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 1, sourceVersion: '', sources: [], importedAt: '', units: [] }
    throw error
  }
}
