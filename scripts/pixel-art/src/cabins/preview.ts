// The cabins' review sheets (CY14): icon contact sheets on night and light grounds (the six lines as sets, then the
// keepsakes and gifts), the room-size pieces by line, and a mock 640 × 360 cabin with one full line placed by its
// frames' `mount` and `foot`. The room is drawn here only for review; the game draws its own.
import { hex } from '../color.ts'
import { Img } from '../tiles/image.ts'
import { ICON, ROOM_SIZE, type Drawn, type RoomFrame } from './atlas.ts'
import { DECOR_COLORS, DECOR_STYLES, FURNITURE, GIFTS, KEEPSAKES, LINE_SLOTS, type Style } from './items.ts'
import { mix } from './kit.ts'

export const NIGHT = '#0d0b1a'
export const LIGHT = '#efe9df'
const CELL: Record<string, string> = { [NIGHT]: '#16132a', [LIGHT]: '#e4ddd0' }
const PAD = 8

/** The icon rows: each style's line of five, then the keepsakes, then the gifts in two rows of six. */
export function iconRows(): string[][] {
  return [
    ...DECOR_STYLES.map((s) => FURNITURE.filter((f) => f.style === s).map((f) => f.id)),
    KEEPSAKES.map((k) => k.id),
    GIFTS.slice(0, 6).map((g) => g.id),
    GIFTS.slice(6).map((g) => g.id),
  ]
}

export function iconSheet(icons: ReadonlyMap<string, Drawn>, scale: number, ground: string): Img {
  const rows = iconRows(), cell = ICON * scale, cols = Math.max(...rows.map((r) => r.length))
  const sheet = new Img(cols * (cell + PAD) + PAD, rows.length * (cell + PAD) + PAD).fill(hex(ground))
  rows.forEach((row, r) => row.forEach((id, c) => {
    const x = PAD + c * (cell + PAD), y = PAD + r * (cell + PAD)
    sheet.copy(new Img(cell, cell).fill(hex(CELL[ground] ?? ground)), x, y)
    sheet.draw(icons.get(id)!.img.scaled(scale), x, y)
  }))
  return sheet
}

/** The room-size pieces: one row per style, Bed, Desk, Floor then Wall and Light, standing on a common baseline. */
export function roomSheet(room: ReadonlyMap<string, Drawn>, scale: number): Img {
  const rowH = 150 * scale, widths = LINE_SLOTS.map((s) => ROOM_SIZE[s] * scale)
  const order = ['bed', 'desk', 'floor', 'wall', 'light'] as const
  const width = widths.reduce((a, b) => a + b + PAD, PAD)
  const sheet = new Img(width, DECOR_STYLES.length * (rowH + PAD) + PAD).fill(hex(NIGHT))
  DECOR_STYLES.forEach((style, r) => {
    let x = PAD
    const y = PAD + r * (rowH + PAD)
    for (const slot of order) {
      const n = ROOM_SIZE[slot] * scale, f = FURNITURE.find((it) => it.style === style && it.slot === slot)!
      const top = y + rowH - n
      sheet.copy(new Img(n, n).fill(hex(CELL[NIGHT]!)), x, top)
      sheet.draw(room.get(f.id)!.img.scaled(scale), x, top)
      x += n + PAD
    }
  })
  return sheet
}

export const ROOM_W = 640, ROOM_H = 360, FLOOR_Y = 252

/** A plain code-drawn cabin: a paneled wall tinted by the style, a round window on the night, a planked floor. */
function cabin(style: Style): Img {
  const room = new Img(ROOM_W, ROOM_H)
  const [base] = DECOR_COLORS[style]
  const wallTop = mix('#100d22', base, .3), wallLow = mix('#1a1634', base, .35)
  for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) {
    let c: string
    if (y < 6) c = '#07060f'
    else if (y < FLOOR_Y) {
      c = mix(wallTop, wallLow, y / FLOOR_Y)
      if (x % 80 === 0 || y === 128) c = mix(c, '#000000', .35)
      if (x % 80 === 1 || y === 129) c = mix(c, '#ffffff', .05)
    } else if (y < FLOOR_Y + 4) c = '#0a0816'
    else {
      const t = (y - FLOOR_Y) / (ROOM_H - FLOOR_Y)
      c = mix('#14112a', '#1d1936', t)
      const seamYs = [262, 274, 290, 311, 338]
      const slant = ((x - 320) * (y - 140)) / ((ROOM_H - 140) * 1)
      if (seamYs.includes(y) || Math.abs(((slant % 64) + 64) % 64) < .9) c = mix(c, '#000000', .3)
    }
    room.set(x, y, hex(c))
  }
  // The window: a round port onto the night, a planet's limb glowing in it.
  const cx = 320, cy = 112, r = 58
  for (let y = cy - r - 6; y <= cy + r + 6; y++) for (let x = cx - r - 6; x <= cx + r + 6; x++) {
    const d = Math.hypot(x - cx, y - cy)
    if (d <= r) {
      let c = mix('#05060f', '#141a44', (y - (cy - r)) / (2 * r))
      const planet = Math.hypot(x - (cx + 40), y - (cy + 70))
      if (planet < 64) c = mix('#2a1f4a', '#6a4aa0', Math.max(0, 1 - planet / 64) * .7)
      if (Math.abs(planet - 64) < 1.4) c = '#b8a0ff'
      if ((x * 7 + y * 13) % 97 === 0 && planet > 66) c = '#e8ecff'
      room.set(x, y, hex(c))
    } else if (d <= r + 6) room.set(x, y, hex(d < r + 2 ? '#3a3f52' : d > r + 4.6 ? '#0b0a14' : '#262a3a'))
  }
  // A small ledge for the keepsake.
  for (let y = 198; y < 204; y++) for (let x = 404; x < 470; x++) room.set(x, y, hex(y === 198 ? '#4a4660' : y > 201 ? '#141222' : '#2c2940'))
  return room
}

export const KEEPSAKE_SPOT = { x: 405, ledge: 198 }

/**
 * One full line placed in the cabin by its frames: floor pieces by `foot` (the rug centred on the floor, the desk
 * behind, the bed in front), the wall piece on the wall above the bed, the light from the ceiling (or on the wall for
 * a sconce), and a keepsake icon on the ledge.
 */
export function diorama(style: Style, room: ReadonlyMap<string, Drawn>, frames: Record<string, RoomFrame>, keepsake: Drawn): Img {
  const img = cabin(style)
  const piece = (slot: string) => FURNITURE.find((f) => f.style === style && f.slot === slot)!
  const put = (id: string, x: number, y: number) => img.draw(room.get(id)!.img, x, y)
  const rug = piece('floor'), desk = piece('desk'), bed = piece('bed'), wall = piece('wall'), light = piece('light')
  put(rug.id, 172, 300 - 75)
  const df = frames[desk.id]!.foot
  put(desk.id, 472, 324 - df.y)
  const bf = frames[bed.id]!.foot
  put(bed.id, 12, 342 - bf.y)
  put(wall.id, 40, 40)
  const lf = frames[light.id]!
  put(light.id, 516, lf.mount === 'ceiling' ? 4 : 64)
  img.draw(keepsake.img, KEEPSAKE_SPOT.x, KEEPSAKE_SPOT.ledge - 57)
  return img
}
