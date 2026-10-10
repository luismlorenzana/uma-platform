// Grains (Fields, HP family): uma-rpg docs/design/items.md#grains. Ears, panicles and cobs, drawn as the harvest.
import { ramp } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

// Drawing helpers shared by the plant families (grains, vegetables, herbs & spices).

export type Pt = readonly [number, number]

const rad = (deg: number) => (deg * Math.PI) / 180

/** The point `t` px from (x, y) along heading `deg` (0° up, clockwise), moved `u` px to the heading's right. */
export function along(x: number, y: number, deg: number, t: number, u = 0): [number, number] {
  const a = rad(deg)
  return [x + Math.sin(a) * t + Math.cos(a) * u, y - Math.cos(a) * t + Math.sin(a) * u]
}

/** Pixels of a Bézier curve (control points in pixel coordinates), one step at a time, with no L-shaped corners. */
export function curvePixels(ctrl: readonly Pt[]): [number, number][] {
  const at = (t: number): [number, number] => {
    let pts = ctrl.map(([x, y]) => [x, y] as [number, number])
    while (pts.length > 1) {
      const prev = pts
      pts = prev.slice(1).map(([x, y], i) => {
        const [px, py] = prev[i] ?? [x, y]
        return [px + (x - px) * t, py + (y - py) * t]
      })
    }
    return pts[0] ?? [0, 0]
  }
  const raw: [number, number][] = []
  for (let i = 0; i <= 240; i++) {
    const [x, y] = at(i / 240)
    const p: [number, number] = [Math.round(x), Math.round(y)]
    const last = raw[raw.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) raw.push(p)
  }
  const out: [number, number][] = []
  raw.forEach((cur, i) => {
    const prev = out[out.length - 1]
    const next = raw[i + 1]
    if (prev && next && Math.abs(prev[0] - next[0]) === 1 && Math.abs(prev[1] - next[1]) === 1) return
    out.push(cur)
  })
  return out
}

/** A 1 px stroke along a curve; `tone` may vary along it (t from 0 to 1). Returns the pixels. */
export function stroke(s: Sprite, id: number, ctrl: readonly Pt[], tone: number | ((t: number) => number) = 3): [number, number][] {
  const px = curvePixels(ctrl)
  px.forEach(([x, y], i) => s.paint(x, y, id, typeof tone === 'number' ? tone : tone(i / Math.max(1, px.length - 1))))
  return px
}

/** A grass blade along a curve: two pixels wide (lit edge, shaded edge) for `wide` of its length, then a 1 px point. */
export function blade(s: Sprite, id: number, ctrl: readonly Pt[], wide = 0.6): void {
  const px = curvePixels(ctrl)
  px.forEach(([x, y], i) => {
    const t = i / Math.max(1, px.length - 1)
    s.paint(x, y, id, t < wide ? 4 : 3)
    if (t < wide) s.paint(x + 1, y, id, 2)
  })
}

/** Paints a small hand-drawn patch: digits 1–5 are tones, anything else is skipped. */
export function stamp(s: Sprite, id: number, x0: number, y0: number, rows: readonly string[]): void {
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const t = Number(row[dx])
      if (t >= 1 && t <= 5) s.paint(x0 + dx, y0 + dy, id, t)
    }
  })
}

/**
 * Draws a foreground part: whatever `draw` paints is rimmed with deep shadow on the earlier pixels it touches,
 * so overlapping ears, grains and leaves stay separate.
 */
export function front(s: Sprite, draw: () => void, rimTone = 1): void {
  const mat = s.mat.slice(), tone = s.tone.slice()
  draw()
  const isNew = (x: number, y: number) => s.inside(x, y) && (s.mat[y * s.w + x] !== mat[y * s.w + x] || s.tone[y * s.w + x] !== tone[y * s.w + x])
  const rim: [number, number][] = []
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (!s.filled(x, y) || isNew(x, y)) continue
      if (isNew(x + 1, y) || isNew(x - 1, y) || isNew(x, y + 1) || isNew(x, y - 1)) rim.push([x, y])
    }
  for (const [x, y] of rim) s.paint(x, y, s.mat[y * s.w + x] ?? 0, Math.min(rimTone, s.toneAt(x, y)))
}

