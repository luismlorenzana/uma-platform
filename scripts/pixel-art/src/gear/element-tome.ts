// One elemental book shape. Growing cut-gem corners, spine bands and a cover stone make every grade legible at 1×.
import { hex } from '../color.ts'
import type { Sprite } from '../sprite.ts'
import { glowPixels, jewel, legendaryHalo } from './fittings.ts'
import { GEMS, GOLD, use } from './materials.ts'
import { elementGlyph, ELEMENTS, type Element } from './symbols.ts'

export function fireTome(s: Sprite, grade: number): void {
  elementTome(s, grade, 'fire')
}

export function elementTome(s: Sprite, grade: number, element: Element): void {
  s.shadow = { cx: 15, cy: 27.3, rx: 9, ry: 2, alpha: 78 }
  const cover = use(s, ELEMENTS[element].color, { lift: 0.38, drop: 0.32, hueShift: 8 })
  const pages = use(s, '#eee2c6', { lift: 0.38, drop: 0.2 })
  const gild = grade >= 8 ? use(s, GOLD) : pages
  const fittingMaterial = GEMS[grade - 1] ?? GEMS[0]
  if (!fittingMaterial) throw new Error(`Missing cut gem for grade ${grade}`)
  const fitting = use(s, fittingMaterial)

  // Page block and the rear cover are offset up-right behind the front board.
  for (let y = 6; y <= 22; y++)
    for (let x = 9; x <= 22; x++) {
      const edge = x === 22 || y === 6 || y === 22
      s.paint(x, y, edge ? cover : pages, edge ? (x === 22 || y === 22 ? 2 : 4) : (y % 3 === 0 ? 2 : 3))
      if (grade >= 8 && !edge && (x >= 20 || y <= 7)) s.paint(x, y, gild, y % 3 === 0 ? 2 : 4)
    }
  for (let y = 8; y <= 25; y++)
    for (let x = 6; x <= 19; x++) {
      let tone = 3
      if (x === 6) tone = 2
      else if (x === 7) tone = 4
      else if (x === 19 || y === 25) tone = 2
      else if (y === 8) tone = 5
      s.paint(x, y, cover, tone)
    }

  // Corner plates lengthen and widen. The colored face stays open around its element emblem.
  const length = [2, 3, 3, 4, 4, 4, 5, 5, 5, 6][grade - 1] ?? 2
  const width = grade >= 7 ? 3 : grade >= 3 ? 2 : 1
  const corners = [[7, 9], [18, 9], [7, 24], [18, 24]] as const
  for (const [cx, cy] of corners) {
    const dx = cx < 12 ? 1 : -1, dy = cy < 16 ? 1 : -1
    for (let u = 0; u < length; u++)
      for (let v = 0; v < width && u + v < length; v++) {
        s.paint(cx + u * dx, cy + v * dy, fitting, cy < 16 ? (v === 0 ? 5 : 3) : 3)
        s.paint(cx + v * dx, cy + u * dy, fitting, cx < 12 ? (v === 0 ? 5 : 4) : 2)
      }
  }
  // Raised bands wrap across the spine, and a wider clasp reaches across the fore-edge.
  const bands = grade >= 6 ? [11, 16, 21] : grade >= 2 ? [12, 21] : [21]
  for (const y of bands)
    for (let x = 6; x <= (grade >= 5 ? 9 : 8); x++) {
      s.paint(x, y, fitting, x === 6 ? 3 : 5)
      if (grade >= 6) s.paint(x, y + 1, fitting, 2)
    }
  for (let y = 14; y <= 18; y++)
    for (let x = grade >= 5 ? 18 : 19; x <= (grade >= 3 ? 21 : 20); x++)
      s.paint(x, y, fitting, y === 14 ? 5 : x === 21 || y === 18 ? 2 : 4)
  if (grade >= 4) {
    const size = grade >= 9 ? 4 : grade >= 6 ? 3 : 2
    // Gold bezel keeps dark gems distinct from the colored leather.
    const bezel = use(s, GOLD)
    for (let y = 19; y <= 20 + size; y++)
      for (let x = 11; x <= 12 + size; x++) s.paint(x, y, bezel, y === 19 ? 5 : x === 11 ? 4 : 2)
    jewel(s, 12, 20, size, fittingMaterial)
  }

  // Flame emblem: dark lower lobe, bright inner tongue, white-hot tip on the legendary books.
  const flame: readonly (readonly [number, number, number])[] = [
    [13, 12, 5], [12, 13, 4], [13, 13, 5], [11, 14, 4], [12, 14, 5], [13, 14, 4], [14, 14, 3],
    [10, 15, 3], [11, 15, 4], [12, 15, 5], [13, 15, 3], [14, 15, 2], [10, 16, 3], [11, 16, 4],
    [12, 16, 4], [13, 16, 3], [14, 16, 2], [11, 17, 3], [12, 17, 3], [13, 17, 2], [12, 18, 2],
  ]
  let bright: [number, number][]
  if (element === 'fire') {
    const emblem = use(s, '#ffcf4a', { lift: 0.55, drop: 0.25 })
    for (const [x, y, tone] of flame) s.paint(x, y, emblem, tone)
    bright = flame.filter(([, , tone]) => tone >= 4).map(([x, y]) => [x, y])
  } else bright = elementGlyph(s, element, 10, 12)
  if (grade >= 9) {
    glowPixels(s, bright, ELEMENTS[element].color, 38)
    if (fittingMaterial.glow) legendaryHalo(s, fittingMaterial.glow, 44)
    s.overlay(12, 13, hex('#ffffff', 210))
  }
}
