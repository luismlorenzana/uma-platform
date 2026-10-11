// Dish kit: the tableware every cooked dish sits on (plates, stands, bowls, boards, skillets, cloths, skewers) and small
// helpers for garnish, steam and cast shadows. Builds on the pantry kit used by the refined items.
import { hex, ramp } from '../color.ts'
import type { ItemIcon } from '../items/types.ts'
import { GOLD, SILVER, WOOD, bounds, box, capsule, copy, roundBox, spans, type Tones } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'

export { GOLD, SILVER, WOOD }
export type { Tones }

export type DishKind = 'planet' | 'duo' | 'feast'

/** One dish icon: its catalog identity (uma-rpg dish ids) plus the painter. */
export interface Dish extends ItemIcon {
  kind: DishKind
  /** The farming family a planet dish belongs to. */
  family?: string
}

// ---------------------------------------------------------------------------------------------------------------
// Materials

export const PORCELAIN = ramp('#e2ddd4', { lift: 0.5, drop: 0.2, hueShift: 10, satShift: 0.02 })
export const CREAMWARE = ramp('#e6d3a8', { lift: 0.45, drop: 0.22, hueShift: 8 })
export const CLAY = ramp('#b4643a', { lift: 0.3, drop: 0.26 })
export const SLATE = ramp('#56606f', { lift: 0.3, drop: 0.3, hueShift: 4 })
export const IRON = ramp('#4a4850', { lift: 0.3, drop: 0.32, hueShift: 4 })
export const COBALT = ramp('#3561b8', { lift: 0.36, drop: 0.28 })
export const CELADON = ramp('#86bfa0', { lift: 0.4, drop: 0.26 })
export const TEAL = ramp('#2f8f8a', { lift: 0.36 })
export const LACQUER = ramp('#a2271f', { lift: 0.36, drop: 0.3, hueShift: 6 })
export const LINEN = ramp('#e8dcc0', { lift: 0.4, drop: 0.22, hueShift: 6 })
export const RED_CLOTH = ramp('#c4433a', { lift: 0.32 })
export const BUTTER = ramp('#f6dc7a', { lift: 0.45, hueShift: 6 })
export const CREAM = ramp('#f4ecd8', { lift: 0.45, drop: 0.2, hueShift: 6 })
export const RICE = ramp('#eeeae0', { lift: 0.5, drop: 0.18, hueShift: 10 })

// ---------------------------------------------------------------------------------------------------------------
// Helpers

/** Flat 3/4-view lighting for a lit top surface: brighter toward the top left. */
export function litTone(x: number, y: number, cx: number, cy: number, rx: number, ry: number, hi = 5, lo = 3): number {
  const t = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
  return t < -0.9 ? hi : t < 0.7 ? Math.min(hi, lo + 1) : lo
}

/** Darkens pixels just below-right of `mask` that are not in it: the object's shadow on what it rests on. */
export function castShadow(s: Sprite, mask: Mask, dx = 1, dy = 1, amount = -1): void {
  const done = new Set<number>()
  mask.each((x, y) => {
    const tx = x + dx, ty = y + dy
    const k = ty * 32 + tx
    if (mask.get(tx, ty) || done.has(k) || !s.filled(tx, ty)) return
    done.add(k)
    s.shift(tx, ty, amount)
  })
}

/** True if (x, y) is empty and not where the render will put an outline. */
export function isOpen(s: Sprite, x: number, y: number): boolean {
  if (!s.inside(x, y) || s.filled(x, y)) return false
  return !(s.filled(x - 1, y) || s.filled(x + 1, y) || s.filled(x, y - 1) || s.filled(x, y + 1))
}

