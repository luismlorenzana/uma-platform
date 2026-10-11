// Wooden weapons (refined Woods): bow, mage staff, arcane staff and cleric staff. The grade's plank colors the wood;
// fittings climb from bare wood and cord through bronze, silver and gold, and the heads grow richer: a bigger crystal in
// claws, a brighter star in its ring, a budded cross with enamel. Legendary woods glow along their grain. The bow lies on
// the 45° diagonal like the blades; the staves stand steeper so their heads sit upright and clear of the corner.
import { hex } from '../color.ts'
import { bloom } from '../items/refined/workbench-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { diagonalShadow } from './blades.ts'
import { diagPaint, xy, type Frame } from './diag.ts'
import { gemOf, glowPixels, jewel, legendaryHalo } from './fittings.ts'
import { at, rotPaint, slant, type Rot } from './rot.ts'
import { BRONZE, CORD, DARK_GRIP, GOLD, IRON, LEATHER_GRIP, METALS, SILVER, use, WOODS, type Material } from './materials.ts'

export const woodOf = (g: number): Material => WOODS[g - 1] ?? (WOODS[0] as Material)

/** Metal fittings on wooden weapons, by grade. */
export function fittingOf(g: number): Material {
  return [BRONZE, BRONZE, BRONZE, IRON, SILVER, SILVER, GOLD, GOLD, METALS[8] as Material, GOLD][g - 1] ?? BRONZE
}

const on = (f: Frame, a: number, b: number) => (a + (f.da ?? 0) + b + f.c + 1000) % 2 === 0

/** The wood's own figure along the bow's limbs: birch dashes, an ebony sheen, glowing grain on legendary woods. */
function figure(s: Sprite, f: Frame, g: number, wood: number, cells: (a: number) => number | null, from: number, to: number): void {
  const m = woodOf(g)
  if (g === 2 && m.accent) {
    const id = use(s, m.accent, { lift: 0.3, drop: 0.3 })
    for (let a = from + 3; a <= to; a += 7) {
      const b = cells(a)
      if (b !== null && on(f, a, b)) {
        const [x, y] = xy(f, a, b)
        s.paint(x, y, id, 3)
      }
    }
  }
  if (g === 8)
    for (let a = from + 2; a <= to; a += 9)
      for (const k of [0, 1]) {
        const b = cells(a + k)
        if (b !== null && on(f, a + k, b - 1)) {
          const [x, y] = xy(f, a + k, b - 1)
          s.paint(x, y, wood, 5)
        }
      }
  if (g >= 9 && m.accent) {
    const glow: [number, number][] = []
    for (let a = from; a <= to; a++) {
      const b = cells(a)
      if (b === null) continue
      if ((a - from) % 9 < 4 && on(f, a, b)) glow.push(xy(f, a, b))
    }
    glowPixels(s, glow, m.accent, 0)
  }
}

/** Leaves sprouting from Yggdrasil wood. */
function leaves(s: Sprite, spots: readonly (readonly [number, number, 1 | -1])[]): void {
  const leaf = use(s, '#86d150', { lift: 0.4, drop: 0.28 })
  for (const [x, y, dir] of spots)
    for (const [dx, dy, t] of [[0, 0, 3], [dir, -1, 4], [2 * dir, -1, 5], [dir, 0, 3], [2 * dir, -2, 4]] as const) s.paint(x + dx, y + dy, leaf, t)
}

// ---------------------------------------------------------------- bow

