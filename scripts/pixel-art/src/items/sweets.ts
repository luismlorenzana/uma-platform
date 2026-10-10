// Sweets (Sugar Grove, Speed family): uma-rpg docs/design/items.md#sweets. The raw sources of sugar: combs, canes, roots, saps, pods and blossoms.
import { ramp, type RGBA } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

function leaf(s: Sprite, cx: number, cy: number, rx: number, ry: number, rot: number, tones: RGBA[]): void {
  const id = s.addRamp(tones)
  shadeDome(s, Mask.ellipse(cx, cy, rx, ry, rot), id, { contact: false, bias: 0.08 })
}

/** A 1 px line between two points. */
function stroke(s: Sprite, a: Point, b: Point, id: number, tone: number, keep?: (x: number, y: number) => boolean): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2))
  for (let k = 0; k <= steps; k++) {
    const x = Math.floor(a[0] + ((b[0] - a[0]) * k) / steps)
    const y = Math.floor(a[1] + ((b[1] - a[1]) * k) / steps)
    if (keep && !keep(x, y)) continue
    s.paint(x, y, id, tone)
  }
}

/** Pixels within `r` of segment a–b. */
function capsule(a: Point, b: Point, r: number): Mask {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1
  return Mask.from((px, py) => {
    const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2))
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy) <= r
  })
}

/** Shades a straight rod from a to b as a cylinder: the side facing the top left is lit. */
function shadeRod(s: Sprite, mask: Mask, a: Point, b: Point, r: number, id: number | ((x: number, y: number, t: number) => number)): void {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1
  let nx = -dy / l, ny = dx / l
  if (nx + ny > 0) {
    nx = -nx
    ny = -ny
  }
  mask.each((x, y) => {
    const px = x + 0.5 - a[0], py = y + 0.5 - a[1]
    const side = (px * nx + py * ny) / r
    const t = (px * dx + py * dy) / (l * l)
    const tone = side > 0.6 ? 3 : side > 0.2 ? 5 : side > -0.25 ? 4 : side > -0.65 ? 3 : 2
    s.paint(x, y, typeof id === 'number' ? id : id(x, y, t), tone)
  })
}

interface CombStyle {
  wax: number
  /** Ramp of a cell's honey, chosen per cell. */
  honey: (i: number, j: number) => number
}

/**
 * A slab of comb: lit wax walls around hexagonal cells (rows of 2, 4, 4, 2 px), in rows 3 px apart with every other row
 * shifted half a cell. Cells must lie on the slab; each pools honey, shadowed under its upper wall, glossy at its lower right.
 */
function comb(s: Sprite, outline: readonly Point[], style: CombStyle, ox = 0, oy = 0, bias = 0): Mask {
  const slab = Mask.polygon(outline)
  shadeDome(s, slab, style.wax, { relief: 0.3, bias: bias + 0.12 })
  const cell: Point[] = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3]]
  const shade = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]
  for (let j = -1; j < 10; j++)
    for (let i = -1; i < 7; i++) {
      const x0 = ox + i * 5 + (j % 2 === 0 ? 0 : 2.5), y0 = oy + j * 3
      const px = cell.map(([dx, dy]) => [Math.floor(x0 + dx), y0 + dy] as const)
      if (!px.every(([x, y]) => slab.get(x, y) && slab.get(x, y + 1))) continue
      const id = style.honey(i, j)
      px.forEach(([x, y], k) => s.paint(x, y, id, (shade[k] ?? 3) - (k === 2 ? 1 : 0)))
      const [hx, hy] = px[9] ?? [0, 0]
      s.paint(hx, hy, id, 5)
    }
  return slab
}

/** A honey drip hanging from an edge: a short stream ending in a round drop. */
function drip(s: Sprite, x: number, top: number, len: number, id: number): void {
  const m = Mask.circle(x + 1, top + len + 1, 1.7).union(Mask.polygon([[x - 0.4, top], [x + 2.4, top], [x + 1.8, top + len + 1], [x + 0.2, top + len + 1]]))
  shadeDome(s, m, id, { contact: false, bias: 0.15 })
}

