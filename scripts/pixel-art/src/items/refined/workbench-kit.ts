// Shared helpers for the Workbench (refined gathering) families: a tiny 3D projector for cut solids (ingots, blocks,
// planks, cloth), cylinder shading for rolls, glow halos and seeded texture marks.
import { hex } from '../../color.ts'
import { rng } from '../../rng.ts'
import { LIGHT, Mask, normalize, type Point, type Vec3 } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'

export type V3 = readonly [number, number, number]

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// ---------------------------------------------------------------- 2D basics

export function fill(s: Sprite, m: Mask, id: number, tone: number): void {
  m.each((x, y) => s.paint(x, y, id, tone))
}

/** Pixels of a line (Bresenham) between two integer points. */
export function linePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = []
  let x = Math.round(x0), y = Math.round(y0)
  const xe = Math.round(x1), ye = Math.round(y1)
  const dx = Math.abs(xe - x), dy = -Math.abs(ye - y)
  const sx = x < xe ? 1 : -1, sy = y < ye ? 1 : -1
  let err = dx + dy
  for (;;) {
    out.push([x, y])
    if (x === xe && y === ye) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return out
}

/** Bounding box of a mask: [minX, minY, maxX, maxY]. */
export function bounds(m: Mask): [number, number, number, number] {
  let x0 = 99, y0 = 99, x1 = -1, y1 = -1
  m.each((x, y) => {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  })
  return [x0, y0, x1, y1]
}

/** Shifts the tone of `count` seeded pixels of `m` whose tone is at least `minTone`. */
export function speckle(s: Sprite, seed: string, m: Mask, count: number, minTone: number, delta = -1, maxTone = 5): void {
  const r = rng(seed)
  const cells: [number, number][] = []
  m.each((x, y) => {
    const t = s.toneAt(x, y)
    if (t >= minTone && t <= maxTone) cells.push([x, y])
  })
  for (let i = 0; i < count && cells.length > 0; i++) {
    const [x, y] = cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0]
    s.shift(x, y, delta)
  }
}

/** The mask of every painted pixel of the sprite. */
export function paintedMask(s: Sprite): Mask {
  const m = new Mask(s.w, s.h)
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.filled(x, y)) m.set(x, y)
  return m
}

/**
 * A soft glow: translucent pixels on the empty canvas around everything painted so far, fading over `reach` pixels.
 * The outline ring (distance 1) gets the strongest tint, so the object seems lit from within.
 */
export function halo(s: Sprite, color: string | ((x: number, y: number) => string), alpha = 90, reach = 2): void {
  const painted = paintedMask(s)
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (painted.get(x, y)) continue
      let best = 99
      for (let dy = -reach; dy <= reach; dy++)
        for (let dx = -reach; dx <= reach; dx++) if (painted.get(x + dx, y + dy)) best = Math.min(best, Math.hypot(dx, dy))
      if (best > reach + 0.2) continue
      const a = best <= 1 ? alpha : best <= 1.5 ? alpha * 0.6 : alpha * 0.32
      s.overlay(x, y, hex(typeof color === 'string' ? color : color(x, y), Math.round(a)))
    }
}

/** Translucent light over painted pixels near a point, strongest at the center. */
export function bloom(s: Sprite, cx: number, cy: number, radius: number, color: string, alpha = 120): void {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++)
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius
      if (d > 1 || !s.filled(x, y)) continue
      s.overlay(x, y, hex(color, Math.round(alpha * (1 - d * d))))
    }
}

// ---------------------------------------------------------------- 3D solids

/** A parallel projection: screen = origin + M · world (x right, y away from the viewer, z up), with the eye and light in world space. */
export interface View {
  m: readonly [Vec3, Vec3]
  ox: number
  oy: number
  /** Unit vector toward the viewer. */
  eye: Vec3
  /** Unit vector toward the light. */
  light: Vec3
}

/** Turntable camera: `yaw` turns the object (degrees, positive sends +x away), `pitch` is the elevation (degrees). */
export function turntable(yaw: number, pitch: number, ox: number, oy: number): View {
  const a = (yaw * Math.PI) / 180, f = (pitch * Math.PI) / 180
  const c = Math.cos(a), sn = Math.sin(a), sf = Math.sin(f), cf = Math.cos(f)
  const right: Vec3 = [c, -sn, 0], up: Vec3 = [sn * sf, c * sf, cf], eye: Vec3 = [-sn * cf, -c * cf, sf]
  const [lx, ly, lz] = LIGHT
  const light = normalize([lx * right[0] - ly * up[0] + lz * eye[0], lx * right[1] - ly * up[1] + lz * eye[1], lx * right[2] - ly * up[2] + lz * eye[2]])
  return { m: [right, [-up[0], -up[1], -up[2]]], ox, oy, eye, light }
}

