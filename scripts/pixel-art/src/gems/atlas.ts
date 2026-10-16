import { Img } from '../tiles/image.ts'
import { drawGem, SIZE } from './paint.ts'
import { GEM_SPECS, type GemSpec } from './spec.ts'

export type GemFrame = { x: number; y: number; w: number; h: number } & GemSpec
export function gemAtlas(): { atlas: Img; frames: Record<string, Omit<GemFrame, 'id'>> } {
  if (GEM_SPECS.length !== 100 || new Set(GEM_SPECS.map(g => g.id)).size !== 100) throw new Error('Expected 100 unique Star Gems')
  const atlas = new Img(320, 320), frames: Record<string, Omit<GemFrame, 'id'>> = {}
  GEM_SPECS.forEach((spec, i) => {
    const x = i % 10 * SIZE, y = Math.floor(i / 10) * SIZE
    const { id, ...metadata } = spec
    atlas.copy(new Img(SIZE, SIZE, drawGem(spec)), x, y)
    frames[id] = { x, y, w: SIZE, h: SIZE, ...metadata }
  })
  return { atlas, frames }
}
