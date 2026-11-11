// uma-farm F55: the review sheet for the romance core's marks, at integer scales on the farm's light and dark grounds.
import { hex } from '../color.ts'
import { Img } from '../tiles/image.ts'
import { drawUi } from './atlas.ts'
import { FRAME_SPECS, HEARTS_MARKS, PLAY_MARKS } from './spec.ts'

export const ROMANCE_MARK_IDS = ['homestead/farmhouse', 'homestead/house', 'farm/ring-bench',
  ...HEARTS_MARKS.map((k) => `hearts/${k}`), 'hearts/memory-frame', ...PLAY_MARKS.map((k) => `play/${k}`)] as const
export const ROMANCE_GROUNDS = ['#ffffff', '#101a24'] as const
const SMALL = ROMANCE_MARK_IDS.filter((id) => id !== 'hearts/memory-frame')

const mark = (id: string): Img => {
  const spec = FRAME_SPECS.find((f) => f.id === id)
  if (!spec) throw new Error(`Missing ${id} preview`)
  return drawUi(spec)
}

/** Stretches the 48px Memory frame to `w`×`h` as a 12px nine-slice: corners fixed, edges and centre repeated. */
export function nineSlice(frame: Img, w: number, h: number, cut = 12): Img {
  const out = new Img(w, h)
  const src = (x: number, y: number): [number, number] => [
    x < cut ? x : x >= w - cut ? frame.w - (w - x) : cut + ((x - cut) % (frame.w - 2 * cut)),
    y < cut ? y : y >= h - cut ? frame.h - (h - y) : cut + ((y - cut) % (frame.h - 2 * cut)),
  ]
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [sx, sy] = src(x, y); out.set(x, y, frame.get(sx, sy)) }
  return out
}

/** A sample tile for the frame: a plain dusk gradient with a low sun, original and character-free. */
function sampleTile(w: number, h: number): Img {
  const tile = new Img(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = y / (h - 1), sun = Math.hypot(x - w * .62, y - h * .64) < h * .14
    tile.set(x, y, sun ? [255, 214, 140, 255] : [Math.round(64 + 160 * t), Math.round(70 + 60 * t), Math.round(140 - 40 * t), 255])
  }
  return tile
}

/**
 * Marks on white then navy; a mock Hearts row (each stage heart, a five-segment bar, then banked, ready, evening and
 * invitation); a mock picker of the five plays; the Memory frame at 48px and stretched to 96×64 around sample tiles.
 */
export function romancePreview(scale: number): Img {
  const pad = 8, cell = 24 * scale, seg = 10 * scale
  const width = Math.max(SMALL.length * (cell + pad) + pad, 2 * (96 * scale + pad) + pad)
  const height = 2 * (cell + pad) + 3 * (cell + pad) + (cell + pad) + 64 * scale + 2 * pad + pad
  const sheet = new Img(width, height).fill(hex('#0f141b'))
  const put = (img: Img, x: number, y: number, box: number) => sheet.draw(img.scaled(scale), x + (box - img.w * scale) / 2, y + (box - img.h * scale) / 2)
  let y = pad
  for (const ground of ROMANCE_GROUNDS) {
    SMALL.forEach((id, i) => {
      const x = pad + i * (cell + pad)
      sheet.copy(new Img(cell, cell).fill(hex(ground)), x, y)
      put(mark(id), x, y, cell)
    })
    y += cell + pad
  }
  // The Hearts rows: a stage heart, a bar of five segments (filled 2, 4, 5), and one status mark each.
  const stages = [['hearts/friendship', '#f27d5a', 2, 'hearts/ready'], ['hearts/romance', '#e34f7d', 4, 'hearts/banked'], ['hearts/spouse', '#e8b43a', 5, 'hearts/evening']] as const
  for (const [heart, color, filled, status] of stages) {
    sheet.copy(new Img(width - 2 * pad, cell).fill(hex('#101a24')), pad, y)
    put(mark(heart), pad, y, cell)
    for (let k = 0; k < 5; k++) sheet.copy(new Img(seg - scale, 6 * scale).fill(hex(k < filled ? color : '#2a3646')), pad + cell + k * seg, y + 9 * scale)
    put(mark(status), pad + cell + 5 * seg + pad, y, cell)
    put(mark('hearts/invitation'), pad + 2 * cell + 5 * seg + 2 * pad, y, cell)
    y += cell + pad
  }
  // The picker: five buttons, the plays' icons centred, the third one pressed.
  PLAY_MARKS.forEach((key, i) => {
    const x = pad + i * (cell + pad)
    sheet.copy(new Img(cell, cell).fill(hex(i === 2 ? '#3a4c66' : '#1e2a38')), x, y)
    put(mark(`play/${key}`), x, y, cell)
  })
  y += cell + pad
  // The Memory frame: native over a 48px sample, then stretched to 96×64 over a larger one.
  const frame = mark('hearts/memory-frame')
  const small = sampleTile(48, 48); small.draw(frame, 0, 0)
  const big = sampleTile(96, 64); big.draw(nineSlice(frame, 96, 64), 0, 0)
  sheet.draw(small.scaled(scale), pad, y)
  sheet.draw(big.scaled(scale), pad + 48 * scale + pad, y)
  return sheet
}