/** A stamp drawn in front of what is already there. */
function grainAt(s: Sprite, id: number, x: number, y: number, rows: readonly string[]): void {
  front(s, () => stamp(s, id, x, y, rows))
}

/** Kernel stamps by the heading they point to (0° up, clockwise), lit from the top left. */
const POINTING: readonly (readonly [number, readonly string[]])[] = [
  [0, ['.5.', '443', '332', '.2.']],
  [45, ['..5', '.44', '432', '32.']],
  [90, ['.44.', '3445', '.32.']],
  [135, ['.4..', '443.', '.332', '..32']],
  [180, ['.4.', '443', '332', '.2.']],
  [225, ['..4.', '.443', '432.', '32..']],
  [270, ['.44.', '5443', '.32.']],
  [315, ['54.', '443', '.32', '..2']],
]

/** A kernel centered on (cx, cy), pointing along `deg`, in front of what is already there. */
function kernelPointing(s: Sprite, id: number, cx: number, cy: number, deg: number): void {
  const gap = (a: number) => Math.abs(((deg - a + 540) % 360) - 180)
  let best = POINTING[0]
  for (const p of POINTING) if (best && gap(p[0]) < gap(best[0])) best = p
  const st = best?.[1] ?? []
  const w = st[0]?.length ?? 2
  grainAt(s, id, Math.round(cx - w / 2), Math.round(cy - st.length / 2), st)
}

interface EarStyle {
  /** Left kernel (pointing up-left) and right kernel stamps; the right one sits one row lower. */
  left: readonly string[]
  right: readonly string[]
  tip: readonly string[]
  /** Rows between kernel pairs. */
  dy: number
}

const PLUMP: EarStyle = {
  left: ['54.', '443', '.32'],
  right: ['.44', '432', '21.'],
  tip: ['.5.', '443', '.3.'],
  dy: 3,
}

const SLENDER: EarStyle = {
  left: ['5.', '44', '.3'],
  right: ['.4', '43', '2.'],
  tip: ['4', '4', '3'],
  dy: 3,
}

/** Kernels hanging from a nodding head: they point down, so the ear grows downward. */
const NODDING: EarStyle = {
  left: ['.3.', '343', '43.'],
  right: ['.2.', '232', '.33'],
  tip: ['.3.', '343', '.4.'],
  dy: -3,
}

interface EarShape {
  /** Tip kernel's top pixel. */
  tip: Pt
  /** Each pair's outer top corners: left, then right. */
  sides: Pt[]
}

/**
 * An ear of grain from its base (x, y) upward: `pairs` kernel pairs then a tip kernel. `lean(k)` is the sideways
 * offset of pair k in pixels, so ears can tilt or curve.
 */
function ear(s: Sprite, id: number, x: number, y: number, pairs: number, lean: (k: number) => number, st: EarStyle): EarShape {
  const w = st.left[0]?.length ?? 3
  const sides: Pt[] = []
  for (let k = 0; k < pairs; k++) {
    const ax = x + Math.round(lean(k)), ay = y - k * st.dy
    stamp(s, id, ax, ay, st.right)
    stamp(s, id, ax - w + 1, ay - 1, st.left)
    sides.push([ax - w + 1, ay - 1], [ax + w - 1, ay])
  }
  const tx = x + Math.round(lean(pairs)), ty = y - pairs * st.dy
  const tw = st.tip[0]?.length ?? 1
  stamp(s, id, tx - Math.floor(tw / 2), ty - 1, st.tip)
  return { tip: [tx, ty - 1], sides }
}

/** Two rows of twine across a sheaf. */
function tie(s: Sprite, id: number, x0: number, x1: number, y: number): void {
  for (let x = x0; x <= x1; x++) {
    s.paint(x, y, id, x === x1 ? 3 : 4)
    s.paint(x, y + 1, id, x === x1 ? 1 : 2)
  }
}

const STRAW = ramp('#c79a45', { hueShift: 6 })
const LEAF = ramp('#79a83c')

