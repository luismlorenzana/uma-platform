// The stand-in kits' shared parts (Q5; ST2): a frame's spec, the shelf packer and a tiny noise, for the forest and town
// stand-ins and the farm's. Internal: not exported from the package.
import type { KitFrame, KitRole } from '../formats/index.js'

export interface Spec { name: string; role: KitRole; w: number; h: number; foot?: [number, number]; blocks?: boolean; light?: KitFrame['light']; weight?: number; set?: string }

export const T = 128
export const tile = (name: string, role: KitRole, weight?: number): Spec => ({ name, role, w: T, h: T, ...(weight ? { weight } : {}) })
export const STAND_IN_PAGE = 2048

/** Shelf-packs the frames onto one page, row by row, 2 px apart, in list order (or tallest first, `byHeight`); a page as
 * tall as it needs, up to 4096. */
export function pack(specs: Spec[], byHeight = false): { frames: Record<string, KitFrame>; height: number } {
  const frames: Record<string, KitFrame> = {}
  let x = 0, y = 0, row = 0
  const order = byHeight ? [...specs].sort((a, b) => b.h - a.h || b.w - a.w) : specs
  for (const s of order) {
    if (x + s.w > STAND_IN_PAGE) { x = 0; y += row + 2; row = 0 }
    frames[s.name] = { page: 0, x, y, w: s.w, h: s.h, role: s.role, ...(s.weight ? { weight: s.weight } : {}),
      ...(s.foot ? { foot: { x: s.foot[0], y: s.foot[1] } } : {}), ...(s.blocks !== undefined ? { blocks: s.blocks } : {}), ...(s.light ? { light: s.light } : {}),
      ...(s.set ? { set: s.set } : {}) }
    x += s.w + 2
    row = Math.max(row, s.h)
  }
  const height = byHeight ? Math.ceil((y + row) / 256) * 256 : STAND_IN_PAGE
  if (y + row > height || height > 2 * STAND_IN_PAGE) throw new Error('the stand-in kit outgrew its page')
  return { frames, height }
}

/** A tiny deterministic noise, so the same kit draws the same every time. */
export function noise(seed: number): () => number {
  let s = seed >>> 0
  return () => { s = (Math.imul(s ^ (s >>> 15), 2_246_822_507) + 0x9e3779b9) >>> 0; return (s & 0xffff) / 0x10000 }
}
