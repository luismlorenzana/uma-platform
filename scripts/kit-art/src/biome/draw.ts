// The biome kits (uma-quest Q33, P147): meadow, ruins, marsh and coast, each everything a band-1 dungeon and its fights
// draw (the forest kit's roles), told apart by palette and finish: fresh greens and wildflowers; warm sandstone and moss;
// deep greens, browns and still water; pale sand, white rock and sea blue. Gentle sunlit daytime, lit from the top
// front-left, no painted cast shadows, no text, no Uma art.
import { hex, mix, shade, smooth, type RGB, type RGBA } from '../color.js'
import { contact, foliage, form, fruit, grassClump, leaf, stem, wood, type Clump } from '../form.js'
import { fillAt, grassTexel, pebble, scatter } from '../farm/ground.js'
import { clumps, trunk } from '../farm/props.js'
import { cells, fbm, hash, stream } from '../noise.js'
import { Canvas, capsule, circle, ellipse, fading, fillTiled, intersect, linear, poly, rect, rough, union, type Shape } from '../paint.js'
import {
  courseTexel, crack, edgeBand, flagTexel, glints, grassyLip, kerbLip, patch, plankTexel, riser, stairs, T, tufts, variantFloor, wall, waterTexel,
} from '../common/surfaces.js'
import type { BiomeId } from './spec.js'

interface Look {
  seed: number
  stone: RGB
  wood: RGB
  metal: RGB
  moss: RGB
  water: [RGB, RGB, RGB]
  sky: [RGB, RGB]
  far: RGB
  ground: [RGB, RGB, RGB]
}
const LOOKS: Record<BiomeId, Look> = {
  meadow: { seed: 700, stone: hex('#a8a296'), wood: hex('#8a5a32'), metal: hex('#4a4a52'), moss: hex('#7aa84a'),
    water: [hex('#3f8fb8'), hex('#5aa9cf'), hex('#a8dcf0')], sky: [hex('#7fbcea'), hex('#dceefa')], far: hex('#8ab07a'), ground: [hex('#5f9a40'), hex('#8cc25a'), hex('#4a7a34')] },
  ruins: { seed: 800, stone: hex('#cdb48a'), wood: hex('#6f4e30'), metal: hex('#5a4a3a'), moss: hex('#7a8a44'),
    water: [hex('#2a2620'), hex('#3a342c'), hex('#5a5044')], sky: [hex('#8cbce0'), hex('#f2e6cc')], far: hex('#b8a888'), ground: [hex('#c9ae82'), hex('#dcc49a'), hex('#a88e64')] },
  marsh: { seed: 900, stone: hex('#7a7a6a'), wood: hex('#5a4630'), metal: hex('#3f3f3a'), moss: hex('#5f8a3a'),
    water: [hex('#2f4a38'), hex('#3f5f44'), hex('#7f9a6a')], sky: [hex('#9ab8c0'), hex('#dfe8de')], far: hex('#6a8a6a'), ground: [hex('#4f6a34'), hex('#6f8a44'), hex('#3a4a2a')] },
  coast: { seed: 1000, stone: hex('#d8d4ca'), wood: hex('#a8906a'), metal: hex('#5a5a60'), moss: hex('#7a9a5a'),
    water: [hex('#2f8ab8'), hex('#4fb0d8'), hex('#bfe8f4')], sky: [hex('#6fb8e8'), hex('#e6f4fa')], far: hex('#4f9ac8'), ground: [hex('#e6d6ae'), hex('#f2e6c6'), hex('#cdb88a')] },
}

const GREEN = { dark: hex('#2f5a2c'), mid: hex('#4f8a3c'), light: hex('#8cc25a') }

// --- Floors, walls, risers, stairs, void -------------------------------------------------------------------------------------

const sandTexel = (x: number, y: number, seed: number): RGB => {
  const big = fbm(x, y, { cells: 3, tile: T, octaves: 3, seed }), ripple = Math.sin((y + fbm(x, y, { cells: 4, tile: T, seed: seed + 1 }) * 24) * Math.PI / 8)
  return shade(mix(hex('#dcc89a'), hex('#efe2c0'), smooth(0.25, 0.75, big)), ripple * 0.035 + (fbm(x, y, { cells: 32, tile: T, octaves: 2, seed: seed + 2 }) - 0.5) * 0.08)
}
const mudTexel = (x: number, y: number, seed: number): RGB => {
  const m = fbm(x, y, { cells: 4, tile: T, octaves: 4, seed }), wet = fbm(x, y, { cells: 3, tile: T, octaves: 3, seed: seed + 3 })
  let c = mix(hex('#4a3e2c'), hex('#5f7a3a'), smooth(0.45, 0.65, m))
  c = mix(c, hex('#7a9a8a'), smooth(0.7, 0.8, wet) * 0.25)
  return shade(c, (fbm(x, y, { cells: 24, tile: T, octaves: 2, seed: seed + 5 }) - 0.5) * 0.18)
}
function floor(id: BiomeId, variant: number): Canvas {
  const L = LOOKS[id]
  if (id === 'meadow') return variantFloor(variant, L.seed, (x, y, seed) => grassTexel(x, y, seed), (c, zone, seed) => {
    tufts(c, zone, seed, zone === 'edge' ? 40 : 30)
    if (zone !== 'inner') return
    if (variant === 3) scatter(8, seed + 3, zone, 4, (x, y, r) => { const col = [hex('#f6f3e4'), hex('#f2c94a'), hex('#e87fa0')][Math.floor(r() * 3)]!; fillAt(c, circle(x, y, 2.2), [...col, 1], zone); fillAt(c, circle(x, y, 0.9), [...hex('#f2c94a'), 1], zone) })
    if (variant === 4) { patch(c, hex('#a8834f'), 64, 66, 30, 0.75, seed); scatter(6, seed + 4, zone, 6, (x, y, r) => pebble(c, x, y, 1.5 + r() * 1.5, 1 + r(), zone)) }
  })
  if (id === 'ruins') {
    const texel = flagTexel({ stones: [hex('#cdb48a'), hex('#bda076'), hex('#d8c29a'), hex('#a8967a')], mortar: hex('#7f6f54'), moss: L.moss, mossAmount: 0.7 }, 3, { joint: 2.2 })
    return variantFloor(variant, L.seed, texel, (c, zone, seed) => {
      if (zone !== 'inner') return
      if (variant === 2 || variant === 4) crack(c, 36, 58, 50, seed)
      if (variant === 3) tufts(c, zone, seed, 6, 0.7)
      if (variant === 4) { patch(c, L.moss, 70, 70, 26, 0.4, seed); tufts(c, zone, seed + 1, 4, 0.6) }
    })
  }
  if (id === 'marsh') return variantFloor(variant, L.seed, mudTexel, (c, zone, seed) => {
    tufts(c, zone, seed, zone === 'edge' ? 14 : 10, 0.8)
    if (zone !== 'inner') return
    if (variant === 3) {
      // A few boardwalk planks laid over the mud.
      const plank = plankTexel(L.wood, 14)
      c.fill(rect(26, 40, 76, 42, 2), [0, 0, 0, 0.3])
      c.fill(rect(26, 38, 76, 42, 2), (x, y) => [...plank(x, y, L.seed + 7, L.seed + 7), 1] as RGBA)
    }
    if (variant === 4) { const w = waterTexel(...L.water); c.fill(rough(ellipse(64, 66, 30, 18), 4, 6, seed), (x, y) => [...w(x, y, seed), 0.95] as RGBA) }
  })
  return variantFloor(variant, L.seed, sandTexel, (c, zone, seed) => {
    if (zone !== 'inner') return
    if (variant === 2) patch(c, hex('#c8b48a'), 64, 64, 30, 0.35, seed)
    if (variant === 3) scatter(6, seed, zone, 4, (x, y, r) => form(c, ellipse(x, y, 2.5 + r() * 2, 1.8 + r()), mix(hex('#f6efe6'), hex('#f2c6b2'), r()), { light: 0.4, rim: 0.3, rimWidth: 1 }))
    if (variant === 4) { c.fill(rough(ellipse(64, 66, 30, 22), 5, 6, seed), (x, y) => [...shade(hex('#8a8478'), (fbm(x, y, { cells: 10, seed }) - 0.5) * 0.3 - (y - 50) / 300), 1] as RGBA); c.fill(rough(ellipse(58, 58, 18, 10), 3, 8, seed + 1), [1, 1, 1, 0.15], 'atop') }
  })
}

