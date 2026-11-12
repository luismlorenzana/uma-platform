// Painted form for the kit's props (P147): a shape filled with its colour, lit from the top front-left, its edge bright
// on the side facing the light and dark on the far side; foliage crowns built from lit clumps; wood, bark, leaves and
// fruit. Every helper paints into a canvas the same way each run. Pure.
import { hex, mix, shade, smooth, type RGB, type RGBA } from './color.js'
import { fbm, stream } from './noise.js'
import { Canvas, capsule, circle, ellipse, fading, poly, rough, union, type Shape } from './paint.js'

/** The light's direction on the card: from the top left. */
const LX = -0.62, LY = -0.78

/** A shape's outward normal at a point (from its distance field). */
function normal(s: Shape, x: number, y: number): [number, number] {
  const e = 0.75, nx = s.sd(x + e, y) - s.sd(x - e, y), ny = s.sd(x, y + e) - s.sd(x, y - e), l = Math.hypot(nx, ny) || 1
  return [nx / l, ny / l]
}

export interface FormOptions {
  /** How much brighter the lit side is than the far side, across the whole shape (0–1). */
  light?: number
  /** The rim's strength and width in texels. */
  rim?: number
  rimWidth?: number
  /** A texture over the colour: noise contrast, cells, stretch. */
  grain?: { amount: number; cells: number; sx?: number; sy?: number; seed: number }
  /** Ambient occlusion toward the bottom of the shape (0–1). */
  ao?: number
}

/** Fills a shape as a lit solid: its colour, a top-left gradient, an optional grain, a bright rim toward the light and a
 * dark one away from it, and darker toward its foot. */
export function form(c: Canvas, s: Shape, base: RGB, o: FormOptions = {}): void {
  const [x0, y0, x1, y1] = s.box, w = x1 - x0, h = y1 - y0, light = o.light ?? 0.35, rim = o.rim ?? 0.28, rw = o.rimWidth ?? 2.5, ao = o.ao ?? 0.18
  c.fill(s, (x, y) => {
    let col = shade(base, (((x - x0) / w - 0.5) * LX + ((y - y0) / h - 0.5) * LY) * light)
    if (o.grain) col = shade(col, (fbm(x, y, { cells: o.grain.cells, octaves: 3, seed: o.grain.seed, sx: o.grain.sx, sy: o.grain.sy }) - 0.5) * o.grain.amount)
    const d = -s.sd(x, y)
    if (d < rw) {
      const [nx, ny] = normal(s, x, y), facing = nx * LX + ny * LY, k = 1 - d / rw
      col = shade(col, facing > 0 ? facing * rim * k : facing * rim * 0.8 * k)
    }
    col = shade(col, -smooth(y0 + h * 0.55, y1, y) * ao)
    return [...col, 1] as RGBA
  })
}

/** A dark contact line where a thing meets what it stands on. */
export const contact = (c: Canvas, cx: number, y: number, rx: number) => c.fill(ellipse(cx, y, rx, Math.max(2, rx * 0.12)), [0, 0, 0, 0.22], 'atop')

export interface Clump { x: number; y: number; r: number }
/** A crown of foliage: rough clumps, each lit on its upper left, dark in the gaps, flecked with leaves. */
export function foliage(c: Canvas, clumps: readonly Clump[], palette: { dark: RGB; mid: RGB; light: RGB; fleck?: RGB }, seed: number, edge = 5): Shape {
  const crown = rough(union(...clumps.map((b) => circle(b.x, b.y, b.r))), edge, 14, seed)
  c.fill(crown, [...palette.dark, 1])
  // Back clumps first: the higher ones sit behind.
  const order = [...clumps].sort((a, b) => a.y - b.y)
  order.forEach((b, i) => {
    const clump = rough(circle(b.x, b.y, b.r * 0.92), edge * 0.8, 16, seed + i + 1)
    c.fill(clump, (x, y) => {
      const lx = b.x - b.r * 0.38, ly = b.y - b.r * 0.45, t = Math.min(1, Math.hypot(x - lx, y - ly) / (b.r * 1.35))
      return [...mix(mix(palette.light, palette.mid, smooth(0.15, 0.6, t)), palette.dark, smooth(0.6, 1, t)), 1] as RGBA
    }, 'atop')
  })
  // Leaf flecks: little lit and shaded marks across the crown.
  const fleck = palette.fleck ?? shade(palette.light, 0.15)
  c.fill(crown, (x, y) => {
    const n = fbm(x, y, { cells: 22, octaves: 2, seed: seed + 50 })
    return n > 0.62 ? [...fleck, smooth(0.62, 0.72, n) * 0.4] : n < 0.34 ? [...palette.dark, smooth(0.34, 0.24, n) * 0.3] : [0, 0, 0, 0]
  }, 'atop')
  // Darker underneath the crown.
  const [, cy0, , cy1] = crown.box
  c.fill(crown, fading(shade(palette.dark, -0.35), (_, y) => smooth(cy0 + (cy1 - cy0) * 0.55, cy1, y) * 0.55), 'atop')
  return crown
}

