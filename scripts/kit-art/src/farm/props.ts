// kit-farm's props and mounted pieces (KF4, KF8): upright cards at the sprites' density, standing on their foot (bottom
// middle, 6 texels up), drawn in code (P147). Lit from the top front-left; no cast shadows on the ground (the stage draws
// one under each card); no text, no faces.
import { hex, mix, shade, smooth, type RGB, type RGBA } from '../color.js'
import { bark, contact, foliage, form, fruit, grassClump, leaf, stem, wood, type Clump } from '../form.js'
import { fbm, hash, stream } from '../noise.js'
import { Canvas, capsule, circle, ellipse, fading, intersect, linear, poly, rect, rough, subtract, union } from '../paint.js'

export const GREEN = { dark: hex('#2f5a2c'), mid: hex('#4f8a3c'), light: hex('#8cc25a') }
export const TIMBER = hex('#8a5a32'), TIMBER_DARK = hex('#5e3d22'), IRON = hex('#3a3a40'), STRAW = hex('#d9b860')

// --- Trees -----------------------------------------------------------------------------------------------------------------

export function trunk(c: Canvas, x: number, foot: number, top: number, w: number, colour: RGB, seed: number): void {
  const flare = poly([[x - w * 1.25, foot], [x - w * 0.55, foot - 22], [x - w * 0.5, top], [x + w * 0.5, top], [x + w * 0.55, foot - 22], [x + w * 1.25, foot]])
  bark(c, rough(flare, 1.5, 20, seed), colour, seed)
  contact(c, x, foot - 1, w * 1.2)
}
export function clumps(seed: number, cx: number, cy: number, rx: number, ry: number, n: number, r0: number, r1: number): Clump[] {
  const r = stream(seed), out: Clump[] = [{ x: cx, y: cy, r: Math.min(rx, ry) * 0.75 }]
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.82
    out.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, r: r0 + r() * (r1 - r0) })
  }
  return out
}
/** A broad oak: a low dome of a crown on a stout trunk. */
function tree1(): Canvas {
  const c = new Canvas(256, 384)
  trunk(c, 128, 378, 200, 24, hex('#6b4a2e'), 1)
  for (const [ax, ay, bx, by] of [[124, 240, 70, 180], [132, 230, 188, 170], [128, 220, 128, 140]]) c.fill(capsule(ax!, ay!, bx!, by!, 7, 4), [...hex('#5a3d24'), 1])
  foliage(c, clumps(11, 128, 150, 88, 92, 16, 32, 48), { ...GREEN }, 11)
  return c
}
/** A tall tree: an upright oval crown. */
function tree2(): Canvas {
  const c = new Canvas(256, 384)
  trunk(c, 128, 378, 230, 18, hex('#5f4430'), 2)
  foliage(c, clumps(21, 128, 140, 80, 120, 18, 28, 44), { dark: hex('#285a3a'), mid: hex('#3f7f4a'), light: hex('#76b062') }, 21)
  return c
}
/** A birch: a pale, slender trunk, a light and airy crown. */
function tree3(): Canvas {
  const c = new Canvas(256, 384)
  const birch = hex('#e8e2d2')
  for (const [x, lean] of [[120, -14], [138, 16]] as const) {
    const s = poly([[x - 9, 378], [x - 5 + lean, 150], [x + 5 + lean, 150], [x + 9, 378]])
    form(c, s, birch, { light: 0.4, rim: 0.3, ao: 0.08 })
    const r = stream(x)
    for (let i = 0; i < 9; i++) { const y = 170 + r() * 200, t = (378 - y) / 228; c.fill(rect(x - 8 + lean * t * 0.9, y, 6 + r() * 6, 2 + r() * 2, 1), [...hex('#3a3530'), 0.85], 'atop') }
  }
  contact(c, 129, 377, 20)
  foliage(c, clumps(31, 128, 130, 98, 96, 14, 24, 38), { dark: hex('#4a7a34'), mid: hex('#7aaa4a'), light: hex('#b6dc78') }, 31, 7)
  return c
}

// --- Small ground pieces ---------------------------------------------------------------------------------------------------