/** A wall's face, by biome and variant: the first variant's face on the edge band, so every variant meets. */
function wallFace(id: BiomeId, variant: number): (x: number, y: number) => RGB {
  return variant === 1 || id === 'ruins' ? ownFace(id, variant) : edgeBand(ownFace(id, 1), ownFace(id, variant))
}
function ownFace(id: BiomeId, variant: number): (x: number, y: number) => RGB {
  const L = LOOKS[id]
  if (id === 'meadow') {
    if (variant === 3) { const t = courseTexel({ stones: [hex('#a8a296'), hex('#958f84'), hex('#b8b2a6')], mortar: hex('#5a5650'), moss: L.moss, mossAmount: 0.6 }, 21.333, { rough: 1, widths: [22, 44] }); return (x, y) => t(x, y, L.seed + 3, L.seed + 3) }
    return (x, y) => {
      const n = fbm(x, y, { cells: 10, tile: T, octaves: 4, seed: L.seed + variant }), clumpy = fbm(x, y, { cells: 4, tile: T, octaves: 2, seed: L.seed + variant + 9 })
      let c = mix(GREEN.dark, GREEN.light, smooth(0.35, 0.75, n * 0.7 + clumpy * 0.3))
      c = shade(c, (fbm(x, y, { cells: 40, tile: T, octaves: 1, seed: L.seed + 4 }) - 0.5) * 0.25)
      return y > 226 ? mix(c, hex('#4a3a28'), smooth(226, 250, y) * 0.7) : c
    }
  }
  if (id === 'ruins') {
    const t = courseTexel({ stones: [hex('#cdb48a'), hex('#bda076'), hex('#d8c29a')], mortar: hex('#6f5f44'), moss: L.moss, mossAmount: 0.7 }, 32, { rough: 1.2, widths: [30, 54] })
    return (x, y) => {
      const c = t(x, y, L.seed + variant * 7, L.seed)
      // A missing block or two inside: dark holes in the broken masonry.
      const hole = cells(x, y * 1.4, 3, T, L.seed + variant * 5, 0.9)
      return variant !== 1 && hole.d1 < 9 && Math.min(hole.cx, T - hole.cx) > 26 && hash(hole.id, 1, L.seed + variant) > 0.55 ? mix(hex('#2a2218'), c, hole.d1 / 12) : c
    }
  }
  if (id === 'marsh') {
    if (variant === 3) return (x, y) => {
      const roots = fbm(x, y, { cells: 6, tile: T, octaves: 4, seed: L.seed + 3, sx: 1, sy: 2 }), vein = Math.abs(fbm(x, y, { cells: 8, tile: T, octaves: 3, seed: L.seed + 4 }) - 0.5)
      return shade(mix(hex('#2f2418'), hex('#6a5038'), smooth(0.4, 0.7, roots)), vein < 0.04 ? 0.25 : 0)
    }
    return (x, y) => {
      const stalk = fbm(x, y, { cells: 2, tile: T, octaves: 3, seed: L.seed + variant, sx: 24, sy: 1 }), tip = smooth(0, 60, y)
      let c = mix(hex('#4f6a34'), hex('#9aaa5a'), stalk)
      c = shade(c, (1 - tip) * 0.12 + ((x * 3 + Math.floor(stalk * 9)) % 7 < 1 ? -0.25 : 0))
      return y > 214 ? mix(c, hex('#2f3a28'), smooth(214, 250, y)) : c
    }
  }
  if (variant === 3) {
    const t = plankTexel(hex('#7a6a54'), 21.333, { joist: 128 })
    return (x, y) => mix(t(x, y, L.seed + 3, L.seed + 3), hex('#e8e2d2'), smooth(0.78, 0.86, fbm(x, y, { cells: 16, tile: T, seed: L.seed + 5 })) * 0.5)
  }
  return (x, y) => {
    // Rock shelves: layers lit along their top edges, the weathered faces between.
    const warp = (fbm(x, y, { cells: 3, tile: T, octaves: 3, seed: L.seed + variant }) - 0.5) * 30, band = ((y + warp + variant * 13) % 38 + 38) % 38
    let c = mix(hex('#cfcac0'), hex('#a8a296'), fbm(x, y, { cells: 6, tile: T, octaves: 3, seed: L.seed + 2 }))
    c = shade(c, band < 4 ? 0.18 : band > 32 ? -0.28 : 0)
    return y > 220 ? mix(c, hex('#5a6a6a'), smooth(220, 250, y) * 0.5) : c
  }
}
const CAPS: Record<BiomeId, RGB | undefined> = { meadow: undefined, ruins: hex('#d8c29a'), marsh: undefined, coast: hex('#e2ddd2') }
function biomeWall(id: BiomeId, variant: number): Canvas {
  const c = wall(wallFace(id, variant), { cap: variant === 3 && id === 'meadow' ? hex('#b8b2a6') : CAPS[id] })
  if (id === 'meadow' && variant !== 3) { const r = stream(LOOKS.meadow.seed + variant); for (let i = 0; i < 6; i++) { const x = 12 + r() * 104, y = 30 + r() * 150; c.fill(circle(x, y, 2.4), [...[hex('#f6f3e4'), hex('#e87fa0')][i % 2]!, 1]) } }
  if (id === 'ruins' && variant === 3) {
    // A fallen column's drums against the wall.
    for (const [x, y, r] of [[40, 210, 26], [92, 220, 22]] as const) { form(c, ellipse(x, y, r, r * 0.9), hex('#d8c29a'), { light: 0.5, rim: 0.35 }); for (let k = -2; k <= 2; k++) c.fill(capsule(x + k * r * 0.35, y - r * 0.8, x + k * r * 0.35, y + r * 0.8, 0.8), [...hex('#a88e64'), 0.7], 'atop') }
  }
  if (id === 'coast' && variant === 3) for (let i = 0; i < 9; i++) { const r = stream(LOOKS.coast.seed + i); form(c, circle(14 + r() * 100, 40 + r() * 180, 3 + r() * 2), hex('#e8e2d2'), { light: 0.5 }) }
  return c
}
function wallTop(id: BiomeId): Canvas {
  const L = LOOKS[id]
  if (id === 'meadow') return variantFloor(1, L.seed + 40, (x, y, seed) => mix(GREEN.dark, GREEN.light, smooth(0.3, 0.75, fbm(x, y, { cells: 10, tile: T, octaves: 4, seed }))))
  if (id === 'marsh') return variantFloor(1, L.seed + 40, (x, y, seed) => mix(hex('#4f6a34'), hex('#a8b064'), smooth(0.3, 0.75, fbm(x, y, { cells: 16, tile: T, octaves: 3, seed, sx: 2, sy: 1 }))))
  const stones = id === 'ruins' ? [hex('#d8c29a'), hex('#c9ae82'), hex('#e0cca6')] : [hex('#d8d4ca'), hex('#c4beb2'), hex('#e6e2d8')]
  return variantFloor(1, L.seed + 40, flagTexel({ stones, mortar: shade(stones[0]!, -0.35), moss: L.moss, mossAmount: 0.6 }, 3))
}
function biomeRiser(id: BiomeId, variant: number): Canvas {
  const L = LOOKS[id], seed = L.seed + 60
  if (id === 'meadow') return riser((x, y) => mix(hex('#8a6440'), hex('#5c3e24'), smooth(0, T, y) * 0.8 + (fbm(x, y, { cells: 2, tile: T, sy: 6, seed: seed + variant }) - 0.5) * 0.3), grassyLip(hex('#6fa64a'), hex('#3d7030'), seed))
  if (id === 'ruins') { const t = courseTexel({ stones: [hex('#bda076'), hex('#cdb48a')], mortar: hex('#6f5f44'), moss: L.moss, mossAmount: 0.5 }, 32, { rough: 1 }); return riser((x, y) => t(x, y, seed + variant * 7, seed), kerbLip(hex('#d8c29a'))) }
  if (id === 'marsh') return riser((x, y) => shade(mix(hex('#4a3a28'), hex('#2f2418'), smooth(0, T, y)), (fbm(x, y, { cells: 6, tile: T, octaves: 3, seed: seed + variant, sx: 1, sy: 2 }) - 0.5) * 0.3), grassyLip(hex('#5f7f3a'), hex('#3f5a2a'), seed))
  const rock = wallFace('coast', variant === 1 ? 1 : 2)
  return riser((x, y) => rock(x, y + 40), (c) => c.fill(rect(0, 0, T, 14), (x, y) => [...shade(sandTexel(x, y, seed), y > 11 ? -0.2 : 0), 1] as RGBA))
}
function biomeStairs(id: BiomeId): Canvas {
  const L = LOOKS[id]
  if (id === 'marsh') { const p = plankTexel(L.wood, 32); return stairs((x, y) => p(x, y, L.seed, L.seed), shade(L.wood, 0.1)) }
  const stones = id === 'ruins' ? [hex('#d8c29a'), hex('#c9ae82')] : id === 'coast' ? [hex('#cfcac0'), hex('#bdb6aa')] : [hex('#b8b2a6'), hex('#a8a296')]
  const t = courseTexel({ stones, mortar: shade(stones[0]!, -0.35), moss: L.moss, mossAmount: 0.4 }, 32, { rough: 0.8, widths: [40, 64] })
  return stairs((x, y) => t(x, y, L.seed + 5, L.seed + 5), shade(stones[0]!, 0.1))
}
function voidTile(id: BiomeId): Canvas {
  const L = LOOKS[id]
  if (id === 'ruins') return variantFloor(1, L.seed + 80, (x, y, seed) => shade(mix(hex('#141210'), hex('#2a2620'), fbm(x, y, { cells: 4, tile: T, octaves: 3, seed })), 0), (c, zone, seed) => scatter(12, seed, zone, 4, (x, y, r) => pebble(c, x, y, 1.5 + r() * 2, 1 + r(), zone, hex('#4a4238'))))
  if (id === 'coast') return variantFloor(1, L.seed + 80, (x, y, seed) => {
    const sand = sandTexel(x, y, seed), caustic = smooth(0.6, 0.7, fbm(x, y, { cells: 6, tile: T, octaves: 2, seed: seed + 3 }))
    return mix(mix(sand, hex('#5ab8d8'), 0.45), hex('#d8f4fc'), caustic * 0.35)
  })
  const w = waterTexel(...L.water)
  return variantFloor(1, L.seed + 80, (x, y, seed) => w(x, y, seed), (c, zone, seed) => {
    glints(c, zone, seed, L.water[2], 6)
    if (id === 'meadow') scatter(zone === 'edge' ? 4 : 3, seed + 3, zone, 6, (x, y, r) => fillAt(c, ellipse(x, y, 4 + r() * 2, 2.2), [...hex('#6f9a3a'), 0.9], zone))
  })
}

