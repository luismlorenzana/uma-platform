// Fruits (Orchard, MP family): uma-rpg docs/design/items.md#fruits.
import { ramp, type RGBA } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

const LEAF = ramp('#5fae3c')
const STEM = ramp('#7b5330')

function leaf(s: Sprite, cx: number, cy: number, rx: number, ry: number, rot: number, tones: RGBA[] = LEAF): void {
  const id = s.addRamp(tones)
  shadeDome(s, Mask.ellipse(cx, cy, rx, ry, rot), id, { contact: false, bias: 0.08 })
}

function stem(s: Sprite, points: readonly (readonly [number, number])[], tones: RGBA[] = STEM): void {
  const id = s.addRamp(tones)
  points.forEach(([x, y], i) => s.paint(x, y, id, i === 0 ? 2 : 3))
}

/** Darkens a few seeded pixels inside the lit part of the object, for skin texture. */
function speckle(s: Sprite, seed: string, mask: Mask, count: number, minTone: number, delta = -1): void {
  const r = rng(seed)
  const cells: [number, number][] = []
  mask.each((x, y) => {
    if (s.toneAt(x, y) >= minTone) cells.push([x, y])
  })
  for (let i = 0; i < count && cells.length > 0; i++) {
    const [x, y] = cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0]
    s.shift(x, y, delta)
  }
}

function apple(s: Sprite, skin: RGBA[], leafTones: RGBA[] = LEAF): void {
  const id = s.addRamp(skin)
  const body = Mask.circle(12.5, 17.5, 8).union(Mask.circle(19.5, 17.5, 8), Mask.ellipse(16, 20, 8.5, 7.5))
  shadeDome(s, body, id)
  stem(s, [[16, 10], [16, 9], [16, 8], [17, 7]])
  leaf(s, 20.5, 8, 3.4, 1.6, -25, leafTones)
}

function peach(s: Sprite, fuzz: RGBA[], blush: RGBA[]): void {
  const fuzzId = s.addRamp(fuzz)
  const blushId = s.addRamp(blush)
  const body = Mask.circle(14.8, 18, 9.2).union(Mask.circle(17.2, 18, 9.2))
  shadeDome(s, body, (x, y) => {
    const b = (x - 7 + (y - 9) * 0.8) / 18
    if (b > 1.18) return blushId
    if (b > 1.0) return (x + y) % 2 === 0 ? blushId : fuzzId
    return fuzzId
  })
  for (let y = 10; y <= 21; y++) s.shift(Math.round(16 - (y - 10) * 0.14), y, -1)
  stem(s, [[16, 8]])
  leaf(s, 19.5, 8, 3.2, 1.5, -20)
}

