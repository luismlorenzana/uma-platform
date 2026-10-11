// Building kit: 48×48 map sprites in classic 3/4 overworld view (roofs from above, front faces head-on, no side
// faces). Tops are lit, fronts take the base tone, right edges and undersides fall into shadow, light from the top left.
import { hex, ramp, type RampOptions } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome, type DomeOptions, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'

export const SIZE = 48
/** The ground contact line: objects stand on row GROUND - 1. Published as each frame's anchorY. */
export const GROUND = 44
export const BASE = GROUND - 1

export const M = {
  from: (test: (px: number, py: number) => boolean) => Mask.from(test, SIZE, SIZE),
  /** Inclusive integer pixel rectangle. */
  rect: (x0: number, y0: number, x1: number, y1: number) => Mask.from((px, py) => px > x0 && px < x1 + 1 && py > y0 && py < y1 + 1, SIZE, SIZE),
  ellipse: (cx: number, cy: number, rx: number, ry: number, rot = 0) => Mask.ellipse(cx, cy, rx, ry, rot, SIZE, SIZE),
  circle: (cx: number, cy: number, r: number) => Mask.circle(cx, cy, r, SIZE, SIZE),
  poly: (pts: readonly Point[]) => Mask.polygon(pts, SIZE, SIZE),
  empty: () => new Mask(SIZE, SIZE),
}

/** Adds a six-tone ramp and returns its id. */
export function col(s: Sprite, base: string, o?: RampOptions): number {
  return s.addRamp(ramp(base, o))
}

export function fill(s: Sprite, m: Mask, id: number, tone: number): Mask {
  m.each((x, y) => s.paint(x, y, id, tone))
  return m
}

export function rect(s: Sprite, id: number, x0: number, y0: number, x1: number, y1: number, tone: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.paint(x, y, id, tone)
}

export function hline(s: Sprite, id: number, x0: number, x1: number, y: number, tone: number): void {
  for (let x = x0; x <= x1; x++) s.paint(x, y, id, tone)
}

export function vline(s: Sprite, id: number, x: number, y0: number, y1: number, tone: number): void {
  for (let y = y0; y <= y1; y++) s.paint(x, y, id, tone)
}

/** A one-pixel line between two points (Bresenham). */
export function line(s: Sprite, id: number, x0: number, y0: number, x1: number, y1: number, tone: number | ((k: number) => number)): void {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy, x = x0, y = y0, k = 0
  for (;;) {
    s.paint(x, y, id, typeof tone === 'number' ? tone : tone(k++))
    if (x === x1 && y === y1) break
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
}

export function erase(s: Sprite, x: number, y: number): void {
  if (s.inside(x, y)) s.mat[y * s.w + x] = -1
}

/** Shifts every painted pixel of `m` by `delta` tones. */
export function shiftMask(s: Sprite, m: Mask, delta: number): void {
  m.each((x, y) => s.shift(x, y, delta))
}

export function dome(s: Sprite, m: Mask, id: number | ((x: number, y: number) => number), o: DomeOptions = {}): Mask {
  shadeDome(s, m, id, o)
  return m
}

/** Seeded painted cells of `m` at or above `minTone`. */
export function pick(s: Sprite, seed: string, m: Mask, count: number, minTone = 1): [number, number][] {
  const r = rng(seed)
  const cells: [number, number][] = []
  m.each((x, y) => {
    if (s.toneAt(x, y) >= minTone) cells.push([x, y])
  })
  const out: [number, number][] = []
  for (let i = 0; i < count && cells.length > 0; i++) out.push(cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0])
  return out
}

/**
 * Lights a solid silhouette as a 3/4 object: lit top rows and left edge, base front, shaded right edge and bottom row.
 */
