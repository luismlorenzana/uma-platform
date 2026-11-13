// The town kits (uma-quest Q32, P147): the Warrior kit's 32 frames drawn in code in each region's look. One set of
// drawings takes a region's style: its street, its walls and roofs, its windows and door, its cloth and lamps, and its
// tree, well and fence. Lit from the top front-left, no text (signs are pictograms), no Uma art.
import { hex, mix, shade, smooth, type RGB, type RGBA } from '../color.js'
import { contact, foliage, form, fruit, leaf, stem, wood, type Clump } from '../form.js'
import { doorway, footing, shutters, strap, windowFrame } from '../farm/buildings.js'
import { fillAt, scatter } from '../farm/ground.js'
import { box, clumps, trunk } from '../farm/props.js'
import { fbm, hash, stream } from '../noise.js'
import { Canvas, capsule, circle, ellipse, fading, intersect, linear, poly, rect, rough, union, type Shape } from '../paint.js'
import {
  courseTexel, crack, flagTexel, grassyLip, kerbLip, patch, plankTexel, riser, roof, roofTexel, stairs, T, tufts, variantFloor, wall,
  type StonePalette,
} from '../common/surfaces.js'

export interface TownStyle {
  id: 'spellblade' | 'mage' | 'summoner' | 'healer'
  seed: number
  street: { kind: 'flags' | 'courses' | 'planks'; stone: StonePalette; plank?: RGB; sand?: RGB }
  terrace: { kind: 'courses' | 'logs' | 'whitewash'; stone: StonePalette; cap: RGB; timber?: RGB; band?: RGB }
  walls: { kind: 'plaster' | 'ashlar' | 'timber'; plaster: RGB; shade: RGB; trim: RGB; stone: StonePalette; band?: RGB }
  window: { frame: RGB; sill: RGB; shutter?: RGB; arched?: boolean }
  door: { leaf: RGB; surround: RGB; arched: boolean; handle: RGB }
  roofs: { kind: 'tiles' | 'flat' | 'thatch'; one: { a: RGB; b: RGB; moss?: RGB; accent?: RGB }; two: { a: RGB; b: RGB; moss?: RGB; accent?: RGB } }
  cloth: { main: RGB; second: RGB; trim: RGB }
  wood: RGB
  metal: RGB
  glass: [RGB, RGB]
  tree: 'trimmed' | 'cypress' | 'willow' | 'palm'
  well: 'roofed' | 'fountain' | 'rain-barrel' | 'domed'
  fence: 'hedge' | 'balustrade' | 'rope' | 'low-wall'
  flowers: RGB[]
  emblem: 'shield' | 'star' | 'leaf' | 'shell'
}

const GREEN = { dark: hex('#2f5a2c'), mid: hex('#4f8a3c'), light: hex('#8cc25a') }

// --- Street, terraces, stairs ----------------------------------------------------------------------------------------------

