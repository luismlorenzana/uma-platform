// kit-farm's ground (KF12): grass, path, tilled soil, forest floor, water and paving, and the risers, drawn in code
// (P147). Every floor tiles with every variant of its family in any order: the texture repeats every tile, the variants
// share the tile's edge band, and differ only inside it (their own patches, tufts, pebbles and leaves). Risers repeat
// left to right; their top 16 texels are the lip. Neutral late-spring light from the top front-left (KF10).
import { hex, mix, shade, smooth, type RGB, type RGBA } from '../color.js'
import { cells, fbm, hash, stream } from '../noise.js'
import { Canvas, capsule, circle, ellipse, fading, fillTiled, rect, type Paint, type Shape } from '../paint.js'

const T = 128
/** Distance (texels) from a texel's middle to the tile's nearest edge. */
export const edgeDist = (x: number, y: number) => Math.min(x, T - x, y, T - y)
/** 0 on the edge band, 1 well inside: where a variant may differ. */
export const inside = (x: number, y: number) => smooth(10, 30, edgeDist(x, y))
export const seedOf = (family: string) => [...family].reduce((s, c) => (s * 31 + c.charCodeAt(0)) | 0, 7)

/** Where decorations go: on the shared edge band (drawn across the edges, the same on every variant), or inside (a
 * variant's own, kept clear of the edges). */
export function scatter(n: number, seed: number, zone: 'edge' | 'inner', reach: number, each: (x: number, y: number, r: () => number) => void): void {
  const r = stream(seed)
  for (let tries = 0, placed = 0; placed < n && tries < n * 40; tries++) {
    const x = r() * T, y = r() * T, d = edgeDist(x, y)
    if (zone === 'edge' ? d > 22 : d < 8 + reach) continue
    placed++
    each(x, y, r)
  }
}
/** Fills a shape on a floor; an edge decoration also at its wrapped places, so it crosses into the next tile. */
export function fillAt(c: Canvas, s: Shape, paint: Paint, zone: 'edge' | 'inner', opacity = 1): void {
  if (zone === 'edge') fillTiled(c, s, paint, T, 'xy', 'over', opacity)
  else c.fill(s, paint, 'over', opacity)
}

/** A floor: a tiling texture (shared at the edges, the variant's inside), then decorations on both zones. */
export function floor(texel: (x: number, y: number, seed: number) => RGB, family: string, variant: number,
  decorate: (c: Canvas, zone: 'edge' | 'inner', seed: number) => void): Canvas {
  const c = new Canvas(T, T), shared = seedOf(family), own = shared + variant * 101
  c.paint((x, y) => { const a = texel(x, y, shared), k = variant === 1 ? 0 : inside(x, y); return [...(k ? mix(a, texel(x, y, own), k) : a), 1] as RGBA })
  decorate(c, 'edge', shared)
  decorate(c, 'inner', own)
  return c
}

// --- Grass ---------------------------------------------------------------------------------------------------------------