function honeycomb(s: Sprite): void {
  const waxId = s.addRamp(ramp('#f4c84e', { lift: 0.38, hueShift: 6 }))
  const honeyId = s.addRamp(ramp('#b8560c', { lift: 0.45, hueShift: 10 }))
  // The slab's lower edge, seen side-on as a band of cell walls.
  const edge = Mask.polygon([[6.8, 19.4], [12, 21.4], [25, 20.4], [25, 22.6], [12, 23.6], [6.8, 21.6]])
  edge.each((x, y) => s.paint(x, y, waxId, x % 2 === 0 ? 2 : 3))
  comb(s, [[6.8, 9.6], [12.6, 6], [21.4, 6.4], [25.4, 10.6], [25, 20.4], [12, 21.4], [6.8, 19.4]], { wax: waxId, honey: () => honeyId }, 1, 1)
  drip(s, 19, 22, 2, honeyId)
}

function sugarcane(s: Sprite): void {
  const caneId = s.addRamp(ramp('#8a3c6c', { lift: 0.32, hueShift: 8 }))
  const nodeId = s.addRamp(ramp('#d6cf8a', { lift: 0.3 }))
  const pithId = s.addRamp(ramp('#f3eec8', { lift: 0.3 }))
  // Leaves sprouting from the top of the tallest stalk.
  leaf(s, 18.2, 5.4, 4.2, 1.2, -40, ramp('#6faa3a'))
  leaf(s, 11.6, 5.2, 3.8, 1.1, 38, ramp('#5f9a34'))
  // A bundle of thick purple stalks, ringed every few pixels by pale nodes.
  const stalks: [Point, Point, number][] = [
    [[10.6, 25.4], [13.6, 7.4], 2.1],
    [[15.8, 25.8], [17.4, 8.6], 2.1],
    [[20.8, 25.4], [22.4, 12.4], 1.9],
  ]
  for (const [i, [a, b, r]] of stalks.entries()) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    shadeRod(s, capsule(a, b, r), a, b, r, (_x, _y, t) => ((((t * len + i * 2) % 5.2) + 5.2) % 5.2 < 0.9 ? nodeId : caneId))
    s.paint(Math.floor(b[0]), Math.floor(b[1]), pithId, 5)
    s.paint(Math.floor(b[0]) - 1, Math.floor(b[1]), pithId, 4)
    s.paint(Math.floor(b[0]), Math.floor(b[1]) + 1, pithId, 3)
  }
}

function sugarBeet(s: Sprite): void {
  const rootId = s.addRamp(ramp('#ecdcbc', { lift: 0.3, drop: 0.24, hueShift: 6 }))
  // Leaves first: a crown of broad leaves on pale stems.
  const leafTones = ramp('#4f9e3a')
  leaf(s, 11.4, 6.6, 4.6, 2.2, 52, leafTones)
  leaf(s, 20.6, 6.2, 4.8, 2.2, -50, leafTones)
  leaf(s, 16, 5.8, 2.4, 3.8, 4, ramp('#5fb444'))
  // A plump cone of a root tapering to a tail, with faint rings.
  const root = Mask.from((px, py) => {
    if (py < 10 || py > 26.4) return false
    const t = (py - 10) / 16.4
    const hw = 7.6 * Math.pow(Math.max(0, 1 - t), 0.8) * (t < 0.14 ? 0.72 + t * 2 : 1)
    return Math.abs(px - (16 + t * 1.6)) <= hw
  })
  shadeDome(s, root, rootId)
  for (const y of [14, 18, 21]) for (let x = 0; x < 32; x++) if (root.get(x, y) && (x + y) % 3 !== 0 && root.get(x - 1, y) && root.get(x + 1, y)) s.shift(x, y, -1)
  const stemId = s.addRamp(ramp('#a8c46a'))
  for (const [x, y] of [[14, 10], [16, 9], [18, 10], [15, 9], [17, 9]] as const) s.paint(x, y, stemId, 3)
}

