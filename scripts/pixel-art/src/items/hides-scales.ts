// Hides & Scales (Monster Den, HP family): uma-rpg docs/design/items.md#hides--scales. Raw pelts, hides and scales from
// the den's fantasy monsters (no real animals): fluffy, stretched, rolled and folded pelts, a scaly patch, plated
// hide, a marked plate and single great scales.
import { hex, ramp } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

const below = (y: number) => Mask.from((_, py) => py > y)

/** Seeded cells of `m` whose tone is at least `minTone`. */
function pickCells(s: Sprite, seed: string, m: Mask, count: number, minTone = 1): [number, number][] {
  const r = rng(seed)
  const cells: [number, number][] = []
  m.each((x, y) => {
    if (s.toneAt(x, y) >= minTone) cells.push([x, y])
  })
  const out: [number, number][] = []
  for (let i = 0; i < count && cells.length > 0; i++) out.push(cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0])
  return out
}

/** Short darker strokes along `dir`: fur or bristles. */
function strokes(s: Sprite, seed: string, m: Mask, count: number, dir: Point, len = 2, delta = -1, minTone = 3): void {
  for (const [x, y] of pickCells(s, seed, m, count, minTone))
    for (let k = 0; k < len; k++) {
      const px = Math.round(x + dir[0] * k), py = Math.round(y + dir[1] * k)
      if (m.get(px, py)) s.shift(px, py, delta)
    }
}

/** The classic stretched-hide silhouette: a body with four leg flaps, a neck and a tail. */
function stretchedHide(cx: number, cy: number, rx: number, ry: number, rot = 0): Mask {
  const a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  const at = (u: number, v: number): Point => [cx + u * c - v * sn, cy + u * sn + v * c]
  const m = Mask.ellipse(cx, cy, rx, ry, rot)
  for (const [u, v, turn] of [[-1, -1, -38], [1, -1, 38], [-1, 1, 38], [1, 1, -38]] as const) {
    const [x, y] = at(u * rx * 0.9, v * ry * 0.62)
    m.union(Mask.ellipse(x, y, 3.4, 1.9, rot + turn))
  }
  const [nx, ny] = at(0, -ry - 0.6)
  const [tx, ty] = at(0, ry + 1)
  return m.union(Mask.ellipse(nx, ny, 2.6, 2, rot), Mask.ellipse(tx, ty, 1.3, 2.4, rot))
}

/** Halo in the rings just outside the outline. */
function hideHalo(s: Sprite, m: Mask, color: string, alphas: readonly number[]): void {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (s.filled(x, y)) continue
      let best = 99
      m.each((mx, my) => {
        best = Math.min(best, Math.abs(mx - x) + Math.abs(my - y))
      })
      const a = alphas[best - 2]
      if (best >= 2 && a) s.overlay(x, y, hex(color, a))
    }
}

/** A single scale: rounded at one end, pointed at the other, with a raised center ridge. */
function scaleShape(cx: number, cy: number, w: number, h: number, rot: number, curl = 0): { mask: Mask; v: (x: number, y: number) => number; u: (x: number, y: number) => number } {
  const a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  const v = (x: number, y: number) => (-(x + 0.5 - cx) * sn + (y + 0.5 - cy) * c) / h
  // `curl` bends the tip sideways, so the scale is not a symmetric (gem-like) shape.
  const u = (x: number, y: number) => ((x + 0.5 - cx) * c + (y + 0.5 - cy) * sn) / w - curl * ((v(x, y) + 1) / 2) ** 2
  // v runs from -1 (rounded top) to +1 (point); the half width narrows toward the point.
  const mask = Mask.from((px, py) => {
    const uu = u(px - 0.5, py - 0.5), vv = v(px - 0.5, py - 0.5)
    if (vv < -1 || vv > 1) return false
    const half = vv < -0.2 ? Math.sqrt(Math.max(0, 1 - ((vv + 0.2) / 0.8) ** 2)) : 1 - ((vv + 0.2) / 1.2) ** 1.6
    return Math.abs(uu) <= half
  })
  return { mask, u, v }
}

/** A tapering spike or horn that bends as it rises: circles along a curve, shaded as one dome. */
function spike(x: number, y: number, h: number, bend: number, w: number): Mask {
  const m = new Mask()
  for (let t = 0; t <= 1.0001; t += 0.05) m.union(Mask.circle(x + bend * t * t, y - h * t, Math.max(0.45, w * (1 - t * 0.92))))
  return m
}