export function bow(s: Sprite, g: number): void {
  diagonalShadow(s)
  const f: Frame = { c: 35 }
  const m = woodOf(g)
  const wood = use(s, m)
  const L = 20, D = 9
  const center = (a: number) => -D * (1 - (a / L) ** 2)
  const thick = (a: number) => (Math.abs(a) <= 3 ? 2.1 : Math.abs(a) >= L - 3 ? 0.9 : Math.abs(a) >= L - 8 ? 1.2 : 1.6)
  // The string, tip to tip.
  const string = use(s, g >= 9 ? '#fff6d8' : '#e9dcc0', { lift: 0.4, drop: 0.3 })
  diagPaint(s, f, string, (a, b) => (b === 0 && Math.abs(a) < L - 0.5 ? 4 : null))
  // The limbs: lit on the outer (upper-left) side.
  diagPaint(s, f, wood, (a, b) => {
    if (Math.abs(a) > L + 0.5) return null
    const d = b - center(a)
    const t = thick(a)
    if (Math.abs(d) > t) return null
    return d < -t + 0.9 ? (d < -1.2 ? 5 : 4) : d > t - 0.9 ? 2 : 3
  })
  figure(s, f, g, wood, (a) => Math.round(center(a)), -L + 3, L - 3)
  // Grip wrap.
  const grip = use(s, g >= 7 ? DARK_GRIP : LEATHER_GRIP)
  diagPaint(s, f, grip, (a, b) => {
    if (Math.abs(a) > 3) return null
    const d = b - center(a)
    if (Math.abs(d) > 2.5) return null
    const t = d < -0.5 ? 4 : d > 0.5 ? 2 : 3
    return (a + 100) % 2 === 0 ? t : Math.max(1, t - 1)
  })
  // Tips: horn or metal caps, curling outward on the finer bows.
  if (g >= 3) {
    const cap = use(s, g >= 4 ? fittingOf(g) : '#e8dcc0')
    for (const sgn of [-1, 1]) {
      diagPaint(s, f, cap, (a, b) => {
        if (sgn * a < L - 3 || sgn * a > L + 0.5) return null
        const d = b - center(a)
        return Math.abs(d) <= 1.3 ? (d < 0 ? 5 : 3) : null
      })
      if (g >= 6) {
        // A curl beyond the tip.
        const [x, y] = xy(f, sgn * (L + 1), -1)
        if (sgn > 0) {
          s.paint(x, y, cap, 4)
          s.paint(x + 1, y - 1, cap, 3)
        } else {
          s.paint(x, y, cap, 4)
          s.paint(x - 1, y + 1, cap, 3)
        }
      }
    }
  }
  // Fittings where the limbs meet the grip.
  if (g >= 5) {
    const fit = use(s, fittingOf(g))
    diagPaint(s, f, fit, (a, b) => {
      if (Math.abs(a) < 4 || Math.abs(a) > 5) return null
      return Math.abs(b - center(a)) <= 2.4 ? (b - center(a) < 0 ? 5 : 3) : null
    })
  }
  if (g >= 7) {
    const [x, y] = xy(f, 0, -9)
    jewel(s, x - 1, y - 1, 3, gemOf(g))
  }
  if (g === 10) leaves(s, [[xy(f, -11, -6)[0], xy(f, -11, -6)[1], -1], [xy(f, 12, -6)[0], xy(f, 12, -6)[1], 1]])
  if (m.glow && g >= 9) legendaryHalo(s, m.glow, 55)
}

// ---------------------------------------------------------------- slanted staves

/** Staves with a wide head stand steeper (two up for one across), the head upright at the top. */
export function staffFrame(): Rot {
  return slant(19.5, 9.5, 2)
}

/** A round staff in a slanted frame, from u0 up to u1. */
function slantShaft(s: Sprite, r: Rot, g: number, u0: number, u1: number, w = 1.45): number {
  const m = woodOf(g)
  const wood = use(s, m)
  rotPaint(s, r, wood, (u, v) => (u >= u0 && u <= u1 && Math.abs(v) <= w ? (v < -0.5 ? 4 : v > 0.5 ? 2 : 3) : null))
  const px = (u: number, v: number) => at(r, u, v).map(Math.floor) as [number, number]
  if (g === 2 && m.accent) {
    const id = use(s, m.accent, { lift: 0.3, drop: 0.3 })
    for (let u = u0 + 3; u < u1 - 1; u += 4.5) {
      const [x, y] = px(u, ((u * 7) | 0) % 2 === 0 ? -0.3 : 0.4)
      s.paint(x, y, id, 3)
    }
  }
  if (g === 8)
    for (let u = u0 + 2; u < u1 - 1; u += 5) {
      const [x, y] = px(u, -0.6)
      s.paint(x, y, wood, 5)
    }
  if (g >= 9 && m.accent) {
    const cells: [number, number][] = []
    for (let u = u0 + 1; u < u1 - 1; u += 0.5) if (((u - u0) % 5) < 2.2) cells.push(px(u, 0))
    glowPixels(s, cells, m.accent, 0)
  }
  return wood
}

