// Blocks (Workbench, refined Stones): uma-rpg docs/design/items.md#stones. Cut building blocks in isometric view:
// three faces, each stone's texture, and a few shapes (cube, brick, slabs, column) so the family varies in silhouette.
import { ramp, type RampOptions } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { frustum, halo, linePixels, onQuad, paintSolid, pixelOf, prism, speckle, turntable, type PaintedFace, type View } from './workbench-kit.ts'

const VIEW: View = turntable(45, 30, 16, 22.6)

type Shape = 'cube' | 'brick' | 'slabs' | 'column' | 'tall' | 'bevel'

interface BlockSpec {
  id: string
  name: string
  grade: number
  stone: string
  stoneRamp?: RampOptions
  shape: Shape
  texture: (s: Sprite, block: Block, spec: BlockSpec) => void
}

interface Block {
  faces: PaintedFace[]
  mask: Mask
  view: View
  stoneId: number
}

const face = (b: Block, tag: string) => b.faces.find((f) => f.tag === tag)
/** The visible side faces, left one first. */
const sides = (b: Block) => b.faces.filter((f) => f.tag !== 'top').sort((p, q) => (p.poly[0]?.[0] ?? 0) - (q.poly[0]?.[0] ?? 0))

function lightEdges(s: Sprite, b: Block): void {
  const top = face(b, 'top')
  if (!top) return
  // Top rim: pixels of the top face that border a side face get the highlight.
  top.mask.each((x, y) => {
    if (!top.mask.get(x, y + 1) && b.mask.get(x, y + 1)) s.paint(x, y, b.stoneId, 5)
  })
  // Front corner: the left face's column next to the right face is lit.
  const [left, right] = sides(b)
  if (left && right)
    left.mask.each((x, y) => {
      if (right.mask.get(x + 1, y) && !top.mask.get(x, y)) s.paint(x, y, b.stoneId, 4)
    })
}

function toBlock(stoneId: number, faces: PaintedFace[], view: View): Block {
  const mask = new Mask()
  for (const f of faces) mask.union(f.mask)
  return { faces, mask, view, stoneId }
}

const TONES = { hi: 4, lo: 2, tones: { top: 4 } }

function build(s: Sprite, spec: BlockSpec, stoneId: number): Block[] {
  if (spec.shape === 'cube') {
    // Legendary blocks are a little smaller, clear of the glints.
    const k = spec.grade >= 9 ? 11 : 13
    const v = spec.grade >= 9 ? turntable(45, 30, 16.4, 22) : VIEW
    return [toBlock(stoneId, paintSolid(s, v, frustum(k, k, k, k, k * 0.85), stoneId, TONES), v)]
  }
  if (spec.shape === 'bevel') {
    // A polished block with chamfered top edges: a box under a low frustum.
    const v = turntable(45, 30, 16, 22.2)
    const body = paintSolid(s, v, frustum(13.5, 13.5, 13.5, 13.5, 8.5), stoneId, TONES)
    const cap = paintSolid(s, v, frustum(13.5, 13.5, 10, 10, 2.2, [0, 0, 8.5]), stoneId, { hi: 5, lo: 3, tones: { top: 4 } })
    return [toBlock(stoneId, [...body.filter((f) => f.tag !== 'top'), ...cap], v)]
  }
  if (spec.shape === 'tall') {
    const v = turntable(45, 30, 16.4, 23.6)
    return [toBlock(stoneId, paintSolid(s, v, frustum(10, 10, 10, 10, 15), stoneId, TONES), v)]
  }
  if (spec.shape === 'brick') {
    const v = turntable(38, 30, 16, 22.4)
    return [toBlock(stoneId, paintSolid(s, v, frustum(17, 9, 17, 9, 8), stoneId, TONES), v)]
  }
  if (spec.shape === 'column') {
    const v = turntable(45, 30, 16, 23.6)
    return [toBlock(stoneId, paintSolid(s, v, prism(6, 7.5, 14, [0, 0, 0], 0.25), stoneId, { hi: 4, lo: 1, tones: { top: 4 } }), v)]
  }
  // Slabs: two thin plates, the upper one slightly turned.
  const v = turntable(45, 30, 16, 22)
  const lower = toBlock(stoneId, paintSolid(s, v, frustum(15, 15, 15, 15, 4.5), stoneId, TONES), v)
  lightEdges(s, lower)
  const v2 = turntable(35, 30, 15.5, 22 - 4.5 * Math.cos((30 * Math.PI) / 180) - 0.4)
  const upper = toBlock(stoneId, paintSolid(s, v2, frustum(13, 13, 13, 13, 4), stoneId, TONES), v2)
  upper.mask.each((x, y) => {
    if (!upper.mask.get(x, y + 1) && lower.mask.get(x, y + 1)) s.paint(x, y + 1, stoneId, 1)
  })
  return [lower, upper]
}

