// kit-farm's crops (KF6): three shared stages and twelve ripe families, each a 128-wide card standing on its plot's
// tile, its foot at the bottom middle; drawn in code (P147). The crop's own icon names it in the bubble; the family only
// has to read as the plant.
import { hex, mix, shade, type RGB } from '../color.js'
import { contact, form, fruit, leaf, stem } from '../form.js'
import { stream } from '../noise.js'
import { Canvas, capsule, circle, ellipse, intersect, poly, rect } from '../paint.js'

const LEAF = { dark: hex('#3f7a34'), mid: hex('#5f9a40'), light: hex('#8cc25a') }
const XS = [30, 64, 98]
const pick = (r: () => number, a: RGB, b: RGB) => mix(a, b, r())

/** A small mound of soil at a plant's foot, so it sits in its row. */
function mound(c: Canvas, x: number, y: number, w = 16): void { form(c, ellipse(x, y, w, 4), hex('#6a4a2c'), { light: 0.4, rim: 0.2 }) }

function sprout(): Canvas {
  const c = new Canvas(128, 64), r = stream(1)
  for (const x of XS) {
    mound(c, x, 56, 12)
    stem(c, x, 56, x, 40, 1.4, LEAF.mid)
    leaf(c, x, 41, x - 12, 34 - r() * 4, 4.5, pick(r, LEAF.mid, LEAF.light))
    leaf(c, x, 41, x + 12, 34 - r() * 4, 4.5, pick(r, LEAF.mid, LEAF.light))
  }
  return c
}
/** A young plant: a fan of leaves. */
function young(c: Canvas, x: number, foot: number, size: number, r: () => number, colours: { a: RGB; b: RGB }, droop = 0): void {
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.42 + (r() - 0.5) * 0.2, l = size * (0.7 + r() * 0.4)
    const tx = x + Math.cos(a) * l, ty = foot - 4 + Math.sin(a) * l * (1 - droop) + droop * l * 0.4
    leaf(c, x, foot - 4, tx, ty, size * 0.22, pick(r, colours.a, colours.b))
  }
}
function growing(): Canvas {
  const c = new Canvas(128, 96), r = stream(2)
  for (const x of XS) { mound(c, x, 88); young(c, x, 90, 34, r, { a: LEAF.dark, b: LEAF.light }) }
  return c
}
function withered(): Canvas {
  const c = new Canvas(128, 96), r = stream(3)
  for (const x of XS) {
    mound(c, x, 88)
    // A bent, browned stalk, its leaves hanging.
    stem(c, x, 88, x + 4, 46, 1.6, hex('#8a7a44'))
    for (let i = 0; i < 5; i++) { const y = 48 + i * 6, s = i % 2 ? 1 : -1; leaf(c, x + 3, y, x + s * (12 + r() * 6), y + 10 + r() * 6, 3.5, pick(r, hex('#7a6a3a'), hex('#a8905a'))) }
  }
  return c
}
/** Root crops: feathery tops over the soil, an orange shoulder showing. */
function root(): Canvas {
  const c = new Canvas(128, 96), r = stream(4)
  for (const x of XS) {
    mound(c, x, 86, 18)
    form(c, intersect(ellipse(x, 88, 9, 12), rect(x - 10, 76, 20, 12)), hex('#e8822e'), { light: 0.5 })
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.16, l = 28 + r() * 12, tx = x + Math.cos(a) * l, ty = 78 + Math.sin(a) * l
      stem(c, x, 78, tx, ty, 1, LEAF.mid)
      for (let k = 1; k < 5; k++) c.fill(circle(x + (tx - x) * k / 5 + (k % 2 ? 3 : -3), 78 + (ty - 78) * k / 5, 2.6), [...pick(r, LEAF.mid, LEAF.light), 1])
    }
  }
  return c
}
/** A head of cabbage: tight round leaves wrapped by looser outer ones. */
function leafy(): Canvas {
  const c = new Canvas(128, 96), r = stream(5)
  for (const [x, s] of [[38, 1], [90, 0.92]] as const) {
    for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; leaf(c, x, 74, x + Math.cos(a) * 36 * s, 72 + Math.sin(a) * 22 * s, 11 * s, pick(r, hex('#5f9a50'), hex('#8cc27a')), true) }
    form(c, circle(x, 62, 21 * s), hex('#a8d48a'), { light: 0.55, rim: 0.35 })
    for (let i = 0; i < 4; i++) c.fill(capsule(x - 14 * s + i * 8 * s, 50, x - 8 * s + i * 6 * s, 76, 0.7), [...hex('#7aa86a'), 0.6], 'atop')
    contact(c, x, 88, 26 * s)
  }
  return c
}
/** A herb clump: small leaves, low and bushy, a few flowers. */
function herb(): Canvas {
  const c = new Canvas(128, 96), r = stream(6)
  for (const x of XS) {
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.6, l = 10 + r() * 22, bx = x + (r() - 0.5) * 8
      leaf(c, bx, 88, bx + Math.cos(a) * l, 88 + Math.sin(a) * l * 0.9, 4, pick(r, hex('#3f8a4a'), hex('#7ac06a')))
    }
    for (let i = 0; i < 3; i++) c.fill(circle(x + (r() - 0.5) * 20, 56 + r() * 10, 2), [...hex('#b88ad8'), 1])
  }
  return c
}
/** Grain: tall golden stalks, heavy heads bending. */
function grain(): Canvas {
  const c = new Canvas(128, 160), r = stream(7)
  for (let i = 0; i < 16; i++) {
    const x = 14 + i * 6.4 + (r() - 0.5) * 4, top = 26 + r() * 22, bend = (r() - 0.3) * 12
    stem(c, x, 154, x + bend * 0.6, top + 14, 1.1, hex('#c8a84a'))
    leaf(c, x, 130 - r() * 30, x + (r() - 0.5) * 30, 100 - r() * 30, 2.5, hex('#b8a04a'), false)
    for (let k = 0; k < 6; k++) form(c, ellipse(x + bend * 0.6 + bend * 0.07 * k, top + k * 3.4, 2.6, 2.2), shade(hex('#e3c25a'), k * -0.03), { light: 0.5, rim: 0.3, rimWidth: 1 })
    c.fill(capsule(x + bend * 0.6, top, x + bend * 0.9, top - 10, 0.4), [...hex('#e8d08a'), 0.9])
  }
  return c
}
/** Rice: clumps of green-gold blades, panicles bowing. */
function rice(): Canvas {
  const c = new Canvas(128, 128), r = stream(8)
  for (const x of XS) {
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i - 4.5) * 0.07, l = 70 + r() * 30; leaf(c, x, 120, x + Math.cos(a) * l, 120 + Math.sin(a) * l, 2.2, pick(r, hex('#6f9a40'), hex('#a8c25a')), false) }
    for (let p = 0; p < 3; p++) {
      const sx = x + (p - 1) * 6, sy = 50 - p * 4
      stem(c, sx, 100, sx + 4, sy, 0.9, hex('#a8b04a'))
      for (let k = 0; k < 7; k++) form(c, ellipse(sx + 4 + k * 2.2, sy + k * 3.5, 1.8, 1.4), hex('#d8c26a'), { light: 0.5, rimWidth: 0.8 })
    }
  }
  return c
}
/** A staked plant: a cane with ties, leaves along it, its fruit. */
function staked(kind: 'red' | 'green' | 'purple'): Canvas {
  const c = new Canvas(128, 192), r = stream(kind.length * 9)
  for (const x of [40, 88]) {
    form(c, rect(x - 2.5, 20, 5, 166, 2), hex('#b08a58'), { light: 0.4 })
    for (const y of [60, 110, 150]) c.fill(rect(x - 4, y, 8, 3, 1), [...hex('#d8c8a0'), 1])
    let px = x, py = 186
    for (let k = 1; k <= 8; k++) {
      const nx = x + Math.sin(k * 1.3) * 7, ny = 186 - k * 20
      stem(c, px, py, nx, ny, 1.6, LEAF.mid); px = nx; py = ny
      const s = k % 2 ? 1 : -1
      leaf(c, nx, ny, nx + s * (16 + r() * 8), ny - 6 - r() * 6, 6, pick(r, LEAF.dark, LEAF.light))
    }
    for (let k = 0; k < 4; k++) {
      const fx = x + (k % 2 ? 9 : -9), fy = 64 + k * 30 + r() * 8
      if (kind === 'red') { fruit(c, fx, fy, 8, hex('#d8402e')); c.fill(poly([[fx - 4, fy - 8], [fx + 4, fy - 8], [fx, fy - 5]]), [...LEAF.dark, 1]) }
      else if (kind === 'green') { fruit(c, fx, fy + 2, 7.5, hex('#4f9a3a'), 9); c.fill(capsule(fx - 3, fy + 2, fx - 3, fy + 8, 0.7), [...hex('#2f6a2a'), 0.6], 'atop'); stem(c, fx, fy - 7, fx + 1, fy - 12, 1.4, hex('#3f6a2a')) }
      else { fruit(c, fx, fy + 6, 6.5, hex('#5a2a6a'), 13); form(c, ellipse(fx, fy - 7, 5, 3), hex('#4f7a3a'), { light: 0.4 }) }
    }
    contact(c, x, 186, 10)
  }
  return c
}
/** Corn: tall stalks with long arching leaves, cobs in green husks with gold silk. */
function corn(): Canvas {
  const c = new Canvas(128, 192), r = stream(10)
  for (const x of [42, 88]) {
    stem(c, x, 184, x + 2, 24, 3, hex('#6f9a40'), 2)
    for (let k = 0; k < 7; k++) {
      const y = 170 - k * 20, s = k % 2 ? 1 : -1
      leaf(c, x, y, x + s * (26 + r() * 8), y - 10 + k * 3, 5, pick(r, LEAF.mid, LEAF.light))
    }
    for (const [y, s] of [[110, 1], [140, -1]] as const) {
      form(c, ellipse(x + s * 8, y, 6, 15), hex('#e8c84a'), { light: 0.5 })
      leaf(c, x + s * 3, y + 16, x + s * 12, y - 16, 6, hex('#8ab05a'))
      c.fill(capsule(x + s * 9, y - 15, x + s * 13, y - 24, 1.2), [...hex('#c8783a'), 1])
    }
    for (let k = 0; k < 5; k++) c.fill(capsule(x + 2, 24, x - 8 + k * 4, 10, 0.9), [...hex('#d8c26a'), 1])
    contact(c, x, 186, 8)
  }
  return c
}
/** Sunflowers: a tall stem, broad leaves, a big face of seeds in gold petals. */
function sunflower(): Canvas {
  const c = new Canvas(128, 192), r = stream(11)
  for (const [x, top, s] of [[44, 52, 1], [88, 72, 0.85]] as const) {
    stem(c, x, 186, x + 2, top, 3, hex('#5f8a3a'), 2.4)
    for (const [y, d] of [[150, -1], [120, 1], [96, -1]] as const) leaf(c, x, y, x + d * 28 * s, y - 14, 11 * s, pick(r, LEAF.mid, LEAF.light))
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      leaf(c, x + 2 + Math.cos(a) * 12 * s, top + Math.sin(a) * 11 * s, x + 2 + Math.cos(a) * 25 * s, top + Math.sin(a) * 22 * s, 4.5 * s, shade(hex('#f2c230'), Math.sin(a + 2.3) * 0.12), false)
    }
    c.fill(ellipse(x + 2, top, 13 * s, 12 * s), (px, py) => [...shade(hex('#5a3a1e'), ((Math.floor(px / 2) + Math.floor(py / 2)) % 2) * 0.12 - (px - x) / 100), 1] as [number, number, number, number])
    contact(c, x, 186, 9)
  }
  return c
}
/** Asparagus: green spears with purple tips. */
function spear(): Canvas {
  const c = new Canvas(128, 128), r = stream(12)
  for (let i = 0; i < 11; i++) {
    const x = 20 + i * 8.6 + (r() - 0.5) * 4, top = 40 + r() * 50
    form(c, capsule(x, 122, x + (r() - 0.5) * 4, top, 3.2, 2.6), hex('#6f9a40'), { light: 0.4, rim: 0.3 })
    form(c, ellipse(x, top + 2, 3.6, 6), hex('#7a5a8a'), { light: 0.5 })
    for (let k = 1; k < 4; k++) c.fill(poly([[x - 3, top + 14 + k * 14], [x, top + 10 + k * 14], [x + 3, top + 14 + k * 14]]), [...hex('#4f7a34'), 0.8], 'atop')
  }
  mound(c, 64, 122, 50)
  return c
}
/** The Emperor Pumpkin: a huge ribbed orange gourd on its vine. */
function gourd(): Canvas {
  const c = new Canvas(128, 96), r = stream(13)
  for (let i = 0; i < 5; i++) leaf(c, 18 + i * 23, 86, 16 + i * 24 + r() * 6, 70 - r() * 16, 9, pick(r, LEAF.dark, LEAF.mid))
  const body = ellipse(64, 62, 46, 28)
  form(c, body, hex('#e8862e'), { light: 0.55, rim: 0.35 })
  for (const dx of [-28, -12, 6, 22]) c.fill(capsule(64 + dx, 38, 64 + dx * 1.15, 86, 1.6), [...hex('#b8601e'), 0.7], 'atop')
  c.fill(ellipse(46, 50, 10, 6), [1, 1, 1, 0.3], 'atop')
  stem(c, 64, 38, 70, 24, 4, hex('#6f7a3a'), 3)
  c.fill(capsule(70, 26, 86, 18, 1), [...LEAF.mid, 1])
  contact(c, 64, 89, 44)
  return c
}

/** Every crop frame of wave 1, by name. */
export const CROP_DRAWERS: Readonly<Record<string, () => Canvas>> = {
  'crop-sprout': sprout, 'crop-growing': growing, 'crop-withered': withered, 'crop-root': root, 'crop-leafy': leafy, 'crop-herb': herb,
  'crop-grain': grain, 'crop-rice': rice, 'crop-staked-red': () => staked('red'), 'crop-staked-green': () => staked('green'),
  'crop-staked-purple': () => staked('purple'), 'crop-corn': corn, 'crop-sunflower': sunflower, 'crop-spear': spear, 'crop-gourd': gourd,
}