/**
 * Oblique (cabinet) projection: fronts stay square to the screen, depth recedes up and to the right by (kx, ky) per
 * unit, and heights shrink by kz. Pixel-friendly: horizontal edges stay horizontal.
 */
export function oblique(ox: number, oy: number, kx = 0.5, ky = 0.5, kz = 1): View {
  return {
    m: [[1, kx, 0], [0, -ky, -kz]],
    ox,
    oy,
    eye: normalize([kx, -1, ky / kz]),
    light: normalize([-0.5, -0.45, 0.75]),
  }
}

export function project(v: View, p: V3): Point {
  const [a, b] = v.m
  return [v.ox + a[0] * p[0] + a[1] * p[1] + a[2] * p[2], v.oy + b[0] * p[0] + b[1] * p[1] + b[2] * p[2]]
}

export interface Face {
  pts: V3[]
  tag?: string
}

export interface PaintedFace {
  tag: string
  pts: V3[]
  poly: Point[]
  mask: Mask
  light: number
  tone: number
}

function newell(pts: readonly V3[]): Vec3 {
  let nx = 0, ny = 0, nz = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] ?? [0, 0, 0], b = pts[(i + 1) % pts.length] ?? [0, 0, 0]
    nx += (a[1] - b[1]) * (a[2] + b[2])
    ny += (a[2] - b[2]) * (a[0] + b[0])
    nz += (a[0] - b[0]) * (a[1] + b[1])
  }
  return normalize([nx, ny, nz])
}

const center = (pts: readonly V3[]): Vec3 => {
  const c: Vec3 = [0, 0, 0]
  for (const p of pts) for (let k = 0; k < 3; k++) c[k] = (c[k] ?? 0) + (p[k] ?? 0) / pts.length
  return c
}

export interface SolidOptions {
  /** Tone of the best-lit visible face. */
  hi?: number
  /** Tone of the darkest visible face. */
  lo?: number
  /** Fixed tones by face tag (overrides the light ladder). */
  tones?: Record<string, number>
  /** A ramp per face tag. */
  ramps?: Record<string, number>
}

/**
 * Paints a convex solid. Faces facing away are culled; the rest are toned on a ladder from `hi` (best lit) to `lo`
 * (darkest) by their light, and painted far to near. Returns the visible faces, near last.
 */
export function paintSolid(s: Sprite, v: View, faces: readonly Face[], rampId: number, o: SolidOptions = {}): PaintedFace[] {
  const all = faces.flatMap((f) => f.pts)
  const mid = center(all)
  const visible: (PaintedFace & { z: number })[] = []
  faces.forEach((f, i) => {
    let n = newell(f.pts)
    const c = center(f.pts)
    if (dot(n, [c[0] - mid[0], c[1] - mid[1], c[2] - mid[2]]) < 0) n = [-n[0], -n[1], -n[2]]
    if (dot(n, v.eye) <= 0.02) return
    const poly = f.pts.map((p) => project(v, p))
    visible.push({ tag: f.tag ?? `f${i}`, pts: f.pts, poly, mask: Mask.polygon(poly), light: dot(n, v.light), tone: 3, z: dot(c, v.eye) })
  })
  const hi = o.hi ?? 4, lo = o.lo ?? 2
  const lights = visible.map((f) => f.light)
  const min = Math.min(...lights), max = Math.max(...lights)
  for (const f of visible) {
    const t = max - min < 1e-6 ? 1 : (f.light - min) / (max - min)
    f.tone = o.tones?.[f.tag] ?? Math.round(lo + t * (hi - lo))
  }
  visible.sort((a, b) => a.z - b.z)
  // Seal hairline gaps between faces with the silhouette first.
  const sil = new Mask()
  for (const f of visible) sil.union(f.mask)
  const hull = Mask.polygon(convexHull(visible.flatMap((f) => f.poly)))
  hull.each((x, y) => {
    if (!sil.get(x, y)) {
      const near = visible.find((f) => f.mask.get(x - 1, y) || f.mask.get(x + 1, y) || f.mask.get(x, y - 1) || f.mask.get(x, y + 1))
      if (near) s.paint(x, y, o.ramps?.[near.tag] ?? rampId, near.tone)
    }
  })
  for (const f of visible) fill(s, f.mask, o.ramps?.[f.tag] ?? rampId, f.tone)
  return visible
}