export function slab(s: Sprite, m: Mask, id: number | ((x: number, y: number) => number), o: { lit?: number; dark?: number; top?: number } = {}): Mask {
  const lit = o.lit ?? 1, dark = o.dark ?? 1, top = o.top ?? 1
  const cells: [number, number, number][] = []
  m.each((x, y) => {
    let l = x, r = x
    while (m.get(l - 1, y)) l--
    while (m.get(r + 1, y)) r++
    let tone = x - l < lit ? 4 : r - x < dark ? 2 : 3
    let open = 0
    while (open < top && m.get(x, y - open - 1)) open++
    if (open < top) tone = x - l < lit ? 5 : 4
    if (!m.get(x, y + 1)) tone = Math.min(tone, 2)
    cells.push([x, y, tone])
  })
  for (const [x, y, tone] of cells) s.paint(x, y, typeof id === 'number' ? id : id(x, y), tone)
  return m
}

/** Soft translucent glow, strongest at the centre, over object and empty canvas alike. */
export function glow(s: Sprite, cx: number, cy: number, rx: number, ry: number, color: string, alpha: number): void {
  const c = hex(color)
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
      if (d < 1) s.overlay(x, y, [c[0], c[1], c[2], Math.round(alpha * (1 - d) ** 1.5)])
    }
}

export function dot(s: Sprite, x: number, y: number, color: string, alpha = 255): void {
  s.overlay(x, y, hex(color, alpha))
}

// ---------------------------------------------------------------------------------------------------------------
// Walls

export type WallTexture = 'plain' | 'clapboard' | 'boards' | 'logs' | 'stone' | 'brick' | 'plaster'

/**
 * A front wall face, rows `top`..`bot`. The top row sits in the roof's shadow. Textures are drawn a tone darker.
 */
export function wall(s: Sprite, id: number, x0: number, x1: number, top: number, bot: number, tex: WallTexture = 'plain', seed = 'wall'): void {
  const r = rng(seed)
  for (let y = top; y <= bot; y++)
    for (let x = x0; x <= x1; x++) {
      let tone = x === x0 ? 4 : x === x1 ? 2 : 3
      const fromBot = bot - y
      if (tex === 'clapboard' && fromBot % 3 === 2) tone = 2
      if (tex === 'clapboard' && fromBot % 3 === 1 && x !== x1) tone = 4
      if (tex === 'boards' && (x - x0) % 4 === 3) tone = 2
      if (tex === 'logs') tone = [2, 3, 4][fromBot % 3] ?? 3
      s.paint(x, y, id, tone)
    }
  if (tex === 'stone' || tex === 'brick') {
    const course = tex === 'brick' ? 2 : 3
    const len = tex === 'brick' ? 4 : 5
    for (let y = bot; y >= top; y -= course + 1) {
      const row = Math.round((bot - y) / (course + 1))
      // The mortar line above each course.
      if (y - course >= top) hline(s, id, x0, x1, y - course, 2)
      let x = x0 + ((row * (tex === 'brick' ? 2 : 3)) % len) - len
      while (x <= x1) {
        const w = tex === 'brick' ? len : len - 1 + Math.floor(r() * 3)
        if (x >= x0 && x <= x1) for (let k = 0; k < course; k++) if (y - k >= top) s.paint(x, y - k, id, 2)
        // A lit top-left corner on each stone.
        if (x + 1 >= x0 && x + 1 <= x1 && y - course + 1 >= top) s.paint(x + 1, y - course + 1, id, 4)
        x += w
      }
    }
    vline(s, id, x0, top, bot, 4)
    vline(s, id, x1, top, bot, 2)
  }
  if (tex === 'plaster') for (const [x, y] of pick(s, seed, M.rect(x0 + 1, top + 1, x1 - 1, bot), Math.floor(((x1 - x0) * (bot - top)) / 18), 3)) s.shift(x, y, -1)
  // Shadow under the eave.
  hline(s, id, x0, x1, top, 1)
}

/** Log ends poking out at both corners of a log wall, every third row. */
export function logEnds(s: Sprite, endId: number, x0: number, x1: number, top: number, bot: number): void {
  for (let y = bot - 1; y > top; y -= 3) {
    s.paint(x0 - 1, y, endId, 4)
    s.paint(x0 - 1, y - 1, endId, 5)
    s.paint(x1 + 1, y, endId, 3)
    s.paint(x1 + 1, y - 1, endId, 4)
  }
}