// --- The dungeon's pieces ----------------------------------------------------------------------------------------------------

function chest(L: Look, open: boolean): Canvas {
  const c = new Canvas(128, open ? 144 : 112), fy = open ? 132 : 100, top = fy - 52
  if (open) {
    form(c, poly([[18, top + 4], [110, top + 4], [104, top - 44], [24, top - 44]]), shade(L.wood, -0.05), { light: 0.35, grain: { amount: 0.25, cells: 3, sx: 1, sy: 8, seed: 3 } })
    c.fill(rect(26, top - 4, 76, 10, 2), [...hex('#1e1610'), 1])
    for (let i = 0; i < 6; i++) fruit(c, 36 + i * 11, top + 2 - (i % 2) * 3, 4.5, hex('#e8b84a'))
  }
  const body = rect(16, top, 96, 52, 4)
  form(c, body, L.wood, { light: 0.4, rim: 0.3, grain: { amount: 0.25, cells: 3, sx: 1, sy: 8, seed: 4 } })
  if (!open) form(c, intersect(ellipse(64, top, 50, 22), rect(14, top - 22, 100, 24)), shade(L.wood, 0.08), { light: 0.45, rim: 0.3, grain: { amount: 0.25, cells: 3, sx: 1, sy: 8, seed: 5 } })
  for (const x of [26, 96]) c.fill(rect(x, open ? top : top - 18, 7, open ? 52 : 70, 1), [...shade(L.metal, 0.15), 1], open ? 'over' : 'atop')
  if (!open) for (const x of [26, 96]) c.fill(rect(x, top, 7, 52, 1), [...shade(L.metal, 0.15), 1])
  form(c, rect(56, top + 6, 16, 18, 3), hex('#c9a24a'), { light: 0.6, rim: 0.4 })
  c.fill(rect(62, top + 14, 4, 6), [...hex('#3a2a10'), 1])
  contact(c, 64, fy, 48)
  return c
}
function spring(L: Look, id: BiomeId): Canvas {
  const c = new Canvas(192, 144)
  const ring = ellipse(91, 96, 80, 34)
  form(c, rough(ring, 3, 10, L.seed), id === 'ruins' ? hex('#cdb48a') : L.stone, { light: 0.5, rim: 0.3, grain: { amount: 0.25, cells: 10, seed: L.seed } })
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; form(c, ellipse(91 + Math.cos(a) * 72, 96 + Math.sin(a) * 28, 13, 9), shade(L.stone, (hash(i, 1, L.seed) - 0.5) * 0.2), { light: 0.55, rim: 0.35 }) }
  const w = waterTexel(hex('#4fb0d8'), hex('#6fc4e8'), hex('#d8f4fc'))
  c.fill(ellipse(91, 94, 60, 20), (x, y) => [...w(x, y, 5), 1] as RGBA)
  c.fill(ellipse(76, 88, 18, 4), [1, 1, 1, 0.35])
  grassClump(c, 30, 104, 24, 22, L.seed + 1, 8); grassClump(c, 156, 108, 24, 20, L.seed + 2, 8)
  return c
}
function waystone(L: Look, id: BiomeId): Canvas {
  const c = new Canvas(112, 224)
  const stone = rough(poly([[20, 212], [30, 60], [48, 18], [66, 16], [84, 64], [92, 212]]), 2.5, 10, L.seed + 3)
  form(c, stone, id === 'ruins' ? hex('#c9ae82') : id === 'coast' ? hex('#d8d4ca') : hex('#9a9890'), { light: 0.55, rim: 0.35, grain: { amount: 0.3, cells: 8, seed: L.seed + 3 } })
  const rune = hex('#6fd8c8')
  for (const [ax, ay, bx, by] of [[56, 70, 56, 150], [56, 90, 40, 110], [56, 90, 72, 110], [44, 136, 68, 136]]) c.fill(capsule(ax!, ay!, bx!, by!, 2.2), [...rune, 1])
  c.fill(stone, fading(L.moss, (x, y) => smooth(170, 212, y) * smooth(0.45, 0.6, fbm(x, y, { cells: 10, seed: 4 }))), 'atop')
  grassClump(c, 56, 214, 70, 18, L.seed + 4, 12)
  return c
}
function stairsDown(L: Look, id: BiomeId): Canvas {
  const c = new Canvas(192, 160), stone = id === 'ruins' ? hex('#cdb48a') : id === 'coast' ? hex('#d8d4ca') : L.stone
  form(c, rect(18, 40, 156, 108, 8), stone, { light: 0.45, rim: 0.3, grain: { amount: 0.25, cells: 10, seed: 6 } })
  c.fill(rect(40, 52, 112, 90, 4), linear(0, 52, 0, 142, [[0, hex('#4a4440')], [1, hex('#0e0c0a')]]))
  for (let s = 0; s < 4; s++) { const y = 60 + s * 18, inset = s * 6; form(c, rect(44 + inset, y, 104 - inset * 2, 8, 1), shade(stone, -0.15 - s * 0.15), { light: 0.3 }) }
  form(c, rect(12, 30, 168, 14, 4), shade(stone, 0.08), { light: 0.5, rim: 0.35 })
  if (id !== 'coast') grassClump(c, 22, 150, 20, 18, L.seed + 6, 6)
  return c
}
function stairsUp(L: Look, id: BiomeId): Canvas {
  const c = new Canvas(192, 192), stone = id === 'ruins' ? hex('#cdb48a') : id === 'coast' ? hex('#d8d4ca') : L.stone
  for (let s = 0; s < 4; s++) { const y = 168 - s * 18, inset = s * 10; form(c, rect(28 + inset, y, 136 - inset * 2, 16, 2), shade(stone, s * 0.04), { light: 0.45, rim: 0.3 }) }
  const arch = union(rect(46, 62, 100, 56), circle(96, 62, 50))
  const opening = union(rect(62, 68, 68, 52), circle(96, 66, 34))
  c.fill(arch, (x, y) => [...shade(stone, (hash(Math.floor(Math.atan2(y - 62, x - 96) * 3), 1, 7) - 0.5) * 0.15 + (x < 70 ? 0.08 : -0.04)), 1] as RGBA)
  c.fill(opening, linear(0, 30, 0, 120, [[0, hex('#f6f2e2')], [1, hex('#cfe6f2')]]))
  c.fill(intersect(arch, rect(0, 116, 192, 4)), [0, 0, 0, 0.2])
  return c
}
function lantern(L: Look): Canvas {
  const c = new Canvas(80, 224)
  wood(c, rect(22, 30, 10, 182, 2), L.wood, 5)
  wood(c, rect(22, 30, 40, 7, 2), L.wood, 6, 'x')
  c.fill(capsule(56, 36, 56, 52, 0.8), [...L.metal, 1])
  form(c, rect(46, 52, 20, 26, 3), L.metal, { light: 0.5 })
  c.fill(rect(49, 56, 14, 18, 2), (x, y) => [...mix(hex('#fff2b8'), hex('#f2a03a'), Math.min(1, Math.hypot(x - 56, y - 64) / 11)), 1] as RGBA)
  form(c, poly([[42, 54], [70, 54], [62, 44], [50, 44]]), L.metal, { light: 0.5 })
  form(c, rect(16, 204, 22, 10, 3), shade(L.stone, -0.1), { light: 0.4 })
  return c
}

