// Leather (Workbench, refined Hides & Scales): uma-rpg docs/design/items.md#hides--scales. A tied roll of tanned leather:
// the lit end shows the rolled layers (grain outside, suede inside), and each hide has its own color, surface and tie.
import { ramp, type RampOptions } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { cylinderFrame, cylinderMasks, cylinderTone, halo, type Cylinder } from './workbench-kit.ts'

type Surface = 'suede' | 'pores' | 'mottle' | 'scales' | 'studs' | 'bigscales' | 'stripes' | 'plates' | 'iridescent' | 'dragon'
type Tie = 'bow' | 'twine' | 'thong' | 'strap' | 'double' | 'gold'

interface LeatherSpec {
  id: string
  name: string
  grade: number
  hide: string
  hideRamp?: RampOptions
  /** The suede (flesh side) seen in the rolled end. */
  suede: string
  surface: Surface
  tie: Tie
  tieColor: string
  /** Roll radius. */
  radius?: number
  /** A loose end of the hide lying out from under the roll. */
  tail?: boolean
  accent?: string
  glow?: string
}

interface Ctx {
  frame: ReturnType<typeof cylinderFrame>
  body: Mask
  cap: Mask
  side: Mask
  angle: number
  c: Cylinder
}

function paintLeather(spec: LeatherSpec): (s: Sprite) => void {
  return (s) => {
    const hide = s.addRamp(ramp(spec.hide, spec.hideRamp ?? { lift: 0.3, drop: 0.28, hueShift: 8, satShift: 0.04 }))
    const suede = s.addRamp(ramp(spec.suede, { lift: 0.3, drop: 0.26, hueShift: 6 }))
    const tieId = s.addRamp(ramp(spec.tieColor, { lift: 0.4, drop: 0.28 }))
    const accent = s.addRamp(ramp(spec.accent ?? spec.hide, { lift: 0.5, drop: 0.25 }))
    const r = spec.radius ?? 6.2
    const legendary = spec.grade >= 9
    const cy = 25.6 - r - (spec.tail ? 2.6 : 0.4)
    const c: Cylinder = { ax: legendary ? 12.6 : 10.6, ay: cy, bx: legendary ? 22.2 : 23, by: cy, r, cap: 4.2 }
    const angle = Math.atan2(c.by - c.ay, c.bx - c.ax)
    const frame = cylinderFrame(c)
    const { body, cap } = cylinderMasks(c)
    const side = new Mask().union(body).subtract(cap)

    // A loose end of the hide lying flat in front of the roll, its edge still irregular.
    if (spec.tail) {
      const yb = Math.round(cy + r)
      const tail = Mask.polygon([[12.5, yb - 1], [25.2, yb - 1], [26.8, yb + 2.6], [14, yb + 2.6]])
      tail.each((x, y) => {
        if (y === yb + 2 && (x * 7 + 3) % 5 === 0) return
        s.paint(x, y, hide, y <= yb ? 2 : y === yb + 1 ? 3 : 4)
      })
    }

    // The rolled body: a cylinder lit from the top left.
    side.each((x, y) => {
      const { d } = frame(x + 0.5, y + 0.5)
      s.paint(x, y, hide, cylinderTone(d, angle))
    })
    const ctx: Ctx = { frame, body, cap, side, angle, c }
    surface(s, spec, ctx, hide, accent)
    // Tanned leather has a soft sheen along the top of the roll.
    if (['suede', 'studs', 'mottle', 'stripes', 'dragon'].includes(spec.surface)) {
      const sheen = Math.round(cy - r * 0.62)
      side.each((x, y) => {
        const { t } = frame(x + 0.5, y + 0.5)
        if (y === sheen && t > 0.1 && t < 0.9 && (x + Math.floor(t * 3)) % 7 !== 0) s.paint(x, y, hide, Math.min(5, s.toneAt(x, y) + 1))
      })
    }

    // The edge of the outer wrap runs along the roll.
    // The cut edge of the outer wrap: a lit lip over a dark seam.
    const seam = Math.round(cy + r * 0.45)
    side.each((x, y) => {
      const { t } = frame(x + 0.5, y + 0.5)
      if (t < 0.06 || t > 0.97) return
      if (y === seam) s.paint(x, y, hide, Math.max(1, s.toneAt(x, y) - 1))
      if (y === seam - 1) s.paint(x, y, hide, Math.min(5, s.toneAt(x, y) + 1))
    })

    // The rolled end: suede layers rolled around a dark core, the hide's grain side between them.
    cap.each((x, y) => {
      const { d, along } = frame(x + 0.5, y + 0.5)
      const u = along / c.cap
      const rho = Math.hypot(u, d)
      const theta = Math.atan2(d, u)
      // A spiral: ring radius grows with the angle, so the layers join up like a real roll.
      const k = (rho - (theta + Math.PI) / (Math.PI * 2) * 0.24 + 1) % 0.48
      if (rho < 0.27) s.paint(x, y, hide, 1)
      else if (rho > 0.84) s.paint(x, y, hide, d < -0.2 ? 4 : 3)
      else if (k < 0.16) s.paint(x, y, hide, 2)
      else s.paint(x, y, suede, d < -0.35 ? 5 : d < 0.45 ? 4 : 3)
    })

    tie(s, spec, ctx, tieId, accent)
    if (spec.glow) halo(s, spec.glow, 65, 2)
  }
}