export function convexHull(points: readonly Point[]): Point[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Point[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2] ?? p, lower[lower.length - 1] ?? p, p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Point[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i] ?? [0, 0]
    while (upper.length >= 2 && cross(upper[upper.length - 2] ?? p, upper[upper.length - 1] ?? p, p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

/** A box (or a frustum when the top is smaller), centered on x/y, standing on z = z0. Tags: top, bottom, +x, -x, +y, -y. */
export function frustum(bx: number, by: number, tx: number, ty: number, h: number, at: V3 = [0, 0, 0], topShift: readonly [number, number] = [0, 0]): Face[] {
  const [x0, y0, z0] = at
  const b = (sx: number, sy: number): V3 => [x0 + (sx * bx) / 2, y0 + (sy * by) / 2, z0]
  const t = (sx: number, sy: number): V3 => [x0 + topShift[0] + (sx * tx) / 2, y0 + topShift[1] + (sy * ty) / 2, z0 + h]
  return [
    { tag: 'top', pts: [t(-1, -1), t(1, -1), t(1, 1), t(-1, 1)] },
    { tag: 'bottom', pts: [b(-1, -1), b(-1, 1), b(1, 1), b(1, -1)] },
    { tag: '-y', pts: [b(-1, -1), b(1, -1), t(1, -1), t(-1, -1)] },
    { tag: '+y', pts: [b(1, 1), b(-1, 1), t(-1, 1), t(1, 1)] },
    { tag: '-x', pts: [b(-1, 1), b(-1, -1), t(-1, -1), t(-1, 1)] },
    { tag: '+x', pts: [b(1, -1), b(1, 1), t(1, 1), t(1, -1)] },
  ]
}

/** A regular prism standing on z0 with `n` sides; tags: top, bottom, s0…s(n-1). */
export function prism(n: number, r: number, h: number, at: V3 = [0, 0, 0], turn = 0): Face[] {
  const [x0, y0, z0] = at
  const ring = (z: number): V3[] =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i + turn) / n) * Math.PI * 2
      return [x0 + Math.cos(a) * r, y0 + Math.sin(a) * r, z] as V3
    })
  const lo = ring(z0), hi = ring(z0 + h)
  const faces: Face[] = [
    { tag: 'top', pts: hi },
    { tag: 'bottom', pts: [...lo].reverse() },
  ]
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    faces.push({ tag: `s${i}`, pts: [lo[i] ?? [0, 0, 0], lo[j] ?? [0, 0, 0], hi[j] ?? [0, 0, 0], hi[i] ?? [0, 0, 0]] })
  }
  return faces
}

/** A point on a quad face by bilinear (u along p0→p1, w along p0→p3). */
export function onQuad(pts: readonly V3[], u: number, w: number): V3 {
  const zero: V3 = [0, 0, 0]
  const a = pts[0] ?? zero, b = pts[1] ?? zero, c = pts[2] ?? zero, d = pts[3] ?? zero
  const lerp = (p: V3, q: V3, t: number): V3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]
  return lerp(lerp(a, b, u), lerp(d, c, u), w)
}

/** Screen pixel of a 3D point. */
export function pixelOf(v: View, p: V3): [number, number] {
  const [x, y] = project(v, p)
  return [Math.floor(x), Math.floor(y)]
}

// ---------------------------------------------------------------- rolls

export interface Cylinder {
  /** Center of the visible (near) end cap. */
  ax: number
  ay: number
  /** Center of the far end. */
  bx: number
  by: number
  /** Radius across the axis. */
  r: number
  /** Half-width of the end ellipse along the axis. */
  cap: number
}

/** Geometry helpers for a cylinder lying on screen: axis coordinate t (0 at A, 1 at B) and signed offset d (−1…1). */
export function cylinderFrame(c: Cylinder): (px: number, py: number) => { t: number; d: number; len: number; along: number } {
  const dx = c.bx - c.ax, dy = c.by - c.ay
  const len = Math.hypot(dx, dy)
  const ux = dx / len, uy = dy / len
  return (px, py) => {
    const qx = px - c.ax, qy = py - c.ay
    const along = qx * ux + qy * uy
    const across = -qx * uy + qy * ux
    return { t: along / len, d: across / c.r, len, along }
  }
}

/** Masks of a lying cylinder: the body (with a rounded far end) and the near end cap. */
export function cylinderMasks(c: Cylinder): { body: Mask; cap: Mask; all: Mask } {
  const frame = cylinderFrame(c)
  const body = Mask.from((px, py) => {
    const { d, along, len } = frame(px, py)
    if (Math.abs(d) > 1) return false
    const e = Math.sqrt(Math.max(0, 1 - d * d)) * c.cap
    return along >= -e && along <= len + e
  })
  const cap = Mask.from((px, py) => {
    const { d, along } = frame(px, py)
    return (along / c.cap) ** 2 + d * d <= 1
  })
  return { body, cap, all: new Mask().union(body, cap) }
}

/** Tone of a cylinder's side at offset d (−1 top … 1 bottom), with the light from the top left. */
export function cylinderTone(d: number, axisAngle: number): number {
  const nd = Math.max(-1, Math.min(1, d))
  // Surface normal across the axis, rotated to screen.
  const a = axisAngle
  const nx = -Math.sin(a) * nd, ny = Math.cos(a) * nd, nz = Math.sqrt(Math.max(0, 1 - nd * nd))
  const l = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]
  if (l > 0.93) return 5
  if (l > 0.74) return 4
  if (l > 0.42) return 3
  if (l > 0.12) return 2
  return 1
}

