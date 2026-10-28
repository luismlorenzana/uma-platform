// Katana calibration painter: a slim, subtly curved single-edged blade with a round guard and wrapped grip.
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { stroke } from '../tiles/props/kit.ts'
import { legendaryHalo } from './fittings.ts'
import { DARK_GRIP, LEATHER_GRIP, use, type Material } from './materials.ts'
import { metalOf, trimOf } from './blades.ts'

/** `tint`: the blade's color for every grade (the colored rows); the guard and pommel are the grade's ingot. */
export function katana(s: Sprite, grade: number, tint?: Material): void {
  s.shadow = { cx: 15.5, cy: 28.3, rx: 8.8, ry: 1.9, alpha: 70 }
  const material = tint ?? metalOf(grade)
  const blade = use(s, material)
  const cells: [number, number][] = []
  for (let i = 0; i <= 17; i++) {
    const x = 10 + i
    const y = Math.round(22 - i - Math.sin((i / 17) * Math.PI) * 1.3)
    cells.push([x, y])
  }
  cells.forEach(([x, y], i) => {
    if (i === cells.length - 1) {
      s.paint(x, y, blade, 5)
      return
    }
    s.paint(x, y, blade, i < 3 ? 3 : 4)
    s.paint(x, y - 1, blade, 5)
    if (i < 12 && i % 3 !== 0) s.paint(x - 1, y + 1, blade, 2)
  })
  // A dark hamon-like line appears on better blades, without making the silhouette thicker.
  if (grade >= 4)
    cells.slice(3, 14).forEach(([x, y], i) => {
      if (i % 3 === 1) s.paint(x, y, blade, grade >= 9 ? 5 : 3)
    })

  const trim = use(s, tint ? metalOf(grade) : trimOf(grade))
  shadeDome(s, Mask.circle(9.5, 22.5, grade >= 6 ? 3 : 2.5), trim, { bias: 0.1, relief: 0.45, contact: false })
  s.paint(9, 22, trim, 2)
  const grip = use(s, grade >= 7 ? DARK_GRIP : LEATHER_GRIP)
  stroke(s, 8, 24, 3, 29, grip, (t) => (t < 0.45 ? 4 : 2))
  stroke(s, 9, 24, 4, 29, grip, (t) => (Math.round(t * 8) % 2 === 0 ? 2 : 3))
  const pommel = use(s, tint ? metalOf(grade) : trimOf(grade))
  s.paint(2, 29, pommel, 4); s.paint(3, 30, pommel, 3); s.paint(4, 29, pommel, 2)
  if (grade >= 9 && material.glow) legendaryHalo(s, material.glow, 52)
}
