// Metal weapons (refined Ores): greatsword and axe. Each lies corner to corner, hilt bottom-left,
// and its metal is the grade's ingot. Grades add fittings: a fuller, then a contrasting guard, gems, and on legendary
// grades glowing runes or molten veins and a halo.
import type { Sprite } from '../sprite.ts'
import { abPolygon, diagPaint, xy, type Frame } from './diag.ts'
import { gemOf, glowPixels, jewel, legendaryHalo } from './fittings.ts'
import { DARK_GRIP, GOLD, LEATHER_GRIP, METALS, SILVER, use, WOODS, type Material } from './materials.ts'

export const metalOf = (g: number): Material => METALS[g - 1] ?? (METALS[0] as Material)

/** Guard and pommel metal: the blade's own metal at low grades, then a contrasting trim. */
export function trimOf(g: number): Material {
  if (g <= 4) return metalOf(g)
  if (g === 6) return SILVER
  return GOLD
}

/** A softer, shorter shadow for long pieces lying corner to corner. */
export function diagonalShadow(s: Sprite): void {
  s.shadow = { cx: 15, cy: 28.4, rx: 8.5, ry: 1.9, alpha: 70 }
}

type Guard = 'bar' | 'droop' | 'knobs' | 'upturn' | 'wings'

interface SwordStyle {
  guard: Guard
  /** Half-length of the guard across the blade, in b units. */
  span: number
  fuller: boolean
  /** Grade of the cut gem set in the guard. */
  gem?: number
  pommelGem?: boolean
  serrated?: boolean
  inlay?: 'rune' | 'molten'
}

/** The guard's offset along the blade at b: quillons bending toward the tip (up) or the hilt (down). */
function guardBend(style: SwordStyle, b: number): number {
  const out = Math.abs(b) - (style.span - 3)
  if (style.guard === 'upturn') return Math.max(0, out)
  if (style.guard === 'droop') return -Math.max(0, out)
  if (style.guard === 'wings') return Math.max(0, Math.abs(b) - (style.span - 5))
  return 0
}

interface Hilt {
  /** a of the guard's middle row. */
  guardA: number
  gripFrom: number
  gripTo: number
  pommelA: number
  pommelR2: number
  /** Half-size of the gem setting (diamond) and its stone. */
  setting?: number
}

function paintHilt(s: Sprite, f: Frame, g: number, style: SwordStyle, h: Hilt, trimMaterial: Material = trimOf(g)): void {
  const trim = use(s, trimMaterial)
  const grip = use(s, g >= 7 ? DARK_GRIP : LEATHER_GRIP)
  // Pommel: round at low grades, a faceted block later.
  const faceted = g >= 5
  diagPaint(s, f, trim, (a, b) => {
    const da = a - h.pommelA
    const inside = faceted ? Math.abs(da) + Math.abs(b) <= Math.sqrt(h.pommelR2) * 1.2 : da * da + b * b <= h.pommelR2
    if (!inside) return null
    return b < -1 ? 5 : b > 1 ? 2 : da > 0 ? 3 : 4
  })
  // Grip: a wrap in diagonal turns.
  diagPaint(s, f, grip, (a, b) => {
    if (a < h.gripFrom || a > h.gripTo || Math.abs(b) > 1) return null
    const base = b < 0 ? 4 : b === 0 ? 3 : 2
    return (a - b + 400) % 4 === 0 ? Math.max(1, base - 2) : base
  })
  // Crossguard: four rows across the blade, its quillons bending at the ends.
  diagPaint(s, f, trim, (a, b) => {
    if (Math.abs(b) > style.span) return null
    const k = guardBend(style, b)
    let lo = h.guardA - 2 + k
    const hi = h.guardA + 1 + k
    if (style.guard === 'wings' && Math.abs(b) >= style.span - 1) lo += 2
    const knob = style.guard === 'knobs' && (a - h.guardA + 0.5) ** 2 + (Math.abs(b) - style.span + 1) ** 2 <= 5
    if (!knob && (a < lo || a > hi)) return null
    const row = a - (h.guardA + k)
    const t = row >= 1 ? 3 : row === 0 ? 4 : row === -1 ? 3 : 2
    return Math.max(1, Math.min(5, t + (b < -3 ? 1 : b > 3 ? -1 : 0)))
  })
  // A diamond setting holding a stone.
  if (style.gem !== undefined) {
    const ca = h.guardA - 0.5
    const r = h.setting ?? 4
    diagPaint(s, f, trim, (a, b) => {
      const d = Math.max(Math.abs(a - ca), Math.abs(b))
      if (d > r) return null
      return d >= r - 0.5 ? (b < 0 ? 4 : 2) : b < 0 ? 5 : 3
    })
    const cx = (ca + f.c) / 2, cy = (f.c - ca) / 2
    if (r >= 4) jewel(s, Math.round(cx - 2), Math.round(cy - 2), 4, gemOf(style.gem))
    else jewel(s, Math.round(cx - 1), Math.round(cy - 1), 2, gemOf(style.gem))
  }
  if (style.pommelGem) {
    const cx = (h.pommelA + f.c) / 2, cy = (f.c - h.pommelA) / 2
    jewel(s, Math.round(cx - 1), Math.round(cy - 1), 2, gemOf(style.gem ?? g))
  }
}