/** Rising steam: two or three soft wisps of translucent white over the empty canvas. */
export function steam(s: Sprite, wisps: readonly (readonly [number, number, number])[], alpha = 120): void {
  for (const [x0, y0, h] of wisps) {
    for (let i = 0; i < h; i++) {
      const x = x0 + Math.round(Math.sin(i * 1.1 + x0) * 0.9)
      const y = y0 - i
      if (isOpen(s, x, y)) s.overlay(x, y, hex('#f4f8ff', Math.round(alpha * (1 - (i / h) * 0.75))))
    }
  }
}

/** A small dome-shaded ellipse (leaf, berry, bean). */
export function blob(s: Sprite, cx: number, cy: number, rx: number, ry: number, rot: number, id: number, o: { bias?: number; contact?: boolean } = {}): Mask {
  const m = Mask.ellipse(cx, cy, rx, ry, rot)
  shadeDome(s, m, id, { contact: o.contact ?? false, bias: o.bias ?? 0.08 })
  return m
}

// ---------------------------------------------------------------------------------------------------------------
// Tableware

export interface PlateSpec {
  cx?: number
  cy?: number
  rx?: number
  ry?: number
  tones: Tones
  /** Thickness of the visible front edge, px. */
  depth?: number
  /** Size of the inner well relative to the plate (0 for a flat board or tray). */
  well?: number
  /** A painted ring around the rim. */
  band?: Tones
  /** A gilded or silvered outer edge. */
  edge?: Tones
  /** A pedestal under the plate (cake stand): height in px. */
  stand?: number
  /** Ramp for the pedestal (defaults to the plate's). */
  standTones?: Tones
}

export interface Plate {
  top: Mask
  well: Mask
  id: number
  cx: number
  cy: number
  rx: number
  ry: number
}

/** A round plate seen from a little above: a lit rim, a shallow well, a dark front edge, optionally on a pedestal. */
export function plate(s: Sprite, o: PlateSpec): Plate {
  const cx = o.cx ?? 16, cy = o.cy ?? 21, rx = o.rx ?? 11, ry = o.ry ?? 5
  const id = s.addRamp(o.tones)
  const top = Mask.ellipse(cx, cy, rx, ry)
  const depth = o.depth ?? 1
  if (o.stand) {
    const sid = o.standTones ? s.addRamp(o.standTones) : id
    const y0 = Math.round(cy + ry + depth - 1)
    const footY = y0 + o.stand
    const foot = Mask.ellipse(cx, footY, rx * 0.42, 1.8)
    Mask.ellipse(cx, footY + 1, rx * 0.42, 1.8).subtract(foot).each((x, y) => s.paint(x, y, sid, 1))
    foot.each((x, y) => s.paint(x, y, sid, litTone(x, y, cx, footY, rx * 0.42, 1.8, 4, 2)))
    const stem = Mask.from((px, py) => py >= y0 && py <= footY - 0.5 && Math.abs(px - cx) <= 1.6 + Math.max(0, py - footY + 2) * 0.8)
    stem.each((x, y) => s.paint(x, y, sid, x + 0.5 < cx - 0.6 ? 4 : x + 0.5 < cx + 1 ? 3 : 2))
  }
  for (let d = 1; d <= depth; d++) {
    Mask.ellipse(cx, cy + d, rx - 0.25 * d, ry).subtract(top).each((x, y) => {
      const t = (x + 0.5 - (cx - rx)) / (2 * rx)
      s.paint(x, y, id, d === depth ? (t < 0.3 ? 2 : 1) : t < 0.25 ? 3 : t < 0.7 ? 2 : 1)
    })
  }
  top.each((x, y) => {
    const ul = !top.get(x, y - 1) || !top.get(x - 1, y)
    const dr = !top.get(x, y + 1) || !top.get(x + 1, y)
    const left = x + 0.5 < cx + rx * 0.1
    s.paint(x, y, id, ul && y + 0.5 < cy && left ? 5 : dr && !left ? 3 : 4)
  })
  const w = o.well ?? 0.7
  const well = w > 0 ? Mask.ellipse(cx + 0.2, cy + 0.25, rx * w, ry * w) : copy(top)
  if (w > 0) {
    well.each((x, y) => {
      const up = !well.get(x, y - 1)
      const dn = !well.get(x, y + 1) || !well.get(x + 1, y)
      s.paint(x, y, id, up && y + 0.5 < cy ? 2 : dn && x + 0.5 > cx - rx * 0.2 ? 4 : 3)
    })
  }
  if (o.band) {
    const bid = s.addRamp(o.band)
    const r0 = w + (1 - w) * 0.3, r1 = w + (1 - w) * 0.72
    top.each((x, y) => {
      if (well.get(x, y)) return
      const r = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
      if (r >= r0 && r <= r1) s.paint(x, y, bid, x + 0.5 < cx - rx * 0.3 ? 4 : 3)
    })
  }
  if (o.edge) {
    const eid = s.addRamp(o.edge)
    top.each((x, y) => {
      if (top.get(x - 1, y) && top.get(x + 1, y) && top.get(x, y - 1) && top.get(x, y + 1)) return
      s.paint(x, y, eid, litTone(x, y, cx, cy, rx, ry, 5, 3))
    })
    for (let d = 1; d <= depth; d++)
      Mask.ellipse(cx, cy + d, rx - 0.25 * d, ry).subtract(top).each((x, y) => {
        if (d === 1 || y > cy + ry) s.paint(x, y, eid, x + 0.5 < cx - rx * 0.4 ? 3 : 2)
      })
  }
  return { top, well, id, cx, cy, rx, ry }
}