/** Shades a scale as a convex plate; with a keel, a lit ridge runs down its middle with a shadow just past it. */
function paintScale(s: Sprite, sc: ReturnType<typeof scaleShape>, pick: (u: number, v: number, x: number, y: number) => number, keel = true, bias = 0, relief = 0.9): void {
  shadeDome(s, sc.mask, (x, y) => pick(sc.u(x, y), sc.v(x, y), x, y), { relief, bias })
  if (!keel) return
  sc.mask.each((x, y) => {
    const u = sc.u(x, y), v = sc.v(x, y)
    if (v < -0.75 || v > 0.8) return
    if (Math.abs(u) < 0.09) s.shift(x, y, 1)
    else if (u >= 0.09 && u < 0.24) s.shift(x, y, -1)
  })
}

/** Darkens concentric growth arcs around a focus near the scale's attached end. */
function growthArcs(s: Sprite, m: Mask, fx: number, fy: number, radii: readonly number[], skip?: (x: number, y: number) => boolean): void {
  m.each((x, y) => {
    const d = Math.hypot(x + 0.5 - fx, y + 0.5 - fy)
    if (radii.some((r) => Math.abs(d - r) < 0.5) && !skip?.(x, y)) s.shift(x, y, -1)
  })
}

/** Darkens the attached end of a scale, ragged where it tore from the hide. */
function scaleRoot(s: Sprite, sc: ReturnType<typeof scaleShape>): void {
  sc.mask.each((x, y) => {
    const v = sc.v(x, y)
    if (v < -0.84 || (v < -0.74 && (x + y) % 2 === 0)) s.shift(x, y, -2)
  })
}

/** Pixels of `m` within `d` steps of its edge. */
function rim(m: Mask, d: number): Mask {
  return Mask.from((px, py) => {
    const x = Math.floor(px), y = Math.floor(py)
    if (!m.get(x, y)) return false
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (Math.abs(dx) + Math.abs(dy) <= d && !m.get(x + dx, y + dy)) return true
    return false
  })
}

