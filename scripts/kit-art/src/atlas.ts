// The kit's atlas (kits.md §2): frames shelf-packed onto one 2048-wide page, tallest first, 2 texels apart, and the
// atlas.json uma-stage's `parseKitAtlas` reads. Deterministic: the same frames give the same bytes. Pure.
import type { DrawnFrame } from './farm/index.js'

export const PAGE = 2048
/** Opaque, tiling pieces: their edge texels are copied one texel into the gap round them, so a kit the stage scales
 * down (fit-to-width, mipmapped) never samples the clear gap at a tile's edge and shows a seam. Cut-outs keep a clear gap. */
const EXTRUDED: ReadonlySet<string> = new Set(['floor', 'riser', 'building-wall', 'window', 'door', 'roof', 'wall', 'wall-top', 'stairs', 'void', 'battle-ground', 'battle-back'])
function extrude(rgba: Uint8Array, x: number, y: number, w: number, h: number): void {
  const copy = (sx: number, sy: number, dx: number, dy: number) => {
    if (dx < 0 || dy < 0 || dx >= PAGE || dy >= PAGE) return
    rgba.copyWithin((dy * PAGE + dx) * 4, (sy * PAGE + sx) * 4, (sy * PAGE + sx) * 4 + 4)
  }
  for (let i = 0; i < w; i++) { copy(x + i, y, x + i, y - 1); copy(x + i, y + h - 1, x + i, y + h) }
  for (let j = -1; j <= h; j++) { const sy = Math.min(y + h - 1, Math.max(y, y + j)); copy(x, sy, x - 1, y + j); copy(x + w - 1, sy, x + w, y + j) }
}
export interface AtlasFrame {
  page: number; x: number; y: number; w: number; h: number; role: string
  set?: string; weight?: number; foot?: { x: number; y: number }; blocks?: boolean; light?: { color: string; radius: number; flicker?: boolean }
}
export type KitKind = 'farm' | 'town' | 'biome'
export interface Atlas { formatVersion: 1; id: string; kind: KitKind; tile: 128; pages: { file: string; width: number; height: number }[]; frames: Record<string, AtlasFrame> }

/** Packs the frames and copies their pixels onto the page. Frames keep the wave's name order in the JSON. */
export function pack(id: string, frames: readonly DrawnFrame[], kind: KitKind = 'farm'): { atlas: Atlas; rgba: Uint8Array } {
  const order = [...frames].sort((a, b) => b.spec.h - a.spec.h || b.spec.w - a.spec.w || a.spec.name.localeCompare(b.spec.name))
  const at = new Map<string, { x: number; y: number }>()
  let x = 0, y = 0, row = 0
  for (const f of order) {
    if (x + f.spec.w > PAGE) { x = 0; y += row + 2; row = 0 }
    at.set(f.spec.name, { x, y }); x += f.spec.w + 2; row = Math.max(row, f.spec.h)
  }
  if (y + row > PAGE) throw new Error(`${id} outgrew its ${PAGE} page`)
  const rgba = new Uint8Array(PAGE * PAGE * 4), out: Record<string, AtlasFrame> = {}
  for (const f of frames) {
    const p = at.get(f.spec.name)!, s = f.spec, px = f.canvas.rgba8()
    for (let row = 0; row < s.h; row++) rgba.set(px.subarray(row * s.w * 4, (row + 1) * s.w * 4), ((p.y + row) * PAGE + p.x) * 4)
    if (EXTRUDED.has(s.role)) extrude(rgba, p.x, p.y, s.w, s.h)
    out[s.name] = { page: 0, x: p.x, y: p.y, w: s.w, h: s.h, role: s.role, ...(s.set ? { set: s.set } : {}), ...(s.weight ? { weight: s.weight } : {}),
      ...(s.foot ? { foot: s.foot } : {}), ...(s.blocks !== undefined ? { blocks: s.blocks } : {}), ...(s.light ? { light: s.light } : {}) }
  }
  return { atlas: { formatVersion: 1, id, kind, tile: 128, pages: [{ file: 'atlas.png', width: PAGE, height: PAGE }], frames: out }, rgba }
}