function stump(): Canvas {
  const c = new Canvas(128, 96)
  const body = union(rect(30, 30, 68, 58, 6), ellipse(64, 88, 42, 6), poly([[22, 90], [34, 70], [40, 90]]), poly([[106, 90], [94, 70], [88, 90]]))
  bark(c, rough(body, 1.2, 20, 4), hex('#6b4a2e'), 4)
  c.fill(ellipse(64, 31, 34, 10), (x, y) => {
    const d = Math.hypot((x - 64) / 34, (y - 31) / 10), ring = Math.sin(d * 22) * 0.06
    return [...shade(mix(hex('#d8b07a'), hex('#b88a54'), d), ring + (d > 0.9 ? -0.25 : 0)), 1] as RGBA
  })
  c.fill(capsule(52, 30, 70, 34, 0.8), [...hex('#7a5a36'), 0.6])
  // A little mushroom at its foot.
  form(c, ellipse(96, 80, 8, 5), hex('#b8763e')); c.fill(rect(94, 82, 4, 8), [...hex('#efe6d2'), 1])
  return c
}
function mushroomPatch(): Canvas {
  const c = new Canvas(128, 64)
  grassClump(c, 64, 58, 100, 14, 5, 16)
  for (const [x, h, r, red] of [[30, 18, 11, false], [52, 26, 14, true], [74, 16, 9, false], [92, 22, 12, false], [104, 12, 7, true]] as const) {
    form(c, rect(x - 3, 58 - h, 6, h, 2), hex('#efe6d2'), { light: 0.3 })
    const cap = intersect(ellipse(x, 58 - h, r, r * 0.75), rect(x - r - 1, 58 - h - r, r * 2 + 2, r * 0.95))
    form(c, cap, red ? hex('#c2453a') : hex('#a8703e'), { light: 0.5, rim: 0.35 })
    if (red) for (const [dx, dy] of [[-4, -5], [3, -7], [5, -3]]) c.fill(circle(x + dx!, 58 - h + dy!, 1.6), [...hex('#f6f0e2'), 1], 'atop')
  }
  return c
}
function herbPatch(): Canvas {
  const c = new Canvas(128, 64)
  const r = stream(6)
  for (let i = 0; i < 26; i++) {
    const x = 26 + r() * 76, a = -Math.PI / 2 + (r() - 0.5) * 1.6, l = 12 + r() * 16
    leaf(c, x, 58, x + Math.cos(a) * l, 58 + Math.sin(a) * l, 3 + r() * 2, mix(hex('#4f8a3c'), hex('#8cc25a'), r()))
  }
  for (let i = 0; i < 9; i++) { const x = 20 + r() * 88, y = 24 + r() * 18; c.fill(circle(x, y, 1.8), [...hex('#f4f1e6'), 1]); c.fill(circle(x, y, 0.8), [...hex('#e8c84a'), 1]) }
  return c
}
function rockSmall(): Canvas {
  const c = new Canvas(96, 64)
  const rock = rough(union(ellipse(46, 40, 34, 20), ellipse(58, 34, 22, 16)), 2.5, 10, 7)
  form(c, rock, hex('#8e8a82'), { light: 0.55, rim: 0.35, grain: { amount: 0.22, cells: 8, seed: 7 } })
  c.fill(capsule(40, 30, 52, 44, 0.8), [...hex('#5e5a54'), 0.7], 'atop')
  c.fill(rock, fading(hex('#6f8a3a'), (x, y) => smooth(0.55, 0.7, fbm(x, y, { cells: 10, seed: 8 })) * (1 - smooth(18, 32, y)) * 0.8), 'atop')
  contact(c, 48, 58, 30)
  return c
}

// --- Fields and Fishery ----------------------------------------------------------------------------------------------------

/** A scarecrow: a pole and crossbar, a patched shirt, straw at the cuffs, a sack head under a straw hat. No face. */
function scarecrow(): Canvas {
  const c = new Canvas(128, 256)
  wood(c, rect(60, 40, 8, 210, 2), TIMBER, 9)
  wood(c, rect(20, 96, 88, 7, 2), TIMBER, 10, 'x')
  for (const [x, dir] of [[26, -1], [102, 1]] as const) for (let i = 0; i < 6; i++) c.fill(capsule(x, 104, x + dir * (4 + i * 2), 112 + i * 3, 1.2, 0.4), [...STRAW, 1])
  const shirt = poly([[28, 96], [100, 96], [98, 112], [84, 112], [88, 170], [40, 170], [44, 112], [30, 112]])
  form(c, rough(shirt, 1.5, 16, 12), hex('#5f7fa8'), { light: 0.4, grain: { amount: 0.12, cells: 12, seed: 12 } })
  // Faded checks and a patch.
  c.fill(shirt, (x, y) => [...hex('#3f5a80'), ((Math.floor(x / 8) + Math.floor(y / 8)) % 2) * 0.25], 'atop')
  form(c, rect(54, 126, 16, 14, 2), hex('#b8763e'), { light: 0.3 })
  for (let i = 0; i < 7; i++) c.fill(capsule(48 + i * 5, 168, 46 + i * 5 + (i % 2 ? 3 : -3), 186 + (i % 3) * 4, 1.2, 0.4), [...STRAW, 1])
  form(c, ellipse(64, 74, 17, 19), hex('#c9a878'), { light: 0.45, grain: { amount: 0.18, cells: 20, seed: 13 } })
  c.fill(rect(54, 88, 20, 5, 2), [...hex('#8a6a42'), 1])
  form(c, ellipse(64, 56, 34, 7), STRAW, { light: 0.4, grain: { amount: 0.2, cells: 10, sx: 4, seed: 14 } })
  form(c, intersect(ellipse(64, 52, 16, 16), rect(40, 30, 50, 24)), shade(STRAW, -0.05), { light: 0.45 })
  c.fill(rect(48, 48, 32, 4), [...hex('#a8453a'), 1])
  contact(c, 64, 249, 8)
  return c
}
/** A small dock reaching out over the water, seen from above at the stage's angle: its deck of boards running out,
 * the front edge, and short posts into the water. */