/** A rectangular board or tray in 3/4 view: a top face and a front edge `depth` px deep. Returns the top face. */
export function slab(s: Sprite, x0: number, y0: number, x1: number, y1: number, tones: Tones, o: { depth?: number; corner?: number; grain?: boolean; lip?: Tones } = {}): { top: Mask; id: number } {
  const id = s.addRamp(tones)
  const depth = o.depth ?? 2
  const top = roundBox(x0, y0, x1, y1, o.corner ?? 1)
  roundBox(x0, y1 - 1, x1, y1 + depth, o.corner ?? 1).subtract(top).each((x, y) => {
    const t = (x - x0) / Math.max(1, x1 - x0)
    s.paint(x, y, id, y === y1 + depth ? 1 : t < 0.2 ? 3 : 2)
  })
  top.each((x, y) => s.paint(x, y, id, y === y0 || x === x0 ? 4 : x === x1 || y === y1 ? 2 : 3))
  s.paint(x0 + 1, y0, id, 5)
  s.paint(x0 + 2, y0, id, 5)
  if (o.grain) {
    for (let y = y0 + 2; y < y1; y += 2) {
      const a = x0 + 2 + ((y * 7) % 5), b = Math.min(x1 - 2, a + 4 + ((y * 3) % 6))
      for (let x = a; x <= b; x++) s.paint(x, y, id, 2)
    }
  }
  if (o.lip) {
    const lid = s.addRamp(o.lip)
    top.each((x, y) => {
      if (top.get(x - 1, y) && top.get(x + 1, y) && top.get(x, y - 1) && top.get(x, y + 1)) return
      s.paint(x, y, lid, y === y0 || x === x0 ? 5 : x === x1 || y === y1 ? 3 : 4)
    })
  }
  return { top, id }
}

export interface BowlSpec {
  cx?: number
  /** Rim center y and half extents. */
  rim?: number
  rx?: number
  ry?: number
  /** How far the bowl hangs below the rim. */
  depth?: number
  tones: Tones
  /** A foot ring under the bowl, px tall. */
  foot?: number
  /** Painted bands: [ramp, rows below the rim from, to]. */
  bands?: readonly (readonly [Tones, number, number])[]
  /** A gilded lip. */
  gilt?: Tones
  /** Handles on both sides (soup bowl). */
  handles?: boolean
}

export interface Bowl {
  body: Mask
  /** The opening (where contents go). */
  opening: Mask
  id: number
  cx: number
  rim: number
  rx: number
  ry: number
}

