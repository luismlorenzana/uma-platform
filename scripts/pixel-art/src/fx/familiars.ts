// Original familiars: small readable bodies, two hand-painted idle poses and bounded spectral glow.
import { bloom, halo } from '../items/refined/workbench-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add, stroke } from '../tiles/props/kit.ts'
import { COLORS, type Kind } from './spec.ts'

const dome = (s: Sprite, m: Mask, id: number) => shadeDome(s, m, id, { bias: 0.12, relief: 0.65, contact: false })

function spiritArm(s: Sprite, kind: Kind, dy: number): void {
  const steel = add(s, '#9ed4e9', { lift: 0.5, drop: 0.26 }), trim = add(s, '#e1e5ec'), grip = add(s, '#53728f')
  const poly = (points: readonly (readonly [number, number])[]) => Mask.polygon(points.map(([x, y]) => [x, y + dy]))
  if (kind === 'greatsword') {
    dome(s, poly([[10, 23], [22, 5], [26, 3], [25, 8], [14, 25]]), steel)
    stroke(s, 6, 20 + dy, 17, 26 + dy, trim, 4)
  } else if (kind === 'axe') {
    dome(s, poly([[13, 6], [19, 4], [25, 8], [27, 13], [24, 18], [19, 16], [19, 12], [13, 10]]), steel)
    stroke(s, 6, 27 + dy, 22, 7 + dy, grip, 4)
    stroke(s, 19, 9 + dy, 26, 18 + dy, trim, 4)
  } else if (kind === 'lance') {
    dome(s, poly([[7, 20], [27, 3], [13, 25]]), steel)
    dome(s, Mask.ellipse(9, 23 + dy, 4.4, 2.8, 35), trim)
  } else if (kind === 'katana') {
    for (let i = 0; i <= 17; i++) {
      const x = 10 + i, y = Math.round(22 - i - Math.sin(i / 17 * Math.PI) * 1.4) + dy
      s.paint(x, y, steel, 4); if (i < 16) s.paint(x, y - 1, steel, 5)
    }
    dome(s, Mask.circle(9, 23 + dy, 2.6), trim)
  } else {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, x = Math.round(6 + 19 * t - Math.sin(t * Math.PI) * 6), y = Math.round(25 - 19 * t - Math.sin(t * Math.PI) * 6) + dy
      s.paint(x, y, steel, t < 0.5 ? 5 : 3)
    }
    stroke(s, 6, 25 + dy, 25, 6 + dy, trim, 3)
    stroke(s, 11, 14 + dy, 14, 11 + dy, grip, 3)
  }
  if (kind === 'greatsword' || kind === 'katana' || kind === 'lance') {
    stroke(s, 8, 25 + dy, 4, 28 + dy, grip, 4)
    s.paint(3, 28 + dy, trim, 5); s.paint(4, 29 + dy, trim, 3)
  }
  halo(s, '#c7e9ff', 62, 2)
}

function salamander(s: Sprite, dy: number, frame: number): void {
  const body = add(s, COLORS.fire, { lift: 0.4, drop: 0.28 }), belly = add(s, '#ffd379'), eye = add(s, '#3c3a50')
  stroke(s, 11, 22 + dy, 4, 20 + dy, body, 3); stroke(s, 4, 20 + dy, 4, 15 + dy, body, 4)
  dome(s, Mask.ellipse(15, 21 + dy, 7.2, 4.2, -8), body)
  dome(s, Mask.ellipse(23, 17 + dy, 4.6, 4, -10), body)
  dome(s, Mask.ellipse(16, 23 + dy, 5.3, 2.2), belly)
  for (const x of [10, 16, 20]) stroke(s, x, 23 + dy, x - 1, 27 + dy, body, 3)
  s.paint(24, 16 + dy, eye, 1); s.paint(24, 15 + dy, belly, 5)
  stroke(s, 24, 20 + dy, 27, 19 + dy, body, 1)
  const tip = frame ? 8 : 10
  dome(s, Mask.polygon([[4, 16 + dy], [2, 12 + dy], [5, tip + dy], [5, 12 + dy], [8, 11 + dy], [7, 17 + dy]]), belly)
}

function iceWisp(s: Sprite, dy: number): void {
  const ice = add(s, COLORS.ice, { lift: 0.48, drop: 0.26 }), eyes = add(s, '#426183')
  dome(s, Mask.polygon([[16, 5 + dy], [23, 12 + dy], [24, 17 + dy], [20, 25 + dy], [16, 22 + dy], [10, 25 + dy], [11, 20 + dy], [8, 14 + dy], [12, 9 + dy]]), ice)
  s.paint(13, 14 + dy, eyes, 1); s.paint(19, 14 + dy, eyes, 1)
  s.sparkle(6, 8 + dy, 1); s.paint(25, 24 + dy, ice, 5)
}

