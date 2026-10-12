// Hand-shaped pixel impacts. Every pose stays readable on its own, including frame 3 for reduced-motion playback.
import { hex } from '../color.ts'
import { bloom, halo } from '../items/refined/workbench-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add, stroke } from '../tiles/props/kit.ts'
import { COLORS, type Kind } from './spec.ts'

const put = (s: Sprite, mask: Mask, id: number) => shadeDome(s, mask, id, { bias: 0.14, relief: 0.45, contact: false })

function crescent(s: Sprite, frame: number, id: number, axe: boolean): void {
  const radius = [7, 12, 13, 10][frame]!
  const outer = axe ? Mask.ellipse(16, 16, radius + 1, radius * 0.64, -32) : Mask.circle(15.5, 15.5, radius)
  const inner = axe ? Mask.ellipse(13, 12, radius - 1, radius * 0.55, -32) : Mask.circle(12, 12, radius - 2)
  put(s, outer.subtract(inner), id)
  if (frame >= 1) {
    const tip = add(s, '#fff5dd', { lift: 0.3, drop: 0.2 })
    stroke(s, 20, 7, 25, 11, tip, 5)
    s.paint(26, 12, tip, 4)
  }
}

function lance(s: Sprite, frame: number, id: number): void {
  const start = [10, 4, 3, 7][frame]!, end = [20, 27, 28, 25][frame]!
  stroke(s, start, 31 - start, end, 31 - end, id, 4)
  stroke(s, start + 1, 31 - start, end, 32 - end, id, 3)
  const p = frame === 0 ? 17 : frame === 3 ? 18 : 20
  for (const [dx, dy] of [[-5, -2], [5, 2], [2, -5], [-2, 5]] as const) stroke(s, p, 31 - p, p + dx, 31 - p + dy, id, 5)
}

function arrow(s: Sprite, x: number, y: number, len: number, id: number): void {
  stroke(s, x - len, y + len, x, y, id, 4)
  stroke(s, x - 4, y, x, y, id, 5); stroke(s, x, y, x, y + 4, id, 3)
  stroke(s, x - len - 1, y + len - 2, x - len + 2, y + len + 1, id, 3)
}

function bow(s: Sprite, frame: number, id: number): void {
  arrow(s, 22, 10, frame === 0 ? 7 : 13, id)
  if (frame >= 1) { arrow(s, 26, 15, 6, id); arrow(s, 16, 6, 5, id) }
  if (frame === 2) { s.paint(26, 6, id, 5); s.paint(28, 9, id, 4); s.paint(22, 4, id, 5) }
}

function katana(s: Sprite, frame: number, id: number): void {
  const lo = [10, 4, 4, 6][frame]!, hi = [21, 27, 28, 25][frame]!
  for (let x = lo; x <= hi; x++) {
    const bend = Math.round(Math.sin((x - lo) / (hi - lo) * Math.PI) * 2)
    s.paint(x, 30 - x - bend, id, 5)
    if (x >= lo + 2 && x < hi) s.paint(x, 34 - x - bend, id, 3)
  }
  if (frame >= 1) { s.paint(23, 7, id, 5); s.paint(6, 24, id, 4) }
}

function fire(s: Sprite, frame: number, id: number): void {
  const spread = [0, 3, 4, 2][frame]!
  const flame = Mask.polygon([[16, 5 - Math.min(2, spread)], [18, 12], [23 + spread, 7], [23, 16], [28, 20], [24, 26], [17, 28], [9, 25], [4, 18], [9, 12], [11, 19], [14, 13]])
  put(s, flame, id)
  const core = add(s, '#ffd15a', { lift: 0.46, drop: 0.23 })
  put(s, Mask.polygon([[16, 12], [19, 19], [22, 16], [22, 24], [16, 26], [11, 22], [14, 19]]), core)
}

function ice(s: Sprite, frame: number, id: number): void {
  const distance = [0, 2, 3, 1][frame]!
  for (const [cx, cy, rx, ry] of [[16, 9 - distance, 3, 5], [8 - distance, 15, 3, 4], [24 + distance, 16, 2, 4], [12, 24 + distance, 3, 3], [21, 24, 2, 3]] as const) {
    const shard = Mask.polygon([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]])
    shard.each((x, y) => s.paint(x, y, id, x < cx ? (y < cy ? 5 : 4) : y < cy ? 3 : 2))
  }
}

function lightning(s: Sprite, frame: number, id: number): void {
  const shift = frame === 2 ? 2 : 0
  put(s, Mask.polygon([[17 + shift, 3], [12, 13], [17, 13], [11, 28], [22, 14], [17, 14], [23 + shift, 3]]), id)
  if (frame !== 0) {
    stroke(s, 15, 15, 6, 11, id, 4); stroke(s, 6, 11, 8, 5, id, 5)
    stroke(s, 19, 16, 26, 21, id, 4); stroke(s, 26, 21, 24, 27, id, 3)
  }
  s.overlay(17, 10, hex('#ffffff', 230))
}

function light(s: Sprite, frame: number, id: number): void {
  const r = [6, 12, 13, 9][frame]!, points: [number, number][] = []
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8 - Math.PI / 2, reach = i % 2 === 0 ? (i % 4 === 0 ? r : r * 0.72) : r * 0.28
    points.push([16 + Math.cos(angle) * reach, 16 + Math.sin(angle) * reach])
  }
  put(s, Mask.polygon(points), id)
  s.sparkle(15, 15, frame === 0 ? 1 : 2)
}

function dark(s: Sprite, frame: number, id: number): void {
  const r = [12, 10, 7, 6][frame]!
  put(s, Mask.circle(16, 16, r).subtract(Mask.circle(16, 16, r - 2)), id)
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + frame * 0.17
    const x = Math.round(16 + Math.cos(angle) * r), y = Math.round(16 + Math.sin(angle) * r)
    const ix = Math.round(16 + Math.cos(angle + 0.4) * (r - 4)), iy = Math.round(16 + Math.sin(angle + 0.4) * (r - 4))
    stroke(s, x, y, ix, iy, id, 4)
  }
  const core = add(s, '#59447e', { lift: 0.42, drop: 0.3 })
  put(s, Mask.circle(16, 16, frame === 0 ? 2 : 3), core)
}

export function hit(s: Sprite, kind: Kind, frame: number): void {
  const id = add(s, COLORS[kind], { lift: 0.42, drop: 0.26, hueShift: 8 })
  if (kind === 'greatsword' || kind === 'axe') crescent(s, frame, id, kind === 'axe')
  else if (kind === 'lance') lance(s, frame, id)
  else if (kind === 'bow') bow(s, frame, id)
  else if (kind === 'katana') katana(s, frame, id)
  else if (kind === 'fire') fire(s, frame, id)
  else if (kind === 'ice') ice(s, frame, id)
  else if (kind === 'lightning') lightning(s, frame, id)
  else if (kind === 'light') light(s, frame, id)
  else dark(s, frame, id)
  // Glow is part of the pixel frame, not an unbounded runtime particle cloud; two-row foe formations remain clear.
  halo(s, COLORS[kind], frame === 1 ? 50 : 28, 1)
  if (kind === 'fire' || kind === 'light' || kind === 'dark') bloom(s, 16, 16, 8, COLORS[kind], frame === 1 ? 42 : 22)
}