// --- Decorations -------------------------------------------------------------------------------------------------------------

function rockProp(w: number, h: number, colour: RGB, seed: number, moss?: RGB): Canvas {
  const c = new Canvas(w, h), fy = h - 12
  const r = rough(union(ellipse(w * 0.48, fy - h * 0.3, w * 0.38, h * 0.32), ellipse(w * 0.6, fy - h * 0.38, w * 0.24, h * 0.24)), 2.5, 10, seed)
  form(c, r, colour, { light: 0.55, rim: 0.35, grain: { amount: 0.22, cells: 8, seed } })
  c.fill(capsule(w * 0.42, fy - h * 0.5, w * 0.5, fy - h * 0.2, 0.8), [...shade(colour, -0.35), 0.7], 'atop')
  if (moss) c.fill(r, fading(moss, (x, y) => smooth(0.55, 0.7, fbm(x, y, { cells: 10, seed: seed + 1 })) * (1 - smooth(fy - h * 0.55, fy - h * 0.3, y))), 'atop')
  contact(c, w / 2, fy, w * 0.36)
  return c
}
function bushProp(w: number, h: number, seed: number, palette = GREEN, berries?: RGB): Canvas {
  const c = new Canvas(w, h)
  foliage(c, clumps(seed, w / 2, h * 0.56, w * 0.36, h * 0.3, 9, 20, 28), palette, seed, 4)
  if (berries) { const r = stream(seed); for (let i = 0; i < 14; i++) fruit(c, w * 0.2 + r() * w * 0.6, h * 0.3 + r() * h * 0.45, 2.6, berries) }
  contact(c, w / 2, h - 12, w * 0.3)
  return c
}
function decorations(id: BiomeId): Record<string, () => Canvas> {
  const L = LOOKS[id]
  if (id === 'meadow') return {
    flowers: () => { const c = new Canvas(128, 80); grassClump(c, 64, 68, 100, 22, L.seed, 18); const r = stream(L.seed + 1); for (let i = 0; i < 12; i++) { const x = 16 + r() * 96, y = 24 + r() * 28, col = [hex('#f6e27a'), hex('#f4f1e6'), hex('#e87fa0'), hex('#a87fd8')][i % 4]!; stem(c, x, 68, x, y, 0.9, hex('#4f8a3c')); for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2 + i; c.fill(ellipse(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3, 2.6, 2.2), [...col, 1]) } c.fill(circle(x, y, 1.6), [...hex('#e8a83a'), 1]) } return c },
    grass: () => { const c = new Canvas(96, 80); grassClump(c, 48, 68, 50, 54, L.seed + 2, 24); return c },
    'bush-1': () => bushProp(160, 128, L.seed + 3),
    'rock-1': () => rockProp(96, 96, hex('#a8a296'), L.seed + 4, L.moss),
    fence: () => {
      const c = new Canvas(160, 144)
      for (const y of [64, 96]) wood(c, rect(4, y - 4, 152, 9, 2), shade(L.wood, 0.05), y, 'x')
      for (const x of [20, 140]) wood(c, rect(x - 7, 40, 14, 92, 3), shade(L.wood, -0.1), x)
      grassClump(c, 80, 132, 140, 18, L.seed + 5, 18)
      return c
    },
  }
  if (id === 'ruins') return {
    'pillar-broken': () => {
      const c = new Canvas(128, 256)
      const shaft = poly([[36, 244], [36, 90], [52, 70], [60, 88], [74, 64], [92, 84], [92, 244]])
      form(c, shaft, hex('#d8c29a'), { light: 0.5, rim: 0.35, grain: { amount: 0.18, cells: 10, seed: 3 } })
      for (let k = 0; k < 5; k++) c.fill(capsule(42 + k * 11, 90, 42 + k * 11, 236, 1.1), [...hex('#a88e64'), 0.6], 'atop')
      form(c, rect(26, 228, 76, 18, 3), hex('#c9ae82'), { light: 0.45 })
      crack(c, 60, 140, 30, 4)
      grassClump(c, 64, 246, 90, 20, L.seed + 1, 12)
      return c
    },
    rubble: () => { const c = new Canvas(160, 96), r = stream(L.seed + 2); for (let i = 0; i < 9; i++) { const x = 34 + r() * 92, y = 50 + r() * 20, w = 10 + r() * 12; form(c, rough(rect(x - w, y - w * 0.7, w * 2, w * 1.4, 3), 1.5, 12, i), mix(hex('#cdb48a'), hex('#a8967a'), r()), { light: 0.55, rim: 0.35 }) } contact(c, 80, 84, 60); return c },
    urn: () => {
      const c = new Canvas(96, 128)
      form(c, union(ellipse(48, 76, 32, 36), rect(34, 24, 28, 24, 4), ellipse(48, 24, 18, 6)), hex('#b8784a'), { light: 0.55, rim: 0.35 })
      for (const y of [56, 92]) c.fill(intersect(rect(14, y, 68, 4), ellipse(48, 76, 32, 36)), [...hex('#2f8a8a'), 0.85], 'atop')
      crack(c, 40, 70, 20, 5)
      contact(c, 48, 116, 26)
      return c
    },
    bookcase: () => {
      const c = new Canvas(160, 224)
      form(c, rect(20, 24, 120, 188, 4), hex('#6f4e30'), { light: 0.4, grain: { amount: 0.25, cells: 3, sx: 1, sy: 8, seed: 7 } })
      const r = stream(L.seed + 3)
      for (let s = 0; s < 4; s++) {
        const y = 36 + s * 44
        c.fill(rect(28, y, 104, 36), [...hex('#2a1c12'), 1])
        let x = 30
        while (x < 128) { const w = 6 + r() * 6, h = 22 + r() * 12, lean = r() > 0.85; if (r() > 0.18) form(c, lean ? poly([[x, y + 36], [x + w, y + 36], [x + w + 8, y + 36 - h], [x + 8, y + 36 - h]]) : rect(x, y + 36 - h, w, h, 1), [hex('#8a3a3a'), hex('#3a5a8a'), hex('#5a7a3a'), hex('#a8844a'), hex('#5a3a6a')][Math.floor(r() * 5)]!, { light: 0.4, rim: 0.3, rimWidth: 1 }); x += w + 1 }
        form(c, rect(24, y + 36, 112, 6, 1), hex('#7f5a38'), { light: 0.45 })
      }
      c.fill(rough(rect(20, 24, 120, 188, 4), 0, 1, 1), fading(hex('#2a2218'), (x, y) => smooth(0.65, 0.8, fbm(x, y, { cells: 6, seed: 8 })) * 0.5), 'atop')
      contact(c, 80, 212, 64)
      return c
    },
    grass: () => { const c = new Canvas(96, 80); grassClump(c, 48, 68, 50, 46, L.seed + 4, 20, { root: hex('#5a6a2c'), tip: hex('#b8c26a') }); return c },
  }
  if (id === 'marsh') return {
    reeds: () => {
      const c = new Canvas(128, 160), r = stream(L.seed)
      for (let i = 0; i < 16; i++) { const x = 20 + r() * 88, top = 20 + r() * 50; leaf(c, x, 148, x + (r() - 0.5) * 20, top, 2.4, mix(hex('#5f8a3a'), hex('#a8b864'), r()), false) }
      for (let i = 0; i < 5; i++) { const x = 30 + i * 17 + r() * 6, top = 14 + r() * 24; stem(c, x, 148, x + 2, top + 24, 1.2, hex('#6f8a3a')); form(c, capsule(x + 2, top, x + 2, top + 24, 4.2), hex('#6b4428'), { light: 0.45 }) }
      return c
    },
    stump: () => {
      const c = new Canvas(128, 128)
      form(c, rough(union(rect(34, 44, 60, 64, 6), ellipse(64, 106, 40, 8), poly([[24, 110], [36, 88], [42, 110]]), poly([[104, 110], [92, 88], [86, 110]])), 1.5, 20, 4), hex('#5a4630'), { light: 0.45, rim: 0.3, grain: { amount: 0.4, cells: 3, sx: 10, seed: 4 } })
      c.fill(ellipse(64, 45, 30, 9), (x, y) => { const d = Math.hypot((x - 64) / 30, (y - 45) / 9); return [...shade(mix(hex('#a88a5a'), hex('#7a5e3a'), d), Math.sin(d * 18) * 0.05 + (d > 0.9 ? -0.25 : 0)), 1] as RGBA })
      c.fill(rough(rect(34, 60, 60, 40), 3, 8, 5), fading(L.moss, (x, y) => smooth(0.5, 0.65, fbm(x, y, { cells: 8, seed: 6 })) * 0.8), 'atop')
      contact(c, 64, 116, 40)
      return c
    },
    lily: () => {
      const c = new Canvas(128, 64)
      for (const [x, y, r] of [[40, 36, 20], [84, 30, 16], [70, 46, 12]] as const) {
        form(c, intersect(ellipse(x, y, r, r * 0.45), poly([[x - r - 2, y - r], [x + r + 2, y - r], [x + r + 2, y + r], [x + 4, y + r], [x, y], [x - 4, y + r], [x - r - 2, y + r]])), hex('#4f8a3c'), { light: 0.45, rim: 0.3 })
      }
      form(c, circle(52, 26, 6), hex('#f4e6f0'), { light: 0.5 }); c.fill(circle(52, 26, 2.4), [...hex('#f2d06a'), 1])
      return c
    },
    log: () => {
      const c = new Canvas(224, 112)
      form(c, rough(rect(18, 50, 190, 46, 22), 2, 14, 7), L.wood, { light: 0.45, rim: 0.3, grain: { amount: 0.35, cells: 3, sx: 1, sy: 10, seed: 7 } })
      c.fill(ellipse(198, 73, 12, 22), (x, y) => { const d = Math.hypot((x - 198) / 12, (y - 73) / 22); return [...shade(mix(hex('#b89a6a'), hex('#8a6a42'), d), Math.sin(d * 14) * 0.05), 1] as RGBA })
      c.fill(rough(rect(18, 48, 170, 20), 3, 8, 8), fading(L.moss, (x, y) => smooth(0.45, 0.6, fbm(x, y, { cells: 10, seed: 9 }))), 'atop')
      contact(c, 112, 100, 90)
      return c
    },
    mushrooms: () => {
      const c = new Canvas(96, 96)
      for (const [x, h, r] of [[30, 26, 13], [56, 40, 18], [76, 22, 11]] as const) {
        form(c, rect(x - 3, 84 - h, 6, h, 2), hex('#efe6d2'), { light: 0.3 })
        form(c, intersect(ellipse(x, 84 - h, r, r * 0.75), rect(x - r - 1, 84 - h - r, r * 2 + 2, r * 0.95)), hex('#8a6a9a'), { light: 0.5, rim: 0.35 })
        for (const dx of [-r * 0.4, r * 0.3]) c.fill(circle(x + dx, 84 - h - r * 0.4, 1.6), [...hex('#e8d8f0'), 1], 'atop')
      }
      grassClump(c, 48, 84, 70, 12, L.seed + 3, 10)
      return c
    },
  }
  return {
    'rock-1': () => rockProp(96, 96, hex('#d8d4ca'), L.seed + 1),
    'rock-2': () => rockProp(128, 112, hex('#cfcac0'), L.seed + 2, hex('#6f8a5a')),
    shell: () => {
      const c = new Canvas(64, 48)
      form(c, intersect(circle(32, 30, 18), rect(12, 10, 40, 26)), hex('#f2d6c2'), { light: 0.55, rim: 0.35 })
      for (let i = -3; i <= 3; i++) c.fill(capsule(32, 34, 32 + i * 5, 14, 0.7), [...hex('#d8a88a'), 0.8], 'atop')
      form(c, rect(26, 32, 12, 6, 2), hex('#e8c4ae'), { light: 0.4 })
      return c
    },
    driftwood: () => {
      const c = new Canvas(224, 96)
      form(c, rough(poly([[14, 70], [60, 52], [140, 58], [210, 46], [214, 60], [150, 76], [60, 82], [18, 84]]), 2, 14, 3), hex('#b8a888'), { light: 0.5, rim: 0.3, grain: { amount: 0.3, cells: 3, sx: 1, sy: 10, seed: 3 } })
      wood(c, capsule(150, 64, 186, 30, 4, 2), hex('#a8987a'), 4)
      contact(c, 112, 84, 90)
      return c
    },
    seaweed: () => { const c = new Canvas(96, 80), r = stream(L.seed + 5); for (let i = 0; i < 14; i++) { const x = 20 + r() * 56; leaf(c, x, 68, x + (r() - 0.5) * 30, 18 + r() * 30, 4, mix(hex('#4a6a3a'), hex('#8a9a4a'), r()), false) } return c },
  }
}

