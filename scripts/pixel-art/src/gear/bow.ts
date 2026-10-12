// D86 Arms recipes start with ore: the old recurved bow silhouette now has grade-ingot limbs over a leather grip.
import type { Sprite } from '../sprite.ts'
import { diagonalShadow, metalOf, trimOf } from './blades.ts'
import { diagPaint, xy, type Frame } from './diag.ts'
import { gemOf, glowPixels, jewel, legendaryHalo } from './fittings.ts'
import { DARK_GRIP, LEATHER_GRIP, use } from './materials.ts'

export function bow(s: Sprite, grade: number): void {
  diagonalShadow(s)
  const f: Frame = { c: 35 }
  const material = metalOf(grade), metal = use(s, material)
  const length = 20, depth = 9
  const center = (a: number) => -depth * (1 - (a / length) ** 2)
  const thick = (a: number) => Math.abs(a) <= 3 ? 2.1 : Math.abs(a) >= length - 3 ? 0.9 : Math.abs(a) >= length - 8 ? 1.2 : 1.6
  const string = use(s, grade >= 9 ? '#fff6d8' : '#e9dcc0', { lift: 0.4, drop: 0.3 })
  diagPaint(s, f, string, (a, b) => b === 0 && Math.abs(a) < length - 0.5 ? 4 : null)
  diagPaint(s, f, metal, (a, b) => {
    if (Math.abs(a) > length + 0.5) return null
    const d = b - center(a), t = thick(a)
    if (Math.abs(d) > t) return null
    return d < -t + 0.9 ? (d < -1.2 ? 5 : 4) : d > t - 0.9 ? 2 : 3
  })
  const grip = use(s, grade >= 7 ? DARK_GRIP : LEATHER_GRIP)
  diagPaint(s, f, grip, (a, b) => {
    if (Math.abs(a) > 3 || Math.abs(b - center(a)) > 2.5) return null
    const t = b - center(a) < -0.5 ? 4 : b - center(a) > 0.5 ? 2 : 3
    return (a + 100) % 2 === 0 ? t : Math.max(1, t - 1)
  })
  const trim = use(s, trimOf(grade))
  if (grade >= 3)
    for (const sign of [-1, 1]) {
      diagPaint(s, f, trim, (a, b) => sign * a >= length - 3 && sign * a <= length + 0.5 && Math.abs(b - center(a)) <= 1.3 ? (b - center(a) < 0 ? 5 : 3) : null)
      if (grade >= 6) {
        const [x, y] = xy(f, sign * (length + 1), -1)
        s.paint(x, y, trim, 4)
        s.paint(x + sign, y - sign, trim, 3)
      }
    }
  if (grade >= 5)
    diagPaint(s, f, trim, (a, b) => Math.abs(a) >= 4 && Math.abs(a) <= 5 && Math.abs(b - center(a)) <= 2.4 ? (b - center(a) < 0 ? 5 : 3) : null)
  if (grade >= 7) {
    const [x, y] = xy(f, 0, -9)
    jewel(s, x - 1, y - 1, 3, gemOf(grade))
  }
  if (grade >= 9 && material.glow) {
    const cells: [number, number][] = []
    for (let a = -16; a <= 16; a++) {
      const b = Math.round(center(a))
      if ((a + b + f.c) % 2 === 0 && (a + 16) % 9 < 4) cells.push(xy(f, a, b))
    }
    glowPixels(s, cells, material.glow, 0)
    legendaryHalo(s, material.glow, 55)
  }
}
