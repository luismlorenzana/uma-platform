// Wilds props: a pine, a mossy boulder, loose stones, a wild grass tuft, mushrooms and a fallen log.
import { rng } from '../../rng.ts'
import { cutStone, Mask, type Point, shadeDome, shadeFacets } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import { add, stroke } from './kit.ts'
import { foot, type Prop } from './types.ts'

function pine(s: Sprite): void {
  const needles = add(s, '#2e6a4e', { hueShift: 12 })
  const bark = add(s, '#6b4630', { hueShift: 10 })
  for (let y = 22; y <= 28; y++) {
    s.paint(7, y, bark, 4)
    s.paint(8, y, bark, 2)
  }
  // Tiers painted bottom first, so each upper tier overlaps the one below it.
  const tiers = [[14, 26, 6.6], [9, 21, 5.6], [5, 15.5, 4.4], [1, 10, 3]] as const
  const r = rng('wilds:pine')
  for (const [top, bottom, half] of tiers) {
    for (let y: number = top; y <= bottom; y++) {
      const v = (y + 0.5 - top) / (bottom - top)
      const hw = half * Math.min(1, v * 1.12) + 0.4
      for (let x = 0; x < 16; x++) {
        const u = (x + 0.5 - 8) / hw
        if (Math.abs(u) > 1) continue
        // The hem of each tier droops in little points.
        if (y === bottom && (x % 3 === 1 || Math.abs(u) > 0.8)) continue
        let t = u < -0.45 ? 4 : u < 0.15 ? 3 : u < 0.6 ? 2 : 1
        if (v > 0.82) t = Math.max(1, t - 1)
        if (v < 0.25 && u < 0.2) t = Math.min(5, t + 1)
        if (r() < 0.12) t = Math.max(1, Math.min(5, t + (r() < 0.5 ? 1 : -1)))
        s.paint(x, y, needles, t)
      }
    }
  }
}

function boulder(s: Sprite): void {
  const stone = add(s, '#8a8e8a', { hueShift: 10 })
  const moss = add(s, '#5c8f3e', { hueShift: 10 })
  const outer: Point[] = [[2, 13], [1, 9], [3, 5], [7, 3], [11, 3.5], [14, 6], [15, 10], [13, 13.5], [8, 14]]
  const inner: Point[] = [[4.5, 10], [4, 8], [6, 6], [8.5, 5.5], [11, 6], [12.5, 8], [12.5, 10.5], [10, 11.5], [7, 11.5]]
  shadeFacets(s, outer, cutStone(outer, inner, 4), stone)
  // Moss on the top, thickest toward the light.
  const r = rng('wilds:boulder')
  Mask.polygon(inner, 16, 16).each((x, y) => {
    if (y <= 8 && r() < 0.75 - (x - 4) * 0.05) s.paint(x, y, moss, y <= 6 ? 4 : 3)
  })
  for (const [x, y] of [[4, 5], [5, 4], [3, 6], [8, 4], [9, 4]] as const) s.paint(x, y, moss, 4)
  s.paint(6, 5, moss, 5)
  // A crack down the front.
  stroke(s, 10, 9, 11, 12, stone, 1)
}

function stones(s: Sprite): void {
  const stone = add(s, '#868b8d', { hueShift: 8 })
  const big: Point[] = [[2, 12], [2, 9], [4, 7], [7, 6.5], [9, 8], [9.5, 11], [7, 12.6]]
  const bigTop: Point[] = [[3.8, 10.4], [4, 9], [5.4, 8.3], [7, 8.5], [7.8, 9.6], [7.4, 10.8], [5.6, 11.2]]
  shadeFacets(s, big, cutStone(big, bigTop, 2.5), stone)
  const small: Point[] = [[10, 13], [10.2, 11], [11.6, 10], [13.2, 10.4], [14, 12], [13, 13.4], [11.2, 13.6]]
  const smallTop: Point[] = [[11, 12.4], [11.1, 11.4], [11.9, 10.9], [12.9, 11.1], [13.2, 12], [12.6, 12.7], [11.6, 12.8]]
  shadeFacets(s, small, cutStone(small, smallTop, 1.6), stone)
}