export const GRASS = { base: hex('#6fa64a'), light: hex('#8fc45c'), dark: hex('#4c8636'), tip: hex('#b2d672'), deep: hex('#3d7030') }
export const grassTexel = (x: number, y: number, seed: number): RGB => {
  const big = fbm(x, y, { cells: 3, tile: T, octaves: 3, seed }), fine = fbm(x, y, { cells: 16, tile: T, octaves: 2, seed: seed + 5 })
  const warm = fbm(x, y, { cells: 2, tile: T, octaves: 2, seed: seed + 9 })
  const mid = fbm(x, y, { cells: 8, tile: T, octaves: 2, seed: seed + 3 })
  let c = mix(GRASS.dark, GRASS.light, 0.3 + smooth(0.2, 0.8, big) * 0.3 + (mid - 0.5) * 0.35)
  c = mix(c, GRASS.base, 0.3)
  c = shade(c, (fine - 0.5) * 0.18)
  return mix(c, hex('#9cb64a'), smooth(0.6, 0.85, warm) * 0.25)
}
/** A tuft of blades: dark at the root, light at the tip, leaning a little. */
export function tuft(c: Canvas, x: number, y: number, r: () => number, zone: 'edge' | 'inner', size = 1): void {
  const blades = 3 + Math.floor(r() * 4)
  for (let i = 0; i < blades; i++) {
    const bx = x + (r() - 0.5) * 7 * size, len = (5 + r() * 7) * size, lean = (r() - 0.5) * 6 * size
    const tip = r() > 0.5 ? GRASS.tip : GRASS.light
    fillAt(c, capsule(bx, y, bx + lean, y - len, 1.1 * size, 0.35), (px, py) => [...mix(GRASS.deep, tip, smooth(y, y - len, py)), 1] as RGBA, zone)
  }
}
export function grass(variant: number): Canvas {
  return floor(grassTexel, 'grass', variant, (c, zone, seed) => {
    scatter(zone === 'edge' ? 44 : 34 + variant * 3, seed, zone, 8, (x, y, r) => tuft(c, x, y, r, zone))
    if (zone === 'inner') {
      // A variant's own: clover in 2, a few daisies in 3, a darker damp patch in 4.
      if (variant === 2) scatter(5, seed + 3, zone, 6, (x, y, r) => { for (let i = 0; i < 3; i++) fillAt(c, circle(x + (r() - 0.5) * 6, y + (r() - 0.5) * 5, 2.2), [...GRASS.light, 1], zone) })
      if (variant === 3) scatter(6, seed + 4, zone, 4, (x, y) => { fillAt(c, circle(x, y, 2), [...hex('#f6f3e4'), 1], zone); fillAt(c, circle(x, y, 0.9), [...hex('#f2c94a'), 1], zone) })
      if (variant === 4) c.paint(fading(GRASS.deep, (x, y) => (1 - smooth(10, 30, Math.hypot((x - 64) / 1.4, y - 64))) * 0.3 * (0.6 + fbm(x, y, { cells: 8, seed }))))
    }
  })
}

// --- Path ----------------------------------------------------------------------------------------------------------------

export const DIRT = { base: hex('#c9a56f'), light: hex('#dcbd8a'), dark: hex('#a8834f'), stone: hex('#b9ab94'), stoneDark: hex('#8c7e69') }
export const pathTexel = (x: number, y: number, seed: number): RGB => {
  const big = fbm(x, y, { cells: 3, tile: T, octaves: 3, seed }), fine = fbm(x, y, { cells: 32, tile: T, octaves: 2, seed: seed + 3 })
  return shade(mix(DIRT.dark, DIRT.light, smooth(0.2, 0.8, big)), (fine - 0.5) * 0.12)
}
/** A pebble: a rounded stone lit on its upper left, a dark rim below. */
export function pebble(c: Canvas, x: number, y: number, rx: number, ry: number, zone: 'edge' | 'inner', base = DIRT.stone): void {
  fillAt(c, ellipse(x + 0.6, y + 0.8, rx + 0.4, ry + 0.4), [...DIRT.dark, 0.7], zone)
  fillAt(c, ellipse(x, y, rx, ry), (px, py) => [...mix(shade(base, 0.25), shade(base, -0.18), smooth(-ry, ry, (px - x) * 0.5 + (py - y))), 1] as RGBA, zone)
}
export function path(variant: number): Canvas {
  return floor(pathTexel, 'path', variant, (c, zone, seed) => {
    scatter(zone === 'edge' ? 16 : 10 + variant * 4, seed, zone, 4, (x, y, r) => pebble(c, x, y, 1.4 + r() * 2.2, 1 + r() * 1.4, zone, mix(DIRT.stone, DIRT.stoneDark, r() * 0.5)))
    if (zone === 'inner' && variant === 2) c.paint(fading(DIRT.dark, (x, y) => (1 - smooth(6, 24, Math.hypot((x - 60) / 1.6, y - 70))) * 0.28 * (0.5 + fbm(x, y, { cells: 8, seed }))))
  })
}

// --- Tilled soil ---------------------------------------------------------------------------------------------------------

