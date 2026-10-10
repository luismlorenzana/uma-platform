// Essences (Ley Spring, MP family): uma-rpg docs/design/items.md#essences. Raw essence floats free as an orb or wisp,
// glowing softly; it is never bottled here (bottles are the refined Infusions).
import { hex, ramp, type RampOptions } from '../color.ts'
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

/** Halo in the rings just outside the outline: the essence's own light on the air around it. */
function aura(s: Sprite, m: Mask, color: string, alphas: readonly number[] = [60, 26]): void {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (s.filled(x, y)) continue
      let best = 99
      m.each((mx, my) => {
        best = Math.min(best, Math.abs(mx - x) + Math.abs(my - y))
      })
      const a = alphas[best - 2]
      if (best >= 2 && a) s.overlay(x, y, hex(color, a))
    }
}

/**
 * Shades a mask as glowing from within: brightest at a core near the top left, falling off toward the edge, mixed with
 * a little ordinary dome light so it still reads as round.
 */
function glow(s: Sprite, m: Mask, ramp: number | ((x: number, y: number) => number), cx: number, cy: number, r: number, o: { floor?: number; contact?: boolean } = {}): void {
  const floor = o.floor ?? 2
  const cells: [number, number, number][] = []
  m.each((x, y) => {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r
    const tone = Math.max(floor, Math.min(5, Math.round(5.2 - d * 3.4)))
    cells.push([x, y, tone])
  })
  shadeDome(s, m, ramp, { contact: o.contact ?? false, bias: 0.1 })
  for (const [x, y, tone] of cells) s.paint(x, y, s.mat[y * s.w + x] ?? 0, Math.round((tone * 2 + s.toneAt(x, y)) / 3))
}

/** A stroke that tapers along a path: circles of shrinking radius. */
function stroke(path: readonly Point[], r0: number, r1: number): Mask {
  const m = new Mask()
  const steps: Point[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i] ?? [0, 0], b = path[i + 1] ?? [0, 0]
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3))
    for (let k = 0; k < n; k++) steps.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
  }
  const last = path[path.length - 1]
  if (last) steps.push(last)
  steps.forEach(([x, y], i) => m.union(Mask.circle(x, y, r0 + ((r1 - r0) * i) / Math.max(1, steps.length - 1))))
  return m
}

/** Samples a parametric curve into a path. */
function curve(f: (t: number) => Point, n = 24): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => f(i / n))
}

/** Tiny floating motes of light: overlays, so they stay soft (no outline). */
function motes(s: Sprite, color: string, points: readonly Point[], arms = false): void {
  for (const [x, y] of points) {
    s.overlay(x, y, hex(color, 235))
    if (arms) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) s.overlay(x + dx, y + dy, hex(color, 90))
  }
}

const lit = (o: RampOptions = {}): RampOptions => ({ lift: 0.45, drop: 0.28, ...o })