interface BladeShape {
  from: number
  tip: number
  half: number
  /** How fast the point tapers: b units lost per a unit. */
  taper: number
}

function paintBlade(s: Sprite, f: Frame, metal: number, style: SwordStyle, b0: BladeShape): void {
  const half = (a: number) => Math.min(b0.half, (b0.tip - a) * b0.taper)
  const inBlade = (a: number, b: number) => {
    if (a < b0.from || a > b0.tip || Math.abs(b) > half(a) + 0.01) return false
    // Notches along both edges near the guard.
    if (style.serrated && a < b0.from + 14 && Math.abs(b) >= b0.half - 0.5 && (a - b0.from) % 4 < 2) return false
    return true
  }
  const fullerEnd = b0.from + (b0.tip - b0.from) * 0.62
  diagPaint(s, f, metal, (a, b) => {
    if (!inBlade(a, b)) return null
    const edge = Math.abs(b) >= half(a) - 0.5
    if (b < 0) {
      if (edge) return 5
      if (style.fuller && b === -1 && a < fullerEnd) return 2
      return 4
    }
    if (b === 0) return style.fuller && a < fullerEnd ? 3 : 5
    if (edge) return 2
    return 3
  })
}

/** Glowing inlay down the blade's middle: a channel of runes, or a molten vein. */
function inlay(s: Sprite, f: Frame, kind: 'rune' | 'molten', color: string, from: number, to: number): void {
  const cells: [number, number][] = []
  const on = (a: number, b: number) => (a + b + f.c + 1000) % 2 === 0
  for (let a = from; a <= to; a++) {
    if (kind === 'rune') {
      for (const b of [-1, 0]) if (on(a, b)) cells.push(xy(f, a, b))
      // A cross-stroke every few steps turns the channel into a row of glyphs.
      if ((a - from) % 6 === 3) for (const b of [-2, 1]) if (on(a, b)) cells.push(xy(f, a, b))
    } else {
      const want = Math.sin((a - from) * 0.5) * 1.6 - 0.5
      for (const b of [-3, -2, -1, 0, 1, 2]) if (on(a, b) && Math.abs(b - want) <= 1) cells.push(xy(f, a, b))
    }
  }
  glowPixels(s, cells, color, 0)
}