/** Three ears tied in a sheaf; the stalks cross at the knot and flare out below it. */
function wheat(s: Sprite): void {
  const grainId = s.addRamp(ramp('#e2b43f', { hueShift: 8 }))
  const stalkId = s.addRamp(STRAW)
  const tieId = s.addRamp(ramp('#b5482f'))
  stroke(s, stalkId, [[10, 16], [19, 26]], 3)
  stroke(s, stalkId, [[22, 16], [13, 26]], 2)
  stroke(s, stalkId, [[16, 15], [16, 26]], 3)
  stroke(s, stalkId, [[15, 20], [14, 26]], 4)
  stroke(s, stalkId, [[17, 20], [18, 26]], 2)
  const awn = 3
  const drawEar = (x: number, y: number, lean: number) => {
    const e = ear(s, grainId, x, y, 3, (k) => k * lean, PLUMP)
    const dir = Math.sign(lean)
    stroke(s, grainId, [[e.tip[0], e.tip[1] - 1], [e.tip[0] + dir * awn * 0.7, e.tip[1] - awn]], 4)
    const [lx, ly] = e.sides[e.sides.length - 2] ?? [0, 0]
    const [rx, ry] = e.sides[e.sides.length - 1] ?? [0, 0]
    stroke(s, grainId, [[lx - 1, ly - 1], [lx - 2 + dir, ly - awn + 1]], 4)
    stroke(s, grainId, [[rx + 1, ry - 1], [rx + 2 + dir, ry - awn + 1]], 3)
  }
  front(s, () => drawEar(11, 16, -1.2))
  front(s, () => drawEar(21, 16, 1.2))
  front(s, () => drawEar(16, 14, 0))
  front(s, () => tie(s, tieId, 14, 18, 20))
}

function oats(s: Sprite): void {
  const stalkId = s.addRamp(ramp('#a8b05a'))
  const huskId = s.addRamp(ramp('#e3d79a', { hueShift: 6 }))
  stroke(s, stalkId, [[16, 26], [15, 14], [17, 4]], 3)
  const spikelet = ['.4.', '454', '443', '332', '2.2']
  const branches: [Pt, Pt][] = [
    [[16, 6], [12, 8]],
    [[16, 7], [20, 9]],
    [[16, 10], [11, 13]],
    [[16, 11], [21, 14]],
    [[15, 15], [10, 18]],
    [[15, 16], [21, 19]],
  ]
  for (const [a, b] of branches) stroke(s, stalkId, [a, [(a[0] + b[0]) / 2, a[1] - 1], b], 3)
  for (const [, b] of branches) grainAt(s, huskId, b[0] - 1, b[1], spikelet)
  grainAt(s, huskId, 16, 2, ['.4.', '454', '443', '.3.'])
}

function barley(s: Sprite): void {
  const grainId = s.addRamp(ramp('#dcc274', { hueShift: 6 }))
  const awnId = s.addRamp(ramp('#efe0a6'))
  const stalkId = s.addRamp(STRAW)
  stroke(s, stalkId, [[13, 26], [13, 22], [12, 20]], 3)
  stroke(s, stalkId, [[19, 26], [19, 22], [20, 20]], 3)
  const drawEar = (x: number, lean: number) => {
    // awns first, so the ear covers their roots: long, nearly parallel bristles from the upper kernels
    const top = x + Math.round(lean * 3)
    const roots: [number, number, number][] = [
      [top, 10, 0],
      [top - 2, 12, -1],
      [top + 2, 13, 1],
      [top - 2, 15, -2],
      [top + 2, 16, 2],
    ]
    for (const [rx, ry, f] of roots) stroke(s, awnId, [[rx, ry], [rx + f * 0.9 + lean * 4, 2 + Math.abs(f)]], (t) => (t < 0.5 ? 4 : 3))
    ear(s, grainId, x, 20, 3, (k) => k * lean, PLUMP)
  }
  front(s, () => drawEar(11, -0.6))
  front(s, () => drawEar(20, 0.6))
}

function rice(s: Sprite): void {
  const stalkId = s.addRamp(ramp('#93ad4a'))
  const grainId = s.addRamp(ramp('#ecc85a', { hueShift: 8 }))
  const leafId = s.addRamp(LEAF)
  blade(s, leafId, [[12, 26], [11, 18], [7, 12]])
  stroke(s, stalkId, [[15, 26], [14, 12], [15, 4], [21, 4]], 3)
  const hang: Pt[][] = [
    [[16, 4], [16, 9], [14, 14]],
    [[19, 4], [20, 10], [19, 17]],
    [[21, 4], [24, 8], [24, 15]],
  ]
  for (const h of hang) stroke(s, stalkId, h, 3)
  for (const h of hang)
    curvePixels(h).forEach(([x, y], i) => {
      if (i % 3 !== 1) return
      grainAt(s, grainId, x + (i % 2 === 0 ? -1 : 0), y, ['45', '43', '32'])
    })
}

