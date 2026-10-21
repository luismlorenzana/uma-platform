// H38 / uma-rpg D161: the Rift, the end-of-tier event on the Battle page. A tall torn lens of light over a cracked
// dark-stone dais, flanked by two leaning obsidian shards, with four rim stones lit in the fronts' colours. Its
// palette is the world atlas's `rift` biome (indigo #3d3f8f, lilac #c49ecd, glow #cfb3ef), so both read as one place.
// Tall and spiky in the middle: no arch, stadium, flags, rune ring or pool, unlike its neighbours.
import { rng } from '../rng.ts'
import type { Point } from '../shape.ts'
import { FRONT_COLORS } from '../ui/rift.ts'
import { FRONTS } from '../ui/spec.ts'
import { BASE, col, dot, glow, hline, line, M } from './kit.ts'
import type { Place } from './types.ts'

const CX = 24
const TOP = 3
const FOOT = 35

/** The tear's rows: a lens that swells in the middle, with torn edges that jump in and out by a pixel. */
function tearRows(): { y: number; left: number; right: number; mid: number }[] {
  const r = rng('rift-tear')
  const rows: { y: number; left: number; right: number; mid: number }[] = []
  let jl = 0, jr = 0
  for (let y = TOP; y <= FOOT; y++) {
    const t = (y + 0.5 - TOP) / (FOOT + 1 - TOP)
    const half = 0.6 + 5.4 * Math.sin(Math.PI * t) ** 0.85
    const mid = CX + 0.8 * Math.sin(Math.PI * 2 * t)
    if (y % 2 === 0) jl = Math.floor(r() * 3) - 1
    if (y % 3 === 1) jr = Math.floor(r() * 3) - 1
    const torn = Math.min(1, half / 2.5)
    rows.push({ y, mid, left: mid - half - jl * torn, right: mid + half + jr * torn })
  }
  return rows
}