const GREAT: SwordStyle[] = [
  { guard: 'bar', span: 7, fuller: false },
  { guard: 'bar', span: 7, fuller: true },
  { guard: 'droop', span: 8, fuller: true },
  { guard: 'knobs', span: 8, fuller: true },
  { guard: 'upturn', span: 8, fuller: true },
  { guard: 'upturn', span: 8, fuller: true, gem: 7 },
  { guard: 'wings', span: 9, fuller: true, gem: 6, pommelGem: true },
  { guard: 'wings', span: 9, fuller: true, gem: 2, pommelGem: true, serrated: true },
  { guard: 'wings', span: 9, fuller: true, gem: 8, pommelGem: true, inlay: 'rune' },
  { guard: 'wings', span: 9, fuller: true, gem: 10, pommelGem: true, inlay: 'molten' },
]

/** `tint`: the blade's color for every grade instead of the grade's ingot (the colored rows); the hilt is then the
 * grade's ingot, as a Tome's fittings are its grade's gem. */
export function greatsword(s: Sprite, g: number, tint?: Material): void {
  diagonalShadow(s)
  const style = GREAT[g - 1] ?? (GREAT[0] as SwordStyle)
  const f: Frame = { c: 32 }
  const m = tint ?? metalOf(g)
  const metal = use(s, m)
  paintBlade(s, f, metal, style, { from: -7, tip: 25, half: 4, taper: 0.5 })
  paintHilt(s, f, g, style, { guardA: -9, gripFrom: -22, gripTo: -11, pommelA: -25, pommelR2: 8 }, tint ? metalOf(g) : undefined)
  if (style.inlay && m.glow) {
    inlay(s, f, style.inlay, m.glow, -4, 14)
    legendaryHalo(s, m.glow, 55)
  }
}
/** Axe hafts: sturdy woods, darker and finer as the grade rises. */
const HAFT_WOOD = [4, 4, 4, 5, 6, 7, 6, 7, 8, 7]
function haftOf(g: number): Material {
  return WOODS[HAFT_WOOD[g - 1] ?? 4] as Material
}

/** A round shaft on the axis (two diagonals), lit on its upper-left side. */
function shaft(s: Sprite, f: Frame, wood: number, from: number, to: number): void {
  diagPaint(s, f, wood, (a, b) => (a >= from && a <= to && (b === -1 || b === 0) ? (b === -1 ? 4 : 2) : null))
}

/** Bands of a fitting around the shaft (three diagonals wide). */
function band(s: Sprite, f: Frame, id: number, from: number, to: number, width = 1.5): void {
  diagPaint(s, f, id, (a, b) => (a >= from && a <= to && Math.abs(b + 0.5) <= width ? (b < -1 ? 5 : b < 0 ? 4 : b === 0 ? 3 : 2) : null))
}

/** A grip binding: dark diagonal turns over the shaft. */
function binding(s: Sprite, f: Frame, id: number, from: number, to: number): void {
  diagPaint(s, f, id, (a, b) => {
    if (a < from || a > to || Math.abs(b + 0.5) > 1.5) return null
    const t = b < -1 ? 4 : b < 0 ? 4 : b === 0 ? 3 : 2
    return (a - b + 400) % 4 < 2 ? t - 1 : t
  })
}
type AxeHead = 'hatchet' | 'bearded' | 'crescent'

interface AxeStyle {
  head: AxeHead
  rivets?: boolean
  /** A spike on the back of the head. */
  spike?: boolean
  gilt?: boolean
  wrap?: boolean
  gem?: number
  engraved?: boolean
}

const AXES: AxeStyle[] = [
  { head: 'hatchet' },
  { head: 'hatchet', rivets: true },
  { head: 'bearded', rivets: true },
  { head: 'bearded', rivets: true, wrap: true, engraved: true },
  { head: 'bearded', gilt: true, wrap: true, spike: true },
  { head: 'bearded', gilt: true, wrap: true, spike: true, gem: 7 },
  { head: 'crescent', gilt: true, wrap: true, spike: true, gem: 6 },
  { head: 'crescent', gilt: true, wrap: true, spike: true, gem: 2, engraved: true },
  { head: 'crescent', gilt: true, wrap: true, spike: true, gem: 8 },
  { head: 'crescent', gilt: true, wrap: true, spike: true, gem: 10 },
]

