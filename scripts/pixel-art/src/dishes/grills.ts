// Fish → grills (ATK). The grade's fish, grilled with dark bar marks, keeps its own skin colours: a skewered carp on a
// leaf, trout and sardines on plates, mackerel Japanese-style, a salmon fillet, an arched sea bream, glazed eel on a
// lacquer tray, seared tuna on slate, then a glowing silverfin and a rainbow koi on silver and gold.
import { ramp } from '../color.ts'
import { halo, leafPlate, motes, pix, rays } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { CELADON, CREAMWARE, GOLD, LACQUER, PORCELAIN, RICE, SILVER, SLATE, type Dish, type Tones, blob, castShadow, plate, skewer, slab } from './kit.ts'

const EYE = ramp('#1d1a24')
const EYE_SHINE = ramp('#f4f1e8')
const LEMON = ramp('#f4d43a', { lift: 0.42 })
const HERB = ramp('#4f9a3a', { lift: 0.34, hueShift: 10 })

interface FishSpec {
  cx: number
  cy: number
  /** Half length of the body (snout to tail base) and half height. */
  len: number
  h: number
  back: Tones
  side: Tones
  belly: Tones
  fin?: Tones
  /** Degrees, clockwise. */
  rot?: number
  /** Arches the body (positive bows the back up). */
  arch?: number
  /** Spacing in px of the dark grill bars across the body (0 for none). */
  marks?: number
  /** Optional per-pixel ramp override (stripes, spots, patches) given body coordinates u (−1 snout … 1 tail) and v. */
  pattern?: (u: number, v: number, x: number, y: number) => number | undefined
  tail?: number
  bias?: number
}

