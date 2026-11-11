// uma-farm F25 part A: the review sheet for the farm's ten marks, at integer scales on the account bar's colours.
import { hex } from '../color.ts'
import { drawIcon } from '../icon.ts'
import { FAMILIES } from '../items/index.ts'
import { Img } from '../tiles/image.ts'
import { drawUi } from './atlas.ts'
import { FRAME_SPECS } from './spec.ts'

export const FARM_MARK_IDS = ['currency/gold', 'farm/seed-packet', 'farm/star', 'farm/heart-bond', 'farm/heart-affinity', 'farm/rank',
  'season/spring', 'season/summer', 'season/autumn', 'season/winter'] as const
/** Five of the farm's crops, each a published 32px item, wearing the seed-packet badge at its bottom-right. */
export const FARM_PREVIEW_CROPS = ['wheat', 'carrot', 'potato', 'tomato', 'corn'] as const
export const FARM_PREVIEW_GROUNDS = ['#ffffff', '#101a24'] as const
/** The mock account bar's three chips: the farm's gold, the season, the Farm Rank. */
export const FARM_BAR_CHIPS = ['currency/gold', 'season/spring', 'farm/rank'] as const

const mark = (id: string): Img => {
  const spec = FRAME_SPECS.find((f) => f.id === id)
  if (!spec) throw new Error(`Missing ${id} preview`)
  return drawUi(spec)
}
/** A crop's 32px icon with the 16px seed-packet badge drawn over its bottom-right quarter, as the farm's shop shows it. */
export function seededCrop(id: string): Img {
  const item = FAMILIES.flatMap((f) => f.raw).find((i) => i.id === id)
  if (!item) throw new Error(`Missing crop ${id}`)
  const crop = new Img(32, 32, drawIcon(item))
  crop.draw(mark('farm/seed-packet'), 16, 16)
  return crop
}

/** Marks on white then navy; the badge over five crops on white then navy; a mock account bar with three chips. */
export function farmPreview(scale: number): Img {
  const pad = 8, cell = 16 * scale, crop = 32 * scale, chipW = 44 * scale, chipH = 20 * scale
  const width = Math.max(FARM_MARK_IDS.length * (cell + pad), FARM_PREVIEW_CROPS.length * (crop + pad), FARM_BAR_CHIPS.length * (chipW + pad) + pad) + pad
  const height = 2 * (cell + pad) + 2 * (crop + pad) + chipH + 4 * scale * 2 + 2 * pad + pad
  const sheet = new Img(width, height).fill(hex('#0f141b'))
  let y = pad
  for (const ground of FARM_PREVIEW_GROUNDS) {
    FARM_MARK_IDS.forEach((id, i) => {
      const x = pad + i * (cell + pad)
      sheet.copy(new Img(cell, cell).fill(hex(ground)), x, y)
      sheet.draw(mark(id).scaled(scale), x, y)
    })
    y += cell + pad
  }
  for (const ground of FARM_PREVIEW_GROUNDS) {
    FARM_PREVIEW_CROPS.forEach((id, i) => {
      const x = pad + i * (crop + pad)
      sheet.copy(new Img(crop, crop).fill(hex(ground)), x, y)
      sheet.draw(seededCrop(id).scaled(scale), x, y)
    })
    y += crop + pad
  }
  // The account bar: a navy strip, each chip a lighter pill with its mark and a pale value bar standing in for text.
  const barH = chipH + 4 * scale * 2
  sheet.copy(new Img(width - pad * 2, barH).fill(hex('#101a24')), pad, y)
  FARM_BAR_CHIPS.forEach((id, i) => {
    const x = pad * 2 + i * (chipW + pad), top = y + 4 * scale
    sheet.copy(new Img(chipW, chipH).fill(hex('#1e2a38')), x, top)
    sheet.draw(mark(id).scaled(scale), x + 2 * scale, top + 2 * scale)
    sheet.copy(new Img(20 * scale, 4 * scale).fill(hex('#c9d4e2')), x + 20 * scale, top + 8 * scale)
  })
  return sheet
}