const MAPLE: readonly Point[] = [
  [0, -1], [0.2, -0.6], [0.46, -0.7], [0.4, -0.36], [0.88, -0.44], [0.64, -0.1], [0.76, 0.12], [0.3, 0.14], [0.28, 0.32], [0.08, 0.24],
  [0.06, 0.62], [-0.06, 0.62], [-0.08, 0.24], [-0.28, 0.32], [-0.3, 0.14], [-0.76, 0.12], [-0.64, -0.1], [-0.88, -0.44], [-0.4, -0.36], [-0.46, -0.7], [-0.2, -0.6],
]

/** A five-lobed maple leaf, `size` px from center to the top tip, turned `rot` degrees. */
function mapleLeaf(s: Sprite, cx: number, cy: number, size: number, rot: number, tones: RGBA[]): void {
  const id = s.addRamp(tones)
  const r = (rot * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r)
  const at = ([x, y]: Point): Point => [cx + (x * c - y * sn) * size, cy + (x * sn + y * c) * size]
  const m = Mask.polygon(MAPLE.map(at))
  shadeDome(s, m, id, { bias: 0.1, relief: 0.7 })
  stroke(s, at([0, 0.5]), at([0, -0.75]), id, 2, (x, y) => m.get(x, y))
}

function mapleSap(s: Sprite): void {
  const woodId = s.addRamp(ramp('#a8743e', { lift: 0.3, hueShift: 6 }))
  const bandId = s.addRamp(ramp('#8c949e', { lift: 0.35 }))
  const sapId = s.addRamp(ramp('#c8701a', { lift: 0.45, hueShift: 10 }))
  // A small stave bucket, wider at the mouth, brimming with amber sap.
  const bucket = Mask.polygon([[7.4, 10.4], [21.6, 10.4], [20.2, 25.2], [8.8, 25.2]])
  bucket.each((x, y) => {
    const p = (x - 7.4) / 14.2
    s.paint(x, y, woodId, p < 0.15 ? 3 : p < 0.45 ? 4 : p < 0.75 ? 3 : 2)
  })
  for (let y = 11; y <= 25; y++) for (let x = 0; x < 32; x++) if (bucket.get(x, y) && x % 3 === 0 && bucket.get(x - 1, y) && bucket.get(x + 1, y)) s.shift(x, y, -1)
  for (const y of [13, 22]) for (let x = 0; x < 32; x++) if (bucket.get(x, y) || bucket.get(x, y + 1)) for (const yy of [y, y + 1]) if (bucket.get(x, yy)) s.paint(x, yy, bandId, yy === y ? 4 : 2)
  // The wire bail.
  for (let k = 0; k <= 24; k++) {
    const a = Math.PI + (k / 24) * Math.PI
    s.paint(Math.floor(14.5 + Math.cos(a) * 7.6), Math.floor(11 + Math.sin(a) * 6), bandId, k < 8 ? 4 : 3)
  }
  // The mouth: a rim around a glossy pool of sap.
  const rim = Mask.ellipse(14.5, 10.4, 7.4, 2.2)
  rim.each((x, y) => s.paint(x, y, woodId, 4))
  Mask.ellipse(14.5, 10.6, 6, 1.4).each((x, y) => s.paint(x, y, sapId, y < 10 ? 2 : x < 13 ? 5 : 3))
  mapleLeaf(s, 21.2, 19.8, 6.4, 24, ramp('#e2452a', { hueShift: 10 }))
}

