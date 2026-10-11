// Accessories: the ring (refined Crystals) and the charm (refined Bones & Horns). The ring is a band seen at a tilt
// with the grade's cut gem set on top, in that gem's own cut; the band climbs from copper to gold and orichalcum and
// gains prongs, shoulders and side stones. The charm hangs a small carving of the grade's kind on a cord that turns
// into a beaded thong and then a gold chain.
import { hex } from '../color.ts'
import { bloom, linePixels } from '../items/refined/workbench-kit.ts'
import { cutStone, Mask, shadeDome, shadeFacets, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { gemOf, jewel, legendaryHalo } from './fittings.ts'
import { BONES, CORD, DARK_GRIP, GOLD, LEATHER_GRIP, METALS, SILVER, use, type Material } from './materials.ts'

// ---------------------------------------------------------------- ring

const BAND: Material[] = [
  METALS[0] as Material, SILVER, SILVER, GOLD, GOLD, METALS[6] as Material, GOLD, METALS[6] as Material, METALS[8] as Material, METALS[9] as Material,
]

function centroid(pts: readonly Point[]): Point {
  return [pts.reduce((n, p) => n + p[0], 0) / pts.length, pts.reduce((n, p) => n + p[1], 0) / pts.length]
}

/** A small faceted stone: side facets ranked by light, a lit table nudged toward the light, a bright corner. */
function facetGem(s: Sprite, id: number, outer: Point[], k = 0.5): void {
  const [cx, cy] = centroid(outer)
  const inner = outer.map(([x, y]) => [cx - 0.5 + (x - cx) * k, cy - 0.5 + (y - cy) * k] as const)
  shadeFacets(s, outer, cutStone(outer, inner, 3), id)
  const table = Mask.polygon(inner)
  table.each((x, y) => {
    if (!table.get(x - 1, y) || !table.get(x, y - 1)) s.paint(x, y, id, 5)
  })
}

function poly(n: number, cx: number, cy: number, rx: number, ry: number, rot = 0): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((i + rot) / n) * Math.PI * 2 - Math.PI / 2
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as const
  })
}

