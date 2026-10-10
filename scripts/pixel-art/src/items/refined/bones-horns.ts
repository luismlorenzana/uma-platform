// Carvings (Workbench, refined Bones & Horns): uma-rpg docs/design/items.md#bones--horns. Thick tokens and small
// figures carved from bone and ivory, each with a relief that echoes its fossil: shell ribs, a spiral, a trilobite,
// a bone, tusk rings, a fang, claw marks, a tooth, a titan idol and a unicorn horn.
import { ramp, type RampOptions } from '../../color.ts'
import { Mask, shadeDome, type Point } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { bloom, halo, linePixels } from './workbench-kit.ts'

const BONE: RampOptions = { lift: 0.36, drop: 0.24, hueShift: 10, satShift: 0.04 }

/** A thick token: the face shaded as a low dome, the rim showing below it. */
function token(s: Sprite, face: Mask, id: number, thick = 2, bias = 0.06): void {
  const rim = new Mask()
  face.each((x, y) => {
    for (let k = 1; k <= thick; k++) if (!face.get(x, y + k)) rim.set(x, y + k)
  })
  rim.each((x, y) => s.paint(x, y, id, rim.get(x, y + 1) ? 2 : 1))
  shadeDome(s, face, id, { bias, relief: 0.7, contact: false })
}

/** An engraved line: a dark groove with a lit lower lip. */
function groove(s: Sprite, face: Mask, id: number, cells: readonly (readonly [number, number])[], lip = true): void {
  for (const [x, y] of cells) if (face.get(x, y)) s.paint(x, y, id, 2)
  if (lip) for (const [x, y] of cells) if (face.get(x, y + 1) && !cells.some(([cx, cy]) => cx === x && cy === y + 1)) s.paint(x, y + 1, id, Math.min(5, s.toneAt(x, y + 1) + 1))
}

/** A raised relief: lit on the upper left, shaded on the lower right. */
function relief(s: Sprite, face: Mask, id: number, m: Mask, body = 4): void {
  // The carved-away ground around the figure: a groove, darkest where the figure shades it (lower right).
  m.each((x, y) => {
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy
      if (!face.get(nx, ny) || m.get(nx, ny)) continue
      s.paint(nx, ny, id, dx + dy > 0 ? 1 : 2)
    }
  })
  m.each((x, y) => {
    if (!face.get(x, y)) return
    const lit = !m.get(x - 1, y) || !m.get(x, y - 1)
    const dark = !m.get(x + 1, y) || !m.get(x, y + 1)
    s.paint(x, y, id, lit && !dark ? 5 : dark && !lit ? 3 : body)
  })
}

function poly(points: readonly Point[]): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] ?? [0, 0], b = points[i + 1] ?? [0, 0]
    const seg = linePixels(a[0], a[1], b[0], b[1])
    out.push(...(i === 0 ? seg : seg.slice(1)))
  }
  return out
}

interface CarvingSpec {
  id: string
  name: string
  grade: number
  bone: string
  boneRamp?: RampOptions
  paint: (s: Sprite, id: number) => void
}

