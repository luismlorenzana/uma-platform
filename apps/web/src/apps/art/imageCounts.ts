import { looksOf, picturesOf, renderOf, type AlbumData, type AlbumEntry, type Universe } from './data'

export interface WorldImageCount { world: string; count: number }

const worlds = [
  ['farm-life', 'uma-farm'],
  ['cyberpunk', 'uma-cyberpunk'],
] as const

/** Published image files on this identity's page, grouped by world. Composed states and animation frames aren't files. */
export function imageCountsOf(data: Pick<AlbumData, 'art'>, all: readonly Universe[], entry: AlbumEntry): WorldImageCount[] {
  const groups = looksOf(all, entry.characterId, entry.sister ? entry.outfitId : undefined)
  const counts = new Map(groups.map(({ universe, looks, splash, pieces, profiles }) => [
    universe.id, new Set([...looks, ...splash, ...pieces, ...profiles].map(image => image.path)).size,
  ]))
  const result: WorldImageCount[] = worlds.flatMap(([id, world]) => {
    const count = counts.get(id) ?? 0
    counts.delete(id)
    return count > 0 ? [{ world, count }] : []
  })
  for (const [world, count] of counts) if (count > 0) result.push({ world, count })

  const referencePaths = new Set(picturesOf(data.art, entry).map(image => image.path))
  const render = renderOf(data.art, entry.outfitId)
  if (render) referencePaths.add(render.path)
  if (referencePaths.size > 0) result.push({ world: 'master-data', count: referencePaths.size })
  return result
}