export const RIFT: Place = {
  id: 'rift', name: 'The Rift', page: 'battle', at: { x: .5, y: .72 },
  paint: s => {
    const stone = col(s, '#6e6878', { lift: .28, drop: .26, hueShift: 6 })
    const obsidian = col(s, '#34303f', { lift: .2, drop: .3 })
    const indigo = col(s, '#3d3f8f', { lift: .34 })
    const violet = col(s, '#8a66cf', { lift: .36 })
    const lilac = col(s, '#c49ecd', { lift: .5, hueShift: 4 })
    const fronts = FRONTS.map(f => col(s, FRONT_COLORS[f], { lift: .42 }))
    s.shadow = { cx: 24, cy: BASE + .5, rx: 20.5, ry: 3.2, alpha: 80 }

    // The dais: a broad lower step and a narrower upper step, chamfered at the back corners. Mid-grey tops, dark faces.
    const step = (x0: number, x1: number, top: number, face: number, bot: number) => {
      for (let y = top; y <= bot; y++)
        for (let x = x0; x <= x1; x++) {
          const inset = y < face ? Math.max(0, 2 - (y - top)) : 0
          if (x < x0 + inset || x > x1 - inset) continue
          let tone: number
          if (y < face) tone = y === top || x - x0 - inset < 1 ? 4 : 3
          else tone = y === face ? 2 : x === x0 ? 2 : 1
          s.paint(x, y, stone, tone)
        }
    }
    step(4, 43, 38, 41, BASE)
    step(9, 38, 33, 36, 37)
    // Cracks: dark seams across the faces and tops; under the tear one glows with leaking lilac light.
    const cracks: Point[][] = [
      [[13, 41], [14, 42], [14, 43]],
      [[35, 41], [34, 42], [35, 43]],
      [[14, 36], [13, 37]],
      [[33, 36], [34, 37]],
      [[6, 39], [8, 40]],
      [[38, 39], [40, 40]],
    ]
    for (const c of cracks) for (let i = 1; i < c.length; i++) line(s, obsidian, c[i - 1]![0], c[i - 1]![1], c[i]![0], c[i]![1], 1)
    for (const [i, [x, y]] of [[24, 36], [23, 37], [24, 38], [25, 39], [25, 40], [24, 41], [25, 42]].entries()) s.paint(x!, y!, lilac, i < 3 ? 5 : i < 5 ? 4 : 3)
    hline(s, lilac, 21, 27, 33, 3)
    hline(s, lilac, 22, 26, 34, 4)

    // Two broken obsidian shards leaning in on the tear: a lit left facet, a dark right facet, a jagged broken top
    // and a lilac rim on the side facing the light.
    const shard = (base: [number, number], tip: [number, number], broken: [number, number], inner: 'left' | 'right') => {
      const [b0, b1] = base, [tx, ty] = tip, [kx, ky] = broken
      const m = M.poly(inner === 'right'
        ? [[b0, 37.5], [kx, ky], [tx, ty], [b1, 37.5]]
        : [[b0, 37.5], [tx, ty], [kx, ky], [b1, 37.5]])
      m.each((x, y) => {
        // The ridge runs from the base's middle to the tip.
        const t = (37.5 - (y + 0.5)) / (37.5 - ty)
        const ridge = (b0 + b1) / 2 + (tx - (b0 + b1) / 2) * t
        const d = x + 0.5 - ridge
        let tone = d < -1.2 ? 3 : d < 0 ? 4 : d < 1 ? 2 : 1
        if (!m.get(x, y - 1)) tone = d < 0 ? 5 : 3
        s.paint(x, y, obsidian, tone)
        const edge = inner === 'right' ? !m.get(x + 1, y) : !m.get(x - 1, y)
        if (edge && y > ty + 1) s.paint(x, y, lilac, y % 5 === 0 ? 5 : 3)
      })
    }
    shard([6.5, 13.5], [15, 13], [10, 18], 'right')
    shard([34.5, 41.5], [33, 16], [38, 20], 'left')

    // The tear: near-white lilac at the core, violet then indigo at the torn edges, standing on the upper step.
    for (const { y, left, right, mid } of tearRows()) {
      for (let x = Math.floor(left); x <= Math.ceil(right); x++) {
        const px = x + 0.5
        if (px < left || px > right) continue
        const u = px < mid ? (mid - px) / (mid - left) : (px - mid) / (right - mid)
        const [id, tone] = u < 0.3 ? [lilac, 5] : u < 0.55 ? [lilac, 4] : u < 0.78 ? [violet, 4] : u < 0.92 ? [violet, 3] : [indigo, 4]
        s.paint(x, y, id, tone)
      }
    }
    // Hairline fractures in the air, running out from the tear's edges.
    for (const [x0, y0, x1, y1] of [[19, 11, 18, 9], [29, 21, 31, 19], [19, 27, 18, 29], [28, 8, 29, 6]] as const) line(s, violet, x0, y0, x1, y1, 4)

    // Four standing stones on the rim, one per front: Iron, Arcane, Duel, Horde from left to right (the colours of the
    // `front/*` crests). Dark stones, each with a glowing crystal cap and rune in its front's colour.
    ;[6, 18, 30, 41].forEach((x, i) => {
      const lit = fronts[i]!
      const top = i === 0 || i === 3 ? 32 : 34
      for (let y = top + 3; y <= 40; y++) for (let xx = x - 1; xx <= x + 1; xx++) s.paint(xx, y, obsidian, xx === x - 1 ? 3 : xx === x + 1 ? 1 : 2)
      // The lit cap: a pointed crystal of the front's colour set on the stone.
      s.paint(x, top, lit, 5)
      for (const [dx, dy, tone] of [[-1, 1, 5], [0, 1, 4], [1, 1, 3], [-1, 2, 4], [0, 2, 3], [1, 2, 2]] as const) s.paint(x + dx, top + dy, lit, tone)
      s.paint(x, top + 5, lit, 4)
      glow(s, x + 0.5, top + 1.5, 3, 3, FRONT_COLORS[FRONTS[i]!], 70)
    })

    // Rock flakes floating up towards the tear, each trailing a faint streak away from it.
    const flakes: [number, number, readonly (readonly [number, number, number])[]][] = [
      [11, 5, [[1, 0, 4], [0, 1, 4], [1, 1, 2]]],
      [6, 16, [[0, 0, 5], [1, 0, 3], [0, 1, 2]]],
      [35, 7, [[0, 0, 5], [1, 0, 4], [2, 0, 3], [1, 1, 2], [2, 1, 1]]],
      [40, 17, [[0, 0, 4], [1, 0, 2], [1, 1, 1]]],
    ]
    for (const [x, y, cells] of flakes) {
      for (const [dx, dy, tone] of cells) s.paint(x + dx, y + dy, stone, tone)
      const out = x < CX ? -1 : 1, from = x < CX ? x - 1 : x + 3
      dot(s, from + out, y + 1, '#cfb3ef', 110)
      dot(s, from + out * 2, y + 1, '#cfb3ef', 55)
    }

    // The halo: the brightest, softest thing in the frame, static (no smoke) and clear of every edge.
    glow(s, CX, 20, 13, 17, '#cfb3ef', 90)
  },
}