/** A plinth of stone along the bottom of a wall. */
export function plinth(s: Sprite, id: number, x0: number, x1: number, top: number, bot: number): void {
  wall(s, id, x0, x1, top, bot, 'stone', `plinth-${x0}-${top}`)
  hline(s, id, x0, x1, top, 4)
}

export interface WindowOptions {
  /** Warm lit glass instead of dark glass. */
  lit?: boolean
  arch?: boolean
  shutters?: number
  /** A sill one pixel wider than the window. */
  sill?: boolean
  mullion?: boolean
}

/** A window: frame (tone 4), glass with a reflection in the top-left pane, optional shutters and sill. */
export function window(s: Sprite, frame: number, glass: number, x: number, y: number, w: number, h: number, o: WindowOptions = {}): void {
  rect(s, frame, x - 1, y - 1, x + w, y + h, 4)
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) {
      let tone = o.lit ? (yy === y ? 3 : 4) : yy === y ? 1 : 2
      if (!o.lit && xx === x && yy === y + 1) tone = 4
      s.paint(xx, yy, glass, tone)
    }
  if (o.arch) {
    erase(s, x - 1, y - 1)
    erase(s, x + w, y - 1)
    s.paint(x, y - 1, frame, 4)
    s.paint(x + w - 1, y - 1, frame, 4)
    s.paint(x - 1, y, frame, 3)
    s.paint(x + w, y, frame, 3)
    if (w > 2) for (let xx = x + 1; xx < x + w - 1; xx++) s.paint(xx, y - 2, frame, 4)
    if (w > 2) for (let xx = x + 1; xx < x + w - 1; xx++) s.paint(xx, y - 1, glass, o.lit ? 3 : 1)
    s.paint(x, y, frame, 4)
    s.paint(x + w - 1, y, frame, 3)
  }
  if (o.mullion && w >= 3) {
    vline(s, frame, x + Math.floor(w / 2), y, y + h - 1, 3)
    if (h >= 4) hline(s, frame, x, x + w - 1, y + Math.floor(h / 2), 3)
  }
  if (o.shutters !== undefined) {
    vline(s, o.shutters, x - 2, y - 1, y + h, 3)
    vline(s, o.shutters, x + w + 1, y - 1, y + h, 2)
  }
  if (o.sill) hline(s, frame, x - 2, x + w + 1, y + h, 5)
}

export interface DoorOptions {
  arch?: boolean
  /** Opened: a dark interior instead of planks. */
  open?: boolean
  frame?: number
  /** Number of leaves (1 or 2). */
  leaves?: number
}

/** A door standing on `bot`: planks with a lit left edge, a shadowed top row and a knob. */
export function door(s: Sprite, id: number, x: number, bot: number, w: number, h: number, o: DoorOptions = {}): void {
  const top = bot - h + 1
  if (o.frame !== undefined) {
    vline(s, o.frame, x - 1, top - 1, bot, 4)
    vline(s, o.frame, x + w, top - 1, bot, 2)
    hline(s, o.frame, x - 1, x + w, top - 1, 4)
  }
  for (let y = top; y <= bot; y++)
    for (let xx = x; xx < x + w; xx++) {
      let tone = o.open ? (y < top + 2 ? 1 : 1) : (xx - x) % 2 === 1 ? 2 : 3
      if (!o.open && xx === x) tone = 4
      if (y === top) tone = 1
      s.paint(xx, y, id, tone)
    }
  if (o.arch) {
    erase(s, x, top)
    erase(s, x + w - 1, top)
    if (o.frame !== undefined) {
      erase(s, x - 1, top - 1)
      erase(s, x + w, top - 1)
      s.paint(x, top, o.frame, 4)
      s.paint(x + w - 1, top, o.frame, 3)
      s.paint(x - 1, top, o.frame, 4)
      s.paint(x + w, top, o.frame, 2)
    }
  }
  if ((o.leaves ?? 1) === 2) vline(s, id, x + Math.floor(w / 2) - (w % 2 === 0 ? 1 : 0), top + 1, bot, 1)
  if (!o.open) s.paint(x + w - 2, bot - Math.floor(h / 2), id, 5)
}

