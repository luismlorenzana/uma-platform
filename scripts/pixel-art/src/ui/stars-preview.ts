import { hex } from '../color.ts'
import { Img } from '../tiles/image.ts'
import { drawUi } from './atlas.ts'
import { FRAME_SPECS, STAR_BODIES, STAT_MARKS } from './spec.ts'

export const STAR_PREVIEW_ROWS = [
  { group: 'star', keys: STAR_BODIES, color: '#ffffff' },
  { group: 'stat', keys: STAT_MARKS, color: '#ffffff' },
  { group: 'star', keys: STAR_BODIES, color: '#17202b' },
  { group: 'stat', keys: STAT_MARKS, color: '#17202b' },
  { group: 'star', keys: STAR_BODIES, color: '#101a24' },
] as const

/** Native-size art on white/dark chips, plus the crests on the chart's night sky; nearest-neighbour integer scales. */
export function starsPreview(scale: number): Img {
  const pad = 8, cell = 24 * scale, step = cell + pad
  const sheet = new Img(8 * step + pad, STAR_PREVIEW_ROWS.length * step + pad).fill(hex('#0f141b'))
  STAR_PREVIEW_ROWS.forEach(({ group, keys, color }, row) => keys.forEach((key, col) => {
    const spec = FRAME_SPECS.find(f => f.id === `${group}/${key}`)
    if (!spec) throw new Error(`Missing ${group}/${key} preview`)
    const x = pad + col * step, y = pad + row * step
    sheet.copy(new Img(cell, cell).fill(hex(color)), x, y)
    sheet.draw(drawUi(spec).scaled(scale), x + (cell - spec.w * scale) / 2, y + (cell - spec.h * scale) / 2)
  }))
  return sheet
}