function cacaoPod(s: Sprite): void {
  const podId = s.addRamp(ramp('#ec9a26', { lift: 0.32, hueShift: 14, satShift: 0.06 }))
  const stemId = s.addRamp(ramp('#6e4a2a'))
  const cx = 15.6, cy = 16.4, len = 10.6, wid = 6.4, rot = -38
  const r = (rot * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r)
  const local = (px: number, py: number): [number, number] => {
    const dx = px - cx, dy = py - cy
    return [(dx * c + dy * sn) / len, (-dx * sn + dy * c) / wid]
  }
  // A football-shaped pod, pointed at both ends.
  const pod = Mask.from((px, py) => {
    const [u, v] = local(px, py)
    return Math.abs(v) <= Math.pow(Math.max(0, 1 - u * u), 0.8) * (u > 0.6 ? 1 - (u - 0.6) * 0.5 : 1)
  })
  shadeDome(s, pod, podId)
  // Ribs: grooves running end to end.
  pod.each((x, y) => {
    const [u, v] = local(x + 0.5, y + 0.5)
    const across = v / Math.max(0.2, Math.pow(Math.max(0, 1 - u * u), 0.8))
    const f = across * 2.4 - Math.round(across * 2.4)
    if (Math.abs(u) > 0.88) return
    if (Math.abs(f) < 0.2) s.shift(x, y, -2)
    else if (f > 0.2 && f < 0.42) s.shift(x, y, 1)
  })
  const tip = (u: number): [number, number] => [cx + u * len * c, cy + u * len * sn]
  const [sx, sy] = tip(-1.02)
  s.paint(Math.floor(sx), Math.floor(sy), stemId, 3)
  s.paint(Math.floor(sx) - 1, Math.floor(sy) + 1, stemId, 2)
}

function vanillaPod(s: Sprite): void {
  const podId = s.addRamp(ramp('#4a2c1c', { lift: 0.3, hueShift: 6 }))
  // Three long cured pods, gently curved, lying in a loose bundle.
  for (const [i, off] of [-3.4, 0, 3.4].entries()) {
    const pts: Point[] = []
    for (let k = 0; k <= 10; k++) {
      const t = k / 10
      pts.push([7.4 + off * 0.7 + t * (15 - i * 1.2), 24.2 + off * 0.7 - t * (15.4 - i * 0.6) + Math.sin(t * Math.PI) * 1.8])
    }
    const m = new Mask()
    for (let k = 0; k + 1 < pts.length; k++) m.union(capsule(pts[k] ?? [0, 0], pts[k + 1] ?? [0, 0], 1.15))
    shadeDome(s, m, podId, { relief: 1.3 })
  }
  // A pale vanilla orchid tucked at the top.
  const petalId = s.addRamp(ramp('#f1e9b2', { lift: 0.35, hueShift: 6 }))
  const lipId = s.addRamp(ramp('#f2c43a', { lift: 0.3 }))
  for (const a of [-90, -18, 54, 126, 198]) {
    const rad = (a * Math.PI) / 180
    shadeDome(s, Mask.ellipse(21 + Math.cos(rad) * 2.6, 8.6 + Math.sin(rad) * 2.6, 2.4, 1.2, a), petalId, { contact: false, bias: 0.1 })
  }
  shadeDome(s, Mask.circle(21.2, 8.8, 1.5), lipId, { contact: false, bias: 0.1 })
  leaf(s, 15.4, 7.4, 3.2, 1.4, 30, ramp('#6aa83e'))
}

function agaveHeart(s: Sprite): void {
  const coreId = s.addRamp(ramp('#d9d6a4', { lift: 0.3, hueShift: 6 }))
  const stumpId = s.addRamp(ramp('#6fa29a', { lift: 0.3, hueShift: 6 }))
  // The piña: a fat oval core covered in the cut stumps of its leaves, spiralling up.
  const core = Mask.ellipse(16, 16.6, 9, 9.4)
  shadeDome(s, core, coreId)
  const r = rng('agave')
  for (let row = 0; row < 5; row++) {
    const y = 9.4 + row * 3.4
    const n = row === 0 || row === 4 ? 3 : 4
    for (let k = 0; k < n; k++) {
      const x = 16 + (k - (n - 1) / 2) * 4.2 + (row % 2) * 1.4 + (r() - 0.5) * 0.6
      // Each stump: a small flat diamond, lit on its upper left.
      const stump = Mask.polygon([[x, y - 1.6], [x + 1.8, y], [x, y + 1.4], [x - 1.8, y]])
      if (!stump.data.some((v, i) => v === 1 && !core.data[i])) {
        stump.each((sx, sy) => s.paint(sx, sy, stumpId, sx + 0.5 < x && sy + 0.5 < y ? 4 : sx + 0.5 >= x && sy + 0.5 >= y ? 2 : 3))
        s.paint(Math.floor(x), Math.floor(y - 1), stumpId, 5)
      }
    }
  }
  // Cut leaf stubs breaking the silhouette at the crown.
  for (const [x, y, w] of [[12.4, 6.6, 2], [16, 5.6, 3], [19.8, 6.8, 2]] as const)
    for (let k = 0; k < w; k++) {
      s.paint(Math.floor(x) + k, Math.floor(y), stumpId, k === 0 ? 4 : 3)
      s.paint(Math.floor(x) + k, Math.floor(y) + 1, stumpId, 2)
    }
}