function dock(): Canvas {
  const c = new Canvas(256, 128)
  for (const x of [24, 128, 232]) { wood(c, rect(x - 6, 92, 12, 30, 2), TIMBER_DARK, x); c.fill(ellipse(x, 120, 15, 3), [...hex('#bfe6f4'), 0.55]) }
  c.fill(rect(6, 12, 244, 82, 3), (x, y) => {
    const board = Math.floor((x - 6) / 20.33), u = (x - 6) % 20.33, g = fbm(x, y, { cells: 4, sx: 10, sy: 1, seed: 15 + board })
    return [...shade(mix(hex('#ad7f4e'), hex('#8f633a'), hash(board, 1, 15)), (g - 0.5) * 0.3 + (u < 1 ? 0.14 : u > 19 ? -0.4 : 0) + (y < 16 ? -0.1 : 0)), 1] as RGBA
  })
  for (let b = 0; b < 12; b++) for (const y of [24, 80]) c.fill(circle(16 + b * 20.33, y, 1), [...IRON, 0.7])
  wood(c, rect(6, 92, 244, 10, 2), shade(TIMBER, -0.18), 16, 'x')
  return c
}
function reeds(): Canvas {
  const c = new Canvas(128, 128)
  const r = stream(17)
  for (let i = 0; i < 14; i++) {
    const x = 20 + r() * 88, top = 20 + r() * 40, lean = (r() - 0.5) * 20
    leaf(c, x, 122, x + lean, top, 2.5, mix(hex('#5f8a3a'), hex('#9cbf5a'), r()), false)
  }
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 17 + r() * 6, top = 14 + r() * 18
    stem(c, x, 122, x + 2, top + 22, 1.2, hex('#6f8a3a'))
    form(c, capsule(x + 2, top, x + 2, top + 22, 4), hex('#6b4428'), { light: 0.45 })
  }
  return c
}

// --- Stations --------------------------------------------------------------------------------------------------------------