// --- The fight set -----------------------------------------------------------------------------------------------------------

/** A wide strip (the fight's ground, or its far layer) repeats left to right: every shape is drawn again a strip's width
 * to either side, and noise repeats on the strip's width. */
function battleGround(id: BiomeId): Canvas {
  const L = LOOKS[id], W = 1024, c = new Canvas(W, 256)
  c.paint((x, y) => {
    const n = fbm(x, y, { cells: 16, tile: W, octaves: 4, seed: L.seed + 1 }), fine = fbm(x, y, { cells: 128, tile: W, octaves: 2, seed: L.seed + 2 })
    let col = mix(L.ground[0], mix(L.ground[2], L.ground[1], smooth(0.2, 0.8, n)), 0.45)
    col = shade(col, (fine - 0.5) * 0.15 + (y / 256 - 0.5) * 0.08)
    if (id === 'ruins') col = mix(col, hex('#7f6f54'), (1 - smooth(1, 3, cells(x, y, 16, W, L.seed, 0.6).d2 - cells(x, y, 16, W, L.seed, 0.6).d1)) * 0.8)
    if (id === 'marsh') col = mix(col, L.water[1], smooth(0.7, 0.78, fbm(x, y, { cells: 8, tile: W, octaves: 3, seed: L.seed + 4 })) * 0.6)
    return [...col, 1] as RGBA
  })
  const r = stream(L.seed + 5)
  for (let i = 0; i < (id === 'coast' ? 30 : 70); i++) {
    const x = r() * W, y = 20 + r() * 230
    if (id === 'coast') fillTiled(c, ellipse(x, y, 3 + r() * 2, 2), [...hex('#f6efe6'), 0.9], W, 'x')
    else for (let k = 0; k < 4; k++) { const bx = x + (r() - 0.5) * 8, l = 6 + r() * 8; fillTiled(c, capsule(bx, y, bx + (r() - 0.5) * 4, y - l, 1.2, 0.3), (px, py) => [...mix(L.ground[2], L.ground[1], smooth(y, y - l, py)), 1] as RGBA, W, 'x') }
  }
  return c
}
function battleBack(id: BiomeId): Canvas {
  const L = LOOKS[id], W = 2048, H = 512, c = new Canvas(W, H), horizon = 330
  c.paint(linear(0, 0, 0, horizon, [[0, L.sky[0]], [1, L.sky[1]]]))
  const r = stream(L.seed + 9)
  // Clouds: soft heaps drifting across the sky.
  for (let i = 0; i < 9; i++) {
    const x = r() * W, y = 50 + r() * 140, w = 120 + r() * 160
    const heap = union(ellipse(x, y, w * 0.5, 22), ellipse(x - w * 0.2, y - 12, w * 0.25, 22), ellipse(x + w * 0.15, y - 16, w * 0.3, 26))
    fillTiled(c, heap, (px, py) => [...mix(hex('#ffffff'), L.sky[1], smooth(y - 30, y + 20, py) * 0.6), 0.85] as RGBA, W, 'x')
  }
  const ridge = (x: number, base: number, amp: number, seed: number) => base + (fbm(x, 0, { cells: 6, tile: W, octaves: 3, seed }) - 0.5) * amp
  // Far hills or the sea, then the biome's own middle distance.
  if (id === 'coast') {
    c.fill(rect(0, 270, W, 70), (x, y) => [...mix(L.far, hex('#2f7aa8'), (y - 270) / 70), 1] as RGBA)
    for (let i = 0; i < 40; i++) { const x = r() * W, y = 278 + r() * 56, l = 6 + r() * 16; fillTiled(c, capsule(x - l, y, x + l, y, 0.8), [...hex('#e6f6fc'), 0.7], W, 'x') }
    for (const x of [180, 1100]) fillTiled(c, rough(poly([[x - 160, 340], [x - 120, 200], [x - 40, 170], [x + 60, 190], [x + 150, 340]]), 6, 10, x), (px, py) => [...shade(hex('#e8e4da'), (px - x) / -900 + (py - 200) / -600), 1] as RGBA, W, 'x')
  } else {
    c.paint((x, y) => { const top = ridge(x, 250, 90, L.seed); return y < top ? [0, 0, 0, 0] : [...mix(L.far, L.sky[1], 0.45 - (y - top) / 600), 1] as RGBA })
    c.paint((x, y) => { const top = ridge(x, 300, 60, L.seed + 1); return y < top ? [0, 0, 0, 0] : [...mix(L.far, L.ground[2], 0.35), 1] as RGBA })
  }
  if (id === 'meadow') for (let i = 0; i < 14; i++) { const x = r() * W, y = 300 + r() * 20, s = 0.5 + r() * 0.5; for (const dx of [-W, 0, W]) { if (x + dx < -120 || x + dx > W + 120) continue; trunk(c, x + dx, y + 30 * s, y, 6 * s, hex('#5a4630'), i); foliage(c, clumps(i, x + dx, y - 20 * s, 50 * s, 34 * s, 6, 18 * s, 26 * s), { dark: hex('#3f6a3a'), mid: hex('#5f8a4a'), light: hex('#8ab86a') }, i, 3) } }
  if (id === 'ruins') for (let i = 0; i < 10; i++) {
    const x = 100 + i * 205 + r() * 40, h = 90 + r() * 80, col = mix(hex('#cdb48a'), L.sky[1], 0.35)
    fillTiled(c, rect(x - 14, 330 - h, 28, h, 2), (px) => [...shade(col, px < x - 6 ? 0.08 : -0.06), 1] as RGBA, W, 'x')
    if (i % 3 === 0) fillTiled(c, intersect(union(rect(x - 14, 330 - h - 40, 130, 40), circle(x + 51, 330 - h, 60)), rect(x - 14, 330 - h - 60, 130, 60)), [...shade(col, -0.04), 1], W, 'x')
  }
  if (id === 'marsh') {
    c.paint((x, y) => { const top = ridge(x, 280, 70, L.seed + 3); return y < top ? [0, 0, 0, 0] : [...mix(hex('#3a5a40'), L.sky[1], 0.35), 1] as RGBA })
    c.fill(rect(0, 318, W, 40), (x, y) => [...mix(L.water[1], L.sky[1], 0.4 - (y - 318) / 200), 1] as RGBA)
    c.paint(fading(hex('#f2f6f0'), (_, y) => (1 - Math.abs(y - 300) / 60) * 0.35))
  }
  // The near ground, rising to meet the fight's strip.
  c.paint((x, y) => {
    const top = ridge(x, 352, 24, L.seed + 7)
    if (y < top) return [0, 0, 0, 0]
    const n = fbm(x, y, { cells: 32, tile: W, octaves: 3, seed: L.seed + 8 })
    return [...shade(mix(L.ground[0], mix(L.ground[2], L.ground[1], smooth(0.2, 0.8, n)), 0.45), (y - H) / 900), 1] as RGBA
  })
  if (id === 'meadow' || id === 'marsh') for (let i = 0; i < 120; i++) { const x = r() * W, y = 360 + r() * 150, l = 5 + r() * 10; fillTiled(c, capsule(x, y, x + (r() - 0.5) * 4, y - l, 1.3, 0.3), [...L.ground[1], 1], W, 'x') }
  if (id === 'meadow') for (let i = 0; i < 60; i++) { const x = r() * W, y = 370 + r() * 130; fillTiled(c, circle(x, y, 2), [...[hex('#f6f3e4'), hex('#f2c94a'), hex('#e87fa0')][i % 3]!, 1], W, 'x') }
  return c
}
function battleMid(id: BiomeId, n: 1 | 2 | 3): Canvas {
  const L = LOOKS[id]
  if (n === 1) {
    const c = new Canvas(320, 352), fx = 151, fy = 340
    if (id === 'ruins') {
      const shaft = poly([[fx - 34, fy], [fx - 34, 120], [fx - 10, 96], [fx + 6, 116], [fx + 34, 90], [fx + 34, fy]])
      form(c, shaft, hex('#d8c29a'), { light: 0.5, rim: 0.35 })
      for (let k = 0; k < 6; k++) c.fill(capsule(fx - 26 + k * 10, 116, fx - 26 + k * 10, fy - 14, 1.2), [...hex('#a88e64'), 0.6], 'atop')
      form(c, rect(fx - 50, fy - 22, 100, 22, 3), hex('#c9ae82'), { light: 0.45 })
      const ivy = stream(L.seed); for (let i = 0; i < 26; i++) { const y = 130 + ivy() * 190, x = fx - 30 + ivy() * 60; leaf(c, x, y, x + (ivy() - 0.5) * 18, y + 8, 4, mix(GREEN.mid, GREEN.light, ivy())) }
      return c
    }
    if (id === 'marsh') {
      trunk(c, fx, fy, 120, 22, hex('#4a3e30'), L.seed)
      for (const [ax, ay, bx, by] of [[fx, 160, fx - 90, 80], [fx, 140, fx + 80, 60], [fx - 40, 112, fx - 70, 40], [fx + 40, 100, fx + 100, 110]]) c.fill(capsule(ax!, ay!, bx!, by!, 7, 2.5), [...hex('#4a3e30'), 1])
      const moss = stream(L.seed + 1); for (let i = 0; i < 30; i++) { const x = fx - 100 + moss() * 200, y = 60 + moss() * 80; c.fill(capsule(x, y, x + (moss() - 0.5) * 4, y + 20 + moss() * 40, 1.4, 0.5), [...hex('#8a9a6a'), 0.9]) }
      return c
    }
    if (id === 'coast') {
      form(c, rough(poly([[fx - 90, fy], [fx - 70, 150], [fx - 30, 70], [fx + 30, 60], [fx + 70, 140], [fx + 96, fy]]), 6, 10, L.seed), hex('#d8d4ca'), { light: 0.55, rim: 0.35, grain: { amount: 0.25, cells: 8, seed: 2 } })
      for (let y = 90; y < fy; y += 34) c.fill(capsule(fx - 80, y, fx + 80, y + 6, 1.2), [...hex('#a8a296'), 0.6], 'atop')
      grassClump(c, fx, 70, 60, 26, L.seed + 1, 14)
      return c
    }
    trunk(c, fx, fy, 180, 24, hex('#6b4a2e'), L.seed)
    foliage(c, clumps(L.seed, fx, 130, 124, 104, 14, 34, 50), { ...GREEN }, L.seed, 5)
    return c
  }
  if (n === 2) {
    const c = new Canvas(256, 160), fx = 137, fy = 148
    const rockCol = id === 'ruins' ? hex('#cdb48a') : id === 'coast' ? hex('#d8d4ca') : id === 'marsh' ? hex('#7a7a6a') : hex('#a8a296')
    form(c, rough(union(ellipse(fx - 30, fy - 40, 70, 40), ellipse(fx + 20, fy - 54, 46, 40)), 4, 10, L.seed), rockCol, { light: 0.55, rim: 0.35, grain: { amount: 0.22, cells: 8, seed: L.seed } })
    if (id === 'coast') { const r = stream(L.seed); for (let i = 0; i < 10; i++) { const x = fx - 80 + r() * 160; leaf(c, x, fy - 6, x + (r() - 0.5) * 20, fy - 26 - r() * 16, 3, hex('#5a7a3a'), false) } }
    else foliage(c, clumps(L.seed + 1, fx + 70, fy - 34, 40, 26, 5, 16, 22), id === 'ruins' ? { dark: hex('#4a5a2c'), mid: hex('#6f7a3a'), light: hex('#a8b064') } : { ...GREEN }, L.seed + 1, 3)
    contact(c, fx, fy, 100)
    return c
  }
  const c = new Canvas(288, 224), fx = 44, fy = 212
  if (id === 'ruins') { form(c, rough(poly([[fx - 20, fy], [fx + 220, fy - 40], [fx + 230, fy - 70], [fx - 10, fy - 30]]), 2, 12, 3), hex('#cdb48a'), { light: 0.5, rim: 0.35 }); crack(c, fx + 100, fy - 40, 40, 4) }
  else if (id === 'coast') wood(c, rough(poly([[fx - 20, fy], [fx + 240, fy - 30], [fx + 236, fy - 46], [fx - 16, fy - 18]]), 2, 14, 5), hex('#b8a888'), 5, 'x')
  else {
    const col = id === 'marsh' ? hex('#4a3e30') : hex('#6b4a2e')
    wood(c, rough(poly([[fx - 20, fy], [fx + 230, fy - 60], [fx + 238, fy - 78], [fx - 16, fy - 22]]), 2, 14, 6), col, 6, 'x')
    c.fill(capsule(fx + 120, fy - 36, fx + 160, fy - 120, 5, 2), [...col, 1])
    if (id === 'meadow') for (let i = 0; i < 10; i++) leaf(c, fx + 100 + i * 12, fy - 50 - i * 4, fx + 108 + i * 12, fy - 66 - i * 4, 4, GREEN.mid)
  }
  return c
}