function palmSap(s: Sprite): void {
  const ribId = s.addRamp(ramp('#8aa244'))
  // A palm frond leaning behind the vessel: a feather of short leaflets swept toward its tip.
  const a: Point = [24.6, 22.6], b: Point = [9.4, 3.8]
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len
  const leafletId = s.addRamp(ramp('#4f9c3c', { hueShift: 8 }))
  for (let d = 4; d < len - 1; d += 2.2) {
    const x = a[0] + dx * d, y = a[1] + dy * d
    const reach = 4.2 * Math.sin((d / len) * Math.PI) + 1
    for (const side of [-1, 1]) {
      const ex = x + (dx * 0.8 - dy * side) * reach, ey = y + (dy * 0.8 + dx * side) * reach
      stroke(s, [x, y], [ex, ey], leafletId, side < 0 ? 4 : 3)
    }
  }
  stroke(s, a, b, ribId, 4)
  // A round clay jar with a short neck, brimming with milky sap.
  const clayId = s.addRamp(ramp('#b9643a', { lift: 0.3, hueShift: 8 }))
  const sapId = s.addRamp(ramp('#f2ead2', { lift: 0.3, drop: 0.2 }))
  const jar = Mask.circle(13.6, 19.6, 6.4).union(Mask.polygon([[10.2, 12.2], [17, 12.2], [16.4, 15.4], [10.8, 15.4]]))
  shadeDome(s, jar, clayId)
  for (let x = 0; x < 32; x++) if (jar.get(x, 18) && jar.get(x - 1, 18) && jar.get(x + 1, 18)) s.shift(x, 18, -1)
  Mask.ellipse(13.6, 12.2, 4.2, 1.6).each((x, y) => s.paint(x, y, clayId, 4))
  Mask.ellipse(13.6, 12.4, 2.8, 0.9).each((x, y) => s.paint(x, y, sapId, 4))
  // A drip of sap down the neck.
  s.paint(15, 13, sapId, 4)
  s.paint(15, 14, sapId, 3)
}

function fairyHoneycomb(s: Sprite): void {
  const wingId = s.addRamp(ramp('#9ad8ff', { lift: 0.55, drop: 0.24, hueShift: 4 }))
  // Two pairs of gauzy wings at the comb's shoulders, catching the light.
  for (const [cx, cy, rx, ry, rot] of [[11.6, 8.2, 4, 2, 40], [20.4, 8.2, 4, 2, -40], [8.6, 13, 3, 1.5, -18], [23.4, 13, 3, 1.5, 18]] as const) {
    const m = Mask.ellipse(cx, cy, rx, ry, rot)
    m.each((x, y) => s.paint(x, y, wingId, (x + y) % 3 === 0 ? 3 : 4))
    s.paint(Math.floor(cx - 1), Math.floor(cy), wingId, 5)
  }
  const waxId = s.addRamp(ramp('#ffe7a8', { lift: 0.5, drop: 0.26, hueShift: 8 }))
  const pastel = ['#ff7eb6', '#b48cff', '#5fd8b0', '#74b8ff'].map((h) => s.addRamp(ramp(h, { lift: 0.4, drop: 0.26 })))
  // A perfect hexagon of comb, each row pooled with a different pastel honey.
  const hex: Point[] = [0, 1, 2, 3, 4, 5].map((k) => [16 + Math.cos((k * Math.PI) / 3) * 9.4, 16.6 + Math.sin((k * Math.PI) / 3) * 8.6])
  comb(s, hex, { wax: waxId, honey: (_i, j) => pastel[(((j - 1) % pastel.length) + pastel.length) % pastel.length] ?? waxId }, 3, 1, 0.12)
  drip(s, 19, 24, 0, pastel[0] ?? waxId)
}