function surface(s: Sprite, spec: LeatherSpec, ctx: Ctx, hide: number, accent: number): void {
  const r = rng(`${spec.id}-surface`)
  const { side, frame } = ctx
  const cells: [number, number][] = []
  side.each((x, y) => cells.push([x, y]))
  const shift = (x: number, y: number, k: number) => s.paint(x, y, hide, Math.max(1, Math.min(5, s.toneAt(x, y) + k)))
  switch (spec.surface) {
    case 'suede':
      for (const [x, y] of cells) if (r() < 0.1 && s.toneAt(x, y) >= 3) shift(x, y, 1)
      break
    case 'pores':
      // Bristle pores: short dark dashes along the roll.
      for (const [x, y] of cells)
        if (r() < 0.07 && side.get(x + 1, y) && s.toneAt(x, y) >= 2) {
          shift(x, y, -1)
          shift(x + 1, y - 1, -1)
        }
      break
    case 'mottle':
      for (const [x, y] of cells) {
        const n = Math.sin(x * 1.3 + y * 0.7) + Math.sin(x * 0.5 - y * 1.9)
        if (n > 1.1) shift(x, y, -1)
      }
      break
    case 'scales':
    case 'bigscales':
    case 'iridescent':
    case 'dragon': {
      // Overlapping scales: a tile per scale, its rim curving dark underneath and its crown lit.
      const big = spec.surface !== 'scales'
      const w = big ? 6 : 4, h = big ? 4 : 3
      const isRim = (x: number, y: number) => {
        const row = Math.floor(y / h)
        const lx = (((x + (row % 2) * (w / 2)) % w) + w) % w, ly = y % h
        return ly === h - 1 ? lx > 0 && lx < w - 1 : ly === h - 2 && (lx === 0 || lx === w - 1)
      }
      const isCrown = (x: number, y: number) => {
        const row = Math.floor(y / h)
        const lx = (((x + (row % 2) * (w / 2)) % w) + w) % w
        return y % h === 0 && lx > 0 && lx < w - 1
      }
      for (const [x, y] of cells) {
        if (isRim(x, y)) {
          if (spec.surface === 'dragon' && s.toneAt(x, y) >= 2) s.paint(x, y, accent, Math.min(5, s.toneAt(x, y) + 1))
          else shift(x, y, -1)
        } else if (isCrown(x, y)) shift(x, y, 1)
      }
      if (spec.surface === 'iridescent') {
        // The scales shift from teal to violet along the roll.
        const violet = s.addRamp(ramp('#8a6ad8', { lift: 0.35, drop: 0.28, hueShift: 8 }))
        for (const [x, y] of cells) {
          const { t } = frame(x + 0.5, y + 0.5)
          const k = t + (y % 3) * 0.04
          if (k > 0.7 || (k > 0.5 && (x + y) % 2 === 0) || (k > 0.32 && (x + y) % 4 === 0)) s.paint(x, y, violet, s.toneAt(x, y))
        }
      }
      break
    }
    case 'studs':
      // Iron studs in two rows along the roll.
      for (const dRow of [-0.35, 0.3])
        for (let t = 0.14; t < 0.98; t += 0.17) {
          const x = Math.round(ctx.c.ax + (ctx.c.bx - ctx.c.ax) * t - Math.sin(ctx.angle) * dRow * ctx.c.r)
          const y = Math.round(ctx.c.ay + (ctx.c.by - ctx.c.ay) * t + Math.cos(ctx.angle) * dRow * ctx.c.r)
          if (!side.get(x, y) || !side.get(x + 1, y + 1)) continue
          s.paint(x, y, accent, 5)
          s.paint(x + 1, y + 1, hide, 1)
        }
      break
    case 'stripes':
      // Dark tiger-like bands across the roll.
      for (const [x, y] of cells) {
        const { along, d } = frame(x + 0.5, y + 0.5)
        const k = (along + d * 1.6 + 20) % 4.2
        if (k < 1.1) s.paint(x, y, accent, Math.max(1, s.toneAt(x, y) - 1))
      }
      break
    case 'plates':
      // Thick, cracked plates.
      for (const [x, y] of cells) {
        const { along, d } = frame(x + 0.5, y + 0.5)
        const row = Math.floor((d + 1) * 2.2)
        const k = (along + row * 2.3 + 20) % 4.6
        if (k < 0.8 || Math.abs(((d + 1) * 2.2) % 1) < 0.18) shift(x, y, -1)
      }
      break
  }
}