function thunderHawk(s: Sprite, dy: number, frame: number): void {
  const gold = add(s, COLORS.lightning, { lift: 0.38, drop: 0.28 }), feathers = add(s, '#b59c60'), beak = add(s, '#ebe7c3')
  const wingY = frame ? 7 : 11
  dome(s, Mask.polygon([[14, 16 + dy], [7, wingY + dy], [2, 13 + dy], [6, 20 + dy], [11, 22 + dy]]), feathers)
  dome(s, Mask.polygon([[18, 16 + dy], [25, wingY + dy], [30, 13 + dy], [26, 20 + dy], [21, 22 + dy]]), feathers)
  dome(s, Mask.ellipse(16, 19 + dy, 4.3, 6.3), gold)
  dome(s, Mask.circle(17, 12 + dy, 3.8), gold)
  dome(s, Mask.polygon([[20, 12 + dy], [25, 14 + dy], [20, 15 + dy]]), beak)
  s.paint(18, 11 + dy, feathers, 1)
  for (const x of [13, 16, 19]) stroke(s, x, 23 + dy, x - 1, 27 + dy, feathers, 3)
  stroke(s, 13, 9 + dy, 15, 6 + dy, gold, 5)
}

function lightSprite(s: Sprite, dy: number, frame: number): void {
  const light = add(s, COLORS.light, { lift: 0.42, drop: 0.25 }), wing = add(s, '#d0e5ec', { lift: 0.5, drop: 0.22 }), face = add(s, '#6f5c6b')
  const wy = frame ? 14 : 16
  dome(s, Mask.ellipse(10, wy + dy, 4.5, 6, -35), wing)
  dome(s, Mask.ellipse(22, wy + dy, 4.5, 6, 35), wing)
  dome(s, Mask.polygon([[16, 15 + dy], [20, 23 + dy], [16, 26 + dy], [12, 23 + dy]]), light)
  dome(s, Mask.circle(16, 11 + dy, 4), light)
  s.paint(14, 11 + dy, face, 1); s.paint(18, 11 + dy, face, 1)
  stroke(s, 13, 18 + dy, 10, 21 + dy, light, 4); stroke(s, 19, 18 + dy, 23, 16 + dy, light, 5)
  stroke(s, 14, 25 + dy, 13, 28 + dy, light, 3); stroke(s, 18, 25 + dy, 19, 28 + dy, light, 2)
  s.sparkle(24, 9 + dy, 1)
}

function shadowCat(s: Sprite, dy: number, frame: number): void {
  const fur = add(s, COLORS.dark, { lift: 0.36, drop: 0.3 }), eye = add(s, '#f1d794')
  stroke(s, 8, 22 + dy, 4, 20 + dy, fur, 3); stroke(s, 4, 20 + dy, 3, 14 + dy, fur, 4)
  stroke(s, 3, 14 + dy, frame ? 7 : 5, 10 + dy, fur, 4)
  dome(s, Mask.ellipse(14, 23 + dy, 8, 4.4), fur)
  dome(s, Mask.circle(22, 17 + dy, 5), fur)
  dome(s, Mask.polygon([[17, 14 + dy], [18, 9 + dy], [22, 13 + dy], [25, 9 + dy], [27, 15 + dy]]), fur)
  for (const x of [10, 17, 24]) stroke(s, x, 24 + dy, x, 28 + dy, fur, 3)
  s.paint(20, 16 + dy, eye, 5); s.paint(24, 16 + dy, eye, 5)
  s.paint(22, 19 + dy, fur, 1)
  stroke(s, 25, 20 + dy, 28, 19 + dy, fur, 4)
}

export function familiar(s: Sprite, kind: Kind, frame: number): void {
  const dy = frame === 1 ? -1 : 0
  s.shadow = { cx: 16, cy: 29.4, rx: 7.5, ry: 1.3, alpha: 46 }
  if (kind === 'fire') salamander(s, dy, frame)
  else if (kind === 'ice') iceWisp(s, dy)
  else if (kind === 'lightning') thunderHawk(s, dy, frame)
  else if (kind === 'light') lightSprite(s, dy, frame)
  else if (kind === 'dark') shadowCat(s, dy, frame)
  else { spiritArm(s, kind, dy); return }
  halo(s, COLORS[kind], 45, 2)
  bloom(s, 16, 16, 10, COLORS[kind], 25)
}