function ambrosiaBlossom(s: Sprite): void {
  const goldId = s.addRamp(ramp('#f6b21c', { lift: 0.5, drop: 0.3, hueShift: 10 }))
  const glowId = s.addRamp(ramp('#ffe68a', { lift: 0.6, drop: 0.24, hueShift: 6 }))
  const heartId = s.addRamp(ramp('#fff6d8', { lift: 0.6, drop: 0.2 }))
  const stamenId = s.addRamp(ramp('#ff9a2a', { lift: 0.4 }))
  const stemId = s.addRamp(ramp('#7fb048'))
  for (let y = 22; y <= 25; y++) s.paint(16, y, stemId, y % 2 === 0 ? 3 : 4)
  leaf(s, 20.2, 23.6, 3.4, 1.4, -22, ramp('#7fb048'))
  leaf(s, 11.8, 23.8, 3, 1.3, 24, ramp('#6a9c3c'))
  // Five broad, slightly pointed petals that pale to a glow toward the heart.
  const cx = 16, cy = 14.6
  for (const a of [-90, -18, 54, 126, 198]) {
    const r = (a * Math.PI) / 180
    const petal = Mask.ellipse(cx + Math.cos(r) * 4.8, cy + Math.sin(r) * 4.4, 5, 3.6, a).union(
      Mask.polygon([[cx + Math.cos(r) * 8, cy + Math.sin(r) * 7.6], [cx + Math.cos(r + 0.5) * 6.4, cy + Math.sin(r + 0.5) * 6], [cx + Math.cos(r - 0.5) * 6.4, cy + Math.sin(r - 0.5) * 6]]),
    )
    shadeDome(s, petal, (x, y) => (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 4.6 ? glowId : goldId), { relief: 0.7, bias: 0.1 })
    // A crease down the middle of each petal.
    for (let d = 3; d < 7; d += 0.5) s.shift(Math.floor(cx + Math.cos(r) * d), Math.floor(cy + Math.sin(r) * d), -1)
  }
  shadeDome(s, Mask.circle(cx, cy, 2.8), heartId, { contact: false, bias: 0.3 })
  for (const [x, y] of [[15, 13], [17, 13], [14, 15], [18, 15], [16, 16]] as const) s.paint(x, y, stamenId, 4)
}

export const SWEETS: ItemIcon[] = [
  { id: 'honeycomb', name: 'Honeycomb', grade: 1, paint: honeycomb },
  { id: 'sugarcane', name: 'Sugarcane', grade: 2, paint: sugarcane },
  { id: 'sugar-beet', name: 'Sugar Beet', grade: 3, paint: sugarBeet },
  { id: 'maple-sap', name: 'Maple Sap', grade: 4, paint: mapleSap },
  { id: 'cacao-pod', name: 'Cacao Pod', grade: 5, paint: cacaoPod },
  { id: 'vanilla-pod', name: 'Vanilla Pod', grade: 6, paint: vanillaPod },
  { id: 'agave-heart', name: 'Agave Heart', grade: 7, paint: agaveHeart },
  { id: 'palm-sap', name: 'Palm Sap', grade: 8, paint: palmSap },
  { id: 'fairy-honeycomb', name: 'Fairy Honeycomb', grade: 9, paint: fairyHoneycomb },
  { id: 'ambrosia-blossom', name: 'Ambrosia Blossom', grade: 10, paint: ambrosiaBlossom },
]