function streetTexel(s: TownStyle) {
  const st = s.street
  if (st.kind === 'planks') return plankTexel(st.plank!, 16)
  if (st.kind === 'courses') return courseTexel(st.stone, 32, { rough: 0.5, widths: [30, 50] })
  const flags = flagTexel(st.stone, 4, { joint: 2.6 })
  return st.sand ? (x: number, y: number, seed: number, fam: number) => mix(flags(x, y, seed, fam), st.sand!, smooth(0.62, 0.8, fbm(x, y, { cells: 4, tile: T, seed: fam + 8 })) * 0.35) : flags
}
function street(s: TownStyle, variant: number): Canvas {
  return variantFloor(variant, s.seed, streetTexel(s), (c, zone, seed) => {
    if (zone !== 'inner') return
    if (variant === 2) patch(c, shade(s.street.stone.stones[0]!, -0.3), 64, 64, 34, 0.18, seed)
    if (variant === 3) {
      if (s.id === 'mage') { form(c, circle(64, 64, 15), shade(s.street.stone.stones[1]!, 0.08), { light: 0.4, rim: 0.3 }); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.fill(capsule(64, 64, 64 + Math.cos(a) * 12, 64 + Math.sin(a) * 12, 1), [...shade(s.street.stone.stones[0]!, -0.3), 0.8]) } }
      else if (s.id === 'healer') scatter(6, seed, 'inner', 4, (x, y, r) => form(c, ellipse(x, y, 3 + r() * 2, 2 + r()), hex('#f2e2d2'), { light: 0.4, rim: 0.3 }))
      else if (s.id === 'summoner') patch(c, hex('#4f6a34'), 64, 64, 30, 0.3, seed)
      else tufts(c, 'inner', seed, 5, 0.7)
    }
    if (variant === 4) { crack(c, 34, 50, 44, seed); if (s.id !== 'summoner') tufts(c, 'inner', seed + 2, 4, 0.7) }
  })
}
function terraceFace(s: TownStyle, variant = 1) {
  const t = s.terrace
  if (t.kind === 'logs') return (x: number, y: number): RGB => {
    const log = Math.floor(x / 21.333), u = (x % 21.333) / 21.333, across = Math.cos((u - 0.42) * Math.PI)
    let c = shade(mix(t.timber!, shade(t.timber!, 0.12), hash(log % 6, 0, s.seed)), (across - 0.5) * 0.4 + (fbm(x, y, { cells: 3, tile: T, sx: 1, sy: 1, seed: s.seed + (log % 6) }) - 0.5) * 0.25)
    if (variant === 2) c = mix(c, hex('#5f7f3a'), smooth(0.62, 0.74, fbm(x, y, { cells: 5, tile: T, seed: s.seed + 31 })) * smooth(8, 24, Math.min(x, T - x)) * 0.7)
    if (y % 96 > 40 && y % 96 < 48) c = mix(hex('#b89a6a'), c, Math.abs((y % 96) - 44) / 4)
    return c
  }
  const course = courseTexel(t.stone, 32, { rough: 0.6 })
  if (t.kind === 'whitewash') return (x: number, y: number): RGB =>
    shade(mix(t.stone.stones[0]!, course(x, y, s.seed + variant, s.seed), 0.25), (fbm(x, y, { cells: 8, tile: T, seed: s.seed + 5 }) - 0.5) * 0.08)
  return (x: number, y: number) => course(x, y, s.seed + 1 + variant * 7, s.seed + 1)
}
function terrace(s: TownStyle, variant: number): Canvas {
  const face = terraceFace(s, variant)
  const band = s.terrace.kind === 'whitewash' ? s.terrace.band : undefined
  const c = wall((x, y) => { const f = face(x, y); return band && y > 222 ? mix(f, band, 0.85) : f }, { cap: s.terrace.cap })
  if (variant === 2 && s.terrace.kind !== 'logs') {
    // Ivy over the second.
    const r = stream(s.seed + 9)
    for (let i = 0; i < 14; i++) { const x = 20 + r() * 88, y = 30 + r() * 120; leaf(c, x, y, x + (r() - 0.5) * 16, y + 8 + r() * 6, 3.5, mix(GREEN.mid, GREEN.light, r())) }
  }
  return c
}
function wallTop(s: TownStyle): Canvas {
  const t = s.terrace
  const texel = t.kind === 'logs' ? plankTexel(t.timber!, 21.333) : flagTexel({ ...t.stone, stones: t.stone.stones.map((c) => shade(c, 0.06)) }, 3)
  return variantFloor(1, s.seed + 50, texel)
}
function riserTile(s: TownStyle, variant: number): Canvas {
  const face = terraceFace(s, variant)
  const lip = s.id === 'summoner' ? grassyLip(hex('#5f7f3a'), hex('#3f5a2a'), s.seed) : kerbLip(shade(s.street.stone.stones[0]!, 0.05))
  return riser((x, y) => face(x, y + 64), lip)
}
function stairsTile(s: TownStyle): Canvas {
  const top = s.street.kind === 'planks' ? plankTexel(s.street.plank!, 32) : flagTexel(s.street.stone, 4)
  return stairs((x, y) => top(x, y, s.seed + 70, s.seed + 70), shade(s.street.kind === 'planks' ? s.street.plank! : s.street.stone.stones[0]!, 0.1))
}

// --- Buildings -------------------------------------------------------------------------------------------------------------

function wallTexel(s: TownStyle) {
  const w = s.walls
  if (w.kind === 'ashlar') { const course = courseTexel(w.stone, 21.333, { rough: 0.4, widths: [30, 46] }); return (x: number, y: number) => course(x, y, s.seed + 80, s.seed + 80) }
  if (w.kind === 'timber') return (x: number, y: number): RGB => {
    const board = Math.floor(x / 16), u = x % 16
    let c = shade(mix(w.plaster, w.shade, hash(board, 0, s.seed) * 0.6), (fbm(x, y, { cells: 2, tile: T, octaves: 3, seed: s.seed + board, sx: 16, sy: 1 }) - 0.5) * 0.3)
    c = shade(c, u < 2 ? 0.1 : u > 13 ? -0.2 : 0)
    return u === 15 ? shade(w.plaster, -0.55) : c
  }
  return (x: number, y: number): RGB => {
    const m = fbm(x, y, { cells: 4, tile: T, octaves: 4, seed: s.seed + 61 }), fine = fbm(x, y, { cells: 32, tile: T, octaves: 2, seed: s.seed + 62 })
    const streak = fbm(x, y, { cells: 2, tile: T, sx: 12, sy: 1, seed: s.seed + 63 })
    return mix(shade(mix(w.shade, w.plaster, 0.6 + m * 0.4), (fine - 0.5) * 0.05), shade(w.shade, -0.12), smooth(0.66, 0.82, streak) * 0.14 + smooth(90, 128, y) * 0.08)
  }
}
/** The building's edges: a post (timber, or stone quoins in courses) on both sides, meeting the next module as one;
 * ashlar walls need none. */