export const FRUITS: ItemIcon[] = [
  { id: 'apple', name: 'Apple', grade: 1, paint: (s) => apple(s, ramp('#d63c39')) },
  {
    id: 'pear',
    name: 'Pear',
    grade: 2,
    paint: (s) => {
      const id = s.addRamp(ramp('#c3cf4c', { hueShift: 10 }))
      const body = Mask.circle(16, 11.5, 5.2).union(Mask.ellipse(16, 15.5, 6.3, 5), Mask.circle(16, 19.5, 8))
      shadeDome(s, body, id)
      speckle(s, 'pear', body, 8, 3)
      stem(s, [[16, 6], [16, 5], [17, 4]])
      leaf(s, 19.6, 5.2, 2.8, 1.3, -30)
    },
  },
  { id: 'peach', name: 'Peach', grade: 3, paint: (s) => peach(s, ramp('#f7a86e'), ramp('#e85a6b')) },
  {
    id: 'plum',
    name: 'Plum',
    grade: 4,
    paint: (s) => {
      const id = s.addRamp(ramp('#7d3b94', { hueShift: 6 }))
      const body = Mask.ellipse(16, 18, 8.8, 9.6, 12)
      shadeDome(s, body, id)
      for (let t = 0; t <= 8; t++) s.shift(Math.round(17 + t * 0.3), 10 + t, -1)
      speckle(s, 'plum-bloom', body, 7, 2, 1)
      stem(s, [[16, 7], [16, 6], [17, 5]])
    },
  },
  {
    id: 'orange',
    name: 'Orange',
    grade: 5,
    paint: (s) => {
      const id = s.addRamp(ramp('#f28c1f'))
      const body = Mask.circle(16, 18, 9.6)
      shadeDome(s, body, id)
      speckle(s, 'orange-peel', body, 18, 3)
      const leafId = s.addRamp(LEAF)
      s.paint(15, 9, leafId, 2)
      s.paint(16, 9, leafId, 3)
      s.paint(17, 9, leafId, 2)
      s.paint(16, 8, leafId, 3)
      leaf(s, 19.8, 6.8, 3.2, 1.4, -18)
    },
  },
  {
    id: 'grape',
    name: 'Grape',
    grade: 6,
    paint: (s) => {
      stem(s, [[16, 8], [16, 7], [16, 6], [16, 5], [17, 4], [18, 3]])
      const id = s.addRamp(ramp('#7042ab', { hueShift: 6 }))
      const rows: [number, number[]][] = [[10, [8.5, 13.5, 18.5, 23.5]], [14.5, [11, 16, 21]], [19, [13.5, 18.5]], [23.5, [16]]]
      for (const [y, xs] of rows) for (const x of xs) shadeDome(s, Mask.circle(x, y, 3.2), id)
      leaf(s, 21.5, 4.5, 3.4, 1.6, -15)
    },
  },
  {
    id: 'mango',
    name: 'Mango',
    grade: 7,
    paint: (s) => {
      const green = s.addRamp(ramp('#86b53d'))
      const yellow = s.addRamp(ramp('#f5b83a'))
      const red = s.addRamp(ramp('#e2522f'))
      const cx = 16, cy = 18, rx = 10.8, ry = 8, rot = -28
      const a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
      shadeDome(s, Mask.ellipse(cx, cy, rx, ry, rot), (x, y) => {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy
        const t = (dx * c + dy * sn) / rx
        const v = (-dx * sn + dy * c) / ry
        const checker = (x + y) % 2 === 0
        if (t > 0.6 || (t > 0.45 && checker)) return green
        const blush = (t + 0.1) ** 2 + (v + 0.55) ** 2
        if (blush < 0.12 || (blush < 0.2 && checker)) return red
        return yellow
      })
      stem(s, [[25, 12], [26, 11]])
    },
  },
  {
    id: 'pomegranate',
    name: 'Pomegranate',
    grade: 8,
    paint: (s) => {
      const id = s.addRamp(ramp('#bb2532'))
      shadeDome(s, Mask.circle(16, 19, 9.4), id)
      const crownId = s.addRamp(ramp('#9c1d2a'))
      const crown = Mask.polygon([[12.5, 12.4], [13.1, 6.8], [14.7, 9.4], [16, 5.6], [17.3, 9.4], [18.9, 6.8], [19.5, 12.4]])
      shadeDome(s, crown, crownId, { bias: 0.1 })
    },
  },
  { id: 'starpeach', name: 'Starpeach', grade: 9, paint: (s) => peach(s, ramp('#ffd98c', { lift: 0.32 }), ramp('#ffb3c6', { satShift: 0, hueShift: 3, drop: 0.18 })) },
  {
    id: 'golden-apple',
    name: 'Golden Apple',
    grade: 10,
    paint: (s) => {
      apple(s, ramp('#efbd25', { lift: 0.5, drop: 0.34, hueShift: 12, satShift: 0.08 }), ramp('#a9c43c'))
      for (const [x, y] of [[10, 13], [10, 14], [11, 12], [12, 11]] as const) s.paint(x, y, 0, 5)
    },
  },
]
