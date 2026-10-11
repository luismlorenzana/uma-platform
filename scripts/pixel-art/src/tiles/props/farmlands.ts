// Farmlands props: a berry bush, two kinds of flowers, a hay bale, a fence, an apple tree and a field stone.
import { rng } from '../../rng.ts'
import { cutStone, shadeFacets } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import { add, box, circles, foliage, stroke } from './kit.ts'
import { foot, type Prop } from './types.ts'

function bush(s: Sprite): void {
  const leaf = add(s, '#3f8a3c', { hueShift: 10 })
  const berry = add(s, '#c8354a')
  const clumps = [[5, 9.5, 3.6], [10.8, 9.2, 3.6], [8, 6, 4]] as const
  foliage(s, circles(s, clumps), leaf, clumps)
  for (const [x, y] of [[4, 8], [11, 7], [8, 10], [6, 4]] as const) {
    s.paint(x, y, berry, 3)
    s.paint(x, y + 1, berry, 2)
  }
  s.paint(4, 8, berry, 5)
  s.paint(11, 7, berry, 5)
}

function daisies(s: Sprite): void {
  const leaf = add(s, '#3d8b3a')
  const petal = add(s, '#f4f1e2', { drop: 0.12 })
  const heart = add(s, '#eab73a')
  for (const [x0, y0, x1, y1] of [[3, 12, 2, 10], [7, 13, 8, 11], [12, 12, 13, 10], [5, 13, 4, 12], [10, 13, 11, 12]] as const) stroke(s, x0, y0, x1, y1, leaf, 2)
  for (const [x, y] of [[3, 7], [8, 4], [12, 7], [6, 10], [10, 10]] as const) {
    s.paint(x, y - 1, petal, 5)
    s.paint(x - 1, y, petal, 4)
    s.paint(x + 1, y, petal, 3)
    s.paint(x, y + 1, petal, 3)
    s.paint(x, y, heart, 4)
  }
}

function tulips(s: Sprite): void {
  const leaf = add(s, '#3d8b3a')
  const red = add(s, '#d8455a'), pink = add(s, '#ea7fa6')
  const heads = [[4, 6, red], [8, 4, pink], [12, 6, red], [6, 9, pink], [10, 9, red]] as const
  for (const [x, y] of heads) stroke(s, x, y + 2, x, 13, leaf, 2)
  for (const [x, y] of [[3, 12], [7, 12], [9, 12], [13, 11]] as const) {
    s.paint(x, y, leaf, 3)
    s.paint(x, y - 1, leaf, 4)
  }
  for (const [x, y, id] of heads) {
    s.paint(x - 1, y, id, 4)
    s.paint(x, y, id, 3)
    s.paint(x + 1, y, id, 4)
    s.paint(x - 1, y + 1, id, 3)
    s.paint(x, y + 1, id, 3)
    s.paint(x + 1, y + 1, id, 2)
    s.paint(x, y - 1, id, 5)
  }
}

function hayBale(s: Sprite): void {
  const hay = add(s, '#d4aa48', { hueShift: 10, lift: 0.22 })
  const twine = add(s, '#7a4a22')
  const r = rng('farmlands:hay')
  box(s, 2, 4, 13, 12, 7, hay, true)
  // Straw: lit streaks along the top, cut ends speckling the front.
  for (const [x, y, n] of [[3, 5, 2], [7, 6, 3], [9, 4, 2], [11, 6, 1]] as const) for (let k = 0; k < n; k++) s.paint(x + k, y, hay, 5)
  for (let y = 9; y <= 11; y++) for (let x = 3; x <= 12; x++) if (r() < 0.3) s.shift(x, y, r() < 0.5 ? -1 : 1)
  for (const x of [5, 10]) for (let y = 4; y <= 12; y++) s.paint(x, y, twine, y <= 7 ? 3 : y === 8 ? 2 : 1)
}

function fence(s: Sprite): void {
  const wood = add(s, '#a06c3c', { hueShift: 10 })
  for (const y of [6, 10]) for (let x = 1; x <= 14; x++) s.paint(x, y, wood, y === 6 ? 4 : 3)
  for (const y of [7, 11]) for (let x = 1; x <= 14; x++) s.paint(x, y, wood, 2)
  for (const x0 of [2, 11]) {
    for (let y = 3; y <= 13; y++) {
      s.paint(x0, y, wood, y === 3 ? 5 : 4)
      s.paint(x0 + 1, y, wood, y === 3 ? 4 : y >= 12 ? 1 : 2)
    }
  }
}

function appleTree(s: Sprite): void {
  const bark = add(s, '#7a5032', { hueShift: 10 })
  const leaf = add(s, '#3c8c3a', { hueShift: 12 })
  const apple = add(s, '#d23a3a')
  // Trunk with a little root flare.
  for (let y = 18; y <= 28; y++) {
    s.paint(7, y, bark, 4)
    s.paint(8, y, bark, 3)
    s.paint(9, y, bark, 2)
  }
  s.paint(6, 28, bark, 3)
  s.paint(10, 28, bark, 2)
  const clumps = [[8, 6.5, 5], [4.6, 9.5, 3.6], [11.4, 9.5, 3.6], [5, 14.5, 3.8], [11, 14.5, 3.8], [8, 16.5, 3.4], [8, 11.5, 4.5]] as const
  const crown = circles(s, clumps)
  foliage(s, crown, leaf, clumps)
  for (const [x, y] of [[3, 10], [10, 5], [12, 13], [7, 16], [6, 8], [9, 11]] as const) {
    s.paint(x, y, apple, 3)
    s.paint(x + 1, y, apple, 2)
    s.paint(x, y - 1, apple, 5)
  }
}

function fieldStone(s: Sprite): void {
  const stone = add(s, '#a59986', { hueShift: 6 })
  const moss = add(s, '#5c9a3e')
  const outer = [[3, 12], [2, 9], [4, 6], [8, 5], [12, 6], [14, 9], [13, 12], [8, 13]] as const
  const inner = [[5, 10], [4.5, 8.5], [6, 7.5], [8.5, 7], [10.5, 7.5], [11.5, 9], [11, 10.5], [8, 11]] as const
  shadeFacets(s, outer, cutStone(outer, inner, 3), stone)
  for (const [x, y] of [[2, 12], [3, 13], [13, 13]] as const) s.paint(x, y, moss, 3)
  s.paint(2, 11, moss, 4)
}

export const FARMLANDS_PROPS: readonly Prop[] = [
  { id: 'bush', w: 16, h: 16, shadow: foot(8.5, 13.4, 6.5, 2), paint: bush },
  { id: 'flowers-a', w: 16, h: 16, shadow: foot(8, 13.5, 5.5, 1.5, 50), paint: daisies },
  { id: 'flowers-b', w: 16, h: 16, shadow: foot(8, 13.5, 5.5, 1.5, 50), paint: tulips },
  { id: 'hay-bale', w: 16, h: 16, shadow: foot(8.5, 13.2, 7, 1.8), paint: hayBale },
  { id: 'fence', w: 16, h: 16, shadow: foot(8, 13.5, 7.5, 1.2, 60), paint: fence },
  { id: 'tree', w: 16, h: 32, shadow: foot(8.5, 29, 6.5, 2), paint: appleTree },
  { id: 'rock', w: 16, h: 16, shadow: foot(8.5, 12.8, 6, 1.8), paint: fieldStone },
]