/**
 * A bowl seen from a little above: a dome-shaded body hanging below an elliptical rim, the inner wall dark at the back.
 * Fill the opening afterwards (`fillBowl`).
 */
export function bowlBody(s: Sprite, o: BowlSpec): Bowl {
  const cx = o.cx ?? 16, rim = o.rim ?? 17.5, rx = o.rx ?? 10, ry = o.ry ?? 3.8, depth = o.depth ?? 8
  const id = s.addRamp(o.tones)
  if (o.handles) {
    for (const side of [-1, 1]) {
      const hx = cx + side * (rx + 0.6)
      const h = Mask.ellipse(hx, rim + 1.6, 2, 1.4).subtract(Mask.ellipse(hx + side * 0.2, rim + 1.6, 0.9, 0.5))
      h.each((x, y) => s.paint(x, y, id, y + 0.5 < rim + 1.4 ? (side < 0 ? 4 : 3) : 2))
    }
  }
  const outer = Mask.ellipse(cx, rim, rx, depth)
  const body = Mask.from((px, py) => py >= rim && outer.get(Math.floor(px), Math.floor(py))).union(Mask.ellipse(cx, rim, rx, ry))
  if (o.foot) {
    const b = bounds(body)
    const fw = rx * 0.45
    body.union(box(Math.round(cx - fw), b.y1 - 1, Math.round(cx + fw) - 1, b.y1 + o.foot - 1))
  }
  shadeDome(s, body, id, { relief: 0.9, contact: false })
  for (const [tones, a, b] of o.bands ?? []) {
    const bid = s.addRamp(tones)
    body.each((x, y) => {
      if (y >= rim + a && y <= rim + b && !Mask.ellipse(cx, rim, rx, ry).get(x, y)) s.paint(x, y, bid, s.toneAt(x, y))
    })
  }
  const opening = Mask.ellipse(cx, rim, rx - 1.2, ry - 0.9)
  opening.each((x, y) => s.paint(x, y, id, y + 0.5 < rim ? 1 : 2))
  // The front lip catches the light, bright on the left.
  const lipId = o.gilt ? s.addRamp(o.gilt) : id
  Mask.ellipse(cx, rim, rx, ry).each((x, y) => {
    if (opening.get(x, y)) return
    const t = (x + 0.5 - (cx - rx)) / (2 * rx)
    const back = y + 0.5 < rim
    s.paint(x, y, lipId, back ? (t < 0.5 ? 4 : 3) : t < 0.4 ? 5 : t < 0.78 ? 4 : 3)
  })
  return { body, opening, id, cx, rim, rx, ry }
}

/**
 * Fills a bowl's opening: a heap rising `mound` px above the rim (0 for a liquid surface). `pick` chooses the ramp per
 * pixel. Returns the contents mask.
 */
export function fillBowl(s: Sprite, b: Bowl, pick: number | ((x: number, y: number) => number), o: { mound?: number; bias?: number; relief?: number; inset?: number } = {}): Mask {
  const mound = o.mound ?? 0
  const inset = o.inset ?? 1.4
  let m: Mask
  if (mound > 0) {
    const heap = Mask.ellipse(b.cx, b.rim, b.rx - inset, b.ry - 0.8 + mound)
    m = Mask.from((px, py) => py < b.rim && heap.get(Math.floor(px), Math.floor(py))).union(Mask.ellipse(b.cx, b.rim - 0.2, b.rx - inset, b.ry - 0.9))
  } else m = Mask.ellipse(b.cx, b.rim + 0.4, b.rx - inset - 0.2, b.ry - 1.3)
  shadeDome(s, m, pick, { contact: false, bias: o.bias ?? 0.05, relief: o.relief ?? (mound > 0 ? 0.8 : 0.35) })
  return m
}