/** The Mill's sails, mounted at their hub (KF4): four latticed arms with cloth, turned to an X. */
function millSails(): Canvas {
  const c = new Canvas(384, 384), cx = 192, cy = 192
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux
    const p = (d: number, s: number): [number, number] => [cx + ux * d + nx * s, cy + uy * d + ny * s]
    // The cloth on one side of the stock, its frame and battens, then the stock.
    const cloth = poly([p(40, 4), p(176, 4), p(176, 44), p(40, 40)])
    form(c, cloth, hex('#efe4c8'), { light: 0.35, grain: { amount: 0.1, cells: 20, seed: 20 + k } })
    c.fill(cloth, (x, y) => [...hex('#c9b68e'), ((x * 0.7 + y * 0.3) % 9 < 1 ? 0.35 : 0)], 'atop')
    for (let d = 52; d <= 176; d += 18) c.fill(capsule(...p(d, 0), ...p(d, 46), 1.6), [...TIMBER_DARK, 1])
    c.fill(capsule(...p(40, 46), ...p(178, 46), 1.8), [...TIMBER_DARK, 1])
    wood(c, capsule(...p(10, 0), ...p(182, 0), 4.5, 3.5), TIMBER, 21 + k)
  }
  form(c, circle(cx, cy, 17), hex('#5e3d22'), { light: 0.5, rim: 0.35 })
  form(c, circle(cx, cy, 8), hex('#8a8a90'), { light: 0.6, rim: 0.4 })
  return c
}
/** A brick chimney stack, mounted on a roof at its foot. */
function chimney(): Canvas {
  const c = new Canvas(64, 192)
  const stack = rect(12, 24, 40, 164, 2)
  c.fill(stack, (x, y) => {
    const row = Math.floor((y - 24) / 10), u = (x - 12 + (row % 2) * 7) % 14, v = (y - 24) % 10, id = Math.floor((x + (row % 2) * 7) / 14) * 31 + row
    const brick = shade(mix(hex('#9a4a36'), hex('#b45e44'), hash(id, 0, 22)), (v < 2 ? 0.1 : v > 7 ? -0.1 : 0) + (x < 16 ? 0.12 : x > 46 ? -0.18 : 0))
    return [...(u > 12.6 || v > 8.6 ? hex('#cbbba2') : brick), 1] as RGBA
  })
  form(c, rect(6, 12, 52, 14, 2), hex('#9e968a'), { light: 0.5, rim: 0.35 })
  c.fill(rect(18, 12, 28, 4, 1), [...hex('#2a2420'), 1])
  c.fill(rect(12, 26, 40, 6), [0, 0, 0, 0.25], 'atop')
  return c
}
/** The Smokehouse's smoker: a stone firebox, a riveted drum, a pipe with a cap. */
function smoker(): Canvas {
  const c = new Canvas(128, 192)
  form(c, rough(rect(18, 128, 92, 58, 6), 1.5, 12, 23), hex('#8e877c'), { light: 0.45, grain: { amount: 0.25, cells: 10, seed: 23 } })
  c.fill(rect(46, 144, 36, 28, 4), [...hex('#2a2420'), 1])
  c.fill(rect(50, 160, 28, 10, 2), [...hex('#d0702e'), 0.8])
  form(c, rect(28, 60, 72, 72, 10), hex('#6d6f74'), { light: 0.55, rim: 0.35 })
  for (const y of [70, 120]) c.fill(rect(28, y, 72, 4), [...shade(IRON, 0.1), 1])
  for (let i = 0; i < 6; i++) c.fill(circle(34 + i * 12, 72, 1.2), [...hex('#a8a8ae'), 1])
  form(c, rect(56, 14, 16, 50, 3), hex('#5a5c62'), { light: 0.5, rim: 0.35 })
  form(c, poly([[46, 18], [82, 18], [72, 6], [56, 6]]), hex('#4a4c52'), { light: 0.5 })
  contact(c, 64, 185, 44)
  return c
}
function logPile(): Canvas {
  const c = new Canvas(256, 128)
  const rows: [number, number, number][] = [[5, 100, 0], [4, 72, 14], [3, 44, 28]]
  for (const [n, y, off] of rows) for (let i = 0; i < n; i++) {
    const x = 46 + off * 2 + i * 41 - off, r = 19
    form(c, circle(x, y, r), hex('#6b4a2e'), { light: 0.5, rim: 0.3, grain: { amount: 0.3, cells: 10, seed: i + y } })
    c.fill(circle(x, y, r - 4), (px, py) => {
      const d = Math.hypot(px - x, py - y) / (r - 4)
      return [...shade(mix(hex('#e0bd86'), hex('#c49a62'), d), Math.sin(d * 18) * 0.05 + (px < x - 6 ? 0.08 : 0)), 1] as RGBA
    })
    c.fill(capsule(x - 2, y - 1, x + 6, y + 3, 0.7), [...hex('#8a6a42'), 0.6])
  }
  contact(c, 128, 120, 100)
  return c
}
/** A sawhorse with a log across it and a bow saw leaning on it. */
function sawBench(): Canvas {
  const c = new Canvas(192, 128)
  for (const x of [52, 140]) for (const d of [-1, 1]) wood(c, capsule(x, 70, x + d * 18, 122, 3.5), TIMBER_DARK, x + d)
  wood(c, rect(30, 64, 132, 9, 2), TIMBER, 24, 'x')
  form(c, rect(20, 38, 152, 28, 13), hex('#7a5232'), { light: 0.5, grain: { amount: 0.3, cells: 4, sx: 1, sy: 8, seed: 25 } })
  c.fill(ellipse(171, 52, 6, 13), [...hex('#e0bd86'), 1])
  c.fill(rect(104, 38, 2, 28), [...hex('#d8b07a'), 1])
  // The bow saw.
  c.fill(capsule(150, 120, 182, 30, 2.5), [...TIMBER, 1])
  c.fill(capsule(150, 120, 162, 26, 1), [...hex('#b8bcc4'), 1])
  c.fill(capsule(162, 26, 182, 30, 2.5), [...TIMBER, 1])
  contact(c, 96, 122, 70)
  return c
}

// --- The yard --------------------------------------------------------------------------------------------------------------