function edges(c: Canvas, s: TownStyle, h = c.h): void {
  if (s.walls.kind === 'ashlar') return
  const trim = s.walls.trim, quoins = s.walls.kind === 'plaster' && s.id === 'spellblade'
  const paint = (px: number, py: number): RGBA => {
    const u = (px - (c.w - 7) + c.w) % c.w, joint = quoins && py % 21.333 < 1.5
    return [...shade(trim, (u < 2 ? 0.16 : u > 11 ? -0.14 : 0) + (joint ? -0.3 : 0) + (fbm(px % T, py, { cells: 8, tile: T, seed: s.seed + 64 }) - 0.5) * 0.15), 1] as RGBA
  }
  c.fill(rect(0, 0, 7, h), paint)
  c.fill(rect(c.w - 7, 0, 7, h), paint)
}
function buildingWall(s: TownStyle, variant: number): Canvas {
  const c = new Canvas(T, T), texel = wallTexel(s)
  c.paint((x, y) => [...texel(x, y), 1] as RGBA)
  if (variant === 2) {
    // A string course or band across the storey.
    const band = s.walls.band ?? shade(s.walls.trim, 0.1)
    c.fill(rect(0, 58, T, 10), (x, y) => [...shade(band, (y < 60 ? 0.18 : y > 66 ? -0.2 : 0) + (fbm(x, y, { cells: 16, tile: T, seed: 7 }) - 0.5) * 0.12), 1] as RGBA)
    c.fill(rect(0, 68, T, 3), [0, 0, 0, 0.15], 'atop')
  }
  if (variant === 3) {
    if (s.id === 'mage' || s.id === 'healer') {
      // A small arched niche (a carved one, or a whitewashed one with a shell).
      const niche = union(rect(48, 40, 32, 44), circle(64, 40, 16))
      c.fill(niche, (x, y) => [...shade(s.walls.shade, -0.25 + (y - 24) / 300), 1] as RGBA)
      c.fill(rect(44, 84, 40, 6, 1), [...shade(s.walls.trim, 0.1), 1])
      if (s.id === 'healer') shell(c, 64, 62, 10, hex('#f2d6c2'))
    } else if (s.id === 'summoner') {
      // Rope lashing and a carved panel.
      for (const y of [30, 98]) for (let x = 0; x < T; x += 6) c.fill(capsule(x, y - 3, x + 4, y + 3, 1.6), [...hex('#b89a6a'), 1])
      form(c, rect(40, 46, 48, 36, 4), shade(s.walls.plaster, -0.1), { light: 0.4, rim: 0.3 })
      leafMotif(c, 64, 64, shade(s.walls.plaster, -0.35))
    } else {
      // Half-timbering's brace, in the region's trim.
      const brace = poly([[8, 118], [18, 124], [120, 14], [110, 8]])
      c.fill(brace, [0, 0, 0, 0.2]); c.fill(brace, [...s.walls.trim, 1])
    }
  }
  footing(c, 112, 16)
  edges(c, s)
  return c
}
function archedWindow(c: Canvas, x: number, y: number, w: number, h: number, frame: RGB, sill: RGB, glass: [RGB, RGB]): void {
  const opening = union(rect(x, y + w / 2, w, h - w / 2), circle(x + w / 2, y + w / 2, w / 2))
  const outer = union(rect(x - 5, y + w / 2, w + 10, h - w / 2 + 3), circle(x + w / 2, y + w / 2, w / 2 + 5))
  c.fill(outer, [...frame, 1])
  c.fill(opening, linear(x, y, x + w * 0.3, y + h, [[0, glass[0]], [1, glass[1]]]))
  c.fill(rect(x + w / 2 - 1.5, y, 3, h), [...frame, 1])
  c.fill(rect(x, y + h * 0.55, w, 3), [...frame, 1])
  c.fill(poly([[x + w * 0.15, y + h], [x + w * 0.35, y + h], [x + w * 0.8, y + w * 0.3], [x + w * 0.6, y + w * 0.3]]), [1, 1, 1, 0.18], 'atop')
  c.fill(rect(x - 8, y + h, w + 16, 7, 1.5), (px, py) => [...shade(sill, py < y + h + 2 ? 0.2 : -0.05), 1] as RGBA)
}
function windowTile(s: TownStyle, variant: number): Canvas {
  const c = buildingWall(s, 1), wn = s.window
  if (wn.arched) archedWindow(c, 42, 18, 44, 70, wn.frame, wn.sill, s.glass)
  else windowFrame(c, variant === 1 ? 36 : 40, 22, variant === 1 ? 56 : 48, 62, wn.frame, wn.sill, variant === 1 ? [2, 3] : [2, 2])
  if (variant === 2 && wn.shutter) shutters(c, wn.arched ? 42 : 40, 22, wn.arched ? 44 : 48, 62, wn.shutter)
  if (variant === 2 && wn.arched && !wn.shutter) c.fill(rect(30, 10, 68, 6, 2), [...s.cloth.main, 1])
  return c
}
function door(s: TownStyle): Canvas {
  const c = new Canvas(T, 2 * T), texel = wallTexel(s), d = s.door
  c.paint((x, y) => [...texel(x, y % T), 1] as RGBA)
  footing(c, 2 * T - 16, 16)
  if (d.arched) {
    const arch = (g: number): Shape => union(rect(30 - g, 76, 68 + g * 2, 180), circle(64, 76, 34 + g))
    c.fill(arch(8), [0, 0, 0, 0.2])
    c.fill(arch(7), (x, y) => [...shade(d.surround, (x < 40 || y < 50 ? 0.1 : -0.05) + (hash(Math.floor(Math.atan2(y - 76, x - 64) * 3 + (y > 76 ? Math.floor(y / 22) * 7 : 0)), 1, s.seed) - 0.5) * 0.12), 1] as RGBA)
    c.fill(arch(0), (x, y) => {
      const u = (x - 30) % 17, g = fbm(x, y, { cells: 2, tile: T, sx: 14, seed: s.seed + 68 })
      return [...shade(d.leaf, (g - 0.5) * 0.22 + (u < 1.5 ? 0.1 : u > 15.5 ? -0.3 : 0)), 1] as RGBA
    })
    c.fill(rect(30, 76, 68, 5), [0, 0, 0, 0.2], 'atop')
  } else {
    doorway(c, 28, 50, 72, 206, d.surround)
    c.fill(rect(28, 50, 72, 206), (x, y) => {
      const u = (x - 28) % 18, g = fbm(x, y, { cells: 2, tile: T, sx: 14, seed: s.seed + 68 })
      return [...shade(d.leaf, (g - 0.5) * 0.24 + (u < 1.5 ? 0.1 : u > 16.5 ? -0.3 : 0)), 1] as RGBA
    })
  }
  for (const y of [116, 214]) strap(c, 32, y, 34)
  c.fill(circle(86, 170, 3.5), [...d.handle, 1]); c.fill(circle(85, 169, 1.4), [...shade(d.handle, 0.4), 1])
  c.fill(rect(22, 2 * T - 6, 84, 6, 1), [...shade(s.street.stone.stones[0]!, 0.1), 1])
  edges(c, s)
  return c
}