// ---------------------------------------------------------------------------------------------------------------
// Roofs

export type RoofTexture = 'shingle' | 'tile' | 'thatch' | 'slate' | 'plank' | 'plain'

function roofTone(tex: RoofTexture, x: number, row: number, base: number, noise: () => number): number {
  switch (tex) {
    case 'shingle':
      if (row % 3 === 2) return base - 1
      if (row % 3 === 0 && (x + Math.floor(row / 3) * 2) % 4 === 0) return base - 1
      return base
    case 'tile': {
      const k = (x + 300) % 3
      if (row % 4 === 3) return base - 1
      return k === 0 ? base + 1 : k === 2 ? base - 1 : base
    }
    case 'thatch': {
      const n = noise()
      if (row % 4 === 3) return n < 0.6 ? base - 1 : base
      return n > 0.78 ? base + 1 : n < 0.2 ? base - 1 : base
    }
    case 'slate':
      if (row % 3 === 2) return base - 1
      if ((x + (Math.floor(row / 3) % 2) * 2) % 4 === 0 && row % 3 !== 2) return base - 1
      return base
    case 'plank':
      // Boards two rows deep, with staggered butt joints.
      if (row % 2 === 1) return base - 1
      return (x + Math.floor(row / 2) * 5) % 9 === 0 ? base - 1 : base
    case 'plain':
      return base
  }
}

export interface SideRoofOptions {
  /** Rows of back slope visible above the ridge. */
  back?: number
  tex?: RoofTexture
  seed?: string
  /** A separate ramp for the ridge cap. */
  ridge?: number
}

/**
 * A side-gabled roof (ridge parallel to the front): a lit strip of back slope, the ridge, and the big front slope
 * down to the eave. Columns `x0`..`x1` should include the overhang.
 */
export function roofSide(s: Sprite, id: number, x0: number, x1: number, ridge: number, eave: number, o: SideRoofOptions = {}): void {
  const back = o.back ?? 2
  const tex = o.tex ?? 'shingle'
  const noise = rng(o.seed ?? `roof-${x0}-${ridge}`)
  for (let y = ridge - back; y < ridge; y++)
    for (let x = x0 + (y === ridge - back ? 1 : 0); x <= x1 - (y === ridge - back ? 1 : 0); x++) s.paint(x, y, id, x === x0 ? 5 : 4)
  for (let x = x0; x <= x1; x++) s.paint(x, ridge, o.ridge ?? id, x === x1 ? 3 : (o.ridge !== undefined ? 4 : 5))
  for (let y = ridge + 1; y <= eave; y++)
    for (let x = x0; x <= x1; x++) {
      let tone = roofTone(tex, x, y - ridge - 1, 3, noise)
      if (x === x0) tone = Math.max(tone, 4)
      if (x === x1) tone = Math.min(tone, 2)
      if (y === eave) tone = Math.min(tone, 2)
      s.paint(x, y, id, tone)
    }
  if (tex === 'thatch') {
    // A ragged eave.
    for (let x = x0; x <= x1; x++) if ((noise() < 0.45)) s.paint(x, eave + 1, id, 2)
  }
}

export interface HipRoofOptions extends SideRoofOptions {
  /** Horizontal inset of the ridge from each end. */
  inset: number
}