function tie(s: Sprite, spec: LeatherSpec, ctx: Ctx, tieId: number, accent: number): void {
  const { frame, side, angle, c } = ctx
  const len = Math.hypot(c.bx - c.ax, c.by - c.ay)
  const bands = spec.tie === 'double' ? [0.32, 0.72] : [0.55]
  const width = spec.tie === 'strap' || spec.tie === 'gold' ? 1.3 : 0.75
  for (const t0 of bands)
    side.each((x, y) => {
      const { along, d } = frame(x + 0.5, y + 0.5)
      if (Math.abs(along - t0 * len) <= width) s.paint(x, y, tieId, Math.min(5, cylinderTone(d, angle) + (spec.tie === 'gold' ? 1 : 0)))
    })
  // Where the tie meets the front of the roll: a knot, bow or buckle.
  const t0 = bands[bands.length - 1] ?? 0.55
  const kx = Math.round(c.ax + (c.bx - c.ax) * t0 - Math.sin(angle) * 0.55 * c.r)
  const ky = Math.round(c.ay + (c.by - c.ay) * t0 + Math.cos(angle) * 0.55 * c.r)
  if (spec.tie === 'bow') {
    for (const [dx, dy, t] of [[-2, -1, 4], [-1, -1, 5], [-2, 0, 3], [0, 0, 5], [1, 0, 4], [2, -1, 4], [3, -1, 5], [3, 0, 3], [-1, 1, 3], [0, 2, 2], [2, 1, 3], [2, 2, 2]] as const) s.paint(kx + dx, ky + dy, tieId, t)
  } else if (spec.tie === 'strap' || spec.tie === 'gold') {
    // A square buckle.
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const) s.paint(kx + dx, ky + dy, accent, dy < 0 || dx < 0 ? 5 : 3)
    s.paint(kx, ky, tieId, 2)
  } else {
    // A knot with two short loose ends.
    s.paint(kx, ky, tieId, 5)
    s.paint(kx + 1, ky, tieId, 3)
    for (const [dx, dy, t] of [[0, 1, 3], [-1, 2, 2], [1, 1, 3], [2, 2, 2]] as const) s.paint(kx + dx, ky + dy, tieId, t)
  }
}

const SPECS: LeatherSpec[] = [
  { id: 'puffbun-leather', name: 'Puffbun Leather', grade: 1, hide: '#f0b6c4', hideRamp: { lift: 0.32, drop: 0.22, hueShift: 8, satShift: 0.03 }, suede: '#fbe3d8', surface: 'suede', tie: 'bow', tieColor: '#8fc8ee', radius: 5.4 },
  { id: 'boarling-leather', name: 'Boarling Leather', grade: 2, hide: '#94643f', suede: '#d9b48a', surface: 'pores', tie: 'twine', tieColor: '#d8c38e', tail: true },
  { id: 'wolfkin-leather', name: 'Wolfkin Leather', grade: 3, hide: '#8f8a86', suede: '#ddd5c8', surface: 'mottle', tie: 'thong', tieColor: '#5a4636' },
  { id: 'lizard-leather', name: 'Lizard Leather', grade: 4, hide: '#d4ab72', suede: '#f1dfbf', surface: 'scales', tie: 'twine', tieColor: '#7a5636', tail: true },
  { id: 'ironback-leather', name: 'Ironback Leather', grade: 5, hide: '#56708f', hideRamp: { lift: 0.42, drop: 0.3, hueShift: 8, satShift: 0.03 }, suede: '#c9c3b8', surface: 'studs', tie: 'strap', tieColor: '#4a3a30', accent: '#e8eef6' },
  { id: 'basilisk-leather', name: 'Basilisk Leather', grade: 6, hide: '#4f9a58', suede: '#d6dfb0', surface: 'bigscales', tie: 'thong', tieColor: '#3d2e22', tail: true },
  { id: 'manticore-leather', name: 'Manticore Leather', grade: 7, hide: '#d38b3c', suede: '#f3dcb4', surface: 'stripes', tie: 'twine', tieColor: '#e9dcc0', accent: '#5a2f1c', tail: true },
  { id: 'behemoth-leather', name: 'Behemoth Leather', grade: 8, hide: '#6b5c78', suede: '#cbbfc8', surface: 'plates', tie: 'double', tieColor: '#c9a46a', radius: 7 },
  { id: 'wyvern-leather', name: 'Wyvern Leather', grade: 9, hide: '#3fb3a6', hideRamp: { lift: 0.38, drop: 0.28, hueShift: 10, satShift: 0.04 }, suede: '#e2f0ea', surface: 'iridescent', tie: 'thong', tieColor: '#2e2a3e', glow: '#a8f0ff' },
  { id: 'dragonhide', name: 'Dragonhide', grade: 10, hide: '#b3202e', hideRamp: { lift: 0.36, drop: 0.3, hueShift: 10, satShift: 0.04 }, suede: '#f2d39a', surface: 'dragon', tie: 'gold', tieColor: '#e0a92e', accent: '#ffd25a', glow: '#ffc04a' },
]

export const HIDES_SCALES_REFINED: ItemIcon[] = SPECS.map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: paintLeather(spec) }))