// --- Signs -------------------------------------------------------------------------------------------------------------------

/** A hanging sign: an iron bracket, a board in the region's colours, a pictogram (no words). */
function sign(s: TownStyle, kind: 'inn' | 'shop'): Canvas {
  const c = new Canvas(128, 112)
  form(c, rect(8, 8, 112, 6, 2), s.metal, { light: 0.5 })
  form(c, circle(12, 11, 5), s.metal, { light: 0.5 })
  for (const x of [34, 94]) c.fill(capsule(x, 13, x, 30, 1.2), [...s.metal, 1])
  const board = s.emblem === 'shell' ? union(rect(18, 30, 92, 66, 30)) : s.emblem === 'star' ? rect(20, 28, 88, 70, 8) : rect(18, 30, 92, 66, 6)
  form(c, board, s.cloth.main, { light: 0.4, rim: 0.3 })
  c.fill(rough(rect(24, 36, 80, 54, 4), 0.5, 20, 1), [...shade(s.cloth.main, 0.12), 1])
  c.fill(rect(18, 30, 92, 3), [...s.cloth.trim, 1])
  const ink = s.cloth.trim
  if (kind === 'inn') {
    // A bed: a frame, a pillow, a blanket.
    form(c, rect(36, 64, 56, 14, 3), shade(s.wood, 0.1), { light: 0.4 })
    form(c, rect(36, 54, 8, 26, 2), s.wood, { light: 0.4 })
    form(c, rect(84, 60, 8, 20, 2), s.wood, { light: 0.4 })
    form(c, ellipse(51, 58, 7, 4), hex('#f4f1e8'), { light: 0.5 })
    form(c, rect(58, 56, 28, 10, 3), ink, { light: 0.4 })
  } else {
    // A coin purse, tied at the neck, a coin beside it.
    form(c, union(ellipse(58, 72, 16, 14), poly([[50, 60], [66, 60], [62, 50], [54, 50]])), hex('#c9a878'), { light: 0.5, rim: 0.3 })
    c.fill(rect(50, 57, 16, 3, 1), [...ink, 1])
    form(c, circle(84, 74, 9), hex('#e8b84a'), { light: 0.6, rim: 0.4 })
    c.fill(circle(84, 74, 5), [...hex('#c9922a'), 0.8])
  }
  return c
}

// --- Props -------------------------------------------------------------------------------------------------------------------

function shell(c: Canvas, x: number, y: number, r: number, colour: RGB): void {
  form(c, intersect(circle(x, y + r * 0.3, r), rect(x - r - 1, y - r, 2 * r + 2, r * 1.3)), colour, { light: 0.5, rim: 0.3 })
  for (let i = -2; i <= 2; i++) c.fill(capsule(x, y + r * 0.3, x + i * r * 0.35, y - r * 0.6, 0.6), [...shade(colour, -0.3), 0.8], 'atop')
}
function leafMotif(c: Canvas, x: number, y: number, colour: RGB): void {
  c.fill(poly([[x, y - 14], [x + 9, y], [x, y + 14], [x - 9, y]]), [...colour, 1])
  c.fill(capsule(x, y - 12, x, y + 12, 0.8), [...shade(colour, 0.4), 1])
}
function emblem(c: Canvas, s: TownStyle, x: number, y: number, r: number, colour: RGB): void {
  if (s.emblem === 'shield') { form(c, poly([[x - r, y - r], [x + r, y - r], [x + r, y + r * 0.2], [x, y + r * 1.2], [x - r, y + r * 0.2]]), colour, { light: 0.4 }); c.fill(capsule(x, y - r * 0.8, x, y + r * 0.8, 1.6), [...s.cloth.main, 1]) }
  else if (s.emblem === 'star') { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]) } form(c, poly(pts), colour, { light: 0.5 }) }
  else if (s.emblem === 'leaf') leafMotif(c, x, y, colour)
  else shell(c, x, y, r, colour)
}

