// A working view while drawing (not shipped): frames on a ground, and a floor family tiled in mixed order, to a PNG.
import { writeFileSync } from 'node:fs'
import { hex } from './color.js'
import { Canvas, rect } from './paint.js'
import { encodePng } from './png.js'

export function sheet(frames: { name: string; c: Canvas }[], bg = '#e6e9df', scale = 1, cols = 2048): Buffer {
  let x = 16, y = 16, row = 0
  const at: { c: Canvas; x: number; y: number }[] = []
  for (const f of frames) {
    if (x + f.c.w > cols - 16) { x = 16; y += row + 16; row = 0 }
    at.push({ c: f.c, x, y }); x += f.c.w + 16; row = Math.max(row, f.c.h)
  }
  const out = new Canvas(cols, y + row + 16)
  out.fill(rect(0, 0, out.w, out.h), [...hex(bg), 1])
  for (const a of at) out.draw(a.c, a.x, a.y)
  return scaled(out, scale)
}
/** Tiles of a family laid in a mixed order (every ordered pair side by side and stacked), to check the seams. */
export function mixGrid(tiles: Canvas[], n = 6): Buffer {
  const out = new Canvas(n * 128, n * 128)
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) out.draw(tiles[(x + z * 2 + Math.floor(x / 2)) % tiles.length]!, x * 128, z * 128)
  return scaled(out, 1)
}
function scaled(c: Canvas, k: number): Buffer {
  const src = c.rgba8(0)
  if (k === 1) return encodePng(c.w, c.h, src)
  const w = c.w * k, h = c.h * k, out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.set(src.subarray(((Math.floor(y / k)) * c.w + Math.floor(x / k)) * 4, ((Math.floor(y / k)) * c.w + Math.floor(x / k)) * 4 + 4), (y * w + x) * 4)
  return encodePng(w, h, out)
}
export const save = (file: string, png: Buffer) => writeFileSync(file, png)
