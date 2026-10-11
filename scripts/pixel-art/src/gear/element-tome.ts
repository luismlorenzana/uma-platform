// Elemental tome calibration painter. The cover stays keyed to the element; cut-gem fittings show the grade.
import { hex } from '../color.ts'
import type { Sprite } from '../sprite.ts'
import { glowPixels, legendaryHalo } from './fittings.ts'
import { GEMS, use } from './materials.ts'

const FIRE = '#ff8a5c'

export function fireTome(s: Sprite, grade: number): void {
  s.shadow = { cx: 15, cy: 27.3, rx: 9, ry: 2, alpha: 78 }
  const cover = use(s, FIRE, { lift: 0.38, drop: 0.32, hueShift: 8 })
  const pages = use(s, '#eee2c6', { lift: 0.38, drop: 0.2 })
  const fittingMaterial = GEMS[grade - 1] ?? GEMS[0]
  if (!fittingMaterial) throw new Error(`Missing cut gem for grade ${grade}`)
  const fitting = use(s, fittingMaterial)

  // Page block and the rear cover are offset up-right behind the front board.
  for (let y = 6; y <= 23; y++)
    for (let x = 9; x <= 22; x++) {
      const edge = x === 22 || y === 6 || y === 23
      s.paint(x, y, edge ? cover : pages, edge ? (x === 22 || y === 23 ? 2 : 4) : (y % 3 === 0 ? 2 : 3))
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

  // Cut-gem corner guards and clasp make the material ladder visible even at 1x.
  const corners = [[7, 9], [18, 9], [7, 24], [18, 24]] as const
  for (const [cx, cy] of corners) {
    s.paint(cx, cy, fitting, 5)
    s.paint(cx + (cx < 12 ? 1 : -1), cy, fitting, 4)
    s.paint(cx, cy + (cy < 16 ? 1 : -1), fitting, 3)
  }
  for (let y = 14; y <= 19; y++) s.paint(19, y, fitting, y === 14 ? 5 : y === 19 ? 2 : 4)
  if (grade >= 5) {
    s.paint(8, 12, fitting, 4); s.paint(8, 20, fitting, 3)
    s.paint(17, 12, fitting, 5); s.paint(17, 20, fitting, 2)
  }

  // Flame emblem: dark lower lobe, bright inner tongue, white-hot tip on the legendary books.
  const flame: readonly (readonly [number, number, number])[] = [
    [13, 12, 5], [12, 13, 4], [13, 13, 5], [11, 14, 4], [12, 14, 5], [13, 14, 4], [14, 14, 3],
    [10, 15, 3], [11, 15, 4], [12, 15, 5], [13, 15, 3], [14, 15, 2], [10, 16, 3], [11, 16, 4],
    [12, 16, 4], [13, 16, 3], [14, 16, 2], [11, 17, 3], [12, 17, 3], [13, 17, 2], [12, 18, 2],
  ]
  const emblem = use(s, '#ffcf4a', { lift: 0.55, drop: 0.25 })
  for (const [x, y, tone] of flame) s.paint(x, y, emblem, tone)
  if (grade >= 9) {
    glowPixels(s, flame.filter(([, , tone]) => tone >= 4).map(([x, y]) => [x, y]), '#ff9c58', 38)
    if (fittingMaterial.glow) legendaryHalo(s, fittingMaterial.glow, 44)
    s.overlay(12, 13, hex('#ffffff', 210))
  }
}