/** A cast-iron skillet with a handle to the right. Returns the inside (to fill). */
export function skillet(s: Sprite, cx: number, cy: number, rx: number, ry: number, tones: Tones = IRON): { inside: Mask; id: number } {
  const id = s.addRamp(tones)
  const handle = capsule(cx + rx - 0.5, cy + 0.6, cx + rx + 5, cy - 1.4, 1.1)
  handle.each((x, y) => s.paint(x, y, id, handle.get(x, y - 1) ? 2 : 3))
  Mask.ellipse(cx, cy + 1.6, rx, ry).subtract(Mask.ellipse(cx, cy, rx, ry)).each((x, y) => s.paint(x, y, id, x + 0.5 < cx - rx * 0.5 ? 2 : 1))
  const top = Mask.ellipse(cx, cy, rx, ry)
  top.each((x, y) => s.paint(x, y, id, litTone(x, y, cx, cy, rx, ry, 4, 3)))
  const inside = Mask.ellipse(cx + 0.1, cy + 0.2, rx - 1.1, ry - 0.9)
  inside.each((x, y) => s.paint(x, y, id, 1))
  return { inside, id }
}

export type Pattern = 'plain' | 'gingham' | 'stripes' | 'check'

/** A cloth or napkin laid flat in 3/4 view (a parallelogram), with a woven pattern and a little fold at the front. */
export function cloth(s: Sprite, pts: readonly (readonly [number, number])[], base: Tones, o: { accent?: Tones; pattern?: Pattern; hem?: boolean } = {}): Mask {
  const id = s.addRamp(base)
  const acc = s.addRamp(o.accent ?? LINEN)
  const m = Mask.polygon(pts)
  const pattern = o.pattern ?? 'plain'
  const b = bounds(m)
  m.each((x, y) => {
    const edge = !m.get(x, y - 1) || !m.get(x - 1, y)
    const low = !m.get(x, y + 1) || !m.get(x + 1, y)
    let tone = edge ? 4 : low ? 2 : 3
    let r = id
    if (pattern === 'gingham') {
      const a = Math.floor((x - b.x0) / 2) % 2 === 0, c = Math.floor((y - b.y0) / 2) % 2 === 0
      if (a && c) r = acc
      else if (a || c) tone = Math.max(1, tone - (edge ? 0 : 1)) + (edge ? 0 : 1)
      if (!a && !c) tone = Math.max(2, tone - 1)
    } else if (pattern === 'stripes') {
      if ((x - b.x0) % 4 < 1) r = acc
    } else if (pattern === 'check') {
      if ((Math.floor((x - b.x0) / 2) + Math.floor((y - b.y0) / 2)) % 2 === 0) r = acc
    }
    s.paint(x, y, r, tone)
  })
  if (o.hem) {
    const sp = spans(m)
    const last = Math.max(...sp.keys())
    const row = sp.get(last)
    if (row) for (let x = row[0]; x <= row[1]; x++) if ((x & 1) === 0) s.paint(x, last + 1, acc, 2)
  }
  return m
}

/** A wooden skewer from (x0, y0) to (x1, y1), its pointed end at (x1, y1). */
export function skewer(s: Sprite, x0: number, y0: number, x1: number, y1: number, tones: Tones = ramp('#d8b37a', { lift: 0.3 })): number {
  const id = s.addRamp(tones)
  const m = capsule(x0, y0, x1, y1, 0.55)
  m.each((x, y) => s.paint(x, y, id, m.get(x, y - 1) ? 2 : 4))
  return id
}

/** A rounded rod (ladle handle, chopstick, quill) from (x0, y0) to (x1, y1), lit along its upper edge. */
export function capsuleLine(s: Sprite, x0: number, y0: number, x1: number, y1: number, r: number, id: number): Mask {
  const m = capsule(x0, y0, x1, y1, r)
  m.each((x, y) => s.paint(x, y, id, !m.get(x, y - 1) || !m.get(x - 1, y) ? 5 : !m.get(x, y + 1) ? 2 : 3))
  return m
}
