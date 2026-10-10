// Deterministic 128 px atlas layout, ported from uma-racer (scripts/assets/README.md).

import type { AtlasFrame } from '@luismlorenzana/uma-data'

export const FRAME_SIZE = 128 as const
export const FRAME_PADDING = 2
export const CELL_SIZE = FRAME_SIZE + FRAME_PADDING * 2
export const MAX_ATLAS_SIZE = 4096
export const CELLS_PER_ROW = Math.floor(MAX_ATLAS_SIZE / CELL_SIZE)
export const CELLS_PER_PAGE = CELLS_PER_ROW * CELLS_PER_ROW

export interface AtlasPageLayout {
  width: number
  height: number
  ids: string[]
}

export interface AtlasLayout {
  pages: AtlasPageLayout[]
  frames: Record<string, AtlasFrame>
}

/** Numeric ids sort as numbers so frame order follows the original's ids; anything else sorts as text. */
export function compareIds(left: string, right: string): number {
  const numeric = /^\d+$/
  if (numeric.test(left) && numeric.test(right)) return Number(left) - Number(right) || (left < right ? -1 : left > right ? 1 : 0)
  return left < right ? -1 : left > right ? 1 : 0
}

export function layoutFrames(inputIds: readonly string[]): AtlasLayout {
  const ids = [...inputIds].sort(compareIds)
  if (ids.length === 0) throw new Error('Cannot build an empty atlas')
  if (new Set(ids).size !== ids.length) throw new Error('Atlas ids must be unique')

  const pages: AtlasPageLayout[] = []
  const frames: Record<string, AtlasFrame> = {}
  for (let offset = 0; offset < ids.length; offset += CELLS_PER_PAGE) {
    const pageIds = ids.slice(offset, offset + CELLS_PER_PAGE)
    const page = pages.length
    const columns = Math.min(CELLS_PER_ROW, pageIds.length)
    const rows = Math.ceil(pageIds.length / CELLS_PER_ROW)
    pages.push({ width: columns * CELL_SIZE, height: rows * CELL_SIZE, ids: pageIds })
    for (let index = 0; index < pageIds.length; index += 1) {
      const id = pageIds[index]!
      frames[id] = {
        page,
        x: (index % CELLS_PER_ROW) * CELL_SIZE + FRAME_PADDING,
        y: Math.floor(index / CELLS_PER_ROW) * CELL_SIZE + FRAME_PADDING,
        width: FRAME_SIZE,
        height: FRAME_SIZE,
      }
    }
  }
  return { pages, frames }
}
