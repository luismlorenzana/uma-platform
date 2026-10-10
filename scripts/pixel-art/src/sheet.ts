// Contact sheets: icons scaled up (nearest neighbor) on a dark background, for previews and reviews.
import type { RGBA } from './color.ts'
import { ICON_SIZE } from './icon.ts'

export interface Sheet {
  w: number
  h: number
  px: Uint8Array
}

export function contactSheet(rows: readonly (readonly Uint8Array[])[], scale: number, pad: number, bg: RGBA, cell: RGBA): Sheet {
  const cols = Math.max(1, ...rows.map((r) => r.length))
  const cellSize = ICON_SIZE * scale
  const w = cols * cellSize + (cols + 1) * pad
  const h = rows.length * cellSize + (rows.length + 1) * pad
  const px = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) px.set(bg, i * 4)
  rows.forEach((row, ry) =>
    row.forEach((icon, rx) => {
      const ox = pad + rx * (cellSize + pad), oy = pad + ry * (cellSize + pad)
      for (let y = 0; y < cellSize; y++)
        for (let x = 0; x < cellSize; x++) {
          const o = ((oy + y) * w + ox + x) * 4
          px.set(cell, o)
          const i = (Math.floor(y / scale) * ICON_SIZE + Math.floor(x / scale)) * 4
          const a = (icon[i + 3] ?? 0) / 255
          for (let k = 0; k < 3; k++) px[o + k] = Math.round((icon[i + k] ?? 0) * a + (px[o + k] ?? 0) * (1 - a))
        }
    }),
  )
  return { w, h, px }
}