/** A wooden box seen from the front and a little above: a lit top, slatted front. */
export function box(c: Canvas, x: number, y: number, w: number, h: number, top: number, colour: RGB, seed: number, lid = false): void {
  c.fill(poly([[x, y + top], [x + 8, y], [x + w + 8, y], [x + w, y + top]]), (px, py) => [...shade(colour, 0.22 + (fbm(px, py, { cells: 4, sx: 1, sy: 6, seed }) - 0.5) * 0.2), 1] as RGBA)
  c.fill(poly([[x + w, y + top], [x + w + 8, y], [x + w + 8, y + h - top], [x + w, y + h]]), [...shade(colour, -0.32), 1])
  c.fill(rect(x, y + top, w, h - top), (px, py) => {
    const slat = Math.floor((py - y - top) / 12), v = (py - y - top) % 12
    return [...shade(colour, (fbm(px, py, { cells: 3, sx: 1, sy: 10, seed: seed + slat }) - 0.5) * 0.3 + (v < 1 ? 0.12 : v > 10.5 ? -0.35 : 0) + (px < x + 3 ? 0.1 : 0)), 1] as RGBA
  })
  for (const px of [x, x + w - 6]) c.fill(rect(px, y + top, 6, h - top), [...shade(colour, -0.12), 1])
  if (lid) c.fill(rect(x - 2, y + top - 3, w + 4, 6, 2), [...shade(colour, -0.05), 1])
}
function bin(): Canvas {
  const c = new Canvas(128, 128)
  box(c, 16, 30, 90, 92, 18, hex('#9a6a3e'), 26, true)
  for (const [x, y] of [[16, 48], [100, 48], [16, 112], [100, 112]]) c.fill(rect(x!, y!, 6, 8, 1), [...IRON, 1])
  form(c, poly([[12, 46], [24, 16], [112, 16], [114, 46]]), hex('#8a5a32'), { light: 0.4, grain: { amount: 0.25, cells: 3, sx: 1, sy: 8, seed: 27 } })
  c.fill(rect(52, 22, 22, 5, 2), [...IRON, 1])
  contact(c, 64, 122, 50)
  return c
}
function crates(): Canvas {
  const c = new Canvas(192, 160)
  const col = hex('#b07a46')
  box(c, 12, 82, 80, 72, 14, col, 28)
  box(c, 96, 86, 76, 68, 14, shade(col, -0.06), 29)
  box(c, 50, 22, 76, 66, 14, shade(col, 0.04), 30)
  // Cross braces on the fronts.
  for (const [x, y, w, h] of [[12, 96, 80, 58], [96, 100, 76, 54], [50, 36, 76, 52]] as const) c.fill(capsule(x + 4, y + h - 4, x + w - 4, y + 4, 3), [...shade(col, -0.1), 1])
  contact(c, 96, 154, 84)
  return c
}
function barrel(): Canvas {
  const c = new Canvas(96, 128)
  const body = intersect(ellipse(48, 72, 42, 64), rect(10, 18, 76, 104))
  c.fill(body, (x, y) => {
    const stave = Math.floor((x - 10) / 9.5), u = (x - 10) % 9.5, across = (x - 48) / 38
    return [...shade(mix(hex('#8a5a32'), hex('#a8703e'), hash(stave, 0, 31)), -across * across * 0.35 - across * 0.12 + (u < 1 ? -0.3 : 0) + (fbm(x, y, { cells: 3, sx: 8, seed: 31 }) - 0.5) * 0.2), 1] as RGBA
  })
  for (const y of [30, 52, 92, 112]) c.fill(intersect(rect(8, y, 80, 5), body), (x) => [...shade(IRON, 0.25 - Math.abs((x - 48) / 40) * 0.2), 1] as RGBA, 'over')
  form(c, ellipse(48, 20, 34, 8), hex('#9a6a3e'), { light: 0.4 })
  c.fill(ellipse(48, 20, 30, 6), (x) => [...shade(hex('#7a5232'), (x - 48) / 120), 1] as RGBA)
  contact(c, 48, 121, 32)
  return c
}
function sack(): Canvas {
  const c = new Canvas(96, 96)
  const bag = rough(union(ellipse(48, 62, 34, 28), poly([[30, 40], [66, 40], [58, 22], [38, 22]])), 2, 10, 32)
  form(c, bag, hex('#c9a878'), { light: 0.5, rim: 0.3, grain: { amount: 0.18, cells: 24, seed: 32 } })
  c.fill(bag, (x, y) => [...hex('#a8885a'), (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? 0.12 : 0], 'atop')
  for (const [ax, ay, bx, by] of [[40, 40, 52, 62], [62, 46, 58, 70]]) c.fill(capsule(ax!, ay!, bx!, by!, 1.2), [...hex('#9a7a50'), 0.6], 'atop')
  c.fill(rect(36, 24, 24, 5, 2), [...hex('#7a5a36'), 1])
  form(c, ellipse(48, 18, 12, 6), hex('#c9a878'), { light: 0.4 })
  for (let i = 0; i < 6; i++) c.fill(circle(70 + i * 3, 86 + (i % 2), 1.5), [...hex('#e3c27a'), 1])
  contact(c, 48, 90, 34)
  return c
}

// --- The Gate, fences, the stall and the porch -----------------------------------------------------------------------------

/** The farm's Gate: two posts and a little shingled roof over the way in, vines climbing; open between the posts. */
function gateArch(): Canvas {
  const c = new Canvas(384, 384)
  for (const x of [52, 332]) {
    wood(c, rect(x - 12, 92, 24, 286, 3), TIMBER, x)
    c.fill(rect(x - 16, 362, 32, 16, 3), [...hex('#9e968a'), 1])
  }
  wood(c, rect(24, 84, 336, 18, 3), TIMBER_DARK, 34, 'x')
  for (const d of [-1, 1]) wood(c, capsule(192 + d * 140, 140, 192 + d * 100, 102, 5), TIMBER_DARK, 35 + d)
  // The roof: shingles in rows over the beam.
  const roofShape = poly([[8, 92], [376, 92], [336, 34], [48, 34]])
  c.fill(roofShape, (x, y) => {
    const row = Math.floor((y - 34) / 12), u = (x + (row % 2) * 10) % 20, v = (y - 34) % 12
    return [...shade(mix(hex('#6f7a48'), hex('#8a8a58'), hash(Math.floor((x + (row % 2) * 10) / 20), row, 36)), (v < 3 ? -0.3 : 0) + (u > 18.5 ? -0.3 : 0) + (x < 80 ? 0.08 : 0)), 1] as RGBA
  })
  form(c, rect(40, 26, 304, 10, 3), hex('#5e5a3a'), { light: 0.4 })
  // Vines and flowers up the posts.
  const r = stream(37)
  for (const x of [52, 332]) for (let i = 0; i < 16; i++) {
    const y = 110 + i * 16 + r() * 6, s = i % 2 ? 1 : -1
    leaf(c, x + s * 6, y, x + s * (16 + r() * 6), y - 8, 4, mix(GREEN.mid, GREEN.light, r()))
    if (r() > 0.6) { c.fill(circle(x + s * 10, y - 4, 3), [...hex('#e87fa0'), 1]); c.fill(circle(x + s * 10, y - 4, 1.2), [...hex('#f6e27a'), 1]) }
  }
  return c
}
function fence(kind: 1 | 2 | 'broken'): Canvas {
  const c = new Canvas(128, 128)
  const rail = (y: number, ax = 0, bx = 128, ay = y, by = y) => wood(c, poly([[ax, ay - 4], [bx, by - 4], [bx, by + 4], [ax, ay + 4]]), shade(TIMBER, 0.05), 38 + y, 'x')
  if (kind === 2) {
    rail(56); rail(92)
    for (let x = 4; x < 128; x += 16) wood(c, poly([[x, 120], [x, 38], [x + 5, 30], [x + 10, 38], [x + 10, 120]]), hex('#d8cdb4'), x)
  } else if (kind === 1) {
    rail(54); rail(86)
    for (const x of [10, 118]) wood(c, rect(x - 7, 34, 14, 88, 3), TIMBER_DARK, x)
  } else {
    rail(54, 0, 70)
    rail(86, 10, 128, 70, 108)
    wood(c, rect(3, 34, 14, 88, 3), TIMBER_DARK, 2)
    wood(c, poly([[104, 122], [100, 44], [114, 40], [118, 122]]), TIMBER_DARK, 3)
  }
  contact(c, 64, 122, 60)
  return c
}
/** A market stall: a striped awning on posts over a counter of produce. */
function stallAwning(): Canvas {
  const c = new Canvas(256, 192)
  for (const x of [30, 226]) wood(c, rect(x - 5, 40, 10, 146, 2), TIMBER_DARK, x)
  box(c, 24, 112, 200, 74, 14, hex('#a8703e'), 39)
  const r = stream(40)
  for (let i = 0; i < 22; i++) {
    const x = 40 + r() * 176, y = 108 + r() * 10, col = [hex('#d8543a'), hex('#e8b43a'), hex('#7aa84a'), hex('#e08a3a')][Math.floor(r() * 4)]!
    fruit(c, x, y, 6 + r() * 3, col)
  }
  // The awning: red and cream stripes, a scalloped edge, lit from the left.
  const awn = poly([[8, 66], [248, 66], [228, 24], [28, 24]])
  c.fill(awn, (x, y) => [...shade(Math.floor((x - 8) / 20) % 2 ? hex('#f2e6d0') : hex('#c8443a'), (y - 24) / 80 - (x - 8) / 900), 1] as RGBA)
  for (let i = 0; i < 12; i++) c.fill(intersect(circle(18 + i * 20, 66, 10), rect(8 + i * 20, 66, 20, 10)), [...(i % 2 ? hex('#f2e6d0') : hex('#c8443a')), 1])
  c.fill(rect(8, 66, 240, 3), [0, 0, 0, 0.15], 'atop')
  contact(c, 128, 186, 110)
  return c
}
/** Wooden steps and a rail before the Farmhouse's door. */
function porch(): Canvas {
  const c = new Canvas(256, 192)
  const col = hex('#a8794a')
  for (let s = 0; s < 3; s++) {
    const y = 120 + s * 22, inset = (2 - s) * 14
    c.fill(rect(48 + inset - s * 6, y - 10, 160 - inset * 2 + s * 12, 10), (x, yy) => [...shade(col, 0.2 + (fbm(x, yy, { cells: 3, sx: 1, sy: 10, seed: 41 + s }) - 0.5) * 0.25), 1] as RGBA)
    c.fill(rect(48 + inset - s * 6, y, 160 - inset * 2 + s * 12, 12), (x, yy) => [...shade(col, -0.18 + (fbm(x, yy, { cells: 3, sx: 1, sy: 10, seed: 44 + s }) - 0.5) * 0.25), 1] as RGBA)
  }
  for (const x of [34, 222]) {
    wood(c, rect(x - 6, 60, 12, 126, 2), TIMBER_DARK, x)
    form(c, circle(x, 58, 8), TIMBER, { light: 0.5 })
  }
  for (const [ax, bx] of [[34, 70], [186, 222]] as const) {
    wood(c, capsule(ax, 74, bx, 74, 3.5), TIMBER, ax, 'x')
    for (let x = ax + 10; x < bx; x += 12) c.fill(rect(x - 2, 76, 4, 80), [...shade(TIMBER, -0.1), 1])
  }
  contact(c, 128, 186, 100)
  return c
}
/** A flower box, hung from its top under a window. */
function flowerBox(): Canvas {
  const c = new Canvas(128, 64)
  box(c, 12, 30, 98, 26, 6, hex('#8a5a32'), 42)
  for (const x of [24, 96]) c.fill(poly([[x, 56], [x + 8, 56], [x + 4, 61]]), [...TIMBER_DARK, 1])
  const r = stream(43)
  for (let i = 0; i < 9; i++) leaf(c, 18 + i * 11, 34, 14 + i * 11 + r() * 8, 18 + r() * 8, 3, GREEN.mid)
  for (let i = 0; i < 8; i++) {
    const x = 20 + i * 12 + r() * 4, y = 12 + r() * 12, col = [hex('#e8566a'), hex('#f6e27a'), hex('#f4f1e6')][i % 3]!
    for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; c.fill(circle(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4), [...col, 1]) }
    c.fill(circle(x, y, 1.6), [...hex('#e8a83a'), 1])
  }
  return c
}
/** Four stakes and a rope round an empty plot, cloth ties on the stakes. */
function lotStakes(): Canvas {
  const c = new Canvas(384, 128)
  const xs = [18, 134, 250, 366]
  for (let i = 0; i < 3; i++) {
    const a = xs[i]!, b = xs[i + 1]!
    for (let t = 0; t < 1; t += 0.01) {
      const x = a + (b - a) * t, y = 54 + Math.sin(t * Math.PI) * 10
      c.fill(circle(x, y, 1.4), [...hex('#d8c8a0'), 1])
    }
  }
  for (const x of xs) {
    wood(c, poly([[x - 5, 112], [x - 5, 44], [x, 38], [x + 5, 44], [x + 5, 112]]), hex('#b08a58'), x)
    c.fill(poly([[x + 4, 52], [x + 16, 56], [x + 14, 62], [x + 4, 60]]), [...hex('#d8543a'), 1])
    c.fill(poly([[x, 112], [x - 4, 122], [x + 4, 122]]), [...hex('#8a6a42'), 1])
  }
  return c
}