/** A hipped roof: lit left hip, shaded right hip, front slope between them. */
export function roofHip(s: Sprite, id: number, x0: number, x1: number, ridge: number, eave: number, o: HipRoofOptions): void {
  const tex = o.tex ?? 'shingle'
  const noise = rng(o.seed ?? `hip-${x0}-${ridge}`)
  const back = o.back ?? 1
  const h = eave - ridge
  const left = (y: number) => x0 + (o.inset * (eave - y)) / h
  const right = (y: number) => x1 - (o.inset * (eave - y)) / h
  for (let y = ridge - back; y < ridge; y++)
    for (let x = Math.ceil(left(ridge) + 1); x <= Math.floor(right(ridge) - 1); x++) s.paint(x, y, id, 4)
  for (let y = ridge; y <= eave; y++) {
    const l = left(y), r = right(y)
    for (let x = x0; x <= x1; x++) {
      const c = x + 0.5
      if (c < l - 0.5 || c > r + 0.5) {
        // Hips: the triangles at each end.
        const inLeft = c >= x0 && x <= Math.floor(l)
        const inRight = c <= x1 + 1 && x >= Math.ceil(r)
        if (inLeft && y > ridge) s.paint(x, y, id, (y - ridge) % 3 === 2 ? 4 : 5)
        else if (inRight && y > ridge) s.paint(x, y, id, (y - ridge) % 3 === 2 ? 1 : 2)
        continue
      }
      let tone = y === ridge ? 5 : roofTone(tex, x, y - ridge - 1, 3, noise)
      if (y === eave) tone = Math.min(tone, 2)
      s.paint(x, y, id, tone)
    }
  }
}

/**
 * A front-gabled roof (ridge running toward the viewer): two sloped planes rising from the eaves at x0/x1 to the
 * apex, extended back by `depth` rows. Returns a mask of the gable triangle under the front edge, for the wall.
 */
export function roofGable(s: Sprite, id: number, x0: number, x1: number, eave: number, rise: number, depth: number, o: { tex?: RoofTexture; seed?: string; trim?: number; wallTop?: number } = {}): Mask {
  const cx = (x0 + x1 + 1) / 2
  const half = (x1 + 1 - x0) / 2
  const edge = (px: number) => eave + 1 - rise + (Math.abs(px - cx) / half) * rise
  const noise = rng(o.seed ?? `gable-${x0}-${eave}`)
  const tex = o.tex ?? 'shingle'
  const gable = M.empty()
  for (let y = 0; y < SIZE; y++)
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5
      const e = edge(px)
      if (py <= e && py >= e - depth - 1) {
        const leftSide = px < cx
        const onRidge = Math.abs(px - cx) < 0.6
        const fromEdge = e - py
        let tone = leftSide ? 4 : 2
        if (onRidge) tone = 5
        else if (fromEdge < 1.4) tone = leftSide ? 3 : 1
        else {
          // Courses run front to back: vertical seams.
          const k = Math.floor(Math.abs(px - cx))
          if (tex !== 'plain' && k % 3 === 2) tone -= 1
          if (tex === 'thatch' && noise() < 0.25) tone += noise() < 0.5 ? -1 : 1
        }
        if (o.trim !== undefined && fromEdge < 1.4 && !onRidge) s.paint(x, y, o.trim, leftSide ? 4 : 3)
        else s.paint(x, y, id, tone)
      } else if (py > e && (o.wallTop === undefined || py < o.wallTop)) gable.set(x, y)
    }
  return gable
}

/** A conical roof: lit left flank, shaded right flank, curved shingle courses, a rounded eave. */
export function roofCone(s: Sprite, id: number, cx: number, half: number, eave: number, height: number, o: { flare?: number; courses?: boolean } = {}): Mask {
  const apex = eave - height
  const flare = o.flare ?? 1.5
  const m = M.from((px, py) => {
    if (py < apex || py > eave + flare + 0.5) return false
    const t = (py - apex) / height
    const w = half * Math.pow(Math.min(1, t), 0.85)
    const dx = px - cx
    if (Math.abs(dx) > w) return false
    // A rounded bottom edge: an ellipse arc.
    const arc = eave + flare * Math.sqrt(Math.max(0, 1 - (dx / half) ** 2))
    return py <= arc
  })
  m.each((x, y) => {
    const t = (x + 0.5 - cx) / half
    let tone = t < -0.55 ? 4 : t < -0.1 ? 4 : t < 0.35 ? 3 : t < 0.75 ? 2 : 1
    if (t < -0.55 && y < eave - height * 0.4) tone = 5
    const arcRow = y - apex - Math.round(2 * (1 - t * t))
    if (o.courses !== false && arcRow > 2 && arcRow % 4 === 0) tone -= 1
    if (!m.get(x, y + 1)) tone = Math.min(tone, 2)
    s.paint(x, y, id, tone)
  })
  return m
}