const SOIL = { base: hex('#7a5232'), light: hex('#9a6c44'), dark: hex('#553821'), deep: hex('#43301c') }
const tilledTexel = (x: number, y: number, seed: number): RGB => {
  // Eight furrows a tile: each ridge lit on its upper side, its trough dark.
  const p = (y % 16) / 16, ridge = Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5
  const wob = fbm(x, y, { cells: 8, tile: T, octaves: 3, seed }), fine = fbm(x, y, { cells: 32, tile: T, octaves: 2, seed: seed + 2 })
  const lit = p < 0.45 ? smooth(0.05, 0.4, p) * (1 - smooth(0.4, 0.5, p)) : 0
  let col = mix(SOIL.deep, SOIL.base, ridge * 0.8 + wob * 0.2)
  col = mix(col, SOIL.light, lit * 0.7)
  return shade(col, (fine - 0.5) * 0.14)
}
export function tilled(variant: number): Canvas {
  return floor(tilledTexel, 'tilled', variant, (c, zone, seed) => {
    // Clods along the ridges.
    scatter(zone === 'edge' ? 10 : 8, seed, zone, 3, (x, y, r) => {
      const ry = Math.floor(y / 16) * 16 + 5
      pebble(c, x, ry, 1.2 + r() * 1.2, 0.9 + r() * 0.6, zone, mix(SOIL.base, SOIL.light, r() * 0.6))
    })
    if (zone === 'inner' && variant === 2) c.paint(fading(SOIL.deep, (x, y) => (1 - smooth(8, 30, Math.hypot((x - 64) / 1.4, y - 60))) * 0.25 * (0.5 + fbm(x, y, { cells: 8, seed }))))
  })
}

// --- Forest floor --------------------------------------------------------------------------------------------------------

const FOREST = { loam: hex('#5b4a32'), moss: hex('#5f7d3a'), mossLight: hex('#7d9a48'), dark: hex('#3c3222') }
const LEAVES: RGB[] = [hex('#8a7a3a'), hex('#a0683a'), hex('#6f8a3a'), hex('#b08a48')]
const forestTexel = (x: number, y: number, seed: number): RGB => {
  const moss = fbm(x, y, { cells: 4, tile: T, octaves: 3, seed }), fine = fbm(x, y, { cells: 24, tile: T, octaves: 2, seed: seed + 1 })
  let c = mix(FOREST.loam, FOREST.moss, smooth(0.42, 0.62, moss))
  c = mix(c, FOREST.mossLight, smooth(0.62, 0.8, moss) * 0.6)
  return shade(c, (fine - 0.5) * 0.18)
}
/** A fallen leaf: a small lens, lit on its upper side, with a dark vein. */
function leaf(c: Canvas, x: number, y: number, r: () => number, zone: 'edge' | 'inner'): void {
  const ang = r() * Math.PI, len = 2.6 + r() * 1.8, dx = Math.cos(ang) * len, dy = Math.sin(ang) * len * 0.6
  const col = mix(LEAVES[Math.floor(r() * LEAVES.length)]!, FOREST.loam, 0.25)
  fillAt(c, capsule(x - dx, y - dy, x + dx, y + dy, 1.5, 1.5), (px, py) => [...shade(col, (y - py) * 0.05), 1] as RGBA, zone)
  fillAt(c, capsule(x - dx * 0.8, y - dy * 0.8, x + dx * 0.8, y + dy * 0.8, 0.35), [...shade(col, -0.35), 0.7], zone)
}
export function forestFloor(variant: number): Canvas {
  return floor(forestTexel, 'forest-floor', variant, (c, zone, seed) => {
    scatter(zone === 'edge' ? 34 : 30, seed, zone, 5, (x, y, r) => leaf(c, x, y, r, zone))
    scatter(zone === 'edge' ? 4 : 4, seed + 7, zone, 10, (x, y, r) => {
      const a = r() * Math.PI, l = 6 + r() * 6
      fillAt(c, capsule(x - Math.cos(a) * l, y - Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5, 0.9), [...hex('#4a3a26'), 1], zone)
    })
    if (zone === 'inner') scatter(variant === 2 ? 5 : 3, seed + 9, zone, 6, (x, y, r) => tuft(c, x, y, r, zone, 0.8))
  })
}

// --- Water ---------------------------------------------------------------------------------------------------------------