/** Each grade's stone in its own cut (as the cut gems are drawn), sized to sit on a ring. */
function ringStone(s: Sprite, g: number, id: number, cx: number, cy: number): void {
  const z = 1.2
  switch (g) {
    case 1:
      facetGem(s, id, poly(6, cx, cy, 3.6 * z, 3.3 * z, 0.5))
      break
    case 2:
      facetGem(s, id, poly(12, cx, cy, 3.4 * z, 4.2 * z))
      break
    case 3: {
      const r = 3.8 * z, c = 1.4 * z
      facetGem(s, id, [[cx - r + c, cy - r], [cx + r - c, cy - r], [cx + r, cy - r + c], [cx + r, cy + r - c], [cx + r - c, cy + r], [cx - r + c, cy + r], [cx - r, cy + r - c], [cx - r, cy - r + c]])
      break
    }
    case 4:
      facetGem(s, id, poly(12, cx, cy, 4 * z, 4 * z))
      break
    case 5: {
      // Emerald cut: a long octagon with a stepped table.
      const w = 3.4 * z, h = 4.4 * z, c = 1.3 * z
      facetGem(s, id, [[cx - w + c, cy - h], [cx + w - c, cy - h], [cx + w, cy - h + c], [cx + w, cy + h - c], [cx + w - c, cy + h], [cx - w + c, cy + h], [cx - w, cy + h - c], [cx - w, cy - h + c]], 0.56)
      break
    }
    case 6: {
      // Pear, point up.
      const pts: Point[] = [[cx, cy - 5 * z]]
      for (let a = -20; a <= 200; a += 30) {
        const t = (a * Math.PI) / 180
        pts.push([cx + Math.cos(t) * 3.7 * z, cy + 1 + Math.sin(t) * 3.4 * z])
      }
      facetGem(s, id, pts)
      break
    }
    case 7: {
      const pts: Point[] = []
      for (let a = -160; a <= 40; a += 40) pts.push([cx + 2 * z + Math.cos((a * Math.PI) / 180) * 2.4 * z, cy - 1.4 * z + Math.sin((a * Math.PI) / 180) * 2.4 * z])
      pts.push([cx, cy + 4.4 * z])
      for (let a = 140; a <= 340; a += 40) pts.push([cx - 2 * z + Math.cos((a * Math.PI) / 180) * 2.4 * z, cy - 1.4 * z + Math.sin((a * Math.PI) / 180) * 2.4 * z])
      pts.push([cx, cy - 2 * z])
      facetGem(s, id, pts, 0.45)
      break
    }
    case 8: {
      // A brilliant seen from the side: crown facets over a pointed pavilion.
      const top = cy - 3.6 * z, girdle = cy - 0.6, tip = cy + 4.6 * z
      const outline = Mask.polygon([[cx - 5, girdle], [cx - 2.4, top], [cx + 2.4, top], [cx + 5, girdle], [cx, tip]])
      outline.each((x, y) => s.paint(x, y, id, 3))
      const facets: [Point[], number][] = [
        [[[cx - 5, girdle], [cx - 2.4, top], [cx - 0.6, top], [cx - 1.8, girdle]], 4],
        [[[cx - 1.8, girdle], [cx - 0.6, top], [cx + 1.6, top], [cx + 1.8, girdle]], 5],
        [[[cx + 1.8, girdle], [cx + 1.6, top], [cx + 2.4, top], [cx + 5, girdle]], 3],
        [[[cx - 5, girdle], [cx - 1.8, girdle], [cx, tip]], 4],
        [[[cx - 1.8, girdle], [cx + 1.8, girdle], [cx, tip]], 3],
        [[[cx + 1.8, girdle], [cx + 5, girdle], [cx, tip]], 2],
      ]
      for (const [p, tone] of facets) Mask.polygon(p).each((x, y) => s.paint(x, y, id, tone))
      for (let x = Math.floor(cx - 4); x <= cx + 4; x++) if (outline.get(x, Math.floor(girdle))) s.paint(x, Math.floor(girdle), id, x < cx ? 5 : 4)
      break
    }
    case 9: {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2
        const r = (i % 2 === 0 ? 5 : 2.4) * z
        return [cx + Math.cos(a) * r, cy + 0.4 + Math.sin(a) * r] as const
      })
      facetGem(s, id, pts, 0.4)
      const core = use(s, '#cfe0ff', { lift: 0.6 })
      s.paint(Math.floor(cx), Math.floor(cy), core, 5)
      break
    }
    default: {
      // Trillion: a softly curved triangle.
      const pts: Point[] = []
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2
        const b = ((i + 0.5) / 3) * Math.PI * 2 - Math.PI / 2
        pts.push([cx + Math.cos(a) * 4.8 * z, cy + 0.6 + Math.sin(a) * 4.8 * z])
        pts.push([cx + Math.cos(b) * 3 * z, cy + 0.6 + Math.sin(b) * 3 * z])
      }
      facetGem(s, id, pts)
    }
  }
}

export function ring(s: Sprite, g: number): void {
  s.shadow = { cx: 16, cy: 27.2, rx: 9, ry: 2, alpha: 80 }
  const gemMat = gemOf(g)
  const metal = use(s, BAND[g - 1] ?? GOLD)
  const cx = 16, cy = 20.2
  const thick = g >= 4 ? 1 : 0
  const outer = Mask.ellipse(cx, cy, 7.8 + thick * 0.4, 5.6 + thick * 0.3)
  const hole = Mask.ellipse(cx, cy - 0.9, 5.4 - thick * 0.2, 3.3 - thick * 0.2)
  const band = new Mask().union(outer).subtract(hole)
  shadeDome(s, band, metal, { bias: 0.1, relief: 0.9, contact: false })
  // The inside of the band at the back sits in shadow.
  band.each((x, y) => {
    if (y + 0.5 < cy - 2.2 && hole.get(x, y + 1)) s.paint(x, y, metal, 2)
  })
  // Engraved shoulders and side stones on finer rings.
  if (g >= 5)
    for (const side of [-1, 1]) {
      const sx = Math.floor(cx + side * 6.2 - (side > 0 ? 1 : 0)), sy = 16
      if (g === 6 || g === 8) jewel(s, sx - (side > 0 ? 0 : 1), sy - 1, 2, gemOf(8))
      else {
        s.paint(sx, sy, metal, 5)
        s.paint(sx, sy + 1, metal, 2)
        s.paint(sx - side, sy - 1, metal, 4)
      }
    }
  // The setting: a cup under the stone, prongs from grade 3.
  const gy = 11.4
  const cup = Mask.ellipse(cx, gy + 4.2, g >= 7 ? 4.4 : 3.6, 2)
  shadeDome(s, cup, metal, { bias: 0.1, contact: false })
  const gem = use(s, gemMat)
  ringStone(s, g, gem, cx, gy)
  if (g >= 3)
    for (const [px, py] of [[-4, -3], [3, -3], [-4, 3], [3, 3]] as const) {
      const x = Math.floor(cx + px), y = Math.floor(gy + py)
      if (s.mat[y * s.w + x] === gem || g >= 6) s.paint(x, y, metal, px < 0 ? 5 : 4)
    }
  // A glint on the stone.
  s.overlay(Math.floor(cx) - 2, Math.floor(gy) - 2, hex('#ffffff', 200))
  if (g >= 9 && gemMat.glow) {
    bloom(s, cx, gy + 0.5, 5, gemMat.accent ?? gemMat.glow, 90)
    legendaryHalo(s, gemMat.glow, 60)
  }
}