function slantCollar(s: Sprite, r: Rot, id: number, u0: number, u1: number, w = 2): void {
  rotPaint(s, r, id, (u, v) => (u >= u0 && u <= u1 && Math.abs(v) <= w ? (v < -0.8 ? 5 : v < 0 ? 4 : v < 0.8 ? 3 : 2) : null))
}

/** Paints an ASCII pattern ('#' cells) centered on pixel (cx, cy), lit on its top-left rims. */
function pattern(s: Sprite, id: number, cx: number, cy: number, rows: readonly string[]): void {
  const h = rows.length, w = rows[0]?.length ?? 0
  const ox = cx - Math.floor(w / 2), oy = cy - Math.floor(h / 2)
  const on = (x: number, y: number) => rows[y]?.[x] === '#'
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== '#') return
      let t = 4
      if (!on(x + 1, y) || !on(x, y + 1)) t = 3
      if (!on(x - 1, y) || !on(x, y - 1)) t = 5
      if (x === Math.floor(w / 2) && y === Math.floor(h / 2)) t = 5
      s.paint(ox + x, oy + y, id, t)
    }),
  )
}

// ---------------------------------------------------------------- mage staff

interface MageStyle {
  /** Crystal half-length and half-width, before the staff frame's scaling. */
  len: number
  wid: number
  holder: 'fork' | 'cord' | 'claws'
  collars: number
}

const MAGE: MageStyle[] = [
  { len: 5, wid: 3, holder: 'cord', collars: 0 },
  { len: 5, wid: 3, holder: 'fork', collars: 0 },
  { len: 5.5, wid: 3.5, holder: 'fork', collars: 1 },
  { len: 5.5, wid: 3.5, holder: 'claws', collars: 1 },
  { len: 6, wid: 4, holder: 'claws', collars: 1 },
  { len: 6, wid: 4, holder: 'claws', collars: 2 },
  { len: 6.5, wid: 4.5, holder: 'claws', collars: 2 },
  { len: 6.5, wid: 4.5, holder: 'claws', collars: 2 },
  { len: 7, wid: 4.5, holder: 'claws', collars: 2 },
  { len: 7, wid: 4.5, holder: 'claws', collars: 2 },
]