function corn(s: Sprite): void {
  const cobId = s.addRamp(ramp('#f2c230'))
  const huskId = s.addRamp(ramp('#8dbb4a'))
  const silkId = s.addRamp(ramp('#c98a4a'))
  const cob = Mask.ellipse(16, 13, 4.6, 9.6)
  shadeDome(s, cob, cobId, { bias: 0.08 })
  cob.each((x, y) => {
    const odd = Math.floor(x / 2) % 2
    if ((y + odd) % 2 === 0 && x % 2 === 1) s.shift(x, y, -1)
  })
  stroke(s, silkId, [[16, 4], [15, 2], [13, 2]], 4)
  stroke(s, silkId, [[17, 4], [18, 2]], 3)
  front(s, () => shadeDome(s, Mask.polygon([[10, 26], [8, 16], [11, 13], [15, 20], [17, 26]]), huskId, { bias: 0.1, contact: false }))
  front(s, () => shadeDome(s, Mask.polygon([[16, 26], [18, 19], [24, 13], [24, 22], [21, 26]]), huskId, { bias: 0, contact: false }))
}

function rye(s: Sprite): void {
  const grainId = s.addRamp(ramp('#7a604e', { hueShift: 14, lift: 0.3 }))
  const stalkId = s.addRamp(ramp('#8f8a5a'))
  // two slender, dusky ears crossed at the stalks
  stroke(s, stalkId, [[12, 20], [19, 26]], 3)
  stroke(s, stalkId, [[20, 20], [13, 26]], 2)
  const drawEar = (x: number, dir: number) => {
    const e = ear(s, grainId, x, 20, 5, (k) => dir * k * 0.5, SLENDER)
    stroke(s, grainId, [[e.tip[0], e.tip[1] - 1], [e.tip[0] + dir, e.tip[1] - 2]], 4)
  }
  front(s, () => drawEar(12, -1))
  front(s, () => drawEar(20, 1))
}

function buckwheat(s: Sprite): void {
  const stemId = s.addRamp(ramp('#c0393b'))
  const petalId = s.addRamp(ramp('#f7e4ea', { lift: 0.5, drop: 0.2, satShift: 0.02 }))
  const eyeId = s.addRamp(ramp('#e8768f'))
  const leafId = s.addRamp(LEAF)
  stroke(s, stemId, [[16, 26], [16, 16], [12, 9]], 3)
  stroke(s, stemId, [[16, 19], [20, 13], [21, 9]], 3)
  stroke(s, stemId, [[16, 15], [16, 12]], 3)
  front(s, () => shadeDome(s, Mask.polygon([[16.5, 22.5], [23, 16.5], [25.5, 18], [24, 23]]), leafId, { contact: false, bias: 0.05 }))
  const clusters: [number, number][] = [[12, 8], [21, 8], [16, 11], [10, 12]]
  for (const [cx, cy] of clusters) {
    const florets: Pt[] = [[cx, cy], [cx - 1.6, cy + 1.2], [cx + 1.6, cy + 1.2], [cx, cy - 1.6], [cx - 1, cy + 2.8], [cx + 1.2, cy + 2.8]]
    const m = new Mask()
    for (const [fx, fy] of florets) m.union(Mask.circle(fx, fy, 1.3))
    front(s, () => {
      shadeDome(s, m, petalId, { contact: false, bias: 0.12 })
      for (const [fx, fy] of florets) if (s.toneAt(Math.floor(fx), Math.floor(fy)) >= 3) s.paint(Math.floor(fx), Math.floor(fy), eyeId, 4)
    })
  }
}

const MOON = ramp('#bccbef', { lift: 0.55, drop: 0.28, hueShift: 10, satShift: 0.02 })