// ---------------------------------------------------------------- charm

const boneOf = (g: number): Material => BONES[g - 1] ?? (BONES[0] as Material)

/** Raised relief on a carving: lit on the upper left, shaded on the lower right. */
function relief(s: Sprite, id: number, m: Mask): void {
  m.each((x, y) => {
    const lit = !m.get(x - 1, y) || !m.get(x, y - 1)
    const dark = !m.get(x + 1, y) || !m.get(x, y + 1)
    s.paint(x, y, id, lit && !dark ? 5 : dark && !lit ? 2 : 4)
  })
}

function groove(s: Sprite, id: number, cells: readonly (readonly [number, number])[], within: Mask): void {
  for (const [x, y] of cells) if (within.get(x, y)) s.paint(x, y, id, 2)
}

function line(points: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] ?? [0, 0], b = points[i + 1] ?? [0, 0]
    out.push(...linePixels(a[0], a[1], b[0], b[1]))
  }
  return out
}

/** The pendant, hanging from (16, 10). Returns nothing; paints the grade's carving. */
function pendant(s: Sprite, g: number, id: number): void {
  const m = boneOf(g)
  switch (g) {
    case 1: {
      // Scallop shell, hinge up: ribs fanning down to a scalloped rim, two ears at the hinge.
      const hx = 16, hy = 11
      const fan = Mask.from((px, py) => {
        const dx = px - hx, dy = py - hy
        if (dy < 0) return false
        const r = Math.hypot(dx, dy)
        const ang = Math.atan2(dx, dy)
        const scallop = 11.6 + Math.cos(ang * 9) * 0.7
        return Math.abs(ang) <= 0.95 && r <= scallop
      })
      const ears = Mask.polygon([[12.4, 10.6], [19.6, 10.6], [18.6, 13.4], [13.4, 13.4]])
      const shell = new Mask().union(fan, ears)
      shadeDome(s, shell, id, { bias: 0.1, relief: 0.6, contact: false })
      fan.each((x, y) => {
        const ang = Math.atan2(x + 0.5 - hx, y + 0.5 - hy)
        const k = (((ang + 0.95) / 1.9) * 5) % 1
        if (y > 13 && k < 0.22) s.paint(x, y, id, Math.max(2, s.toneAt(x, y) - 2))
        else if (y > 13 && k > 0.78) s.paint(x, y, id, Math.min(5, s.toneAt(x, y) + 1))
      })
      break
    }
    case 2: {
      const disc = Mask.circle(16, 17.6, 5.8)
      shadeDome(s, disc, id, { bias: 0.08, relief: 0.6, contact: false })
      const cells: [number, number][] = []
      for (let t = 0; t < Math.PI * 4.4; t += 0.08) {
        const r = 4.8 - t * 0.33
        if (r < 0.6) break
        cells.push([Math.floor(16.2 + Math.cos(t) * r), Math.floor(17.8 + Math.sin(t) * r)])
      }
      groove(s, id, cells, disc)
      break
    }
    case 3: {
      const plaque = Mask.ellipse(16, 18, 5.4, 6.6)
      shadeDome(s, plaque, id, { bias: 0.06, relief: 0.6, contact: false })
      const bug = new Mask().union(Mask.ellipse(16, 14.6, 3.6, 2.2), Mask.polygon([[13, 15.6], [19, 15.6], [18.2, 21.4], [16, 23], [13.8, 21.4]]))
      relief(s, id, bug)
      for (let y = 17; y <= 21; y += 2) groove(s, id, line([[13, y], [19, y]]), bug)
      for (const x of [15, 17]) groove(s, id, line([[x, 16], [x, 21]]), bug)
      break
    }
    case 4: {
      // A little bone, hanging upright.
      const bone = new Mask().union(
        Mask.polygon([[14.6, 13], [17.4, 13], [17.4, 22], [14.6, 22]]),
        Mask.circle(14.4, 12.4, 1.9), Mask.circle(17.6, 12.4, 1.9), Mask.circle(14.4, 22.6, 1.9), Mask.circle(17.6, 22.6, 1.9),
      )
      shadeDome(s, bone, id, { bias: 0.1, relief: 0.8, contact: false })
      break
    }
    case 5: {
      // A curved tusk with a bronze cuff at its root.
      const tusk = new Mask()
      for (let i = 0; i <= 40; i++) {
        const t = i / 40
        const x = 16 + Math.sin(t * 2.2) * 5 - t * 1.5, y = 11.6 + t * 12
        tusk.union(Mask.circle(x, y, 2.6 - t * 2))
      }
      shadeDome(s, tusk, id, { bias: 0.1, contact: false })
      const cuff = use(s, m.accent ?? '#a8621f', { lift: 0.4, drop: 0.3 })
      tusk.each((x, y) => {
        if (y >= 11 && y <= 13) s.paint(x, y, cuff, x < 16 ? 4 : 3)
      })
      break
    }
    case 6: {
      const fang = Mask.polygon([[12.4, 11.6], [19.6, 11.6], [19, 15.4], [17.6, 20], [15.6, 24.6], [14.6, 20], [13, 15.4]])
      shadeDome(s, fang, id, { bias: 0.08, relief: 0.8, contact: false })
      const cap = use(s, m.accent ?? '#c9a24a', { lift: 0.45 })
      for (let x = 12; x <= 19; x++) {
        if (fang.get(x, 12)) s.paint(x, 12, cap, x < 15 ? 5 : x < 18 ? 4 : 3)
        if (fang.get(x, 13)) s.paint(x, 13, cap, x < 15 ? 4 : 3)
      }
      groove(s, id, line([[15, 16], [17, 17]]), fang)
      break
    }
    case 7: {
      // A hooked talon.
      const claw = new Mask()
      for (let i = 0; i <= 40; i++) {
        const t = i / 40
        const a = Math.PI * (0.95 - t * 0.85)
        claw.union(Mask.circle(19 + Math.cos(a) * 6, 13 + Math.sin(a) * 9.5, 2.9 - t * 2.4))
      }
      shadeDome(s, claw, id, { bias: 0.08, contact: false })
      claw.each((x, y) => {
        if (!claw.get(x + 1, y) && y > 15 && s.toneAt(x, y) > 2) s.paint(x, y, id, 2)
      })
      break
    }
    case 8: {
      // A great serrated tooth on its root.
      const left: Point[] = [], right: Point[] = []
      for (let y = 13; y <= 23; y++) {
        const k = (23 - y) / 10
        const half = 0.6 + k * 4.2
        const serr = y % 2 === 0 ? 0.6 : 0
        left.push([16 - half - serr, y])
        right.push([16 + half + serr, y])
      }
      const tooth = Mask.polygon([...left, ...right.reverse()])
      const root = use(s, m.accent ?? '#a07b52', { lift: 0.3, drop: 0.28 })
      shadeDome(s, Mask.polygon([[11.2, 10.6], [20.8, 10.6], [20.2, 13.4], [11.8, 13.4]]), root, { bias: 0.05, contact: false })
      shadeDome(s, tooth, id, { bias: 0.06, contact: false })
      groove(s, id, line([[13, 16], [14, 15], [16, 17], [18, 15], [19, 16]]), tooth)
      break
    }
    case 9: {
      // A small idol: a heavy-browed head on broad shoulders, lit from within.
      const glow = use(s, m.accent ?? '#ffcf5a', { lift: 0.55, drop: 0.2 })
      const body = Mask.polygon([[11, 19.4], [21, 19.4], [22.4, 22], [21.6, 25], [10.4, 25], [9.6, 22]])
      const head = Mask.ellipse(16, 15.2, 4.2, 4.6)
      shadeDome(s, body, id, { bias: 0.04, contact: false })
      shadeDome(s, head, id, { bias: 0.08, contact: false })
      for (let x = 12; x <= 19; x++) if (head.get(x, 13)) s.paint(x, 13, id, 2)
      for (const x of [13, 14, 17, 18]) s.paint(x, 14, glow, 5)
      s.paint(15, 16, id, 2)
      s.paint(16, 16, id, 3)
      for (let x = 14; x <= 17; x++) s.paint(x, 18, id, 2)
      for (const [x, y] of line([[16, 20], [15, 22], [16, 24]])) s.paint(x, y, glow, 4)
      bloom(s, 16, 15, 3.5, '#ffd77a', 90)
      bloom(s, 16, 22, 3, '#ffcf5a', 70)
      break
    }
    default: {
      // A spiral horn, gilt at the root.
      const horn = Mask.polygon([[12.8, 12], [19.2, 12], [16.4, 25], [15.6, 25]])
      shadeDome(s, horn, id, { bias: 0.1, contact: false })
      for (const y of [14, 16, 18, 20, 22]) {
        const x0 = 12 + Math.floor((y - 12) * 0.3)
        for (const [x, yy] of line([[x0, y], [32 - x0 - 1, y - 1]])) if (horn.get(x, yy)) s.paint(x, yy, id, 2)
      }
      const gilt = use(s, m.accent ?? '#e8c46a', { lift: 0.5, drop: 0.3 })
      for (let x = 12; x <= 19; x++) {
        s.paint(x, 11, gilt, x < 15 ? 5 : x < 18 ? 4 : 3)
        s.paint(x, 12, gilt, x < 15 ? 4 : 3)
      }
      bloom(s, 16, 18, 6, '#ffe8fb', 60)
    }
  }
}

