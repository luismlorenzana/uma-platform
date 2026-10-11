// Elemental orb calibration painter. A fire sphere sits in a cut-gem claw setting whose material advances by grade.
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { glowPixels, legendaryHalo } from './fittings.ts'
import { GEMS, use } from './materials.ts'

const FIRE = '#ff8a5c'

export function fireOrb(s: Sprite, grade: number): void {
  s.shadow = { cx: 15.5, cy: 27, rx: 8.4, ry: 2, alpha: 76 }
  const fittingMaterial = GEMS[grade - 1] ?? GEMS[0]
  if (!fittingMaterial) throw new Error(`Missing cut gem for grade ${grade}`)
  const fitting = use(s, fittingMaterial)
  const fire = use(s, FIRE, { lift: 0.48, drop: 0.32, hueShift: 8 })
  const sphere = Mask.circle(15.5, 13.5, 7.5)
  shadeDome(s, sphere, fire, { bias: 0.08, relief: 1.05, contact: false })

  // A tiny flame suspended in the sphere keeps the element readable when the fitting is also red.
  const core = use(s, '#ffd05b', { lift: 0.55, drop: 0.24 })
  for (const [x, y, tone] of [[15, 9, 5], [14, 10, 5], [15, 10, 4], [13, 11, 4], [14, 11, 5], [15, 11, 3], [16, 11, 2], [13, 12, 3], [14, 12, 4], [15, 12, 3], [16, 12, 2], [14, 13, 3], [15, 13, 2]] as const) s.paint(x, y, core, tone)

  // Three claws rise around the sphere and meet a compact pedestal.
  for (let y = 15; y <= 24; y++) {
    const spread = Math.max(0, Math.floor((21 - y) / 2))
    const left = 10 - spread, right = 21 + spread
    if (sphere.get(left, y) || y >= 19) s.paint(left, y, fitting, left < 10 ? 5 : 4)
    if (sphere.get(right, y) || y >= 19) s.paint(right, y, fitting, 2)
  }
  for (let x = 10; x <= 21; x++) {
    s.paint(x, 23, fitting, x < 15 ? 5 : x > 18 ? 2 : 4)
    s.paint(x, 24, fitting, x < 13 ? 4 : x > 19 ? 1 : 3)
  }
  if (grade >= 4) {
    for (const [x, y, tone] of [[9, 18, 5], [10, 17, 4], [21, 17, 3], [22, 18, 2]] as const) s.paint(x, y, fitting, tone)
  }
  if (grade >= 7) {
    s.paint(14, 24, fitting, 5); s.paint(15, 23, fitting, 5); s.paint(17, 24, fitting, 2)
  }
  if (grade >= 9) {
    glowPixels(s, [[14, 10], [14, 11], [15, 9]], '#ffad69', 42)
    if (fittingMaterial.glow) legendaryHalo(s, fittingMaterial.glow, 50)
  }
}