/** Bark: vertical furrows over a trunk shape. */
export function bark(c: Canvas, s: Shape, base: RGB, seed: number): void {
  form(c, s, base, { light: 0.45, rim: 0.3, grain: { amount: 0.45, cells: 3, sx: 10, sy: 1, seed }, ao: 0.1 })
}
/** Wood grain running along one axis. */
export function wood(c: Canvas, s: Shape, base: RGB, seed: number, along: 'x' | 'y' = 'y', o: FormOptions = {}): void {
  form(c, s, base, { light: 0.3, rim: 0.25, grain: { amount: 0.3, cells: 3, sx: along === 'y' ? 12 : 1, sy: along === 'y' ? 1 : 12, seed }, ...o })
}

/** A leaf: a lens from its base to its tip, `width` across, lit along one side, a vein down the middle. */
export function leaf(c: Canvas, ax: number, ay: number, bx: number, by: number, width: number, colour: RGB, vein = true): void {
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, mx = ax + dx * 0.45, my = ay + dy * 0.45
  const lens = poly([[ax, ay], [mx + nx * width, my + ny * width], [bx, by], [mx - nx * width, my - ny * width]])
  form(c, rough(lens, 0.6, 30, Math.round(ax * 7 + ay)), colour, { light: 0.3, rim: 0.3, rimWidth: 1.8, ao: 0 })
  if (vein) c.fill(capsule(ax, ay, ax + dx * 0.85, ay + dy * 0.85, 0.45), [...shade(colour, -0.3), 0.7], 'atop')
}
/** A stem: a capsule, lit on its left. */
export function stem(c: Canvas, ax: number, ay: number, bx: number, by: number, r: number, colour: RGB, r2 = r * 0.7): void {
  form(c, capsule(ax, ay, bx, by, r, r2), colour, { light: 0.2, rim: 0.35, rimWidth: 1.6, ao: 0 })
}
/** A round fruit: a sphere with a highlight and a dark underside. */
export function fruit(c: Canvas, cx: number, cy: number, rx: number, colour: RGB, ry = rx): void {
  form(c, ellipse(cx, cy, rx, ry), colour, { light: 0.55, rim: 0.3, rimWidth: Math.max(1.5, rx * 0.25), ao: 0.15 })
  c.fill(ellipse(cx - rx * 0.35, cy - ry * 0.4, rx * 0.28, ry * 0.2), [1, 1, 1, 0.55], 'atop')
}
/** A grass clump at a foot: blades fanning up, dark at the root. */
export function grassClump(c: Canvas, cx: number, cy: number, spread: number, height: number, seed: number, n = 12, palette = { root: hex('#3d7030'), tip: hex('#9ccc62') }): void {
  const r = stream(seed)
  for (let i = 0; i < n; i++) {
    const x = cx + (r() - 0.5) * spread, h = height * (0.5 + r() * 0.5), lean = (r() - 0.5) * height * 0.5
    c.fill(capsule(x, cy, x + lean, cy - h, 1.6, 0.3), (px, py) => [...mix(palette.root, palette.tip, smooth(cy, cy - h, py)), 1] as RGBA)
  }
}