export function mageStaff(s: Sprite, g: number): void {
  s.shadow = { cx: 13, cy: 28.6, rx: 7, ry: 1.8, alpha: 70 }
  const st = MAGE[g - 1] ?? (MAGE[0] as MageStyle)
  const r = staffFrame()
  const len = st.len + 0.5, wid = st.wid * 0.72
  const foot = -len - 1
  const wood = slantShaft(s, r, g, -23.5, foot + 1.5)
  const fit = use(s, fittingOf(g))
  if (g >= 3) slantCollar(s, r, fit, -23.8, -22.2, 1.4)
  // What holds the crystal: a cord binding, the staff split into tines, or metal claws.
  const holder = st.holder === 'claws' ? fit : wood
  const prong = (u: number, v: number) => {
    if (u < foot || u > 0.8) return null
    const t = (u - foot) / (0.8 - foot)
    const w = 0.9 + Math.sin(t * Math.PI * 0.62) * (wid + 0.3)
    const d = Math.abs(v) - w
    return Math.abs(d) <= 0.62 ? (v < 0 ? 5 : 3) : null
  }
  if (st.holder !== 'cord') rotPaint(s, r, holder, (u, v) => prong(u, v))
  // The crystal: a long bipyramid along the staff, four facets lit by their side.
  const gem = use(s, gemOf(g))
  rotPaint(s, r, gem, (u, v) => {
    if (Math.abs(u) / len + Math.abs(v) / wid > 1) return null
    if (v < -0.35) return u >= 0 ? 5 : 4
    if (v < 0.35) return u >= 0 ? 4 : 3
    return u >= 0 ? 3 : 2
  })
  // Claws close over the crystal's lower half.
  if (st.holder !== 'cord') rotPaint(s, r, holder, (u, v) => (u > -len * 0.55 ? prong(u, v) : null))
  else {
    const cord = use(s, CORD)
    slantCollar(s, r, cord, foot, foot + 2.2, 1.8)
  }
  {
    const [x, y] = at(r, len * 0.3, -wid * 0.35).map(Math.floor) as [number, number]
    s.overlay(x, y, hex('#ffffff', 210))
  }
  for (let i = 0; i < st.collars; i++) slantCollar(s, r, fit, foot - 4 - i * 3.5, foot - 3 - i * 3.5)
  if (g === 10) {
    const [x, y] = at(r, -13, -1.5).map(Math.floor) as [number, number]
    leaves(s, [[x, y, -1]])
  }
  const glow = gemOf(g).glow ?? woodOf(g).glow
  if (g >= 9 && glow) {
    bloom(s, r.ox, r.oy, 4.5, glow, 90)
    legendaryHalo(s, glow, 60)
  }
}

// ---------------------------------------------------------------- arcane staff

/** The star's color: pale brass at first, warming to gold, then starlight. */
const STAR = ['#efe3a8', '#f0dc8a', '#f5d36a', '#f8cc4e', '#ffc93a', '#ffd23f', '#ffd84a', '#ffe066', '#c8f4ff', '#ffe27a']
const SMALL_STAR = ['..#..', '#####', '.###.', '.#.#.']
const BIG_STAR = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.']

export function arcaneStaff(s: Sprite, g: number): void {
  s.shadow = { cx: 13, cy: 28.6, rx: 7, ry: 1.8, alpha: 70 }
  const r = staffFrame()
  const R = g >= 4 ? 5.9 : 5.4
  const hole = R - (g >= 5 ? 2.2 : 1.9)
  slantShaft(s, r, g, -23.5, -R + 0.8, 1.2)
  const ringMat = g <= 2 ? woodOf(g) : fittingOf(g)
  const ring = use(s, ringMat)
  const band = Mask.circle(r.ox, r.oy, R).subtract(Mask.circle(r.ox, r.oy, hole))
  shadeDome(s, band, ring, { bias: 0.12, contact: false })
  if (g >= 3) slantCollar(s, r, ring, -R - 1.6, -R + 0.4)
  if (g >= 5) slantCollar(s, r, ring, -23.8, -22.2, 1.4)
  // Studs around the ring on finer staves.
  if (g >= 6)
    for (let k = 0; k < 4; k++) {
      const ang = -Math.PI / 2 + (k * Math.PI) / 2 + 0.46
      const x = Math.floor(r.ox + Math.cos(ang) * (R - 1.1)), y = Math.floor(r.oy + Math.sin(ang) * (R - 1.1))
      s.paint(x, y, ring, 5)
      s.paint(x + 1, y + 1, ring, 2)
    }
  // The star in the ring.
  const star = use(s, STAR[g - 1] ?? '#ffe27a', { lift: 0.55, drop: 0.3 })
  const cx = Math.floor(r.ox), cy = Math.floor(r.oy)
  pattern(s, star, cx, cy, g >= 4 ? BIG_STAR : SMALL_STAR)
  if (g >= 8) {
    const [x, y] = at(r, -R - 3.6, 0).map(Math.floor) as [number, number]
    jewel(s, x - 1, y - 1, 3, gemOf(g))
  }
  const glow = g >= 9 ? (g === 9 ? '#b8f0ff' : '#ffd77a') : null
  if (glow) {
    bloom(s, cx + 0.5, cy + 0.5, 4, glow, 120)
    legendaryHalo(s, glow, 55)
  } else if (g >= 6) bloom(s, cx + 0.5, cy + 0.5, 3, '#fff3c0', 70)
  if (g === 10) {
    const [x, y] = at(r, -12, -1.5).map(Math.floor) as [number, number]
    leaves(s, [[x, y, -1]])
  }
}