export const WATER = { deep: hex('#3a86b0'), mid: hex('#4f9dc6'), light: hex('#86c8e6'), sparkle: hex('#e6f6ff') }
export const waterTexel = (x: number, y: number, seed: number): RGB => {
  const big = fbm(x, y, { cells: 2, tile: T, octaves: 3, seed, sy: 2 }), ripple = fbm(x, y, { cells: 4, tile: T, octaves: 3, seed: seed + 4, sy: 4 })
  let c = mix(WATER.deep, WATER.mid, smooth(0.3, 0.7, big))
  // Light bands where the ripples crest.
  c = mix(c, WATER.light, smooth(0.58, 0.76, ripple) * 0.45)
  return c
}
export function water(variant: number): Canvas {
  return floor(waterTexel, 'water', variant, (c, zone, seed) => {
    scatter(zone === 'edge' ? 10 : 8, seed, zone, 8, (x, y, r) => {
      const l = 3 + r() * 6
      fillAt(c, capsule(x - l, y, x + l, y, 0.8), [...WATER.light, 0.85], zone)
      if (r() > 0.5) fillAt(c, capsule(x - l * 0.4, y - 0.4, x + l * 0.3, y - 0.4, 0.5), [...WATER.sparkle, 0.9], zone)
    })
  })
}

// --- Paving --------------------------------------------------------------------------------------------------------------

export const STONE = { a: hex('#bdb6a6'), b: hex('#aaa393'), c: hex('#c9c2b0'), mortar: hex('#7e776a'), dark: hex('#6a6458') }
/** Setts in running bond: rows of four 32-texel stones, every other row shifted by half a stone (repeats every tile). */
function sett(x: number, y: number): { id: number; u: number; v: number } {
  const row = Math.floor(y / 32), shift = row % 2 ? 16 : 0, col = Math.floor((x + shift) / 32) % 4
  return { id: row * 4 + col, u: ((x + shift) % 32) - 16, v: (y % 32) - 16 }
}
const pavingTexel = (seed: number) => (x: number, y: number, sharedSeed: number): RGB => {
  const s = sett(x, y)
  // A stone's colour and size are its own; stones that touch an edge keep the shared ones, so every variant meets.
  const edgeStone = s.id < 4 || s.id >= 12 || [0, 3].includes(s.id % 4) || (Math.floor(s.id / 4) % 2 === 1 && s.id % 4 === 1)
  const own = edgeStone ? sharedSeed : seed, h = hash(s.id, 0, own)
  const hx = 15.2 - hash(s.id, 1, own) * 1.1, hy = 15 - hash(s.id, 2, own) * 1.1, ox = (hash(s.id, 3, own) - 0.5) * 0.8, oy = (hash(s.id, 4, own) - 0.5) * 0.8
  const qx = Math.abs(s.u - ox) - (hx - 4), qy = Math.abs(s.v - oy) - (hy - 4)
  const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 4 + (fbm(x, y, { cells: 16, tile: T, octaves: 2, seed: sharedSeed + 5 }) - 0.5) * 2.2
  let c = h < 0.33 ? STONE.a : h < 0.66 ? STONE.b : STONE.c
  const fine = fbm(x, y, { cells: 32, tile: T, octaves: 2, seed: sharedSeed + 2 })
  c = shade(c, (fine - 0.5) * 0.16)
  // Rounded stone edges: lit upper-left, shaded lower-right, mortar in the joints.
  const rim = smooth(-4, 0, d), toward = ((s.u - ox) + (s.v - oy)) / 20
  c = shade(c, rim * (toward < 0 ? 0.12 : -0.2))
  return mix(c, STONE.mortar, smooth(-0.4, 0.8, d))
}
export function paving(variant: number): Canvas {
  const own = seedOf('paving') + variant * 101
  // Paving varies by its stones' colours, not a cross-fade, so its joints stay crisp.
  const c = new Canvas(T, T)
  c.paint((x, y) => [...pavingTexel(variant === 1 ? seedOf('paving') : own)(x, y, seedOf('paving')), 1] as RGBA)
  scatter(variant === 1 ? 3 : 5, own + 3, 'inner', 4, (x, y, r) => tuft(c, Math.round(x / 32) * 32 + 0.5, Math.round(y / 32) * 32 + 2, r, 'inner', 0.6))
  return c
}

// --- Risers --------------------------------------------------------------------------------------------------------------