/** Crenellations along a wall top: merlons with lit tops, gaps cut out. */
export function battlements(s: Sprite, id: number, x0: number, x1: number, y: number, merlon = 3, gap = 2, h = 2): void {
  for (let x = x0, k = 0; x <= x1; k++) {
    const w = Math.min(merlon, x1 - x + 1)
    for (let yy = y - h; yy < y; yy++) for (let xx = x; xx < x + w; xx++) s.paint(xx, yy, id, yy === y - h ? 5 : xx === x ? 4 : xx === x + w - 1 ? 2 : 3)
    x += w + gap
  }
}

/** A chimney: lit top, front face, a dark flue. Returns the point where smoke should rise. */
export function chimney(s: Sprite, id: number, x: number, top: number, bot: number, w = 4): { x: number; y: number } {
  for (let y = top; y <= bot; y++) for (let xx = x; xx < x + w; xx++) s.paint(xx, y, id, xx === x ? 4 : xx === x + w - 1 ? 2 : 3)
  hline(s, id, x - 1, x + w, top, 4)
  hline(s, id, x, x + w - 1, top - 1, 4)
  hline(s, id, x + 1, x + w - 2, top - 1, 1)
  if ((bot - top) > 4) hline(s, id, x, x + w - 1, top + 3, 2)
  return { x: x + w / 2, y: top - 1 }
}

// ---------------------------------------------------------------------------------------------------------------
// Ground pieces and props

/**
 * A raised patch of ground (a field plot, a platform): a lit top face and a front lip `lip` rows thick.
 */
export function patch(s: Sprite, top: Mask, id: number, lip = 2, topTone = 3): void {
  const lipCells: [number, number, number][] = []
  top.each((x, y) => {
    for (let k = 1; k <= lip; k++) if (!top.get(x, y + k)) lipCells.push([x, y + k, k === lip ? 1 : 2])
  })
  top.each((x, y) => s.paint(x, y, id, topTone))
  for (const [x, y, t] of lipCells) if (!top.get(x, y)) s.paint(x, y, id, t)
}

/** A fence: posts every `every` px with two rails. */
export function fence(s: Sprite, id: number, x0: number, x1: number, bot: number, o: { every?: number; h?: number } = {}): void {
  const every = o.every ?? 4
  const h = o.h ?? 5
  for (const ry of [bot - h + 2, bot - 1]) hline(s, id, x0, x1, ry, 4)
  for (const ry of [bot - h + 3, bot]) hline(s, id, x0, x1, ry, 2)
  for (let x = x0; x <= x1; x += every) {
    vline(s, id, x, bot - h, bot, 3)
    s.paint(x, bot - h, id, 5)
  }
}

/** A barrel: a short cylinder lit from the left, its lid seen from above, two hoops. */
export function barrel(s: Sprite, wood: number, hoop: number, cx: number, bot: number, w = 6, h = 7): void {
  const x0 = Math.round(cx - w / 2), x1 = x0 + w - 1, top = bot - h + 1
  // Staves bulge a pixel past the lid and the foot.
  const m = M.rect(x0, top + 1, x1, bot - 1).union(M.rect(x0 + 1, top, x1 - 1, bot))
  m.each((x, y) => {
    const t = (x + 0.5 - cx) / (w / 2)
    s.paint(x, y, wood, t < -0.45 ? 4 : t < 0.35 ? 3 : 2)
  })
  hline(s, wood, x0 + 1, x1 - 1, top, 5)
  for (const hy of [top + 2, bot - 1]) for (let x = x0; x <= x1; x++) s.paint(x, hy, hoop, x - x0 < 2 ? 4 : 2)
}