function grassTuft(s: Sprite): void {
  const blade = add(s, '#4f8f40', { hueShift: 12 })
  const dry = add(s, '#c2ae62', { hueShift: 8 })
  // Blades two pixels wide (lit left, shaded right), rooted apart so the outline runs between them.
  const blades = [[3, 13, 1, 7, blade], [5, 13, 4, 4, blade], [7, 13, 7, 2, dry], [9, 13, 10, 4, blade], [11, 13, 13, 6, blade]] as const
  for (const [x0, y0, x1, y1, id] of blades) {
    const n = y0 - y1
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = Math.round(x0 + (x1 - x0) * t * t)
      const y = y0 - i
      const tone = t > 0.7 ? 4 : t > 0.3 ? 3 : 2
      s.paint(x, y, id, tone + (t > 0.85 ? 1 : 0))
      if (t < 0.8) s.paint(x + 1, y, id, tone - 1)
    }
  }
}

function mushrooms(s: Sprite): void {
  const cap = add(s, '#b8452f', { hueShift: 10 })
  const tan = add(s, '#c4955a', { hueShift: 10 })
  const stem = add(s, '#ece0c4', { drop: 0.14 })
  const stems = [[5, 9, 12, 1], [10, 10, 12, 0], [13, 11, 12, 0]] as const
  for (const [x, y0, y1, wide] of stems)
    for (let y = y0; y <= y1; y++) {
      s.paint(x, y, stem, 4)
      if (wide) s.paint(x + 1, y, stem, 2)
    }
  const capOf = (cx: number, cy: number, rx: number, ry: number) => Mask.from((px, py) => py <= cy + 0.6 && ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1, 16, 16)
  shadeDome(s, capOf(5.9, 8.4, 4.2, 4), cap, { bias: 0.05 })
  shadeDome(s, capOf(10.5, 9.6, 2.7, 2.4), tan)
  shadeDome(s, capOf(13.4, 10.8, 1.9, 1.7), tan)
  for (const [x, y] of [[4, 6], [7, 5], [6, 7]] as const) s.paint(x, y, stem, 5)
}

function log(s: Sprite): void {
  const bark = add(s, '#6e4a2e', { hueShift: 10 })
  const wood = add(s, '#c99d64', { hueShift: 8 })
  const moss = add(s, '#5a9142')
  const rows = [4, 4, 3, 3, 2, 1] as const
  for (let x = 4; x <= 14; x++)
    rows.forEach((t, i) => {
      const y = 6 + i
      if (x === 14 && (i === 0 || i === 5)) return
      s.paint(x, y, bark, t)
    })
  // Bark furrows.
  for (const [x0, x1, y] of [[6, 9, 8], [10, 13, 9], [5, 7, 10], [11, 12, 7]] as const) stroke(s, x0, y, x1, y, bark, 2)
  // The sawn end, with its rings.
  Mask.ellipse(3.6, 8.5, 2.1, 3.1, 0, 16, 16).each((x, y) => {
    const d = Math.hypot((x + 0.5 - 3.6) / 2.1, (y + 0.5 - 8.5) / 3.1)
    s.paint(x, y, wood, d > 0.8 ? 4 : d > 0.45 ? 3 : 2)
  })
  s.paint(3, 8, wood, 2)
  for (const [x, y, t] of [[6, 6, 4], [7, 5, 3], [8, 6, 4], [9, 6, 3], [12, 6, 4], [13, 6, 3], [7, 6, 5]] as const) s.paint(x, y, moss, t)
}

export const WILDS_PROPS: readonly Prop[] = [
  { id: 'pine', w: 16, h: 32, shadow: foot(8.5, 28.6, 6.5, 2), paint: pine },
  { id: 'boulder', w: 16, h: 16, shadow: foot(8.5, 13.6, 7.2, 2.2), paint: boulder },
  { id: 'rock', w: 16, h: 16, shadow: foot(8.5, 13, 6.5, 1.6), paint: stones },
  { id: 'grass-tuft', w: 16, h: 16, shadow: foot(8, 13.6, 5, 1.3, 55), paint: grassTuft },
  { id: 'mushrooms', w: 16, h: 16, shadow: foot(8.5, 13.2, 6, 1.5, 65), paint: mushrooms },
  { id: 'log', w: 16, h: 16, shadow: foot(9, 12.6, 6.8, 1.6), paint: log },
]
