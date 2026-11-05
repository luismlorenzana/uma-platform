import { hex } from '../color.ts'
import { Img } from '../tiles/image.ts'
import { drawUi } from './atlas.ts'
import { FRAME_SPECS } from './spec.ts'

const currencies = ['currency/prize-money', 'currency/speed-ticket', 'currency/uma-ticket', 'currency/card-ticket', 'currency/laurel']
const yard = ['yard/fatigue', 'yard/rest']
export const YARD_PREVIEW_ROWS = [
  { ids: currencies, color: '#ffffff' },
  { ids: currencies, color: '#101a24' },
  { ids: yard, color: '#101a24' },
  { ids: yard, color: '#e4eaf2' },
  { ids: yard, color: '#0b1118' },
] as const

/** Keep native pixels at integer scales, on the actual account-bar and Yard tile colours. */
export function yardPreview(scale: number): Img {
  const pad = 8, cell = 24 * scale, step = cell + pad
  const sheet = new Img(5 * step + pad, YARD_PREVIEW_ROWS.length * step + pad).fill(hex('#0f141b'))
  YARD_PREVIEW_ROWS.forEach(({ ids, color }, row) => ids.forEach((id, col) => {
    const spec = FRAME_SPECS.find(f => f.id === id)
    if (!spec) throw new Error(`Missing ${id} preview`)
    const x = pad + col * step, y = pad + row * step
    sheet.copy(new Img(cell, cell).fill(hex(color)), x, y)
    sheet.draw(drawUi(spec).scaled(scale), x + (cell - spec.w * scale) / 2, y + (cell - spec.h * scale) / 2)
  }))
  return sheet
}