/** Calls `fn` for points spread over a face (u, w in 0–1). */
function facePixels(b: Block, f: PaintedFace, u: number, w: number): [number, number] {
  return pixelOf(b.view, onQuad(f.pts, u, w))
}

// ---------------------------------------------------------------- textures

function pits(seed: string, count: number) {
  return (s: Sprite, b: Block) => {
    for (const f of b.faces) speckle(s, `${seed}-${f.tag}`, f.mask, Math.round((count * f.mask.data.reduce((n, v) => n + v, 0)) / 120), 2, -1, 4)
  }
}

/** Horizontal strata on the sides, and matching bands on the top. */
function strata(bandId: number, rows: readonly number[]) {
  return (s: Sprite, b: Block) => {
    for (const f of sides(b))
      for (const w of rows)
        for (let u = 0; u <= 1; u += 0.02) {
          const [x, y] = facePixels(b, f, u, w)
          if (f.mask.get(x, y)) s.paint(x, y, bandId, s.toneAt(x, y))
        }
    const top = face(b, 'top')
    if (top)
      for (const w of [0.3, 0.68])
        for (let u = 0; u <= 1; u += 0.02) {
          const [x, y] = facePixels(b, top, u, w + Math.sin(u * 9) * 0.05)
          if (top.mask.get(x, y)) s.paint(x, y, bandId, 4)
        }
  }
}

function granite(darkId: number, lightId: number) {
  return (s: Sprite, b: Block, spec: BlockSpec) => {
    const r = rng(`${spec.id}-grain`)
    b.mask.each((x, y) => {
      const t = s.toneAt(x, y)
      const roll = r()
      if (roll < 0.16) s.paint(x, y, darkId, Math.max(1, t - 1))
      else if (roll < 0.24) s.paint(x, y, lightId, Math.min(5, t + 1))
    })
  }
}

function veins(veinId: number, seed: string, count: number) {
  return (s: Sprite, b: Block) => {
    const r = rng(seed)
    for (const f of b.faces) {
      for (let k = 0; k < count; k++) {
        let u = r(), w = 0
        const du = (r() - 0.5) * 0.9
        let prev: [number, number] | null = null
        for (; w <= 1; w += 0.12) {
          const p = facePixels(b, f, Math.min(1, Math.max(0, u)), w)
          if (prev) for (const [x, y] of linePixels(prev[0], prev[1], p[0], p[1])) if (f.mask.get(x, y)) s.paint(x, y, veinId, Math.max(2, s.toneAt(x, y) - 1))
          prev = p
          u += du * 0.12 + (r() - 0.5) * 0.12
        }
      }
    }
  }
}

function glassy(s: Sprite, b: Block): void {
  // Sharp diagonal reflections across each face, like polished volcanic glass.
  for (const f of b.faces) {
    const lane = f.tag === 'top' ? [0.25, 0.45] : [0.2, 0.32]
    for (const start of lane)
      for (let t = 0; t <= 1; t += 0.05) {
        const [x, y] = facePixels(b, f, start + t * 0.35, 1 - t)
        if (f.mask.get(x, y)) s.paint(x, y, b.stoneId, f.tag === 'top' ? 5 : s.toneAt(x, y) + 2)
      }
  }
}