export const EARTH = { top: hex('#8a6440'), mid: hex('#74512f'), low: hex('#5c3e24'), band: hex('#9a7550'), root: hex('#4a3420') }
/** The grassy lip: the floor's edge hanging over the drop, blades poking down over the earth. */
export function grassLip(c: Canvas, seed: number): void {
  c.fill(rect(0, 0, T, 13), (x, y) => [...shade(grassTexel(x, y, seedOf('grass')), -smooth(4, 13, y) * 0.18), 1] as RGBA)
  const r = stream(seed)
  for (let i = 0; i < 46; i++) {
    const x = r() * T, len = 4 + r() * 9, lean = (r() - 0.5) * 4
    fillTiled(c, capsule(x, 10, x + lean, 10 + len, 1.4, 0.4), (px, py) => [...mix(GRASS.base, GRASS.deep, smooth(10, 10 + len, py)), 1] as RGBA, T, 'x')
  }
}
export const earthTexel = (seed: number) => (x: number, y: number): RGB => {
  const strata = fbm(x, y, { cells: 2, tile: T, octaves: 3, seed, sy: 6 }), fine = fbm(x, y, { cells: 24, tile: T, octaves: 2, seed: seed + 1 })
  let c = mix(EARTH.top, EARTH.low, smooth(0, T, y))
  c = mix(c, EARTH.band, smooth(0.6, 0.72, strata) * 0.5)
  return shade(c, (fine - 0.5) * 0.16)
}
export function riserGrass(variant: number): Canvas {
  const seed = seedOf('riser-grass') + variant * 13, c = new Canvas(T, T)
  c.paint((x, y) => [...earthTexel(seedOf('riser-grass'))(x, y), 1] as RGBA)
  // Pebbles and roots in the face; the variant's own spread.
  scatter(variant === 1 ? 7 : 10, seed, 'inner', 3, (x, y, r) => { if (y > 24) pebble(c, x, y, 2 + r() * 2.5, 1.6 + r() * 1.4, 'inner', mix(DIRT.stone, DIRT.stoneDark, r() * 0.6)) })
  const r = stream(seed + 5)
  for (let i = 0; i < 3 + variant; i++) {
    const x = 12 + r() * 104, l = 10 + r() * 16
    c.fill(capsule(x, 14, x + (r() - 0.5) * 10, 14 + l, 1.2, 0.4), [...EARTH.root, 0.9])
  }
  // Shade under the lip, and darker toward the foot.
  c.paint(fading(hex('#2c1c10'), (x, y) => (1 - smooth(13, 30, y)) * 0.45), 'multiply')
  grassLip(c, seedOf('riser-grass') + 1)
  return c
}
/** Wet stones stacked over the water, a grassy lip on top. */
export function riserBank(): Canvas {
  const c = new Canvas(T, T), seed = seedOf('riser-bank')
  c.paint((x, y) => [...mix(hex('#5d5850'), hex('#3d3a36'), smooth(10, T, y)), 1] as RGBA)
  c.paint((x, y) => {
    const s = cells(x, y * 1.4, 5, T, seed, 0.7), edge = s.d2 - s.d1
    const wet = smooth(70, 120, y), base = mix(hex('#9a958a'), hex('#6f6b63'), hash(s.id, 1, seed)), body = mix(base, hex('#55524c'), wet * 0.6)
    const lit = smooth(4, 0, Math.hypot(x - s.cx + 4, y * 1.4 - s.cy + 4) - 6) * 0.25
    return [...mix(shade(body, lit), hex('#2f2c28'), 1 - smooth(1.5, 4, edge)), 1] as RGBA
  })
  // Moss in the joints up top, a wet sheen low down, the water's edge at the foot.
  c.paint(fading(hex('#5f7d3a'), (x, y) => smooth(0.55, 0.75, fbm(x, y, { cells: 6, tile: T, seed: seed + 3 })) * (1 - smooth(20, 60, y)) * 0.7))
  c.paint(fading(hex('#cfe8f2'), (x, y) => smooth(0.7, 0.8, fbm(x, y, { cells: 8, tile: T, seed: seed + 4, sy: 2 })) * smooth(80, 110, y) * 0.35))
  c.fill(rect(0, T - 7, T, 7), (x, y) => [...mix(WATER.mid, WATER.light, smooth(T - 7, T - 3, y) * 0.4), 0.85])
  c.paint(fading(hex('#2c1c10'), (x, y) => (1 - smooth(13, 28, y)) * 0.4), 'multiply')
  grassLip(c, seed + 1)
  return c
}