/** A wooden crate in 3/4 view: a lit lid and a front face with a frame and a diagonal brace. */
export function crate(s: Sprite, id: number, x: number, bot: number, w: number, h: number, lid = 2): void {
  const top = bot - h + 1
  rect(s, id, x, top, x + w - 1, top + lid - 1, 4)
  hline(s, id, x, x + w - 1, top, 5)
  for (let y = top + lid; y <= bot; y++)
    for (let xx = x; xx < x + w; xx++) {
      const edge = xx === x || xx === x + w - 1 || y === top + lid || y === bot
      s.paint(xx, y, id, edge ? (xx === x + w - 1 ? 2 : 4) : 2)
    }
  line(s, id, x + 1, bot - 1, x + w - 2, top + lid + 1, 3)
  hline(s, id, x, x + w - 1, top + lid, 3)
}

/** A sack: a lumpy dome with a tied neck. */
export function sack(s: Sprite, id: number, cx: number, bot: number, w = 6, h = 7): void {
  const body = M.ellipse(cx, bot - h * 0.38 + 0.5, w / 2, h * 0.42).union(M.rect(Math.round(cx - w / 2 + 1), bot - 1, Math.round(cx + w / 2 - 2), bot))
  dome(s, body, id, { contact: false, bias: 0.1 })
  const nx = Math.round(cx - 0.5)
  s.paint(nx, bot - h + 2, id, 2)
  s.paint(nx, bot - h + 1, id, 4)
  s.paint(nx + 1, bot - h + 1, id, 3)
  s.paint(nx - 1, bot - h + 1, id, 4)
}

/** A round tree: a canopy of lit leaf clumps on a short trunk. Returns the canopy mask. */
export function roundTree(s: Sprite, leaf: number, bark: number, cx: number, bot: number, r: number, trunk: number, seed: string, o: { lobes?: number; squash?: number; trunkW?: number } = {}): Mask {
  const tw = o.trunkW ?? 3
  const squash = o.squash ?? 1
  const cy = bot - trunk - r * squash + 1
  const tx = Math.round(cx - tw / 2)
  for (let y = Math.round(cy); y <= bot; y++)
    for (let x = tx; x < tx + tw; x++) s.paint(x, y, bark, x === tx ? 4 : x === tx + tw - 1 ? 2 : 3)
  // Root flare.
  s.paint(tx - 1, bot, bark, 3)
  s.paint(tx + tw, bot, bark, 2)
  const rnd = rng(seed)
  const canopy = M.ellipse(cx, cy, r, r * squash)
  const n = o.lobes ?? 6
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.5
    canopy.union(M.ellipse(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62 * squash, r * 0.48, r * 0.48 * squash))
  }
  dome(s, canopy, leaf, { contact: false, relief: 1.1 })
  // Leaf clumps: short dark arcs under lit bumps.
  const clumps = pick(s, `${seed}-clumps`, canopy, Math.round(r * 1.6), 3)
  for (const [x, y] of clumps) {
    if (canopy.get(x, y + 1) && canopy.get(x + 1, y + 1)) {
      s.shift(x, y + 1, -1)
      s.shift(x + 1, y + 1, -1)
      s.shift(x, y, 1)
    }
  }
  // Shadow of the canopy on the trunk.
  for (let x = tx; x < tx + tw; x++) {
    const y = Math.round(cy + r * squash)
    if (!canopy.get(x, y)) s.paint(x, y, bark, 1)
  }
  return canopy
}