/** Every frame of a biome's kit, by name. */
export function biomeDrawers(id: BiomeId): Record<string, () => Canvas> {
  const L = LOOKS[id]
  return {
    'floor-1': () => floor(id, 1), 'floor-2': () => floor(id, 2), 'floor-3': () => floor(id, 3), 'floor-4': () => floor(id, 4),
    'wall-1': () => biomeWall(id, 1), 'wall-2': () => biomeWall(id, 2), 'wall-3': () => biomeWall(id, 3), 'wall-top': () => wallTop(id),
    'riser-1': () => biomeRiser(id, 1), 'riser-2': () => biomeRiser(id, 2), stairs: () => biomeStairs(id), void: () => voidTile(id),
    'chest-closed': () => chest(L, false), 'chest-open': () => chest(L, true), spring: () => spring(L, id), waystone: () => waystone(L, id),
    'stairs-down': () => stairsDown(L, id), 'stairs-up': () => stairsUp(L, id), lantern: () => lantern(L),
    'battle-ground': () => battleGround(id), 'battle-back': () => battleBack(id),
    'battle-mid-1': () => battleMid(id, 1), 'battle-mid-2': () => battleMid(id, 2), 'battle-mid-3': () => battleMid(id, 3),
    ...decorations(id),
  }
}
void hash; void kerbLip