/** A whole grilled fish lying on its side, head to the left: back, flank and belly bands, gill line, eye, fins, char. */
function fish(s: Sprite, o: FishSpec): Mask {
  const a = ((o.rot ?? 0) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  const tail = o.tail ?? 0.45
  const local = (px: number, py: number): [number, number] => {
    const dx = px - o.cx, dy = py - o.cy
    const u = (dx * c + dy * sn) / o.len
    let v = (-dx * sn + dy * c) / o.h
    v += (o.arch ?? 0) * (u * u - 0.3)
    return [u, v]
  }
  const profile = (u: number) => Math.sqrt(Math.max(0, 1 - ((u + 0.12) / 1.12) ** 2)) * (u < -0.6 ? 0.92 + (u + 0.6) * 0.1 : 1)
  const body = Mask.from((px, py) => {
    const [u, v] = local(px, py)
    return u >= -1 && u <= 1 && Math.abs(v) <= profile(u)
  })
  const tailM = Mask.from((px, py) => {
    const [u, v] = local(px, py)
    if (u < 0.86 || u > 1 + tail) return false
    const k = (u - 0.86) / tail
    const spread = 0.28 + k * 0.95
    const notch = k > 0.65 && Math.abs(v) < (k - 0.65) * 1.6
    return Math.abs(v) <= spread && !notch
  })
  const finId = s.addRamp(o.fin ?? o.back)
  const dorsal = Mask.from((px, py) => {
    const [u, v] = local(px, py)
    return u > -0.3 && u < 0.45 && v < 0 && v > -profile(u) - 0.42 * (1 - Math.abs(u - 0.05) / 0.38)
  }).subtract(body)
  const all = new Mask().union(body, tailM, dorsal)
  castShadow(s, all, 1, 1)
  dorsal.each((x, y) => s.paint(x, y, finId, 3))
  tailM.each((x, y) => {
    const [u] = local(x + 0.5, y + 0.5)
    s.paint(x, y, finId, u > 1.15 ? 2 : 3)
  })
  const back = s.addRamp(o.back), side = s.addRamp(o.side), belly = s.addRamp(o.belly)
  shadeDome(s, body, (x, y) => {
    const [u, v] = local(x + 0.5, y + 0.5)
    const p = o.pattern?.(u, v, x, y)
    if (p !== undefined) return p
    const t = v / Math.max(0.2, profile(u))
    return t < -0.35 ? back : t > 0.4 ? belly : side
  }, { relief: 0.6, bias: o.bias ?? 0.08, contact: true })
  // Gill line, char marks, eye.
  body.each((x, y) => {
    const [u, v] = local(x + 0.5, y + 0.5)
    if (Math.abs(u + 0.56) < 0.07 && Math.abs(v) < profile(u) * 0.85) s.shift(x, y, -1)
    if (o.marks) {
      // One-pixel bars slanting across the flank, between the gills and the tail.
      const along = u * o.len - v * o.h * 0.7
      const k = (((along + o.len) % o.marks) + o.marks) % o.marks
      if (u > -0.42 && u < 0.78 && k < 1 && Math.abs(v) < profile(u) * 0.8) s.paint(x, y, s.mat[y * 32 + x] ?? back, 1)
    }
  })
  const ex = o.cx + (-0.74 * o.len) * c - (-0.22 * o.h) * sn, ey = o.cy + (-0.74 * o.len) * sn + (-0.22 * o.h) * c
  s.paint(Math.floor(ex), Math.floor(ey), s.addRamp(EYE), 1)
  s.paint(Math.floor(ex), Math.floor(ey) - 1, s.addRamp(EYE_SHINE), 5)
  return all
}

/** A lemon wedge lying on the plate. */
function lemon(s: Sprite, x: number, y: number): void {
  const id = s.addRamp(LEMON)
  pix(s, x, y, ['.aaa', 'abbb', 'cccc'], { a: [id, 5], b: [id, 4], c: [id, 2] })
}

function herb(s: Sprite, pts: readonly (readonly [number, number, number])[], tones: Tones = HERB): void {
  const id = s.addRamp(tones)
  for (const [x, y, rot] of pts) blob(s, x, y, 2, 0.9, rot, id, { bias: 0.12 })
}

/** Dark grill bars across a mask. */
function grillMarks(s: Sprite, m: Mask, every: number, phase = 0): void {
  m.each((x, y) => {
    if ((((x - y + phase) % every) + every) % every === 0) s.shift(x, y, -2)
  })
}

export const GRILLS: Dish[] = [
  {
    id: 'dish-fish-1',
    name: 'Carp Grill',
    kind: 'planet',
    family: 'fish',
    grade: 1,
    paint: (s) => {
      // A golden carp grilled whole on a stick, laid on a broad leaf.
      leafPlate(s, ramp('#4f8f3a', { lift: 0.3 }), { cx: 16, cy: 22, rx: 12.5, ry: 4.4, rot: -6 })
      fish(s, { cx: 15.4, cy: 16.6, len: 8.6, h: 4, rot: -6, back: ramp('#86602a', { hueShift: 6 }), side: ramp('#cf9a3a', { lift: 0.32 }), belly: ramp('#ead08e', { lift: 0.3 }), fin: ramp('#a8732e'), marks: 3 })
      skewer(s, 3, 18.4, 28, 15.6)
    },
  },
  {
    id: 'dish-fish-2',
    name: 'Trout Grill',
    kind: 'planet',
    family: 'fish',
    grade: 2,
    paint: (s) => {
      // A rainbow-striped trout on a clay plate, a lemon wedge at its tail.
      plate(s, { cy: 21.4, rx: 12.6, ry: 5, tones: ramp('#e8ecef', { lift: 0.5, drop: 0.22 }), edge: ramp('#3a64b0', { lift: 0.3 }), well: 0.74 })
      const pink = s.addRamp(ramp('#e8768d', { satShift: 0.03 }))
      const spot = s.addRamp(ramp('#2f2a26'))
      fish(s, {
        cx: 14.6, cy: 18, len: 8.8, h: 3.6, rot: -4,
        back: ramp('#6f7c45', { hueShift: 6 }), side: ramp('#c9cdb8', { lift: 0.3 }), belly: ramp('#ece6dc', { lift: 0.3 }), fin: ramp('#8c8a58'),
        marks: 4,
        pattern: (u, v, x, y) => (Math.abs(v) < 0.22 && u > -0.5 ? pink : v < -0.3 && (x * 3 + y * 5) % 7 === 0 ? spot : undefined),
      })
      lemon(s, 23, 21)
    },
  },
  {
    id: 'dish-fish-3',
    name: 'Sardine Grill',
    kind: 'planet',
    family: 'fish',
    grade: 3,
    paint: (s) => {
      // Three little blue-backed sardines side by side on a creamware plate, with lemon and parsley.
      plate(s, { cy: 21.6, rx: 12.6, ry: 5.2, tones: CREAMWARE, well: 0.72 })
      for (const [cx, cy] of [[14.4, 14.6], [15.4, 18], [16.4, 21.4]] as const)
        fish(s, { cx, cy, len: 7.2, h: 1.9, rot: -8, tail: 0.5, back: ramp('#3a68b0', { hueShift: 6 }), side: ramp('#8fb0d0', { lift: 0.36 }), belly: ramp('#d3dde6', { lift: 0.45 }), fin: ramp('#7d97b4'), marks: 3 })
      lemon(s, 23, 22)
      herb(s, [[7.6, 22.4, 20]])
    },
  },
  {
    id: 'dish-fish-4',
    name: 'Mackerel Grill',
    kind: 'planet',
    family: 'fish',
    grade: 4,
    paint: (s) => {
      // A striped mackerel on a long white plate, Japanese style, with a mound of grated radish on a shiso leaf.
      slab(s, 3, 17, 28, 24, ramp('#34466e', { lift: 0.32, drop: 0.3 }), { corner: 2, lip: ramp('#8aa0c8', { lift: 0.4 }) })
      const stripe = s.addRamp(ramp('#173a4a', { lift: 0.18 }))
      fish(s, {
        cx: 14, cy: 16.6, len: 9, h: 3.4, rot: -4,
        back: ramp('#2fae96', { hueShift: 6 }), side: ramp('#9ec9c8', { lift: 0.35 }), belly: ramp('#e2eaee', { lift: 0.4 }), fin: ramp('#4f7a80'),
        marks: 4,
        pattern: (u, v, x) => (v < -0.25 && u > -0.45 && Math.abs(((x + Math.round(v * 3)) % 3)) === 0 ? stripe : undefined),
      })
      herb(s, [[22.4, 21.6, -10]], ramp('#3f8a3a', { lift: 0.32 }))
      const radish = s.addRamp(RICE)
      shadeDome(s, Mask.ellipse(23.4, 20.4, 2.6, 1.8), radish, { bias: 0.1 })
    },
  },
  {
    id: 'dish-fish-5',
    name: 'Salmon Grill',
    kind: 'planet',
    family: 'fish',
    grade: 5,
    paint: (s) => {
      // A thick salmon fillet with pale fat lines and grill bars, lemon and dill, on a white plate.
      plate(s, { cy: 21.4, rx: 12.4, ry: 5.2, tones: PORCELAIN, well: 0.72 })
      const skin = s.addRamp(ramp('#5a6a7e', { lift: 0.3 }))
      const flesh = s.addRamp(ramp('#f5875a', { lift: 0.36, hueShift: 4, drop: 0.2 }))
      const fat = s.addRamp(ramp('#fbe0d2', { lift: 0.3 }))
      const top = Mask.polygon([[6.5, 15.5], [12, 12.6], [22.5, 13.2], [24.5, 16.4], [20.5, 19.6], [8.5, 19.4]])
      const side = Mask.polygon([[6.5, 15.5], [8.5, 19.4], [20.5, 19.6], [24.5, 16.4], [24.5, 18.6], [20.5, 21.8], [8.5, 21.6], [6.5, 17.6]]).subtract(top)
      castShadow(s, new Mask().union(top, side), 1, 1)
      side.each((x, y) => s.paint(x, y, y > 20 ? skin : flesh, y > 20 ? 2 : 2))
      shadeDome(s, top, flesh, { relief: 0.4, bias: 0.14, contact: false })
      top.each((x, y) => {
        if ((x + y * 2) % 5 === 0 && s.toneAt(x, y) > 1) s.paint(x, y, fat, 4)
      })
      grillMarks(s, top, 4, 1)
      lemon(s, 22, 21)
      const dill = s.addRamp(ramp('#5fae3c', { lift: 0.36 }))
      pix(s, 12, 11, ['a.a.', '.a.a', 'b.b.', '.b..'], { a: [dill, 4], b: [dill, 3] })
    },
  },
  {
    id: 'dish-fish-6',
    name: 'Sea Bream Grill',
    kind: 'planet',
    family: 'fish',
    grade: 6,
    paint: (s) => {
      // A rosy sea bream salt-grilled in a festive arch, on a celadon oval platter with leaves.
      plate(s, { cy: 21.6, rx: 12.6, ry: 5, tones: CELADON, well: 0.72 })
      const blue = s.addRamp(ramp('#5fd2f0', { lift: 0.4 }))
      fish(s, {
        cx: 15.6, cy: 16.4, len: 9, h: 4.6, arch: 0.55,
        back: ramp('#e2506a', { hueShift: 6 }), side: ramp('#f08a96', { lift: 0.34 }), belly: ramp('#f7c6c0', { lift: 0.3 }), fin: ramp('#c23a52'),
        marks: 5,
        pattern: (u, v, x, y) => (v < -0.1 && u > -0.4 && u < 0.7 && (x * 5 + y * 3) % 9 === 0 ? blue : undefined),
      })
      const salt = s.addRamp(ramp('#f4f1e8', { lift: 0.5 }))
      for (const [x, y] of [[26, 15], [7, 15], [25, 13]] as const) s.paint(x, y, salt, 5)
      herb(s, [[24, 22, -20], [8.4, 22.4, 25]], ramp('#3f8a3a', { lift: 0.32 }))
    },
  },
  {
    id: 'dish-fish-7',
    name: 'Eel Grill',
    kind: 'planet',
    family: 'fish',
    grade: 7,
    paint: (s) => {
      // A whole eel grilled in a long S, lacquered with a dark sweet glaze and charred across, on a long red-rimmed plate.
      slab(s, 3, 14, 28, 24, CREAMWARE, { depth: 2, corner: 1, lip: LACQUER })
      const glaze = s.addRamp(ramp('#8a3c16', { lift: 0.32, hueShift: 10 }))
      const skin = s.addRamp(ramp('#3d4834', { hueShift: 6 }))
      const path = (t: number): [number, number] => [5.4 + t * 21.4, 19.8 - t * 2.4 + Math.sin(t * Math.PI * 2.4) * 2.8]
      const eel = new Mask()
      for (let t = 0; t <= 1; t += 0.005) {
        const [x, y] = path(t)
        const r = t < 0.06 ? 1.6 + t * 8 : t > 0.8 ? 2.1 - (t - 0.8) * 7 : 2.1
        eel.union(Mask.circle(x, y, Math.max(0.5, r)))
      }
      castShadow(s, eel, 1, 1)
      shadeDome(s, eel, glaze, { relief: 0.6, bias: 0.16 })
      // The dark skin shows along the lower edge; glossy glaze catches the light along the top.
      eel.each((x, y) => {
        if (!eel.get(x, y + 1)) s.paint(x, y, skin, 3)
        else if (!eel.get(x, y - 1) && (x & 1) === 0) s.paint(x, y, glaze, 5)
      })
      for (const t of [0.25, 0.5, 0.75]) {
        const [x, y] = path(t)
        for (let dy = -1; dy <= 1; dy++) if (eel.get(Math.floor(x), Math.floor(y) + dy) && eel.get(Math.floor(x), Math.floor(y) + dy + 1)) s.paint(Math.floor(x), Math.floor(y) + dy, glaze, 1)
      }
      const [ex, ey] = path(0.03)
      s.paint(Math.floor(ex), Math.floor(ey) - 1, s.addRamp(EYE), 1)
      const sansho = s.addRamp(HERB)
      pix(s, 24, 21, ['.a', 'aa'], { a: [sansho, 4] })
      pix(s, 6, 15, ['a.', 'aa'], { a: [sansho, 3] })
    },
  },
  {
    id: 'dish-fish-8',
    name: 'Tuna Grill',
    kind: 'planet',
    family: 'fish',
    grade: 8,
    paint: (s) => {
      // A thick tuna steak seared with a crosshatch, its cut side ruby red, on a slate plate with a gilt rim.
      plate(s, { cy: 21.4, rx: 12.4, ry: 5, tones: SLATE, edge: GOLD, well: 0.74 })
      const seared = s.addRamp(ramp('#8a6a52', { lift: 0.34 }))
      const red = s.addRamp(ramp('#d23848', { lift: 0.42, hueShift: 6 }))
      const top = Mask.polygon([[6.5, 15], [11.5, 11.6], [24.5, 12.6], [23.5, 16.6], [10.5, 17.6]])
      const side = Mask.polygon([[6.5, 15], [10.5, 17.6], [23.5, 16.6], [23.5, 20], [10.5, 21.4], [6.5, 18.6]]).subtract(top)
      castShadow(s, new Mask().union(top, side), 1, 1)
      side.each((x, y) => {
        const edge = !side.get(x, y + 1) || !side.get(x, y - 1)
        s.paint(x, y, edge ? seared : red, edge ? 2 : x < 11 ? 4 : (x + y) % 4 === 0 ? 3 : 4)
      })
      shadeDome(s, top, seared, { relief: 0.4, bias: 0.12, contact: false })
      top.each((x, y) => {
        if ((x + y * 2) % 5 === 0 || (x - y * 2) % 5 === 0) s.shift(x, y, -2)
      })
      const navy = s.addRamp(ramp('#253f7c', { hueShift: 6 }))
      const fin = s.addRamp(ramp('#f2c23a', { lift: 0.3 }))
      pix(s, 24, 20, ['b.b', 'bab', '.a.'], { a: [navy, 3], b: [fin, 4] })
      herb(s, [[7.6, 22.6, 20]], ramp('#5fae3c', { lift: 0.34 }))
    },
  },
  {
    id: 'dish-fish-9',
    name: 'Silverfin Grill',
    kind: 'planet',
    family: 'fish',
    grade: 9,
    paint: (s) => {
      // A silverfin grilled whole, its scales still glowing cyan, on a silver platter.
      plate(s, { cy: 23.4, rx: 7.8, ry: 3.2, tones: SILVER, well: 0.7, depth: 2 })
      const glow = s.addRamp(ramp('#6ee7ff', { lift: 0.5, drop: 0.3, hueShift: 4 }))
      fish(s, {
        cx: 14.6, cy: 17.6, len: 7.8, h: 3.7, arch: 0.16, rot: 5,
        back: ramp('#7f92b8', { lift: 0.5, drop: 0.3 }), side: ramp('#b8c6dc', { lift: 0.55, drop: 0.32, hueShift: 6 }), belly: ramp('#e6eef8', { lift: 0.5 }), fin: ramp('#6ee7ff', { lift: 0.5, drop: 0.3 }),
        marks: 5,
        pattern: (u, v) => (Math.abs(v) < 0.18 && u > -0.45 ? glow : undefined),
      })
      halo(s, 16, 17, 13, 9, '#6ee7ff', 85)
      motes(s, [[22, 6], [11, 9], [25, 18]], '#d8fbff', 200)
    },
  },
  {
    id: 'dish-fish-10',
    name: 'Rainbow Koi Grill',
    kind: 'planet',
    family: 'fish',
    grade: 10,
    paint: (s) => {
      // A pearl-white koi patched in every colour, grilled whole on a gold platter.
      plate(s, { cy: 23.4, rx: 7.8, ry: 3.2, tones: GOLD, well: 0.7, depth: 2 })
      const hues = ['#ff4b4b', '#ff9a2a', '#ffd84a', '#5fd36a', '#4aa8ff', '#9b6aff'].map((h) => s.addRamp(ramp(h, { lift: 0.4 })))
      fish(s, {
        cx: 14.6, cy: 17.6, len: 7.8, h: 3.7, arch: 0.16, rot: 5,
        back: ramp('#f2efe9', { lift: 0.4, drop: 0.2 }), side: ramp('#f2efe9', { lift: 0.4, drop: 0.2 }), belly: ramp('#fbf8f2', { lift: 0.4, drop: 0.18 }), fin: ramp('#ece4f6', { lift: 0.4, drop: 0.22 }),
        marks: 0,
        pattern: (u, v) => (v < 0.3 && u > -0.5 && u < 0.9 ? hues[Math.min(5, Math.max(0, Math.floor((u + 0.5) * 4.3)))] : undefined),
      })
      halo(s, 16, 17, 13, 9.5, '#ffd34d', 85)
      rays(s, 16, 15, 9, 12, [-90, -55, -125], '#ffe27a', 130)
    },
  },
]