// --- Overgrown lots and decorations ----------------------------------------------------------------------------------------

function weeds(variant: 1 | 2): Canvas {
  const c = new Canvas(128, 128)
  grassClump(c, 64, 122, 100, variant === 1 ? 90 : 60, 44 + variant, 30, { root: hex('#3f6a2c'), tip: hex('#a8c25a') })
  const r = stream(46 + variant)
  if (variant === 1) {
    for (let i = 0; i < 5; i++) {
      const x = 20 + r() * 88, top = 30 + r() * 40
      stem(c, x, 122, x + (r() - 0.5) * 10, top, 1.2, hex('#5f8a3a'))
      if (i % 2) { c.fill(circle(x, top, 6), [...hex('#f2f2ea'), 0.9]); for (let k = 0; k < 10; k++) c.fill(capsule(x, top, x + Math.cos(k) * 7, top + Math.sin(k) * 7, 0.4), [...hex('#ffffff'), 0.8]) }
      else { for (let k = 0; k < 8; k++) c.fill(ellipse(x + Math.cos(k * 0.8) * 4, top + Math.sin(k * 0.8) * 4, 3, 2), [...hex('#f2c64a'), 1]); c.fill(circle(x, top, 2.5), [...hex('#e09a2a'), 1]) }
    }
  } else {
    for (let i = 0; i < 7; i++) { const x = 34 + r() * 60, a = -Math.PI / 2 + (r() - 0.5) * 1.4; leaf(c, x, 122, x + Math.cos(a) * 42, 122 + Math.sin(a) * 42, 10, mix(hex('#4f7a34'), hex('#7aa84a'), r())) }
    for (const x of [44, 90]) {
      stem(c, x, 122, x + 4, 42, 1.6, hex('#6f8a4a'))
      form(c, ellipse(x + 4, 42, 7, 6), hex('#7a8a4a'), { light: 0.4 })
      for (let k = 0; k < 9; k++) c.fill(capsule(x + 4, 38, x - 4 + k, 26, 1.1, 0.4), [...hex('#a85aa8'), 1])
    }
  }
  return c
}
function brambles(): Canvas {
  const c = new Canvas(192, 160)
  const r = stream(48)
  for (let i = 0; i < 9; i++) {
    const x0 = 30 + r() * 132, h = 60 + r() * 80, x1 = Math.min(176, Math.max(16, x0 + (r() - 0.5) * 120))
    let px = x0, py = 154
    for (let t = 1; t <= 12; t++) {
      const k = t / 12, x = x0 + (x1 - x0) * k, y = 154 - Math.sin(k * Math.PI * 0.85) * h
      c.fill(capsule(px, py, x, y, 2.4, 2), [...mix(hex('#5a2a2a'), hex('#7a3a32'), r()), 1])
      if (t % 3 === 0) leaf(c, x, y, x + (r() - 0.5) * 22, y - 8 - r() * 8, 5, mix(hex('#3f6a2c'), hex('#6f9a44'), r()))
      if (t % 2 === 0) c.fill(poly([[x, y - 2], [x + 4, y - 6], [x + 1, y]]), [...hex('#d8c8a8'), 1])
      px = x; py = y
    }
  }
  for (let i = 0; i < 10; i++) { const x = 30 + r() * 132, y = 50 + r() * 70; fruit(c, x, y, 3.4, hex('#2a2440')) }
  contact(c, 96, 154, 80)
  return c
}
function flowers(variant: 1 | 2): Canvas {
  const c = new Canvas(128, 64)
  grassClump(c, 64, 58, 100, 20, 49 + variant, 20)
  const r = stream(50 + variant), cols = variant === 1 ? [hex('#f6e27a'), hex('#f4f1e6'), hex('#f2c64a')] : [hex('#e87fa0'), hex('#a87fd8'), hex('#f4b6c8')]
  for (let i = 0; i < 11; i++) {
    const x = 14 + r() * 100, y = 14 + r() * 28, col = cols[i % 3]!
    stem(c, x, 58, x + (r() - 0.5) * 6, y, 0.9, hex('#4f8a3c'))
    for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2 + i; c.fill(ellipse(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3, 2.6, 2.2), [...shade(col, p < 2 ? 0.1 : -0.05), 1]) }
    c.fill(circle(x, y, 1.6), [...(variant === 1 ? hex('#e09a2a') : hex('#f6e27a')), 1])
  }
  return c
}
function bush(variant: 1 | 2): Canvas {
  const c = new Canvas(160, 128)
  foliage(c, clumps(52 + variant, 80, 72, 58, 40, 9, 22, 30), variant === 1 ? { ...GREEN } : { dark: hex('#2a5a3a'), mid: hex('#457f4f'), light: hex('#7ab06a') }, 52 + variant, 4)
  if (variant === 2) { const r = stream(54); for (let i = 0; i < 16; i++) fruit(c, 34 + r() * 92, 40 + r() * 56, 2.6, hex('#d83a3a')) }
  contact(c, 80, 121, 50)
  return c
}
/** A post lantern: an iron post, warm glass in a housing, a cap. Its live light is the stage's. */
function lantern(): Canvas {
  const c = new Canvas(64, 192)
  form(c, rect(28, 70, 8, 116, 2), IRON, { light: 0.5, rim: 0.35 })
  form(c, rect(22, 176, 20, 10, 2), IRON, { light: 0.5 })
  c.fill(rect(16, 30, 32, 40, 3), [...IRON, 1])
  c.fill(rect(20, 34, 24, 32, 2), radial(32, 48, 18, hex('#fff2b8'), hex('#f2a03a')))
  c.fill(rect(31, 34, 2, 32), [...IRON, 1])
  form(c, poly([[12, 32], [52, 32], [42, 18], [22, 18]]), IRON, { light: 0.5 })
  form(c, circle(32, 14, 5), IRON, { light: 0.5 })
  c.fill(rect(16, 70, 32, 4, 1), [...IRON, 1])
  return c
}
export function radial(cx: number, cy: number, r: number, inner: RGB, outer: RGB) {
  return (x: number, y: number): RGBA => { const t = Math.min(1, Math.hypot(x - cx, y - cy) / r); return [...mix(inner, outer, t), 1] as RGBA }
}

/** Every prop and mounted piece of wave 1, by name. */
export const PROP_DRAWERS: Readonly<Record<string, () => Canvas>> = {
  'tree-1': tree1, 'tree-2': tree2, 'tree-3': tree3, stump, 'mushroom-patch': mushroomPatch, 'herb-patch': herbPatch,
  scarecrow, dock, reeds, 'mill-sails': millSails, chimney, smoker, 'log-pile': logPile, 'saw-bench': sawBench,
  bin, crates, barrel, sack, 'gate-arch': gateArch, 'fence-1': () => fence(1), 'fence-2': () => fence(2), 'fence-broken': () => fence('broken'),
  'stall-awning': stallAwning, porch, 'flower-box': flowerBox, 'lot-stakes': lotStakes,
  'weeds-1': () => weeds(1), 'weeds-2': () => weeds(2), brambles, 'flowers-1': () => flowers(1), 'flowers-2': () => flowers(2),
  'bush-1': () => bush(1), 'bush-2': () => bush(2), 'rock-small': rockSmall, lantern,
}
void linear; void subtract