export const HIDES_SCALES: ItemIcon[] = [
  {
    id: 'puffbun-pelt',
    name: 'Puffbun Pelt',
    grade: 1,
    paint: (s) => {
      // A round pelt of pastel fluff with tufted edges and the two long puffbun ears.
      const id = s.addRamp(ramp('#f4c3d2', { lift: 0.42, drop: 0.17, hueShift: 6, satShift: -0.04 }))
      const inner = s.addRamp(ramp('#fbe3d6', { lift: 0.3, drop: 0.2, satShift: 0 }))
      for (const [x, rot] of [[12, -16], [20.5, 18]] as const) {
        const ear = Mask.ellipse(x, 9.5, 2.3, 5, rot)
        shadeDome(s, ear, id, { contact: false, bias: 0.04 })
        Mask.ellipse(x + 0.2, 9.8, 0.9, 3.3, rot).each((px, py) => s.paint(px, py, inner, 3))
      }
      const body = Mask.ellipse(16, 18.6, 8.2, 6.6)
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.2
        body.union(Mask.circle(16 + Math.cos(a) * 8.2, 18.6 + Math.sin(a) * 6.6, 2.1))
      }
      body.subtract(below(26.5))
      shadeDome(s, body, id, { relief: 0.8, bias: 0.08 })
      for (const [x, y] of [[12, 15], [16, 14], [20, 16], [11, 19], [15, 18], [19, 20], [13, 22], [17, 23]] as const) {
        s.shift(x, y, 1)
        s.shift(x + 1, y + 1, -1)
      }
    },
  },
  {
    id: 'boarling-hide',
    name: 'Boarling Hide',
    grade: 2,
    paint: (s) => {
      // A stretched brown hide, a mane of coarse dark bristles down the spine.
      const id = s.addRamp(ramp('#8e5d3b', { lift: 0.3, drop: 0.28, hueShift: 6 }))
      const m = stretchedHide(16, 16.5, 7.4, 8.2)
      shadeDome(s, m, id, { relief: 0.55, bias: 0.04 })
      strokes(s, 'boarling-coat', m, 22, [0.5, 1], 2, -1, 3)
      const r = rng('boarling-bristles')
      for (let y = 8; y <= 24; y++) {
        s.paint(16, y, id, 1)
        const side = r() < 0.5 ? -1 : 1
        const len = 1 + Math.floor(r() * 2.5)
        for (let k = 1; k <= len; k++) if (m.get(16 + side * k, y + k)) s.paint(16 + side * k, y + k, id, k === len ? 2 : 1)
      }
    },
  },
  {
    id: 'wolfkin-pelt',
    name: 'Wolfkin Pelt',
    grade: 3,
    paint: (s) => {
      // A rolled grey pelt tied with a cord: the dark back stripe runs along the roll, the leather side spirals at its end.
      const id = s.addRamp(ramp('#a0a6b2', { lift: 0.36, drop: 0.26, hueShift: 8 }))
      const dark = s.addRamp(ramp('#4f5462', { lift: 0.3, drop: 0.26 }))
      const leather = s.addRamp(ramp('#d6c0a0', { lift: 0.3 }))
      const cord = s.addRamp(ramp('#8a5532', { lift: 0.3 }))
      const roll = Mask.polygon([[9.5, 11.5], [24, 11.5], [24, 22.5], [9.5, 22.5]]).union(Mask.ellipse(24, 17, 1.8, 5.5))
      const cyl = (y: number) => (y < 13 ? 5 : y < 15 ? 4 : y < 19 ? 3 : y < 21 ? 2 : 1)
      roll.each((x, y) => s.paint(x, y, Math.abs(y + 0.5 - 14.5) < 1.2 ? dark : id, cyl(y)))
      strokes(s, 'wolfkin', roll, 22, [1, 0], 2, -1, 3)
      strokes(s, 'wolfkin-sheen', roll, 10, [1, 0], 2, 1, 2)
      Mask.polygon([[16.5, 11], [18.5, 11], [18.5, 23], [16.5, 23]]).each((x, y) => s.paint(x, y, cord, cyl(y) - (x === 18 ? 1 : 0)))
      // The rolled end: leather underside spiralling around the fur.
      const end = Mask.ellipse(9.5, 17, 3, 5.6)
      end.each((x, y) => {
        const d = Math.hypot((x + 0.5 - 9.5) / 3, (y + 0.5 - 17) / 5.6)
        const ring = Math.floor(d * 3.2 + Math.atan2(y + 0.5 - 17, x + 0.5 - 9.5) / (Math.PI * 2))
        s.paint(x, y, ring % 2 === 0 ? leather : id, d > 0.8 ? 2 : 3 + (x < 9 ? 1 : 0))
      })
    },
  },
  {
    id: 'rock-lizard-scale',
    name: 'Rock Lizard Scale',
    grade: 4,
    paint: (s) => {
      // A torn patch of sandy lizard skin tiled with overlapping scales: rows of interlocking arcs, each scale lit in
      // the middle, shadowed just under the edge of the scale above it.
      const id = s.addRamp(ramp('#c4a874', { lift: 0.34, drop: 0.3, hueShift: 10 }))
      const dark = s.addRamp(ramp('#977a50', { lift: 0.3, drop: 0.3 }))
      const patch = Mask.polygon([[9, 10], [12.5, 7.5], [16.5, 9], [20.5, 7], [24.5, 10], [24, 15.5], [25, 21], [21.5, 25.5], [16, 26.5], [10.5, 25.5], [7.5, 21], [8.5, 15.5]])
      const arc = (x: number, y: number) => {
        const row = Math.floor(y / 3), ly = y - row * 3
        const lx = (((x + (row % 2) * 4) % 8) + 8) % 8
        return (ly === 2 && lx >= 2 && lx <= 5) || (ly === 1 && (lx === 1 || lx === 6)) || (ly === 0 && (lx === 0 || lx === 7))
      }
      const cell = (x: number, y: number) => {
        const row = Math.floor((y + 1) / 3)
        return [Math.floor((x + (row % 2) * 4 + 4) / 8), row] as const
      }
      patch.each((x, y) => {
        let tone = arc(x, y) ? 1 : arc(x, y - 1) ? 2 : arc(x, y + 1) ? 3 : 4
        const shade = (x - 16) * 0.05 + (y - 16) * 0.06
        if (tone > 1 && shade > 0.5) tone--
        if (tone > 1 && tone < 4 && shade < -0.5) tone++
        const [cx, cy] = cell(x, y)
        const marked = (cx * 2 + cy) % 5 === 0
        s.paint(x, y, marked ? dark : id, tone)
      })
    },
  },
  {
    id: 'ironback-hide',
    name: 'Ironback Hide',
    grade: 5,
    paint: (s) => {
      // A stretched hide whose back is armored with overlapping bands of riveted gunmetal plate.
      const id = s.addRamp(ramp('#6f7988', { lift: 0.42, drop: 0.32, hueShift: 8 }))
      const hideId = s.addRamp(ramp('#6e5444', { lift: 0.3 }))
      const hide = stretchedHide(16, 16.5, 7.8, 8.2)
      shadeDome(s, hide, hideId, { relief: 0.5 })
      const shell = Mask.ellipse(16, 16.2, 6.6, 7.8)
      shadeDome(s, shell, id, { relief: 0.9, bias: -0.12 })
      const bandH = 3.2
      shell.each((x, y) => {
        const curve = ((x + 0.5 - 16) / 6.6) ** 2 * 1.4
        const t = (y + 0.5 - 8.4 + curve) / bandH
        const f = t - Math.floor(t)
        if (f > 0.72) s.paint(x, y, id, 1)
        else if (f < 0.3) s.shift(x, y, 1)
      })
      for (const [x, y] of [[13, 11], [19, 11], [12, 15], [16, 14], [20, 15], [13, 18], [19, 18], [16, 21]] as const) if (shell.get(x, y)) s.paint(x, y, id, 5)
    },
  },
  {
    id: 'basilisk-scale',
    name: 'Basilisk Scale',
    grade: 6,
    paint: (s) => {
      // A beveled green plate marked with a staring, slit-pupilled eye.
      const id = s.addRamp(ramp('#4c9a4e', { lift: 0.36, drop: 0.3, hueShift: 8 }))
      const eye = s.addRamp(ramp('#f5cf3a', { lift: 0.45, drop: 0.3, hueShift: 10 }))
      const outer: Point[] = [[16, 4.5], [24.5, 10], [24, 20.5], [16, 26.5], [8, 20.5], [7.5, 10]]
      const m = Mask.polygon(outer)
      const inner = Mask.polygon(outer.map(([x, y]) => [16 + (x - 16) * 0.74, 15.6 + (y - 15.6) * 0.74] as const))
      m.each((x, y) => {
        const dx = x + 0.5 - 16, dy = y + 0.5 - 15.6
        const lit = dx * -0.55 + dy * -0.75
        s.paint(x, y, id, inner.get(x, y) ? 3 : lit > 1.5 ? 4 : lit > -2 ? 3 : 2)
      })
      inner.each((x, y) => {
        if (!inner.get(x - 1, y - 1)) s.paint(x, y, id, 2)
        else if (!inner.get(x + 1, y + 1)) s.paint(x, y, id, 4)
      })
      // An almond eye: the overlap of two circles, with a vertical slit pupil.
      const almond = Mask.circle(16, 19.2, 6.4).subtract(Mask.from((px, py) => Math.hypot(px - 16, py - 12) > 6.4))
      almond.each((x, y) => {
        const t = x + 0.5 - 16 + (y + 0.5 - 15.6) * 0.6
        s.paint(x, y, eye, t < -2.4 ? 4 : t > 2 ? 2 : 3)
      })
      for (let y = 12; y <= 19; y++) if (almond.get(16, y)) s.paint(16, y, id, 1)
      for (const y of [14, 15, 16]) if (almond.get(15, y)) s.paint(15, y, id, 1)
      s.paint(13, 14, eye, 5)
    },
  },
  {
    id: 'manticore-hide',
    name: 'Manticore Hide',
    grade: 7,
    paint: (s) => {
      // A tawny stretched hide with a row of curved red spines along its back.
      const id = s.addRamp(ramp('#c99a52', { lift: 0.34, drop: 0.28, hueShift: 8 }))
      const red = s.addRamp(ramp('#c8303a', { lift: 0.4, drop: 0.3 }))
      for (const [x, y, h, bend] of [[10.5, 13.5, 5, 2], [14.5, 12.5, 6.5, 2.6], [18.5, 12, 6, 2.4], [22, 13, 4.5, 1.8]] as const)
        shadeDome(s, spike(x, y, h, bend, 2.1), red, { contact: false, bias: 0.06 })
      const m = stretchedHide(16, 18.5, 7.6, 6.4, -6)
      shadeDome(s, m, id, { relief: 0.55, bias: 0.04 })
      strokes(s, 'manticore', m, 18, [1, 0.3], 2, -1, 3)
    },
  },
  {
    id: 'behemoth-hide',
    name: 'Behemoth Hide',
    grade: 8,
    paint: (s) => {
      // A thick hide folded in two, wrinkled purple-grey leather crested by a ridge of curved horns.
      const id = s.addRamp(ramp('#74658c', { lift: 0.32, drop: 0.3, hueShift: 8 }))
      const horn = s.addRamp(ramp('#e6dcc2', { lift: 0.3, drop: 0.32, hueShift: 10 }))
      for (const [x, y, h, bend] of [[11, 14.5, 5, 2.2], [16, 13.5, 7, 3], [21, 14.2, 5.5, 2.4]] as const)
        shadeDome(s, spike(x, y, h, bend, 2.3), horn, { contact: false, bias: 0.04 })
      const lower = Mask.ellipse(16.8, 23.2, 9.6, 3.4).subtract(below(26.5))
      shadeDome(s, lower, id, { bias: -0.15, relief: 0.6 })
      const upper = Mask.ellipse(15.6, 18.5, 9.4, 5.6)
      shadeDome(s, upper, id, { relief: 0.7 })
      // The thick folded edge: a lit lip over a dark crease.
      upper.each((x, y) => {
        if (!upper.get(x, y + 1)) s.paint(x, y, id, 1)
        else if (!upper.get(x, y + 2)) s.paint(x, y, id, x < 14 ? 4 : 3)
      })
      for (const [cx, cy, rr] of [[12, 19, 3.5], [19.5, 18, 3], [16, 16.5, 4.5]] as const)
        Mask.circle(cx, cy + rr, rr).subtract(Mask.circle(cx, cy + rr + 0.9, rr)).each((x, y) => {
          if (upper.get(x, y) && y < 21) s.shift(x, y, -1)
        })
    },
  },
  {
    id: 'wyvern-scale',
    name: 'Wyvern Scale',
    grade: 9,
    paint: (s) => {
      // One long scale hooking at the tip: teal at the root shimmering into green, a violet sheen along one edge,
      // a raised keel and growth lines.
      const teal = s.addRamp(ramp('#2fb4ad', { lift: 0.46, drop: 0.32, hueShift: 12 }))
      const green = s.addRamp(ramp('#5cc46c', { lift: 0.44, drop: 0.32, hueShift: 10 }))
      const violet = s.addRamp(ramp('#8a78e6', { lift: 0.44, drop: 0.32 }))
      const sc = scaleShape(15.6, 15.2, 6.8, 10.6, 8, 0.9)
      paintScale(s, sc, (_u, v, x, y) => {
        const checker = (x + y) % 2 === 0
        return v > 0.3 || (v > 0.12 && checker) ? green : teal
      }, true, -0.1, 0.7)
      // The violet sheen rides the shaded edge, kept bright so it reads as a play of light, not a dark face.
      const sheen = rim(sc.mask, 2)
      sc.mask.each((x, y) => {
        if (sheen.get(x, y) && sc.u(x, y) > 0.35 && sc.v(x, y) > -0.7) s.paint(x, y, violet, Math.max(3, s.toneAt(x, y)))
      })
      growthArcs(s, sc.mask, 14.5, 4.5, [7, 11])
      scaleRoot(s, sc)
      hideHalo(s, sc.mask, '#5ff0d0', [50, 20])
    },
  },
  {
    id: 'dragon-scale',
    name: 'Dragon Scale',
    grade: 10,
    paint: (s) => {
      // A great crimson scale whose free edge and keel glow molten gold, with growth ridges and a torn root.
      const red = s.addRamp(ramp('#cc2034', { lift: 0.45, drop: 0.34, hueShift: 12 }))
      const gold = s.addRamp(ramp('#ffc23a', { lift: 0.6, drop: 0.3, hueShift: 10 }))
      const sc = scaleShape(16.6, 14.8, 7.4, 10.2, -8, -0.5)
      const edge = rim(sc.mask, 1)
      paintScale(s, sc, () => red, false, -0.04, 0.75)
      growthArcs(s, sc.mask, 15, 4, [7.5, 11.5, 15.5])
      sc.mask.each((x, y) => {
        const u = sc.u(x, y), v = sc.v(x, y)
        if (edge.get(x, y) && v > -0.3) s.paint(x, y, gold, u < 0 ? 4 : 3)
        else if (Math.abs(u) < 0.08 && v > -0.7 && v < 0.85) s.paint(x, y, gold, v < -0.2 ? 5 : 4)
        else if (u >= 0.08 && u < 0.2 && v > -0.7 && v < 0.85) s.shift(x, y, -1)
      })
      scaleRoot(s, sc)
      hideHalo(s, sc.mask, '#ff7a3a', [64, 26])
      // Embers drifting up off its heat.
      for (const [x, y, a] of [[23, 5, 255], [25, 8, 200], [22, 2, 150], [9, 3, 170]] as const) s.overlay(x, y, hex(a > 190 ? '#ffd36a' : '#ff8a3a', a))
    },
  },
]