function tree(s: TownStyle): Canvas {
  const c = new Canvas(352, 352), fx = 172, fy = 340
  if (s.tree === 'cypress') {
    for (const [x, h, w] of [[150, 300, 46], [204, 240, 38]] as const) {
      trunk(c, x, fy, fy - 40, 10, hex('#5a4030'), x)
      const body: Clump[] = []
      for (let i = 0; i < 9; i++) body.push({ x: x + (i % 2 ? 4 : -4), y: fy - 30 - i * (h / 10), r: w * (1 - Math.abs(i - 3) / 9) * 0.8 })
      foliage(c, body, { dark: hex('#1f4a34'), mid: hex('#2f6a44'), light: hex('#5a9a62') }, s.seed + x, 4)
    }
    return c
  }
  if (s.tree === 'palm') {
    let px = fx, py = fy
    for (let i = 1; i <= 10; i++) {
      const t = i / 10, nx = fx + Math.sin(t * 1.4) * 34, ny = fy - t * 236
      form(c, capsule(px, py, nx, ny, 11 - t * 3, 10 - t * 3), hex('#9a7a52'), { light: 0.45, rim: 0.3, grain: { amount: 0.3, cells: 10, sx: 1, sy: 6, seed: i } })
      c.fill(capsule(px - 8, py, px + 8, py - 2, 1), [...hex('#6a5034'), 0.6], 'atop')
      px = nx; py = ny
    }
    contact(c, fx, fy - 1, 16)
    const r = stream(s.seed)
    // Fronds arching out and down from the crown, each a rib with leaflets either side.
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 1.05 + (i / 11) * Math.PI * 0.9 + (r() - 0.5) * 0.15, l = 100 + r() * 36
      const tx = px + Math.cos(a) * l, ty = py + Math.abs(Math.sin(a)) * -l * 0.25 + 70 - (i % 3) * 10
      for (let k = 1; k <= 16; k++) {
        const t = k / 16, bx = px + (tx - px) * t, by = py + (ty - py) * t - Math.sin(t * Math.PI) * 34
        const len = 26 * (1 - t * 0.55), col = mix(hex('#2f6a34'), hex('#8ac25a'), 0.25 + r() * 0.6)
        leaf(c, bx, by, bx + len * 0.35, by + len, 4.2, col, false)
        leaf(c, bx, by, bx - len * 0.35, by + len, 4.2, shade(col, -0.1), false)
      }
    }
    for (let i = 0; i < 4; i++) fruit(c, px - 8 + i * 6, py + 10 + (i % 2) * 4, 5, hex('#8a6a3a'))
    return c
  }
  if (s.tree === 'willow') {
    trunk(c, fx, fy, 170, 22, hex('#4f4030'), s.seed)
    foliage(c, clumps(s.seed, fx, 120, 110, 70, 12, 28, 40), { dark: hex('#3a5a2c'), mid: hex('#5f8a3c'), light: hex('#9ac25a') }, s.seed, 5)
    const r = stream(s.seed + 1)
    for (let i = 0; i < 60; i++) {
      const x = 60 + r() * 230, y = 100 + r() * 80, l = 60 + r() * 110
      c.fill(capsule(x, y, x + (r() - 0.5) * 8, Math.min(330, y + l), 1.6, 0.6), (px, py) => [...mix(hex('#6f9a44'), hex('#b2d272'), smooth(y, y + l, py) * 0.7), 0.95] as RGBA)
    }
    return c
  }
  // A trimmed round tree in a stone ring.
  trunk(c, fx, fy - 14, 210, 18, hex('#6b4a2e'), s.seed)
  const dome: Clump[] = [{ x: fx, y: 150, r: 70 }]
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, d = i % 2 ? 0.55 : 0.85; dome.push({ x: fx + Math.cos(a) * 110 * d, y: 150 + Math.sin(a) * 92 * d, r: 34 + (i % 3) * 6 }) }
  foliage(c, dome, { ...GREEN }, s.seed, 3)
  form(c, intersect(ellipse(fx, fy - 6, 46, 16), rect(fx - 48, fy - 22, 96, 22)), s.street.stone.stones[0]!, { light: 0.45, rim: 0.3 })
  form(c, rect(fx - 46, fy - 12, 92, 12, 3), shade(s.street.stone.stones[0]!, -0.05), { light: 0.4 })
  return c
}
function well(s: TownStyle): Canvas {
  const c = new Canvas(224, 272), fx = 107, fy = 260, stone = s.street.stone.stones[0]!
  const basin = (r: number, top: number) => {
    form(c, rect(fx - r, top, 2 * r, fy - top, 10), stone, { light: 0.45, rim: 0.3, grain: { amount: 0.2, cells: 12, seed: s.seed } })
    for (let y = top + 14; y < fy - 6; y += 16) c.fill(rect(fx - r, y, 2 * r, 2), [...shade(stone, -0.25), 1], 'atop')
    form(c, ellipse(fx, top, r, 12), shade(stone, 0.1), { light: 0.5 })
  }
  if (s.well === 'rain-barrel') {
    for (const x of [fx - 50, fx + 50]) wood(c, rect(x - 6, 150, 12, 110, 2), s.wood, x)
    wood(c, rect(fx - 70, 146, 140, 12, 2), s.wood, 3, 'x')
    const body = intersect(ellipse(fx, 100, 48, 70), rect(fx - 48, 50, 96, 96))
    form(c, body, shade(s.wood, 0.1), { light: 0.5, rim: 0.3, grain: { amount: 0.25, cells: 3, sx: 8, seed: 4 } })
    for (const y of [64, 96, 128]) c.fill(intersect(rect(fx - 50, y, 100, 5), body), [...s.metal, 1])
    form(c, ellipse(fx, 50, 44, 10), shade(s.wood, -0.1), { light: 0.4 })
    form(c, poly([[fx - 60, 40], [fx + 60, 40], [fx + 30, 6], [fx - 30, 6]]), hex('#8a7a44'), { light: 0.5, grain: { amount: 0.25, cells: 6, sx: 8, seed: 5 } })
    c.fill(capsule(fx + 40, 120, fx + 58, 150, 3), [...s.metal, 1])
    contact(c, fx, fy - 1, 60)
    return c
  }
  if (s.well === 'fountain') {
    basin(86, 190)
    c.fill(ellipse(fx, 190, 76, 8), [...hex('#6fb4d0'), 1])
    form(c, rect(fx - 12, 90, 24, 100, 4), stone, { light: 0.5, rim: 0.35 })
    form(c, ellipse(fx, 94, 34, 10), shade(stone, 0.1), { light: 0.5 })
    for (const d of [-1, 1]) for (let k = 0; k < 10; k++) c.fill(circle(fx + d * (10 + k * 5), 96 + (k * k) * 0.9, 2.4 - k * 0.12), [...hex('#bfe6f4'), 0.85])
    form(c, circle(fx, 82, 8), s.cloth.main, { light: 0.6 })
    contact(c, fx, fy - 1, 80)
    return c
  }
  basin(70, 170)
  c.fill(ellipse(fx, 170, 60, 7), [...hex('#2a3a44'), 1])
  for (const x of [fx - 62, fx + 62]) wood(c, rect(x - 6, 60, 12, 116, 2), s.wood, x)
  wood(c, rect(fx - 66, 78, 132, 8, 2), s.wood, 7, 'x')
  c.fill(capsule(fx, 86, fx, 130, 1), [...hex('#b89a6a'), 1])
  form(c, rect(fx - 10, 128, 20, 18, 3), s.wood, { light: 0.4 })
  if (s.well === 'domed') {
    form(c, intersect(ellipse(fx, 60, 76, 52), rect(fx - 80, 0, 160, 62)), s.roofs.two.a, { light: 0.55, rim: 0.35 })
    form(c, circle(fx, 10, 6), s.cloth.trim, { light: 0.6 })
  } else {
    const r = poly([[fx - 90, 64], [fx + 90, 64], [fx + 40, 14], [fx - 40, 14]])
    c.fill(r, (x, y) => { const v = (y - 14) % 12; return [...shade(mix(s.roofs.one.a, s.roofs.one.b, hash(Math.floor((x + Math.floor((y - 14) / 12) * 9) / 18), Math.floor(y / 12), 3)), (v < 3 ? -0.28 : 0) + (x < fx ? 0.06 : -0.04)), 1] as RGBA })
  }
  contact(c, fx, fy - 1, 66)
  return c
}
function stall(s: TownStyle, n: 1 | 2): Canvas {
  const c = new Canvas(288, 256), fx = n === 1 ? 134 : 139
  for (const x of [fx - 108, fx + 108]) wood(c, rect(x - 6, 50, 12, 196, 2), s.wood, x)
  box(c, fx - 116, 160, 232, 84, 14, shade(s.wood, 0.08), 39 + n)
  const r = stream(s.seed + n * 7)
  const goods: Record<TownStyle['id'], RGB[][]> = {
    spellblade: [[hex('#d8543a'), hex('#e8b43a'), hex('#c9a060')], [hex('#e8e2d2'), hex('#5f7fa8'), hex('#c9c2b0')]],
    mage: [[hex('#7f5ad8'), hex('#5ad8c8'), hex('#e8d08a')], [hex('#e8dcc0'), hex('#c9a878'), hex('#8a5a3a')]],
    summoner: [[hex('#8aa8b8'), hex('#6f8a4a'), hex('#b8a060')], [hex('#5f8a3c'), hex('#a87a3a'), hex('#e0a83a')]],
    healer: [[hex('#f2d6c2'), hex('#e8a07a'), hex('#9fd8ef')], [hex('#e8823a'), hex('#5aa8c8'), hex('#f2e2b8')]],
  }
  const palette = goods[s.id][n - 1]!
  for (let i = 0; i < 18; i++) {
    const x = fx - 96 + r() * 192, y = 152 + r() * 10, col = palette[Math.floor(r() * palette.length)]!
    if (n === 2 && (s.id === 'mage' || s.id === 'spellblade')) form(c, rect(x - 7, y - 10, 14, 16, 2), col, { light: 0.4 })
    else fruit(c, x, y, 6 + r() * 3, col)
  }
  const awn = poly([[fx - 132, 96], [fx + 132, 96], [fx + 110, 40], [fx - 110, 40]])
  c.fill(awn, (x, y) => [...shade(Math.floor((x - fx + 132) / 22) % 2 ? (n === 1 ? s.cloth.second : s.cloth.trim) : s.cloth.main, (y - 40) / 90 - (x - fx) / 900), 1] as RGBA)
  for (let i = 0; i < 12; i++) c.fill(intersect(circle(fx - 121 + i * 22, 96, 11), rect(fx - 132 + i * 22, 96, 22, 11)), [...(i % 2 ? (n === 1 ? s.cloth.second : s.cloth.trim) : s.cloth.main), 1])
  contact(c, fx, 243, 120)
  return c
}
function fence(s: TownStyle): Canvas {
  const c = new Canvas(160, 144), fy = 132
  if (s.fence === 'hedge') {
    const body = rough(rect(10, 40, 140, 92, 18), 4, 14, s.seed)
    c.fill(body, [...GREEN.dark, 1])
    c.fill(body, (x, y) => [...mix(GREEN.light, GREEN.dark, smooth(40, 132, y + (x - 10) * 0.2)), 1] as RGBA, 'atop')
    c.fill(body, (x, y) => { const n = fbm(x, y, { cells: 22, octaves: 2, seed: s.seed + 1 }); return n > 0.6 ? [...GREEN.light, 0.5] : n < 0.35 ? [...GREEN.dark, 0.4] : [0, 0, 0, 0] }, 'atop')
  } else if (s.fence === 'balustrade') {
    const stone = s.walls.stone.stones[0]!
    form(c, rect(8, 116, 144, 16, 3), stone, { light: 0.4 })
    for (let x = 22; x < 150; x += 24) form(c, union(ellipse(x, 98, 8, 14), rect(x - 5, 66, 10, 50, 3), ellipse(x, 72, 7, 6)), stone, { light: 0.5, rim: 0.3 })
    form(c, rect(4, 52, 152, 14, 3), shade(stone, 0.05), { light: 0.45, rim: 0.3 })
  } else if (s.fence === 'rope') {
    for (const x of [16, 144]) wood(c, rect(x - 7, 40, 14, 92, 4), s.wood, x)
    for (const y of [60, 92]) for (let t = 0; t <= 1; t += 0.01) c.fill(circle(16 + 128 * t, y + Math.sin(t * Math.PI) * 10, 2.2), [...hex('#c8aa78'), 1])
  } else {
    const white = s.walls.plaster
    form(c, rect(8, 60, 144, 72, 6), white, { light: 0.35, rim: 0.3, grain: { amount: 0.08, cells: 10, seed: 3 } })
    form(c, rect(4, 52, 152, 12, 4), s.cloth.main, { light: 0.4 })
    for (let x = 30; x < 150; x += 34) c.fill(circle(x, 96, 6), [...shade(white, -0.15), 1])
  }
  contact(c, 80, fy - 1, 70)
  return c
}
function barrel(s: TownStyle): Canvas {
  const c = new Canvas(112, 144), cx = 56
  const body = intersect(ellipse(cx, 80, 46, 70), rect(12, 22, 88, 110))
  c.fill(body, (x, y) => {
    const stave = Math.floor((x - 12) / 11), across = (x - cx) / 44
    return [...shade(mix(s.wood, shade(s.wood, 0.15), hash(stave, 0, s.seed)), -across * across * 0.35 - across * 0.12 + ((x - 12) % 11 < 1 ? -0.3 : 0) + (fbm(x, y, { cells: 3, sx: 8, seed: 31 }) - 0.5) * 0.2), 1] as RGBA
  })
  for (const y of [36, 60, 104, 122]) c.fill(intersect(rect(10, y, 92, 5), body), (x) => [...shade(s.metal, 0.25 - Math.abs((x - cx) / 46) * 0.2), 1] as RGBA)
  form(c, ellipse(cx, 24, 40, 9), shade(s.wood, 0.05), { light: 0.4 })
  contact(c, cx, 131, 36)
  return c
}
function crate(s: TownStyle): Canvas {
  const c = new Canvas(128, 128)
  box(c, 12, 30, 84, 86, 16, shade(s.wood, 0.15), s.seed)
  c.fill(capsule(16, 110, 92, 50, 3.5), [...shade(s.wood, 0.02), 1])
  for (const [x, y] of [[12, 46], [90, 46], [12, 108], [90, 108]]) c.fill(rect(x!, y!, 6, 8, 1), [...s.metal, 1])
  contact(c, 55, 115, 44)
  return c
}
function bench(s: TownStyle): Canvas {
  const c = new Canvas(192, 128), col = s.id === 'healer' ? hex('#5a8ab8') : s.wood
  for (const x of [34, 156]) wood(c, rect(x - 6, 76, 12, 40, 2), shade(col, -0.15), x)
  wood(c, rect(16, 66, 160, 12, 3), col, 1, 'x')
  wood(c, rect(16, 50, 160, 10, 3), shade(col, 0.05), 2, 'x')
  for (const x of [34, 156]) wood(c, rect(x - 5, 26, 10, 50, 2), shade(col, -0.1), x + 1)
  wood(c, rect(16, 26, 160, 18, 4), col, 3, 'x')
  contact(c, 95, 115, 80)
  return c
}
function flowerBox(s: TownStyle): Canvas {
  const c = new Canvas(176, 128)
  const planter = s.id === 'healer' ? hex('#c8643a') : s.id === 'summoner' ? s.wood : s.street.stone.stones[0]!
  form(c, rect(20, 70, 136, 46, 6), planter, { light: 0.45, rim: 0.3, grain: { amount: 0.15, cells: 10, seed: 2 } })
  form(c, rect(14, 64, 148, 10, 3), shade(planter, 0.08), { light: 0.45 })
  const r = stream(s.seed + 3)
  for (let i = 0; i < 16; i++) leaf(c, 26 + i * 8, 70, 18 + i * 8 + r() * 16, 34 + r() * 14, 4.5, mix(GREEN.mid, GREEN.light, r()))
  for (let i = 0; i < 12; i++) {
    const x = 30 + i * 10 + r() * 6, y = 24 + r() * 26, col = s.flowers[i % s.flowers.length]!
    for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2 + i; c.fill(ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 3.6, 3.2, 2.6), [...shade(col, p < 2 ? 0.1 : -0.05), 1]) }
    c.fill(circle(x, y, 1.8), [...hex('#f2d06a'), 1])
  }
  contact(c, 88, 115, 70)
  return c
}
function noticeboard(s: TownStyle): Canvas {
  const c = new Canvas(160, 224)
  for (const x of [24, 136]) wood(c, rect(x - 6, 50, 12, 162, 2), s.wood, x)
  form(c, rect(16, 64, 128, 96, 4), shade(s.wood, 0.12), { light: 0.4, grain: { amount: 0.2, cells: 3, sx: 1, sy: 8, seed: 5 } })
  form(c, rect(22, 70, 116, 84, 2), hex('#b89a6a'), { light: 0.2 })
  const r = stream(s.seed + 4)
  for (let i = 0; i < 6; i++) {
    const x = 28 + (i % 3) * 36 + r() * 6, y = 76 + Math.floor(i / 3) * 38 + r() * 4
    form(c, rect(x, y, 28, 32, 1), mix(hex('#f4ecd8'), hex('#e8dcc0'), r()), { light: 0.3, rim: 0.2 })
    c.fill(circle(x + 14, y + 3, 1.8), [...s.cloth.main, 1])
  }
  form(c, poly([[4, 64], [156, 64], [136, 34], [24, 34]]), s.roofs.one.a, { light: 0.5 })
  contact(c, 80, 211, 70)
  return c
}
function banner(s: TownStyle): Canvas {
  const c = new Canvas(112, 256)
  form(c, rect(51, 16, 10, 228, 3), s.metal, { light: 0.5, rim: 0.35 })
  form(c, circle(56, 14, 6), s.cloth.trim, { light: 0.6 })
  form(c, rect(22, 34, 68, 6, 2), s.metal, { light: 0.5 })
  const cloth = poly([[26, 40], [86, 40], [86, 150], [56, 172], [26, 150]])
  form(c, cloth, s.cloth.main, { light: 0.4, rim: 0.3 })
  c.fill(cloth, (x) => [...s.cloth.trim, x < 30 || x > 82 ? 1 : 0], 'atop')
  for (let i = 0; i < 3; i++) c.fill(capsule(32 + i * 20, 44, 34 + i * 20, 146, 1.2), [...shade(s.cloth.main, -0.12), 0.6], 'atop')
  emblem(c, s, 56, 92, 16, s.cloth.trim)
  form(c, rect(44, 236, 24, 10, 3), s.metal, { light: 0.4 })
  return c
}
function lantern(s: TownStyle): Canvas {
  const c = new Canvas(96, 256), cx = 49
  form(c, rect(cx - 4, 90, 8, 146, 2), s.metal, { light: 0.5, rim: 0.35 })
  form(c, rect(cx - 12, 228, 24, 16, 3), s.metal, { light: 0.5 })
  form(c, union(rect(cx - 18, 40, 36, 48, 4), poly([[cx - 26, 42], [cx + 26, 42], [cx + 12, 22], [cx - 12, 22]])), s.metal, { light: 0.5 })
  c.fill(rect(cx - 13, 46, 26, 38, 2), (x, y) => [...mix(s.glass[0], s.glass[1], Math.min(1, Math.hypot(x - cx, y - 64) / 20)), 1] as RGBA)
  c.fill(rect(cx - 1, 46, 2, 38), [...s.metal, 1])
  form(c, circle(cx, 18, 6), s.metal, { light: 0.5 })
  if (s.id === 'mage') form(c, poly([[cx, 6], [cx + 5, 14], [cx - 5, 14]]), s.cloth.trim, { light: 0.5 })
  return c
}

