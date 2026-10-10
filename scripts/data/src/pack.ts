// Writes the master sets into the local release, ported from uma-racer's content-pack writer. Each set is one
// deterministic JSON file `{ set, items }` with items sorted by id; art files and the art index are preserved.

import { parseSet, SET_NAMES, type ReleaseFile, type ReleaseManifest, type SetItems, type SetName } from '@luismlorenzana/uma-data'
import { DEFAULT_RELEASE_DIR, readLocalManifest, removeUnlisted, writeLocalManifest, writeReleaseFile } from './release-dir'

export type MasterSets = { [N in SetName]: readonly SetItems[N][] }

export interface WriteDataSetsOptions {
  sets: MasterSets
  /** Source dataset versions, e.g. `{ "gametora/skills": "…" }`. Replaces the previous sources. */
  sources: Record<string, string>
  releaseDir?: string
  now?: Date
}

/** The exact bytes of one set file. */
export function serializeSet<N extends SetName>(name: N, items: readonly SetItems[N][]): string {
  const sorted = [...items].sort((left, right) => left.id - right.id)
  return JSON.stringify({ set: name, items: sorted })
}

export async function writeDataSets(options: WriteDataSetsOptions): Promise<ReleaseManifest> {
  const releaseDir = options.releaseDir ?? DEFAULT_RELEASE_DIR
  const previous = await readLocalManifest(releaseDir)
  const previousSetPaths = new Set(previous ? Object.values(previous.sets) : [])
  // Art files and the art index belong to `pnpm assets:import`; keep them as they are.
  const files: ReleaseFile[] = previous?.files.filter((file) => !previousSetPaths.has(file.path)) ?? []

  const sets = {} as Record<SetName, string>
  for (const name of SET_NAMES) {
    const json = serializeSet(name, options.sets[name] as readonly SetItems[typeof name][])
    // Every set passes the published parser before it's written, so a normalizer bug can't reach a release.
    parseSet(name, JSON.parse(json) as unknown)
    const file = await writeReleaseFile(releaseDir, 'data', name, 'json', json)
    sets[name] = file.path
    files.push(file)
  }

  const manifest = await writeLocalManifest(
    releaseDir,
    { sources: options.sources, sets, art: previous?.art ?? null, files },
    options.now,
  )
  await removeUnlisted(releaseDir, 'data', manifest)
  return manifest
}