export const ESSENCES: ItemIcon[] = [
  {
    id: 'mist-essence',
    name: 'Mist Essence',
    grade: 1,
    paint: (s) => {
      // A small drifting cloud with two curling wisps trailing beneath it.
      const id = s.addRamp(ramp('#c3d2e8', { lift: 0.5, drop: 0.22, satShift: 0.04, hueShift: 8 }))
      const tails = stroke(curve((t) => [19.5 - t * 10, 19.5 + Math.sin(t * Math.PI) * 3.2 + t * 2]), 1.8, 0.6).union(
        stroke(curve((t) => [14 + t * 9.5, 21 + Math.sin(t * Math.PI) * 2.4 + t * 2.4]), 1.5, 0.6),
      )
      shadeDome(s, tails, id, { contact: false, bias: 0.02 })
      // Puffs shaded one by one, back to front, so each bulge catches its own light.
      const cloud = new Mask()
      for (const m of [Mask.circle(17.5, 12.5, 4.6), Mask.circle(12.5, 15, 3.6), Mask.circle(21.5, 15.5, 3.4), Mask.ellipse(16.5, 17.8, 8, 2.6), Mask.circle(15.5, 16.5, 3.4)]) {
        shadeDome(s, m, id, { contact: false, bias: 0.12, relief: 0.8 })
        cloud.union(m)
      }
      motes(s, '#e8f1ff', [[9, 10], [24, 9], [25, 20]])
      aura(s, new Mask().union(cloud, tails), '#cfe0ff', [40, 16])
    },
  },
  {
    id: 'dew-essence',
    name: 'Dew Essence',
    grade: 2,
    paint: (s) => {
      // A cluster of floating droplets: one large, two small, each with a bright glint and refracted rim.
      const id = s.addRamp(ramp('#6cc7f0', lit({ lift: 0.55, hueShift: 10 })))
      const drop = (cx: number, cy: number, r: number, tip: number) => {
        const m = Mask.circle(cx, cy, r).union(Mask.polygon([[cx - r * 0.82, cy - r * 0.45], [cx, cy - r - tip], [cx + r * 0.82, cy - r * 0.45]]))
        shadeDome(s, m, id, { contact: false, bias: 0.05 })
        m.each((x, y) => {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy
          if (Math.hypot(dx, dy) > r - 1.2 && dx + dy > r * 0.6) s.paint(x, y, id, 4)
        })
        s.paint(Math.floor(cx - r * 0.45), Math.floor(cy - r * 0.35), id, 5)
        if (r > 3) s.paint(Math.floor(cx - r * 0.45), Math.floor(cy - r * 0.35) + 1, id, 5)
        return m
      }
      const all = new Mask().union(drop(15.5, 18.5, 5.4, 5.5), drop(22.5, 12.5, 2.4, 2.4), drop(9.5, 11.5, 2, 2))
      aura(s, all, '#9fe2ff', [44, 18])
    },
  },
  {
    id: 'breeze-essence',
    name: 'Breeze Essence',
    grade: 3,
    paint: (s) => {
      // A curling wind swirl, pale green and white, with loose gust streaks.
      const id = s.addRamp(ramp('#a8e6b4', lit({ lift: 0.55, satShift: 0.03 })))
      const spiral = stroke(
        curve((t) => {
          const a = 0.6 + t * Math.PI * 2.6
          const r = 7.6 - t * 6.4
          return [16.5 + Math.cos(a) * r, 15 + Math.sin(a) * r * 0.82]
        }, 60),
        1.9,
        0.7,
      )
      const gusts = stroke(curve((t) => [9 + t * 9, 23.5 - Math.sin(t * Math.PI) * 1.2]), 0.9, 0.5).union(stroke(curve((t) => [19 + t * 6, 23 + Math.sin(t * Math.PI) * 0.8 - t]), 0.6, 0.5))
      shadeDome(s, gusts, id, { contact: false, bias: 0.2 })
      shadeDome(s, spiral, id, { contact: false, bias: 0.15 })
      aura(s, new Mask().union(spiral, gusts), '#d9ffe0', [36, 14])
    },
  },
  {
    id: 'ember-essence',
    name: 'Ember Essence',
    grade: 4,
    paint: (s) => {
      // A burning orb: a hot yellow heart, orange body, tongues of flame licking upward.
      const outer = s.addRamp(ramp('#ff6a24', lit({ hueShift: 14 })))
      const core = s.addRamp(ramp('#ffd04a', lit({ lift: 0.6, hueShift: 10 })))
      const flame = stroke(curve((t) => [16 + Math.sin(t * 5) * 0.8, 15 - t * 10]), 3.6, 0.5)
        .union(stroke(curve((t) => [12.5 - t * 1.6, 16 - t * 6.5]), 2.4, 0.4), stroke(curve((t) => [19.5 + t * 2.4, 16 - t * 7]), 2.4, 0.4))
      const body = Mask.circle(16, 18.5, 6).union(flame)
      glow(s, body, (x, y) => (Math.hypot(x + 0.5 - 15.6, y + 0.5 - 18) < 3.6 ? core : outer), 15.6, 17.5, 7.5, { floor: 2 })
      aura(s, body, '#ff9a3c', [60, 24])
    },
  },
  {
    id: 'tide-essence',
    name: 'Tide Essence',
    grade: 5,
    paint: (s) => {
      // A sphere of seawater holding a curling wave, a line of foam along its crest.
      const deep = s.addRamp(ramp('#1d58b8', lit({ hueShift: 8 })))
      const sea = s.addRamp(ramp('#45b4e8', lit({ lift: 0.55 })))
      const foam = s.addRamp(ramp('#e6f8ff', { lift: 0.3, drop: 0.2 }))
      const cx = 16, cy = 16.5, r = 7.6
      const orb = Mask.circle(cx, cy, r)
      // Two foam lines ride the water: the upper one breaks into a curl at its crest.
      const waveY = (x: number) => cy + 0.5 - Math.sin(((x - 8.5) / 15) * Math.PI * 2) * 1.6
      shadeDome(s, orb, (x, y) => (y + 0.5 > waveY(x + 0.5) ? deep : sea), { contact: false, bias: 0.1 })
      orb.each((x, y) => {
        const wy = waveY(x + 0.5)
        if (Math.abs(y + 0.5 - wy) < 0.75) s.paint(x, y, foam, x < 16 ? 5 : 4)
        const wy2 = wy + 4
        if (Math.abs(y + 0.5 - wy2) < 0.6 && x > 9 && x < 22) s.paint(x, y, foam, 3)
      })
      for (const [x, y] of [[20, 13], [21, 12], [22, 12], [23, 13], [23, 14]] as const) if (orb.get(x, y)) s.paint(x, y, foam, 5)
      const splash = Mask.circle(22.5, 7.5, 1.1).union(Mask.circle(25, 9.5, 0.8))
      splash.each((x, y) => s.paint(x, y, sea, 4))
      aura(s, new Mask().union(orb, splash), '#7cc8ff', [50, 20])
    },
  },
  {
    id: 'spark-essence',
    name: 'Spark Essence',
    grade: 6,
    paint: (s) => {
      // A crackling yellow orb throwing jagged bolts.
      const id = s.addRamp(ramp('#ffd02a', lit({ lift: 0.6, hueShift: 10 })))
      // Bolts: one-pixel zigzags with sharp turns, drawn as straight pixel runs between corners.
      const bolts = new Mask()
      const run = (pts: Point[]) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i] ?? [0, 0], [x1, y1] = pts[i + 1] ?? [0, 0]
          const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
          for (let k = 0; k <= n; k++) bolts.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n))
        }
      }
      run([[12, 13], [10, 12], [11, 10], [8, 8]])
      run([[20, 13], [22, 12], [21, 10], [24, 9]])
      run([[20, 20], [21, 22], [19, 23], [21, 25]])
      run([[12, 20], [10, 20], [11, 22], [8, 23]])
      const orb = Mask.circle(16, 16.5, 5.6)
      glow(s, orb, id, 15.4, 15.8, 5.6, { floor: 2 })
      const arc = s.addRamp(ramp('#fffbe0', { lift: 0.3, drop: 0.2 }))
      for (const [x, y] of [[13, 16], [14, 15], [15, 16], [16, 15], [17, 16], [18, 17]] as const) s.paint(x, y, arc, 5)
      aura(s, orb, '#fff07a', [60, 24])
      // The bolts are pure light (overlays), so they stay crisp and unoutlined, with a yellow glow either side.
      bolts.each((x, y) => {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (!bolts.get(x + dx, y + dy) && !s.filled(x + dx, y + dy)) s.overlay(x + dx, y + dy, hex('#ffd83a', 110))
      })
      bolts.each((x, y) => s.overlay(x, y, hex('#fffbe6')))
    },
  },
  {
    id: 'glimmer-essence',
    name: 'Glimmer Essence',
    grade: 7,
    paint: (s) => {
      // A soft mote of starlight: a four-pointed star around a round glowing core, with tiny twinkles.
      const id = s.addRamp(ramp('#ffe7a0', lit({ lift: 0.6, drop: 0.24, hueShift: 14 })))
      const lav = s.addRamp(ramp('#cbb8ff', lit({ lift: 0.55 })))
      const cx = 16, cy = 15.5
      const star = Mask.polygon([
        [cx, cy - 11], [cx + 2, cy - 2], [cx + 8.5, cy], [cx + 2, cy + 2], [cx, cy + 10], [cx - 2, cy + 2], [cx - 8.5, cy], [cx - 2, cy - 2],
      ]).union(Mask.circle(cx, cy, 3.6))
      glow(s, star, (x, y) => (Math.abs(x + 0.5 - cx) + Math.abs(y + 0.5 - cy) > 8 ? lav : id), cx - 0.4, cy - 0.4, 9, { floor: 3 })
      // Starlight has no dark side: keep the thin points luminous.
      star.each((x, y) => {
        if (s.toneAt(x, y) < 3) s.paint(x, y, s.mat[y * s.w + x] ?? id, 3)
      })
      motes(s, '#fff6d0', [[9, 8], [23, 8], [23, 22], [10, 23]], true)
      aura(s, star, '#fff2c0', [56, 22])
    },
  },
  {
    id: 'shadow-essence',
    name: 'Shadow Essence',
    grade: 8,
    paint: (s) => {
      // A dark violet wisp of spirit-fire: a round smoky head whose single tail rises and curls over.
      const id = s.addRamp(ramp('#4a2a6e', { lift: 0.34, drop: 0.3, hueShift: 10 }))
      const heart = s.addRamp(ramp('#b47cff', lit({ lift: 0.5 })))
      const tail = stroke([[18.5, 15.5], [18.6, 12.5], [17.2, 9.6], [14.6, 7.6], [12.6, 5.6], [12.8, 3.8]], 3.8, 0.5)
      const head = Mask.circle(16, 19, 5.8)
      const body = new Mask().union(head, tail)
      shadeDome(s, body, id, { contact: false, bias: -0.02 })
      Mask.circle(15.5, 19.5, 2.2).each((x, y) => s.paint(x, y, heart, Math.hypot(x + 0.5 - 15, y + 0.5 - 19) < 1.1 ? 4 : 2))
      s.paint(14, 18, heart, 5)
      motes(s, '#c9a4ff', [[9, 10], [24, 21], [23, 8]])
      aura(s, body, '#7a44c0', [60, 24])
    },
  },
  {
    id: 'aether',
    name: 'Aether',
    grade: 9,
    paint: (s) => {
      // An iridescent orb of pure aether, pearly pink, lilac and cyan, inside a faint tilted ring of light.
      const pink = s.addRamp(ramp('#f5b0e2', lit({ lift: 0.55 })))
      const cyan = s.addRamp(ramp('#86e8ff', lit({ lift: 0.55 })))
      const lilac = s.addRamp(ramp('#b9a4ff', lit({ lift: 0.55 })))
      const cx = 16, cy = 15.5, r = 6.6
      const orb = Mask.circle(cx, cy, r)
      glow(s, orb, (x, y) => {
        const t = (y + 0.5 - cy) * 0.8 + (x + 0.5 - cx) * 0.35 + Math.sin((x - y) * 0.9) * 0.9
        const checker = (x + y) % 2 === 0
        if (t < -2.4 || (t < -1.6 && checker)) return pink
        if (t < 1.6 || (t < 2.4 && checker)) return lilac
        return cyan
      }, cx - 1.5, cy - 1.5, 8.5, { floor: 3 })
      // Two crossing rings of light: behind the orb they show only faintly; in front they are bright.
      for (const rot of [-28, 28]) {
        const k = Math.tan((rot * Math.PI) / 180)
        Mask.ellipse(cx, cy, 9.4, 2.7, rot)
          .subtract(Mask.ellipse(cx, cy, 8.3, 1.6, rot))
          .each((x, y) => {
            const front = y + 0.5 - cy >= (x + 0.5 - cx) * k
            if (orb.get(x, y) && !front) return
            s.overlay(x, y, hex('#f2fdff', front ? 225 : 120))
          })
      }
      motes(s, '#ffe6fb', [[10, 9], [22, 23]])
      aura(s, orb, '#d6c8ff', [56, 22])
    },
  },
  {
    id: 'prismatic-essence',
    name: 'Prismatic Essence',
    grade: 10,
    paint: (s) => {
      // An orb that splits light into every color, attended by three floating prism shards.
      const hues = ['#ff4d6d', '#ff9f3a', '#ffe14a', '#5fdc6a', '#4aa8ff', '#9a6bff'].map((c) => s.addRamp(ramp(c, lit({ lift: 0.5 }))))
      const white = s.addRamp(ramp('#ffffff', { lift: 0.3, drop: 0.14 }))
      const cx = 16, cy = 15, r = 6.3
      const orb = Mask.circle(cx, cy, r)
      glow(s, orb, (x, y) => {
        const t = ((x + 0.5 - cx) * 0.55 + (y + 0.5 - cy) * 0.83 + r) / (2 * r)
        return hues[Math.max(0, Math.min(5, Math.floor(t * 6)))] ?? white
      }, cx - 1.6, cy - 1.6, 9, { floor: 3 })
      for (const [x, y] of [[13, 12], [14, 12], [13, 13]] as const) s.paint(x, y, white, 5)
      // Three prism shards drift around it, each a little triangle of a different color.
      const shards = new Mask()
      for (const [x, y, k, flip] of [[11, 24, 0, -1], [25, 19.5, 4, -1], [21.5, 5.5, 3, 1]] as const) {
        const tri = Mask.polygon([[x - 1.9, y + 1.6 * flip], [x + 1.9, y + 1.6 * flip], [x, y - 2.1 * flip]])
        tri.each((px, py) => s.paint(px, py, hues[k] ?? white, px + 0.5 < x ? 5 : 3))
        shards.union(tri)
      }
      aura(s, new Mask().union(orb, shards), '#ffffff', [50, 20])
    },
  },
]