// ---------------------------------------------------------------- cleric staff

interface CrossStyle {
  arm: number
  flare: boolean
  /** Enamel inlaid down the middle of the arms. */
  enamel?: string
  gem: boolean
}

const CLERIC: CrossStyle[] = [
  { arm: 5, flare: false, gem: false },
  { arm: 5, flare: false, gem: false },
  { arm: 5, flare: false, gem: false },
  { arm: 5.2, flare: true, gem: false },
  { arm: 5.2, flare: true, gem: true },
  { arm: 5.2, flare: true, gem: true },
  { arm: 5.2, flare: true, enamel: '#c8283c', gem: true },
  { arm: 5.2, flare: true, enamel: '#2f5fd0', gem: true },
  { arm: 5.2, flare: true, enamel: '#bdfcef', gem: true },
  { arm: 5.2, flare: true, enamel: '#fff3c4', gem: true },
]

export function clericStaff(s: Sprite, g: number): void {
  s.shadow = { cx: 13, cy: 28.6, rx: 7, ry: 1.8, alpha: 70 }
  const st = CLERIC[g - 1] ?? (CLERIC[0] as CrossStyle)
  const r = staffFrame()
  const crossMat = g <= 2 ? woodOf(g) : fittingOf(g)
  slantShaft(s, r, g, -23.5, -st.arm)
  const id = use(s, crossMat)
  // A Latin cross: the upright continues the staff past the bar; finer crosses end each arm in a round bud.
  const w = 1.75
  const top = st.arm, side = st.arm, foot = st.arm * 1.7
  const buds: [number, number][] = st.flare ? [[top, 0], [0, -side], [0, side]] : []
  rotPaint(s, r, id, (u, v) => {
    const inUp = u >= -foot && u <= top && Math.abs(v) <= w
    const inBar = Math.abs(v) <= side && Math.abs(u) <= w
    const bud = buds.find(([bu, bv]) => (u - bu) ** 2 + (v - bv) ** 2 <= 3.6)
    if (bud) {
      const d = u - bud[0] - (v - bud[1])
      return d > 0.6 ? 5 : d < -0.8 ? 2 : 4
    }
    if (!inUp && !inBar) return null
    if (inBar && !inUp) return u < -0.6 ? 2 : u > 0.6 ? 5 : 4
    return v < -0.6 ? 5 : v < 0.6 ? 4 : 2
  })
  if (st.enamel) {
    const enamel = use(s, st.enamel, { lift: 0.45, drop: 0.3 })
    rotPaint(s, r, enamel, (u, v) => {
      const up = u >= -foot + 2.5 && u <= top - 0.6 && Math.abs(v) <= 0.55
      const bar = Math.abs(u) <= 0.55 && Math.abs(v) <= side - 0.6
      return up || bar ? (u + v < 0 ? 4 : 3) : null
    })
  }
  if (g >= 3) slantCollar(s, r, id, -foot - 1.5, -foot)
  if (g >= 4) slantCollar(s, r, id, -23.8, -22.2, 1.4)
  if (st.gem) jewel(s, Math.floor(r.ox) - 1, Math.floor(r.oy) - 1, g >= 7 ? 3 : 2, gemOf(g >= 9 ? 8 : g === 5 ? 1 : 6))
  if (g === 10) {
    const [x, y] = at(r, -12, -1.5).map(Math.floor) as [number, number]
    leaves(s, [[x, y, -1]])
  }
  if (g >= 9) {
    const glow = g === 9 ? '#c8fff0' : '#ffe9a0'
    bloom(s, r.ox, r.oy, 5, glow, 70)
    legendaryHalo(s, glow, 60)
  }
}