const SPECS: CarvingSpec[] = [
  {
    id: 'shell-carving',
    name: 'Shell Carving',
    grade: 1,
    bone: '#efdcd0',
    boneRamp: { lift: 0.4, drop: 0.22, hueShift: 6, satShift: 0 },
    paint: (s, id) => {
      // An arched token with a scallop shell in relief.
      const arch = Mask.circle(16, 15, 8.6).union(Mask.polygon([[7.4, 15], [24.6, 15], [24.6, 24.4], [7.4, 24.4]]))
      token(s, arch, id, 2, 0)
      // The scallop in relief: a ribbed fan with a scalloped rim, closing to a hinge with two ears.
      const art = [
        '.#.#.#.#.#.',
        '###########',
        '###########',
        '###########',
        '.#########.',
        '..#######..',
        '...#####...',
        '..#######..',
        '..#######..',
      ]
      const ox = 10, oy = 10
      const fan = new Mask()
      art.forEach((row, y) => [...row].forEach((c, x) => c === '#' && fan.set(ox + x, oy + y)))
      relief(s, arch, id, fan)
      for (const [tx, ty] of [[1, 1], [3, 0], [5, 0], [7, 0], [9, 1]] as const)
        for (const [x, y] of linePixels(ox + 5, oy + 6, ox + tx, oy + ty + 1)) if (fan.get(x, y) && y < oy + 6) s.paint(x, y, id, 3)
    },
  },
  {
    id: 'ammonite-carving',
    name: 'Ammonite Carving',
    grade: 2,
    bone: '#dcb98a',
    paint: (s, id) => {
      const disc = Mask.circle(16, 16.5, 9.2)
      token(s, disc, id, 2)
      // A spiral groove winding in from the rim.
      const cells: [number, number][] = []
      for (let t = 0; t < Math.PI * 5.2; t += 0.06) {
        const r = 7.6 - t * 0.43
        if (r < 0.8) break
        cells.push([Math.floor(16.2 + Math.cos(t) * r), Math.floor(16.7 + Math.sin(t) * r)])
      }
      groove(s, disc, id, cells)
      // Ribs across the outer whorl.
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        groove(s, disc, id, [[Math.floor(16.2 + Math.cos(a) * 8.4), Math.floor(16.7 + Math.sin(a) * 8.4)]], false)
      }
    },
  },
  {
    id: 'trilobite-carving',
    name: 'Trilobite Carving',
    grade: 3,
    bone: '#c4b8a2',
    paint: (s, id) => {
      const plaque = Mask.ellipse(16, 16.5, 8.4, 9.8)
      token(s, plaque, id, 2, 0)
      // The trilobite in relief: a head shield, a ribbed body in three lobes and a small tail.
      const head = Mask.ellipse(16, 11.4, 5.4, 3.2).subtract(Mask.from((_, py) => py > 12.4))
      const body = Mask.polygon([[11.6, 12.4], [20.4, 12.4], [19.2, 20.5], [16, 23.2], [12.8, 20.5]])
      const bug = new Mask().union(head, body)
      relief(s, plaque, id, bug)
      for (let y = 14; y <= 21; y += 2) groove(s, plaque, id, poly([[12, y], [20, y]]).filter(([x]) => bug.get(x, y)), false)
      for (const x of [14, 18]) groove(s, plaque, id, poly([[x, 13], [x, 20]]).filter(([px, py]) => bug.get(px, py)), false)
      s.paint(14, 11, id, 1)
      s.paint(18, 11, id, 1)
    },
  },
  {
    id: 'bone-carving',
    name: 'Bone Carving',
    grade: 4,
    bone: '#ebe0c6',
    paint: (s, id) => {
      // A tablet with a bone carved across it and a border.
      const tablet = Mask.polygon([[9.5, 9], [22.5, 9], [23.5, 10.5], [23.5, 23], [22.5, 24.5], [9.5, 24.5], [8.5, 23], [8.5, 10.5]])
      token(s, tablet, id, 2, 0)
      const inset = Mask.polygon([[10.5, 10.5], [21.5, 10.5], [21.5, 23], [10.5, 23]])
      const border = new Mask().union(tablet).subtract(inset)
      border.each((x, y) => {
        if (inset.get(x + 1, y) || inset.get(x, y + 1)) s.paint(x, y, id, 2)
      })
      const bone = new Mask().union(
        Mask.polygon([[13, 19.4], [18.4, 14], [20, 15.6], [14.6, 21]]),
        Mask.circle(12.4, 19.2, 1.9), Mask.circle(14.8, 21.6, 1.9), Mask.circle(18.2, 12.4, 1.9), Mask.circle(20.6, 14.8, 1.9),
      )
      relief(s, tablet, id, bone, 5)
    },
  },
  {
    id: 'tusk-carving',
    name: 'Tusk Carving',
    grade: 5,
    bone: '#f0e2bf',
    paint: (s, id) => {
      // A tusk sweeping up from its cut base, with a bronze cuff and carved bands.
      const at = (t: number): [number, number, number] => {
        const u = 1 - t
        return [u * u * 10 + 2 * u * t * 22.5 + t * t * 23, u * u * 21.4 + 2 * u * t * 23.6 + t * t * 6.5, 4 - t * 3.2]
      }
      const samples = Array.from({ length: 61 }, (_, i) => i / 60)
      const tusk = new Mask()
      for (const t of samples) {
        const [x, y, r] = at(t)
        tusk.union(Mask.circle(x, y, Math.max(0.6, r)))
      }
      shadeDome(s, tusk, id, { bias: 0.1, contact: false })
      const nearest = (x: number, y: number) => {
        let best = 0, bd = 99
        for (const t of samples) {
          const [cx, cy] = at(t)
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
          if (d < bd) [bd, best] = [d, t]
        }
        return best
      }
      const cuff = s.addRamp(ramp('#a8621f', { lift: 0.4, drop: 0.3 }))
      tusk.each((x, y) => {
        const t = nearest(x, y)
        if (t > 0.08 && t < 0.22) s.paint(x, y, cuff, Math.max(2, Math.min(5, s.toneAt(x, y) - 1 + (t < 0.11 ? 1 : 0))))
        else if (Math.abs(t - 0.42) < 0.03 || Math.abs(t - 0.62) < 0.03) s.paint(x, y, id, Math.max(1, s.toneAt(x, y) - 2))
      })
      // The cut base: a lighter oval with a ring.
      const [bx, by] = at(0)
      Mask.ellipse(bx - 1.2, by, 2.4, 4.4).each((x, y) => s.paint(x, y, id, 4))
      Mask.ellipse(bx - 1.2, by, 1, 2).each((x, y) => s.paint(x, y, id, 3))
    },
  },
  {
    id: 'fang-carving',
    name: 'Fang Carving',
    grade: 6,
    bone: '#f2ecdc',
    paint: (s, id) => {
      // A fang pendant on a cord, with a carved band near the root.
      const cord = s.addRamp(ramp('#6b4630', { lift: 0.3 }))
      for (const [x, y] of poly([[9, 5], [12, 9], [16, 10], [20, 9], [23, 5]])) s.paint(x, y, cord, 3)
      const fang = Mask.polygon([[12, 11], [20, 11], [19.4, 15], [17.6, 21], [15, 26.4], [14.4, 21], [12.6, 15]])
      token(s, fang, id, 1, 0.08)
      const cap = s.addRamp(ramp('#c9a24a', { lift: 0.45 }))
      for (let x = 12; x <= 19; x++) {
        if (fang.get(x, 12)) s.paint(x, 12, cap, x < 15 ? 5 : x < 18 ? 4 : 3)
        if (fang.get(x, 13)) s.paint(x, 13, cap, x < 15 ? 4 : 3)
      }
      groove(s, fang, id, poly([[14, 16], [17, 18]]))
      groove(s, fang, id, poly([[15, 19], [17, 20]]))
    },
  },
  {
    id: 'claw-carving',
    name: 'Claw Carving',
    grade: 7,
    bone: '#e2d3b1',
    paint: (s, id) => {
      // A shield-shaped talisman raked by three claw marks.
      const shield = Mask.polygon([[8.5, 8.5], [23.5, 8.5], [23.5, 15], [21, 21], [16, 25], [11, 21], [8.5, 15]])
      token(s, shield, id, 2, 0.02)
      for (const dx of [-4, 0, 4]) {
        const cells = poly([[13 + dx, 11], [15 + dx, 15], [16 + dx, 19], [15.6 + dx, 22]])
        for (const [x, y] of cells) if (shield.get(x, y)) s.paint(x, y, id, 1)
        for (const [x, y] of cells) if (shield.get(x + 1, y) && !cells.some(([cx, cy]) => cx === x + 1 && cy === y)) s.paint(x + 1, y, id, 5)
      }
    },
  },
  {
    id: 'tooth-carving',
    name: 'Tooth Carving',
    grade: 8,
    bone: '#efe6cc',
    paint: (s, id) => {
      // A great tooth standing on its root: curved, serrated, and carved with a zigzag band.
      const rootId = s.addRamp(ramp('#a07b52', { lift: 0.3, drop: 0.28 }))
      const left: Point[] = [], right: Point[] = []
      for (let y = 6; y <= 21; y++) {
        const t = (y - 6) / 15
        const half = 1 + t * 6
        const lean = (1 - t) * (1 - t) * 4
        const serr = y % 2 === 0 ? 0.7 : 0
        left.push([16 + lean - half - serr, y])
        right.push([16 + lean + half + serr, y])
      }
      const tooth = Mask.polygon([...left, ...right.reverse()])
      const root = Mask.polygon([[9.5, 20.6], [22.5, 20.6], [22, 24], [20.5, 25.6], [11.5, 25.6], [10, 24]])
      shadeDome(s, root, rootId, { bias: 0, contact: false })
      shadeDome(s, tooth, id, { bias: 0.06, contact: false })
      groove(s, tooth, id, poly([[12, 17], [14, 15], [16, 17], [18, 15], [20, 17]]))
      groove(s, tooth, id, poly([[15, 11], [17, 13]]))
    },
  },
  {
    id: 'titan-carving',
    name: 'Titan Carving',
    grade: 9,
    bone: '#e0d2b4',
    paint: (s, id) => {
      // A small idol: a heavy-browed head on broad shoulders, lit from within.
      const glow = s.addRamp(ramp('#ffcf5a', { lift: 0.55, drop: 0.2 }))
      const head = Mask.ellipse(16, 10.8, 5.6, 6).union(Mask.polygon([[10.6, 11.5], [21.4, 11.5], [20.2, 16.6], [11.8, 16.6]]))
      const body = Mask.polygon([[10, 16.6], [22, 16.6], [23.4, 20.5], [22.8, 25.4], [9.6, 25.4], [9, 20.5]])
      shadeDome(s, body, id, { bias: 0.02, contact: false })
      shadeDome(s, head, id, { bias: 0.08, contact: false })
      // Brow, eyes and mouth.
      for (let x = 11; x <= 21; x++) if (head.get(x, 9)) s.paint(x, 9, id, 2)
      for (const x of [13, 14, 18, 19]) s.paint(x, 10, glow, 5)
      for (const x of [13, 19]) s.paint(x, 11, glow, 4)
      s.paint(16, 12, id, 2)
      s.paint(16, 11, id, 3)
      for (let x = 14; x <= 18; x++) s.paint(x, 14, id, 2)
      // Glowing cracks down the chest.
      for (const [x, y] of poly([[16, 18], [15, 20], [17, 22], [16, 24]])) s.paint(x, y, glow, 4)
      for (const [x, y] of poly([[12, 19], [13, 21]])) s.paint(x, y, glow, 3)
      for (const [x, y] of poly([[20, 19], [19, 21]])) s.paint(x, y, glow, 3)
      bloom(s, 16, 12, 3, '#ffd77a', 90)
      bloom(s, 16, 21, 4, '#ffcf5a', 70)
      halo(s, '#ffd88a', 55, 2)
    },
  },
  {
    id: 'unicorn-carving',
    name: 'Unicorn Carving',
    grade: 10,
    bone: '#f4eef4',
    boneRamp: { lift: 0.5, drop: 0.24, hueShift: 14, satShift: 0.04 },
    paint: (s, id) => {
      // A pearly cameo with a spiral horn in relief.
      const cameo = Mask.ellipse(16.3, 16.3, 7.7, 9.6)
      token(s, cameo, id, 2, 0.04)
      const pearl = [s.addRamp(ramp('#f6d6ee', { lift: 0.5 })), s.addRamp(ramp('#d6e6fb', { lift: 0.5 }))]
      cameo.each((x, y) => {
        const k = Math.sin(x * 0.7 + y * 0.45)
        if (s.toneAt(x, y) >= 3 && Math.abs(k) > 0.85) s.paint(x, y, pearl[k > 0 ? 0 : 1] ?? id, s.toneAt(x, y))
      })
      // A gilt rim, then a spiral horn standing out in pale gold.
      const gilt = s.addRamp(ramp('#e8c46a', { lift: 0.5, drop: 0.3 }))
      cameo.each((x, y) => {
        if (!cameo.get(x - 1, y) || !cameo.get(x + 1, y) || !cameo.get(x, y - 1) || !cameo.get(x, y + 1)) s.paint(x, y, gilt, x + y < 32 ? 5 : 3)
      })
      const hornId = s.addRamp(ramp('#f7e7b8', { lift: 0.55, drop: 0.3 }))
      const horn = Mask.polygon([[11, 22.6], [14.6, 22.2], [21.6, 8.6]])
      relief(s, cameo, hornId, horn)
      for (const t of [0.18, 0.36, 0.54, 0.72]) {
        const x = Math.round(12.6 + (21.4 - 12.6) * t), y = Math.round(22.2 + (8.8 - 22.2) * t)
        for (const [dx, dy] of [[-1, 0], [0, 0], [1, -1]] as const) if (horn.get(x + dx, y + dy)) s.paint(x + dx, y + dy, hornId, 2)
      }
      bloom(s, 16, 16, 8, '#ffe8fb', 50)
      halo(s, '#f3e2ff', 60, 2)
    },
  },
]

export const BONES_HORNS_REFINED: ItemIcon[] = SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  grade: spec.grade,
  paint: (s) => spec.paint(s, s.addRamp(ramp(spec.bone, spec.boneRamp ?? BONE))),
}))