/** Every town frame for a region's style, by name. */
export function townDrawers(s: TownStyle): Record<string, () => Canvas> {
  return {
    'floor-1': () => street(s, 1), 'floor-2': () => street(s, 2), 'floor-3': () => street(s, 3), 'floor-4': () => street(s, 4),
    'wall-1': () => terrace(s, 1), 'wall-2': () => terrace(s, 2), 'wall-top': () => wallTop(s),
    'riser-1': () => riserTile(s, 1), 'riser-2': () => riserTile(s, 2), stairs: () => stairsTile(s),
    'building-wall-1': () => buildingWall(s, 1), 'building-wall-2': () => buildingWall(s, 2), 'building-wall-3': () => buildingWall(s, 3),
    'window-1': () => windowTile(s, 1), 'window-2': () => windowTile(s, 2), door: () => door(s),
    'roof-1': () => roof(roofTexel(s.roofs.kind, s.roofs.one, s.seed + 90, 1)), 'roof-2': () => roof(roofTexel(s.roofs.kind, s.roofs.two, s.seed + 90, 2)),
    'sign-inn': () => sign(s, 'inn'), 'sign-shop': () => sign(s, 'shop'),
    'tree-1': () => tree(s), well: () => well(s), 'stall-1': () => stall(s, 1), 'stall-2': () => stall(s, 2), fence: () => fence(s),
    barrel: () => barrel(s), crate: () => crate(s), bench: () => bench(s), 'flower-box': () => flowerBox(s), noticeboard: () => noticeboard(s),
    banner: () => banner(s), lantern: () => lantern(s),
  }
}
void fillAt; void stem; void fading; void ellipse
