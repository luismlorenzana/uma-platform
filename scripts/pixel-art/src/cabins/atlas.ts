// The two cabin families (CY14, P164): `cabin-icons`, all 48 items at 64 px in the item table's order, eight across, and
// `cabin-room`, the 30 furniture pieces at room size (Bed, Desk, Floor 150 px; Wall, Light 96 px), one row per slot in
// style order. Every piece is drawn by the same painter at each size, natively.
import { Img } from '../tiles/image.ts'
import { BEDS } from './beds.ts'
import { DESKS } from './desks.ts'
import { FLOORS } from './floors.ts'
import { GIFT_ART } from './gifts.ts'
import { DECOR_STYLES, FURNITURE, ITEMS, LINE_SLOTS, type Furniture, type Item, type LineSlot, type Style } from './items.ts'
import { KEEPSAKE_ART } from './keepsakes.ts'
import { Pen, type Painter } from './kit.ts'
import { LIGHT_MOUNT, LIGHTS } from './lights.ts'
import { WALLS } from './walls.ts'

export const ICON = 64
export const ICON_COLUMNS = 8
export const ROOM_SIZE: Record<LineSlot, number> = { bed: 150, desk: 150, floor: 150, wall: 96, light: 96 }
export type Mount = 'floor' | 'wall' | 'ceiling'

const PAINTERS: Record<LineSlot, Record<Style, Painter>> = { bed: BEDS, desk: DESKS, wall: WALLS, floor: FLOORS, light: LIGHTS }

export function painter(item: Item): Painter {
  if (item.kind === 'furniture') return PAINTERS[item.slot][item.style]
  const art = item.kind === 'keepsake' ? KEEPSAKE_ART[item.id] : GIFT_ART[item.id]
  if (!art) throw new Error(`No painter for ${item.id}`)
  return art
}

export const mountOf = (f: Furniture): Mount => (f.slot === 'wall' ? 'wall' : f.slot === 'light' ? LIGHT_MOUNT[f.style] : 'floor')

export interface Drawn { img: Img; filled: Uint8Array }

/** Draws an item at `size` px: the RGBA image and which pixels are solid (painted, not shadow, halo or wash). */
export function draw(item: Item, size: number): Drawn {
  const p = new Pen(size)
  painter(item)(p)
  const px = p.finish(), filled = new Uint8Array(size * size)
  for (let i = 0; i < filled.length; i++) filled[i] = (p.s.mat[i] ?? -1) >= 0 ? 1 : 0
  return { img: new Img(size, size, px), filled }
}

export const drawIcon = (item: Item): Img => draw(item, ICON).img

export interface Foot { x: number; y: number; w: number }

/**
 * Where a piece meets the floor, in its cell: the lowest solid row and the span of the solid pixels in its two lowest
 * rows. A rug lies flat, so its footprint is the whole cell (its bottom row, full width). For a wall or ceiling piece
 * it is the piece's bottom edge, for spacing it above the furniture.
 */
export function footOf(f: Furniture, d: Drawn): Foot {
  const n = d.img.w
  if (f.slot === 'floor') return { x: 0, y: n - 1, w: n }
  let bottom = -1
  for (let i = 0; i < d.filled.length; i++) if (d.filled[i]) bottom = Math.floor(i / n)
  let x0 = n, x1 = -1
  for (let y = Math.max(0, bottom - 1); y <= bottom; y++) for (let x = 0; x < n; x++) if (d.filled[y * n + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x) }
  return { x: x0, y: bottom, w: x1 - x0 + 1 }
}

export interface IconFrame { x: number; y: number; w: number; h: number; name: string; kind: Item['kind']; slot?: string; style?: Style; gift?: string }
export interface RoomFrame { x: number; y: number; w: number; h: number; name: string; slot: LineSlot; style: Style; mount: Mount; foot: Foot }

export function packIcons(): { atlas: Img; frames: Record<string, IconFrame>; drawn: Map<string, Drawn> } {
  const rows = Math.ceil(ITEMS.length / ICON_COLUMNS)
  const atlas = new Img(ICON_COLUMNS * ICON, rows * ICON)
  const frames: Record<string, IconFrame> = {}, drawn = new Map<string, Drawn>()
  ITEMS.forEach((item, i) => {
    const d = draw(item, ICON), x = (i % ICON_COLUMNS) * ICON, y = Math.floor(i / ICON_COLUMNS) * ICON
    atlas.copy(d.img, x, y)
    drawn.set(item.id, d)
    const base = { x, y, w: ICON, h: ICON, name: item.name, kind: item.kind }
    frames[item.id] = item.kind === 'furniture' ? { ...base, slot: item.slot, style: item.style } : item.kind === 'keepsake' ? { ...base, slot: item.slot } : { ...base, gift: item.gift }
  })
  return { atlas, frames, drawn }
}

/** The room sheet: one row per slot (beds, desks, floors at 150; walls, lights at 96), styles left to right. */
export function roomLayout(): { width: number; height: number; at: (f: Furniture) => { x: number; y: number } } {
  const tops: Partial<Record<LineSlot, number>> = {}
  let y = 0
  for (const slot of ['bed', 'desk', 'floor', 'wall', 'light'] as const) { tops[slot] = y; y += ROOM_SIZE[slot] }
  const width = Math.max(...LINE_SLOTS.map((s) => ROOM_SIZE[s] * DECOR_STYLES.length))
  return { width, height: y, at: (f) => ({ x: DECOR_STYLES.indexOf(f.style) * ROOM_SIZE[f.slot], y: tops[f.slot]! }) }
}

export function packRoom(): { atlas: Img; frames: Record<string, RoomFrame>; drawn: Map<string, Drawn> } {
  const layout = roomLayout()
  const atlas = new Img(layout.width, layout.height)
  const frames: Record<string, RoomFrame> = {}, drawn = new Map<string, Drawn>()
  // Frames in the room sheet's reading order: row by row.
  const order = (['bed', 'desk', 'floor', 'wall', 'light'] as const).flatMap((slot) => FURNITURE.filter((f) => f.slot === slot))
  for (const f of order) {
    const n = ROOM_SIZE[f.slot], d = draw(f, n), { x, y } = layout.at(f)
    atlas.copy(d.img, x, y)
    drawn.set(f.id, d)
    frames[f.id] = { x, y, w: n, h: n, name: f.name, slot: f.slot, style: f.style, mount: mountOf(f), foot: footOf(f, d) }
  }
  return { atlas, frames, drawn }
}