/** A conifer: tiers of drooping boughs, lit on the left. */
export function pine(s: Sprite, leaf: number, bark: number, cx: number, bot: number, h: number, half: number, o: { tiers?: number; trunk?: number } = {}): Mask {
  const tiers = o.tiers ?? 3
  const trunk = o.trunk ?? 3
  const tx = Math.round(cx - 1)
  for (let y = bot - trunk; y <= bot; y++) {
    s.paint(tx, y, bark, 4)
    s.paint(tx + 1, y, bark, 2)
  }
  const top = bot - h + 1
  const crown = bot - trunk
  const all = M.empty()
  for (let i = 0; i < tiers; i++) {
    const t0 = top + ((crown - top) * i) / (tiers + 0.6)
    const t1 = top + ((crown - top) * (i + 1.6)) / (tiers + 0.6)
    const w = half * (0.45 + (0.55 * (i + 1)) / tiers)
    const tier = M.from((px, py) => {
      if (py < t0 || py > t1 + 1) return false
      const f = (py - t0) / (t1 - t0)
      const dx = Math.abs(px - cx)
      // Drooping tips: the lower edge curves down toward the outside.
      const lower = t1 - 1.6 + (dx / w) * 1.6
      return dx <= w * Math.min(1, f + 0.08) && py <= lower + 1
    })
    tier.each((x, y) => {
      const t = (x + 0.5 - cx) / w
      let tone = t < -0.5 ? 4 : t < 0 ? 4 : t < 0.45 ? 3 : 2
      if (y < t0 + 2 && t < 0.2) tone = 5
      if (!tier.get(x, y + 1)) tone = Math.max(1, tone - 2)
      s.paint(x, y, leaf, tone)
    })
    all.union(tier)
  }
  return all
}

/** A rough boulder lit as a dome, flattened at the bottom. */
export function boulder(s: Sprite, id: number, cx: number, bot: number, rx: number, ry: number, o: DomeOptions = {}): Mask {
  const m = M.ellipse(cx, bot - ry + 1, rx, ry).subtract(M.rect(0, bot + 1, SIZE - 1, SIZE - 1))
  dome(s, m, id, { relief: 0.8, contact: true, ...o })
  return m
}

/** Water seen from above: a shaded band under the far bank, ripple glints. */
export function water(s: Sprite, m: Mask, id: number, seed: string, bank?: number): void {
  m.each((x, y) => {
    let tone = 3
    if (!m.get(x, y - 1) || !m.get(x, y - 2)) tone = 2
    if (!m.get(x, y + 1)) tone = 4
    s.paint(x, y, id, tone)
    if (bank !== undefined && !m.get(x, y - 1)) s.paint(x, y, bank, 2)
  })
  const r = rng(seed)
  const cells: [number, number][] = []
  m.each((x, y) => {
    if (m.get(x - 1, y) && m.get(x + 2, y) && m.get(x, y - 3) && m.get(x, y + 1)) cells.push([x, y])
  })
  for (let i = 0; i < Math.max(2, Math.round(cells.length / 40)) && cells.length; i++) {
    const [x, y] = cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0]
    s.paint(x, y, id, 5)
    s.paint(x + 1, y, id, 4)
  }
}

/** A prism crystal: lit left facet, shaded right facet, a bright tip. */
export function crystal(s: Sprite, id: number, bx: number, by: number, w: number, h: number, lean = 0): Mask {
  const tipX = bx + lean, tipY = by - h
  const half = w / 2
  const body: Point[] = [
    [bx - half, by],
    [bx - half + lean * 0.75, by - h * 0.7],
    [tipX, tipY],
    [bx + half + lean * 0.75, by - h * 0.7],
    [bx + half, by],
  ]
  const m = M.poly(body)
  m.each((x, y) => {
    // Which side of the central ridge line (base centre → tip)?
    const t = (y + 0.5 - by) / (tipY - by)
    const ridgeX = bx + (tipX - bx) * t
    const d = x + 0.5 - ridgeX
    let tone = d < -half * 0.35 ? 5 : d < 0 ? 4 : d < half * 0.5 ? 3 : 2
    if (t > 0.78) tone = d < 0.2 ? 5 : 3
    s.paint(x, y, id, tone)
  })
  return m
}

