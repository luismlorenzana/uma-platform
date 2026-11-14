// uma-farm F83's ranch goods (P178): the Coop's and the Barn's eggs and milk, G1 → G4 in the farm's order (its
// `EGGS_MILK`). Original art in the items' style: light from the top left, the shared outline and soft shadow. Each has its
// own silhouette, so the four tell apart in a 16 px chip: an upright egg, a slim bottle, an egg lying in a nest, a jug.
import { ramp } from '../color.ts'
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

/** An egg: an ellipse whose lower half is fuller, turned `rot` degrees clockwise. */
function eggMask(cx: number, cy: number, rx: number, ry: number, rot: number): Mask {
  const r = (rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r)
  return Mask.from((px, py) => {
    const dx = px - cx, dy = py - cy
    const u = dx * c + dy * s, v = -dx * s + dy * c
    const t = Math.max(-1, Math.min(1, v / ry)), half = rx * (1 + 0.14 * t)
    return (u * u) / (half * half) + (v * v) / (ry * ry) <= 1
  })
}

function rect(s: Sprite, material: number, x0: number, y0: number, x1: number, y1: number, tone: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.paint(x, y, material, tone)
}

/** Shades a mask as an upright cylinder: lit at its left third, darkest at its right edge. */
function shadeColumn(s: Sprite, mask: Mask, material: number, x0: number, x1: number): void {
  mask.each((x, y) => {
    const t = (x + 0.5 - x0) / (x1 - x0 + 1)
    s.paint(x, y, material, t < 0.12 ? 3 : t < 0.38 ? 5 : t < 0.6 ? 4 : t < 0.84 ? 3 : 2)
  })
}

/** G1, the Coop's hen's egg: a warm brown egg standing a little tilted. */
function egg(s: Sprite): void {
  const shell = s.addRamp(ramp('#d9a874', { lift: 0.42, drop: 0.24, satShift: 0.03 }))
  const body = eggMask(16, 17.5, 7.4, 10.2, 8)
  shadeDome(s, body, shell, { contact: false, relief: 1.1, bias: 0.1 })
  // A smooth glossy streak at the upper left: a shell, not a tuber's skin.
  for (const [x, y] of [[13, 10], [12, 11], [12, 12], [11, 13], [11, 14]] as const) s.paint(x, y, shell, 5)
}

/** G2, the Barn's milk: a slim glass dairy bottle full to the shoulder, a foil cap and a printed band. */
function milk(s: Sprite): void {
  const glass = s.addRamp(ramp('#b9d2d8', { lift: 0.5, drop: 0.26, satShift: 0.02 }))
  const cream = s.addRamp(ramp('#ece6d6', { lift: 0.55, drop: 0.2, hueShift: 10 }))
  const foil = s.addRamp(ramp('#3f78c0', { lift: 0.4, drop: 0.25 }))
  const outline: Point[] = [[14, 5], [18, 5], [18, 9], [20, 13], [20, 26], [19, 27], [13, 27], [12, 26], [12, 13], [14, 9]]
  const bottle = Mask.polygon(outline)
  shadeColumn(s, bottle, glass, 12, 19)
  // The milk fills the body and the shoulder; the neck's glass stays clear above it.
  const fill = Mask.polygon([[13, 11], [19, 11], [19.5, 13], [19.5, 26], [12.5, 26], [12.5, 13]])
  shadeColumn(s, fill, cream, 12, 19)
  rect(s, glass, 13, 13, 13, 25, 4)
  // A thick lip under a foil cap pressed over it, its crimp a darker line.
  rect(s, glass, 13, 5, 18, 6, 4)
  rect(s, glass, 13, 5, 14, 6, 5)
  rect(s, foil, 13, 2, 18, 4, 3)
  rect(s, foil, 14, 2, 17, 2, 5)
  rect(s, foil, 13, 3, 14, 3, 4)
  rect(s, foil, 13, 4, 18, 4, 2)
  // The printed band: blue, with a pale line of lettering.
  rect(s, foil, 12, 17, 19, 21, 3)
  rect(s, foil, 12, 17, 19, 17, 4)
  rect(s, foil, 19, 18, 19, 21, 2)
  for (const x of [14, 15, 17, 18]) s.paint(x, 19, cream, 5)
}