function polish(s: Sprite, b: Block): void {
  // A soft sheen on the top and the lit side.
  const top = face(b, 'top')
  if (top)
    for (let t = 0.2; t <= 0.6; t += 0.05) {
      const [x, y] = facePixels(b, top, t, 0.55)
      if (top.mask.get(x, y)) s.paint(x, y, b.stoneId, 5)
    }
  const [left] = sides(b)
  if (left)
    for (let w = 0.25; w <= 0.8; w += 0.08) {
      const [x, y] = facePixels(b, left, 0.25, w)
      if (left.mask.get(x, y)) s.paint(x, y, b.stoneId, 4)
    }
}

function rune(glowId: number, glow: string) {
  return (s: Sprite, b: Block) => {
    const [left, right] = sides(b)
    if (!left || !right) return
    // Algiz on the lit face, Kaun on the shaded one, carved and glowing.
    const [lx, ly] = facePixels(b, left, 0.5, 0.45)
    const algiz: [number, number][] = [[0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [-1, -1], [-2, -2], [-2, -3], [1, -1], [2, -2], [2, -3]]
    for (const [dx, dy] of algiz) if (left.mask.get(lx + dx, ly + dy)) s.paint(lx + dx, ly + dy, glowId, 5)
    const [rx, ry] = facePixels(b, right, 0.5, 0.45)
    const kaun: [number, number][] = [[1, -2], [0, -1], [-1, 0], [0, 1], [1, 2]]
    for (const [dx, dy] of kaun) if (right.mask.get(rx + dx, ry + dy)) s.paint(rx + dx, ry + dy, glowId, 4)
    halo(s, glow, 60, 2)
  }
}

function cracks(glowId: number, glow: string, seed: string) {
  return (s: Sprite, b: Block) => {
    const r = rng(seed)
    const cells: [number, number][] = []
    for (const f of b.faces) {
      const n = 1
      for (let k = 0; k < n; k++) {
        let u = 0.3 + r() * 0.4, w = 0.1
        let prev = facePixels(b, f, u, w)
        for (let step = 0; step < 3; step++) {
          u += (r() - 0.5) * 0.5
          w += 0.22 + r() * 0.1
          const p = facePixels(b, f, Math.min(0.95, Math.max(0.05, u)), Math.min(0.95, w))
          for (const c of linePixels(prev[0], prev[1], p[0], p[1])) if (f.mask.get(c[0], c[1])) cells.push(c)
          prev = p
        }
      }
    }
    for (const [x, y] of cells) s.paint(x, y, glowId, 4)
    for (const [x, y] of cells) if (r() < 0.35) s.paint(x, y, glowId, 5)
    halo(s, glow, 70, 2)
  }
}

/** A small fossil shell pressed into the lit face. */
function fossil(s: Sprite, b: Block): void {
  const [left] = sides(b)
  if (!left) return
  const [cx, cy] = facePixels(b, left, 0.42, 0.42)
  const ring: [number, number][] = [[-1, -1], [0, -2], [1, -1], [1, 0], [1, 1], [0, 2], [-1, 1], [-2, 0]]
  for (const [dx, dy] of ring) if (left.mask.get(cx + dx, cy + dy)) s.paint(cx + dx, cy + dy, b.stoneId, 2)
  for (const [dx, dy] of [[0, -1], [0, 0], [-1, 0]] as const) if (left.mask.get(cx + dx, cy + dy)) s.paint(cx + dx, cy + dy, b.stoneId, 4)
  if (left.mask.get(cx, cy + 1)) s.paint(cx, cy + 1, b.stoneId, 2)
}

/** Thin split lines along the sides of layered stone. */
function laminate(s: Sprite, b: Block): void {
  for (const f of sides(b))
    for (let u = 0.04; u <= 0.96; u += 0.02) {
      if (Math.sin(u * 23) > 0.75) continue
      const [x, y] = facePixels(b, f, u, 0.5)
      if (f.mask.get(x, y) && s.toneAt(x, y) <= 4) s.paint(x, y, b.stoneId, Math.max(1, s.toneAt(x, y) - 1))
    }
}

function paint(spec: BlockSpec): (s: Sprite) => void {
  return (s) => {
    const stoneId = s.addRamp(ramp(spec.stone, spec.stoneRamp ?? { satShift: 0.02, hueShift: 6, lift: 0.3, drop: 0.25 }))
    const blocks = build(s, spec, stoneId)
    const last = blocks[blocks.length - 1]
    if (!last) return
    for (const b of blocks) lightEdges(s, b)
    const all: Block = { faces: blocks.flatMap((b) => b.faces), mask: new Mask().union(...blocks.map((b) => b.mask)), view: last.view, stoneId }
    spec.texture(s, blocks.length > 1 ? last : all, spec)
    if (blocks.length > 1) for (const b of blocks.slice(0, -1)) spec.texture(s, b, spec)
  }
}

const withRamp = (hex: string, o?: RampOptions) => (s: Sprite) => s.addRamp(ramp(hex, o ?? { satShift: 0.02, hueShift: 6 }))

const SPECS: BlockSpec[] = [
  {
    id: 'limestone-block',
    name: 'Limestone Block',
    grade: 1,
    stone: '#d8cca5',
    shape: 'cube',
    texture: (s, b) => {
      pits('limestone', 6)(s, b)
      fossil(s, b)
    },
  },
  {
    id: 'sandstone-block',
    name: 'Sandstone Block',
    grade: 2,
    stone: '#dba566',
    shape: 'brick',
    texture: (s, b) => strata(withRamp('#bf7444')(s), [0.22, 0.5, 0.78])(s, b),
  },
  {
    id: 'slate-block',
    name: 'Slate Block',
    grade: 3,
    stone: '#5d6a7e',
    shape: 'slabs',
    texture: (s, b) => {
      pits('slate', 3)(s, b)
      laminate(s, b)
    },
  },
  {
    id: 'granite-block',
    name: 'Granite Block',
    grade: 4,
    stone: '#b48f88',
    shape: 'cube',
    texture: (s, b, spec) => granite(withRamp('#4a4049')(s), withRamp('#efe6e0')(s))(s, b, spec),
  },
  { id: 'basalt-block', name: 'Basalt Block', grade: 5, stone: '#55565f', shape: 'column', texture: pits('basalt', 4) },
  {
    id: 'marble-block',
    name: 'Marble Block',
    grade: 6,
    stone: '#ece9e4',
    stoneRamp: { lift: 0.4, drop: 0.2, hueShift: 10, satShift: 0.02 },
    shape: 'cube',
    texture: (s, b) => {
      veins(withRamp('#8c93a6')(s), 'marble', 2)(s, b)
      polish(s, b)
    },
  },
  {
    id: 'obsidian-block',
    name: 'Obsidian Block',
    grade: 7,
    stone: '#30263f',
    stoneRamp: { lift: 0.32, drop: 0.3, hueShift: 10, satShift: 0.06 },
    shape: 'cube',
    texture: (s, b) => glassy(s, b),
  },
  {
    id: 'jade-block',
    name: 'Jade Block',
    grade: 8,
    stone: '#4fae7a',
    stoneRamp: { lift: 0.32, drop: 0.26, hueShift: 8, satShift: 0.04 },
    shape: 'bevel',
    texture: (s, b) => {
      speckle(s, 'jade-cloud', b.mask, 14, 2, 1, 3)
      veins(withRamp('#8fd9a8', { lift: 0.3, drop: 0.2 })(s), 'jade', 1)(s, b)
      polish(s, b)
    },
  },
  {
    id: 'runestone-block',
    name: 'Runestone Block',
    grade: 9,
    stone: '#6c778a',
    shape: 'tall',
    texture: (s, b) => {
      pits('runestone', 3)(s, b)
      rune(withRamp('#6ff0ff', { lift: 0.5, drop: 0.25 })(s), '#7ff6ff')(s, b)
    },
  },
  {
    id: 'meteorite-block',
    name: 'Meteorite Block',
    grade: 10,
    stone: '#4b403f',
    stoneRamp: { lift: 0.3, drop: 0.3, hueShift: 6, satShift: 0.03 },
    shape: 'cube',
    texture: (s, b) => {
      pits('meteorite', 6)(s, b)
      cracks(withRamp('#ff9a3a', { lift: 0.5, drop: 0.2 })(s), '#ffb35a', 'meteorite-cracks')(s, b)
    },
  },
]

export const STONES_REFINED: ItemIcon[] = SPECS.map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: paint(spec) }))