/** `tint`: the head's color for every grade (the colored rows); its eye, bands and spike are the grade's ingot. */
export function axe(s: Sprite, g: number, tint?: Material): void {
  diagonalShadow(s)
  const st = AXES[g - 1] ?? (AXES[0] as AxeStyle)
  const f: Frame = { c: 35 }
  const m = tint ?? metalOf(g)
  const metal = use(s, m)
  const trim = use(s, tint ? metalOf(g) : st.gilt ? trimOf(g) : m)
  const wood = use(s, haftOf(g))
  const n0 = 7, n1 = 12
  shaft(s, f, wood, -24, n1 + 4)
  band(s, f, trim, -25, -23, 1)
  if (st.wrap) binding(s, f, use(s, g >= 7 ? DARK_GRIP : LEATHER_GRIP), -21, -12)
  // The blade on the upper-left side: a narrow neck at the eye flaring to a long convex edge, the beard hooking back
  // toward the grip.
  const shapes: Record<AxeHead, [number, number][]> = {
    hatchet: [[8, -1], [12, -1], [13, -5], [16, -9], [17, -12], [14, -14], [9, -14.5], [4, -13.5], [2, -11.5], [5, -8], [7, -5]],
    bearded: [[8, -1], [12, -1], [13, -5], [16, -9], [18, -12.5], [15, -14.5], [9, -15.5], [3, -15], [-1, -13.5], [-2, -11.5], [3, -9.5], [6, -6]],
    crescent: [[8, -1], [12, -1], [14, -5], [19, -9], [21, -12], [19, -15], [12, -16.5], [4, -16], [-2, -14.5], [-5, -11.5], [-1, -10], [5, -7]],
  }
  const blade = abPolygon(f, shapes[st.head])
  blade.each((x, y) => {
    const out = (dx: number, dy: number) => !blade.get(x + dx, y + dy)
    let t = 3
    if (out(-1, -1) || (out(-1, 0) && out(0, -1))) t = 5
    else if (out(-2, -2)) t = 4
    else if (out(-1, 1) || out(0, 1)) t = 2
    else if (x + y - f.c > -5) t = 2
    s.paint(x, y, metal, t)
  })
  if (st.engraved) {
    // An engraved line following the edge.
    blade.each((x, y) => {
      if (!blade.get(x - 3, y - 3) && blade.get(x - 2, y - 2) && x + y - f.c < -6) s.paint(x, y, metal, 2)
    })
  }
  // The eye around the haft.
  diagPaint(s, f, trim, (a, b) => {
    if (a < n0 || a > n1 || b < -2 || b > 2) return null
    if (a === n0 || a === n1) return b < 0 ? 3 : 2
    return b <= -1 ? 4 : b === 0 ? 3 : 2
  })
  if (st.spike)
    diagPaint(s, f, trim, (a, b) => {
      if (b < 3 || b > 8) return null
      const w = (8.5 - b) * 0.5
      const mid = (n0 + n1) / 2
      return Math.abs(a - mid) <= w ? (a > mid ? 4 : 2) : null
    })
  if (st.rivets)
    for (const a of [n0 + 1, n1 - 1]) {
      const b = (a + f.c) % 2 === 0 ? -4 : -3
      const [x, y] = xy(f, a, b)
      s.paint(x, y, metal, 5)
      s.paint(x + 1, y, metal, 1)
    }
  if (st.gem) {
    const [x, y] = xy(f, 10, -6)
    jewel(s, x - 1, y - 1, 3, gemOf(st.gem))
  }
  if (m.glow && g >= 9) {
    const cells: [number, number][] = []
    blade.each((x, y) => {
      if (blade.get(x - 1, y - 1) && !blade.get(x - 2, y - 2) && x + y - f.c < -7) cells.push([x, y])
    })
    glowPixels(s, cells, m.glow, 0)
    legendaryHalo(s, m.glow, 55)
  }
}