/** G3, the Coop's duck egg: a larger, pale blue-green egg lying in a straw nest. */
function duckEgg(s: Sprite): void {
  const shell = s.addRamp(ramp('#a9d1c6', { lift: 0.45, drop: 0.24, hueShift: 6 }))
  const straw = s.addRamp(ramp('#c39a52', { lift: 0.36, drop: 0.27 }))
  const body = eggMask(16, 15.5, 7, 10.5, 62)
  shadeDome(s, body, shell, { contact: false, relief: 0.85, bias: 0.08 })
  for (const [x, y] of [[11, 11], [12, 10], [13, 10]] as const) s.paint(x, y, shell, 5)
  // The nest's near rim: a low woven bowl over the egg's lower half, its straws in alternating tones.
  const nest = Mask.ellipse(16, 22, 13, 5.2).subtract(Mask.ellipse(16, 17.6, 10.5, 3.4))
  shadeDome(s, nest, straw, { contact: false, relief: 0.6, bias: 0.04 })
  nest.each((x, y) => { if ((x * 2 + y * 3) % 7 === 0) s.shift(x, y, -1); else if ((x * 3 + y) % 9 === 0) s.shift(x, y, 1) })
  // Two loose straws poking up from the rim at the sides.
  for (const [x, y] of [[4, 18], [5, 18], [5, 19], [27, 17], [26, 18], [26, 19]] as const) s.paint(x, y, straw, 4)
}

/** G4, the Barn's goat milk: a round sage-glazed jug with a handle, full to its mouth, a drip running from the spout. */
function goatMilk(s: Sprite): void {
  const clay = s.addRamp(ramp('#7f9a68', { lift: 0.38, drop: 0.27, hueShift: 6 }))
  const cream = s.addRamp(ramp('#efeadf', { lift: 0.55, drop: 0.18, hueShift: 10 }))
  const band = s.addRamp(ramp('#d9c08a', { lift: 0.4, drop: 0.24 }))
  // The handle first, so the belly's edge gets its contact line against it.
  const handle = Mask.ellipse(23, 15.5, 4.6, 6.2).subtract(Mask.ellipse(23, 15.5, 2.2, 3.8), Mask.from((px) => px < 21))
  shadeDome(s, handle, clay, { contact: false, relief: 0.5 })
  const body = Mask.ellipse(15, 19.5, 8.6, 8)
    .union(Mask.polygon([[9.5, 6], [20, 6], [21, 14], [9, 14]]), Mask.polygon([[6, 5.5], [10, 5.5], [10, 9], [8, 9]]))
    .subtract(Mask.from((_, py) => py > 27))
  shadeDome(s, body, clay, { relief: 0.8, bias: -0.1 })
  // A pale band at the shoulder.
  body.each((x, y) => { if (y === 13 || y === 14) s.paint(x, y, band, x < 12 ? 4 : x > 19 ? 2 : 3) })
  // The mouth, seen a little from above: a lit rim around the milk's surface, the spout at the left.
  const opening = Mask.ellipse(14.6, 7.2, 5.4, 1.7)
  Mask.ellipse(14.6, 7.2, 6.6, 2.7).subtract(opening).subtract(Mask.from((px) => px < 8)).each((x, y) => s.paint(x, y, clay, y <= 5 ? 4 : 3))
  opening.each((x, y) => s.paint(x, y, cream, x < 13 ? 5 : x > 17 ? 3 : 4))
  rect(s, cream, 7, 6, 8, 6, 5)
  // A drip of milk from the spout down the jug's front.
  for (const [x, y, t] of [[7, 7, 5], [7, 8, 4], [7, 9, 4], [7, 10, 4], [8, 11, 4], [8, 12, 3], [8, 15, 4], [8, 16, 4], [9, 17, 3]] as const) s.paint(x, y, cream, t)
}

/** Art identity only, keyed by uma-farm's ids: no prices, animals or rules. */
export const RANCH_GOODS: readonly ItemIcon[] = [
  { id: 'egg', name: 'Egg', grade: 1, paint: egg },
  { id: 'milk', name: 'Milk', grade: 2, paint: milk },
  { id: 'duck-egg', name: 'Duck Egg', grade: 3, paint: duckEgg },
  { id: 'goat-milk', name: 'Goat Milk', grade: 4, paint: goatMilk },
]