export function charm(s: Sprite, g: number): void {
  s.shadow = { cx: 16, cy: 27.4, rx: 7, ry: 1.8, alpha: 70 }
  const m = boneOf(g)
  // The cord: a V from the top corners down to the bail; beads, then a gold chain.
  const cordMat = g <= 2 ? CORD : g <= 4 ? LEATHER_GRIP : g <= 6 ? DARK_GRIP : GOLD
  const cord = use(s, cordMat)
  const left = line([[9, 3], [12, 7], [15, 9]])
  const right = line([[22, 3], [19, 7], [16, 9]])
  for (const [i, [x, y]] of [...left, ...right].entries()) {
    const chain = g >= 7
    s.paint(x, y, cord, chain ? (i % 2 === 0 ? 5 : 3) : x < 16 ? 4 : 3)
  }
  if (g >= 3 && g <= 6) {
    const bead = use(s, g <= 4 ? '#c46c47' : '#3a6ae0', { lift: 0.4, drop: 0.3 })
    for (const [x, y] of [[11, 5], [20, 5]] as const) {
      s.paint(x, y, bead, 5)
      s.paint(x + 1, y, bead, 3)
      s.paint(x, y + 1, bead, 3)
      s.paint(x + 1, y + 1, bead, 2)
    }
  }
  // The bail.
  const bail = use(s, g >= 5 ? GOLD : cordMat)
  for (const [x, y, t] of [[15, 9, 4], [16, 9, 3], [15, 10, 3], [16, 10, 2]] as const) s.paint(x, y, bail, t)
  const id = use(s, m)
  pendant(s, g, id)
  if (g >= 7) {
    const gem = g === 7 ? 7 : g === 8 ? 6 : g === 9 ? 9 : 10
    jewel(s, 15, 8, 2, gemOf(gem))
  }
  if (g >= 9 && m.glow) legendaryHalo(s, m.glow, 60)
}