function moonrice(s: Sprite): void {
  const stalkId = s.addRamp(ramp('#8d93c4'))
  const grainId = s.addRamp(MOON)
  stroke(s, stalkId, [[20, 26], [20, 24], [19, 23]], 3)
  // an ear bowed into a crescent; extra kernels swell the middle of the bow
  const pairs = 6, amp = 7
  const lean = (k: number) => -amp * Math.sin((Math.PI * k) / pairs)
  for (let k = 1; k < pairs; k++) {
    if (Math.sin((Math.PI * k) / pairs) < 0.6) continue
    stamp(s, grainId, 19 + Math.round(lean(k)) - 4, 22 - k * 3, PLUMP.left)
  }
  front(s, () => ear(s, grainId, 19, 22, pairs, lean, PLUMP), 2)
}

function sunwheat(s: Sprite): void {
  const grainId = s.addRamp(ramp('#ffcc33', { lift: 0.55, drop: 0.32, hueShift: 12 }))
  const coreId = s.addRamp(ramp('#ff8a1f', { lift: 0.55, hueShift: 12 }))
  const stalkId = s.addRamp(ramp('#d98a2a'))
  const leafId = s.addRamp(ramp('#c9a43a'))
  // a sun-shaped head: kernels point out from a glowing core, awns shine between them like rays
  const cx = 16, cy = 11, n = 8, r = 5.2
  stroke(s, stalkId, [[16, 26], [16, 16]], 3)
  blade(s, leafId, [[16, 24], [20, 21], [23, 17]])
  for (let i = 0; i < n; i++) {
    const deg = (i / n) * 360 + 180 / n
    stroke(s, grainId, [along(cx, cy, deg, r + 1.2), along(cx, cy, deg, r + 3.4)], 4)
  }
  for (let i = 0; i < n; i++) {
    const deg = (i / n) * 360
    kernelPointing(s, grainId, ...along(cx, cy, deg, r), deg)
  }
  front(s, () =>
    Mask.circle(cx, cy, 2.6).each((x, y) => {
      const d = Math.hypot(x + 0.5 - cx + 0.6, y + 0.5 - cy + 0.6)
      s.paint(x, y, coreId, d < 1.2 ? 5 : d < 2 ? 4 : 3)
    }),
  )
}

function wildRice(s: Sprite): void {
  const stalkId = s.addRamp(ramp('#a8a060'))
  const grainId = s.addRamp(ramp('#4f3c30', { lift: 0.42, drop: 0.3, hueShift: 14 }))
  const awnId = s.addRamp(ramp('#b9a77a'))
  const tieId = s.addRamp(ramp('#c97f3a'))
  // a tied bundle whose heavy heads of long dark grain nod over on both sides
  stroke(s, stalkId, [[13, 26], [15, 20], [14, 9], [11, 4], [9, 7]], 3)
  stroke(s, stalkId, [[19, 26], [17, 20], [18, 9], [21, 4], [23, 7]], 2)
  stroke(s, stalkId, [[16, 26], [16, 20], [16, 13]], 4)
  const pairs = 5
  const hang = (x: number, dir: number) => {
    ear(s, grainId, x, 7, pairs, (k) => dir * k * 0.25, NODDING)
    const bx = x + Math.round(dir * pairs * 0.25), by = 7 + pairs * 3 + 2
    stroke(s, awnId, [[bx, by], [bx + dir, by + 3]], 3)
  }
  front(s, () => hang(9, -1))
  front(s, () => hang(23, 1))
  front(s, () => tie(s, tieId, 14, 18, 19))
}

export const GRAINS: ItemIcon[] = [
  { id: 'wheat', name: 'Wheat', grade: 1, paint: wheat },
  { id: 'oats', name: 'Oats', grade: 2, paint: oats },
  { id: 'barley', name: 'Barley', grade: 3, paint: barley },
  { id: 'rice', name: 'Rice', grade: 4, paint: rice },
  { id: 'corn', name: 'Corn', grade: 5, paint: corn },
  { id: 'rye', name: 'Rye', grade: 6, paint: rye },
  { id: 'buckwheat', name: 'Buckwheat', grade: 7, paint: buckwheat },
  { id: 'wild-rice', name: 'Wild Rice', grade: 8, paint: wildRice },
  { id: 'moonrice', name: 'Moonrice', grade: 9, paint: moonrice },
  { id: 'sunwheat', name: 'Sunwheat', grade: 10, paint: sunwheat },
]
