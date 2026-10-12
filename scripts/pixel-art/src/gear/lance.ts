// A cavalry lance, not a leaf-bladed spear: a long tapered metal cone and a round vamplate over the wrapped grip.
import type { Sprite } from '../sprite.ts'
import { diagonalShadow, metalOf, trimOf } from './blades.ts'
import { diagPaint, xy, type Frame } from './diag.ts'
import { gemOf, glowPixels, jewel, legendaryHalo } from './fittings.ts'
import { DARK_GRIP, LEATHER_GRIP, use } from './materials.ts'

export function lance(s: Sprite, grade: number): void {
  diagonalShadow(s)
  const f: Frame = { c: 32 }
  const material = metalOf(grade), metal = use(s, material), trim = use(s, trimOf(grade))
  const grip = use(s, grade >= 7 ? DARK_GRIP : LEATHER_GRIP)
  // The shaft below the guard is short; almost the whole length above it is the tapering cone.
  diagPaint(s, f, grip, (a, b) => {
    if (a < -26 || a > -11 || Math.abs(b + 0.5) > 1.3) return null
    return (a - b + 400) % 4 < 2 ? (b < 0 ? 3 : 1) : b < 0 ? 4 : 2
  })
  diagPaint(s, f, metal, (a, b) => {
    if (a < -8 || a > 27) return null
    const width = (27 - a) * (grade >= 5 ? 0.145 : 0.125) + 0.3
    if (Math.abs(b + 0.5) > width) return null
    return b <= -1 ? (b === -1 || b < -width + 0.5 ? 5 : 4) : b === 0 ? 3 : 2
  })
  // A flattened circular hand guard viewed on its diagonal, with a bright rolled rim.
  const span = grade >= 7 ? 8 : grade >= 3 ? 7 : 6
  diagPaint(s, f, trim, (a, b) => {
    if (((a + 10) / 3.2) ** 2 + ((b + 0.5) / span) ** 2 > 1) return null
    return a > -9 ? (b < 0 ? 5 : 3) : a < -11 ? 2 : b < -2 ? 4 : 3
  })
  // Metal butt and a ferrule directly above the vamplate.
  for (const [from, to] of [[-27, -25], [-8, -6]] as const)
    diagPaint(s, f, trim, (a, b) => a >= from && a <= to && Math.abs(b + 0.5) <= 1.5 ? (b < 0 ? 5 : 2) : null)
  if (grade >= 4) {
    const [x, y] = xy(f, -10, -1)
    jewel(s, x - 1, y - 1, grade >= 7 ? 3 : 2, gemOf(grade))
  }
  if (grade >= 6)
    diagPaint(s, f, trim, (a, b) => a >= -3 && a <= -1 && Math.abs(b + 0.5) <= 3.8 ? (b < 0 ? 4 : 2) : null)
  if (grade >= 9 && material.glow) {
    const cells: [number, number][] = []
    for (let a = 0; a <= 20; a += 2) cells.push(xy(f, a, 0))
    glowPixels(s, cells, material.glow, 0)
    legendaryHalo(s, material.glow, 55)
  }
}
