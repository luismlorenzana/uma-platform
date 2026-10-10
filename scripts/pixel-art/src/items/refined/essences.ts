// Infusions (Workbench, refined Essences): uma-rpg docs/design/items.md#essences. Stoppered glass bottles of glowing
// liquid; the bottle shapes vary, and each liquid carries a small motif of its essence (mist, drops, wind, embers, waves,
// lightning, sparkles, smoke, shimmer, rainbow).
import { ramp, type RampOptions } from '../../color.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { bloom, bounds, halo } from './workbench-kit.ts'

const GLASS = ramp('#7aa9c2', { lift: 0.55, drop: 0.34, hueShift: 6, satShift: 0.02 })
const CORK = ramp('#a8743f', { lift: 0.3, drop: 0.28 })

interface Bottle {
  /** The glass body, without the neck. */
  body: Mask
  /** Neck: left x, width, top y, bottom y. */
  neck: { x: number; w: number; top: number; bottom: number }
  /** Liquid surface row. */
  level: number
}

function roundFlask(): Bottle {
  return { body: Mask.circle(16, 19.5, 7.6), neck: { x: 14, w: 4, top: 8, bottom: 13 }, level: 17 }
}

function teardrop(): Bottle {
  const body = Mask.circle(16, 20.5, 6.4).union(Mask.polygon([[16, 9.5], [21.4, 18.5], [10.6, 18.5]]))
  return { body, neck: { x: 14, w: 4, top: 7, bottom: 11 }, level: 18 }
}

function cone(): Bottle {
  const body = Mask.polygon([[13.6, 12.5], [18.4, 12.5], [24.2, 23.5], [23.2, 25.6], [8.8, 25.6], [7.8, 23.5]])
  return { body, neck: { x: 14, w: 4, top: 7, bottom: 13 }, level: 18 }
}

function squat(): Bottle {
  const body = Mask.ellipse(16, 20.5, 8.8, 5.8).union(Mask.ellipse(16, 17.5, 5.2, 3))
  return { body, neck: { x: 14, w: 4, top: 10, bottom: 15 }, level: 18 }
}

function tall(): Bottle {
  const body = Mask.polygon([[12.5, 11.5], [19.5, 11.5], [21.6, 13.6], [21.6, 25.6], [10.4, 25.6], [10.4, 13.6]])
  return { body, neck: { x: 14, w: 4, top: 6, bottom: 12 }, level: 15 }
}

function diamond(): Bottle {
  const body = Mask.polygon([[16, 10.5], [24.2, 18.5], [16, 26.4], [7.8, 18.5]])
  return { body, neck: { x: 14, w: 4, top: 6, bottom: 11 }, level: 16 }
}

function square(): Bottle {
  const body = Mask.polygon([[10.5, 14.5], [21.5, 14.5], [23.4, 16.4], [23.4, 25.6], [8.6, 25.6], [8.6, 16.4]])
  return { body, neck: { x: 14, w: 4, top: 10, bottom: 15 }, level: 18 }
}

function gourd(): Bottle {
  const body = Mask.circle(16, 21, 6.4).union(Mask.circle(16, 13.6, 3.6))
  return { body, neck: { x: 15, w: 2, top: 6, bottom: 11 }, level: 18 }
}

function amphora(): Bottle {
  const body = Mask.ellipse(16, 18.8, 5.6, 7.4).union(Mask.polygon([[13, 25], [19, 25], [19.6, 26.6], [12.4, 26.6]]))
  return { body, neck: { x: 15, w: 2, top: 7, bottom: 12 }, level: 16 }
}

function hexFlask(): Bottle {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2
    return [16 + Math.cos(a) * 8.6, 19 + Math.sin(a) * 7.6] as const
  })
  return { body: Mask.polygon(pts), neck: { x: 14, w: 4, top: 7, bottom: 12.5 }, level: 17 }
}

interface InfusionSpec {
  id: string
  name: string
  grade: number
  bottle: () => Bottle
  liquid: string
  liquidRamp?: RampOptions
  /** Glow color around the liquid. */
  glow: string
  /** Strength of the outer halo (0 for none). */
  aura?: number
  motif?: (s: Sprite, liquid: Mask, ids: { liquid: number; glass: number; accent: number }, level: number) => void
  accent?: string
  /** A halo that runs through the rainbow around the bottle. */
  rainbow?: boolean
  /** Stopper: a cork, or a faceted crystal for the legendary ones. */
  stopper?: 'cork' | 'crystal' | 'wax'
}

function paintInfusion(spec: InfusionSpec): (s: Sprite) => void {
  return (s) => {
    const glass = s.addRamp(GLASS)
    const liquid = s.addRamp(ramp(spec.liquid, spec.liquidRamp ?? { lift: 0.45, drop: 0.3, hueShift: 10, satShift: 0.04 }))
    const accent = s.addRamp(ramp(spec.accent ?? spec.glow, { lift: 0.5, drop: 0.3 }))
    const b = spec.bottle()
    const n = b.neck
    const neck = Mask.from((px, py) => px >= n.x && px <= n.x + n.w && py >= n.top + 1 && py <= n.bottom + 0.6)
    const glassMask = new Mask().union(b.body, neck)
    // Glass: dim and cool, so the liquid inside glows against it.
    shadeDome(s, glassMask, glass, { bias: -0.38, contact: false })
    // Liquid: inside the glass wall, below the surface.
    const inner = new Mask()
    b.body.each((x, y) => {
      if (y >= b.level && b.body.get(x - 1, y) && b.body.get(x + 1, y) && b.body.get(x, y + 1)) inner.set(x, y)
    })
    shadeDome(s, inner, liquid, { bias: 0.06, contact: false })
    // Meniscus.
    inner.each((x, y) => {
      if (!inner.get(x, y - 1)) s.paint(x, y, liquid, 5)
    })
    spec.motif?.(s, inner, { liquid, glass, accent }, b.level)
    // Glass highlight: a streak on the upper left of the body and a glint on the right.
    const [x0, y0, x1, y1] = bounds(b.body)
    const hx = x0 + 2
    for (let y = y0 + 2; y <= Math.min(y1 - 3, y0 + 2 + Math.max(3, Math.floor((y1 - y0) * 0.4))); y++) if (b.body.get(hx, y) && b.body.get(hx - 1, y)) s.paint(hx, y, glass, 5)
    if (b.body.get(x1 - 2, y1 - 3)) s.paint(x1 - 2, y1 - 3, glass, 4)
    // Lip and stopper.
    const lip = s.addRamp(GLASS)
    for (let x = n.x - 1; x <= n.x + n.w + 1; x++) s.paint(x, n.top + 1, lip, x <= n.x ? 5 : x >= n.x + n.w ? 3 : 4)
    const stopper = spec.stopper ?? 'cork'
    if (stopper === 'crystal') {
      const gem = s.addRamp(ramp(spec.accent ?? spec.glow, { lift: 0.5, drop: 0.3 }))
      const cx = n.x + n.w / 2
      const top = Mask.polygon([[cx, n.top - 3.6], [cx + 2.6, n.top - 1], [cx, n.top + 1.2], [cx - 2.6, n.top - 1]])
      top.each((x, y) => s.paint(x, y, gem, x + 0.5 < cx ? (y < n.top - 1 ? 5 : 4) : y < n.top - 1 ? 3 : 2))
    } else {
      const corkId = s.addRamp(stopper === 'wax' ? ramp('#7a2a3a') : CORK)
      for (let y = n.top - 2; y <= n.top; y++)
        for (let x = n.x; x <= n.x + n.w; x++) s.paint(x, y, corkId, y === n.top - 2 ? 4 : x === n.x ? 4 : x === n.x + n.w ? 2 : 3)
    }
    // Light from within.
    const [lx0, ly0, lx1, ly1] = bounds(inner)
    bloom(s, (lx0 + lx1 + 1) / 2, (ly0 + ly1 + 1) / 2, Math.max(4, (lx1 - lx0) / 2 + 1), spec.glow, 40)
    if (spec.aura) halo(s, spec.rainbow ? rainbowAt : spec.glow, spec.aura, 2)
  }
}

const RAINBOW = ['#ff6a7a', '#ffb04a', '#ffe95a', '#6fe88a', '#5ab8ff', '#a98bff']

/** Halo color by angle around the bottle's center. */
function rainbowAt(x: number, y: number): string {
  const a = (Math.atan2(y + 0.5 - 17, x + 0.5 - 16) / (Math.PI * 2) + 1) % 1
  return RAINBOW[Math.floor(a * RAINBOW.length) % RAINBOW.length] ?? '#ffffff'
}

// ---------------------------------------------------------------- motifs

const at = (s: Sprite, m: Mask, x: number, y: number, id: number, tone: number) => {
  if (m.get(x, y)) s.paint(x, y, id, tone)
}

function bubbles(cells: readonly (readonly [number, number])[]) {
  return (s: Sprite, m: Mask, ids: { liquid: number }) => {
    for (const [x, y] of cells) at(s, m, x, y, ids.liquid, 5)
  }
}

const SPECS: InfusionSpec[] = [
  {
    id: 'mist-infusion',
    name: 'Mist Infusion',
    grade: 1,
    bottle: roundFlask,
    liquid: '#7690bd',
    glow: '#b9c9e6',
    accent: '#e6eef8',
    motif: (s, m, ids, level) => {
      // Curls of mist rising off the surface into the empty glass.
      for (const [x, y, t] of [[13, level - 1, 4], [14, level - 2, 5], [15, level - 2, 4], [16, level - 1, 4], [18, level - 2, 4], [19, level - 3, 5], [18, level - 4, 4], [12, level - 3, 3]] as const) s.paint(x, y, ids.accent, t)
      bubbles([[14, 21], [18, 23]])(s, m, ids)
    },
  },
  {
    id: 'dew-infusion',
    name: 'Dew Infusion',
    grade: 2,
    bottle: teardrop,
    liquid: '#5fe0e0',
    glow: '#b6fbf6',
    motif: (s, m, ids) => {
      // A bright drop suspended in the liquid.
      for (const [x, y, t] of [[16, 19, 5], [15, 20, 5], [16, 20, 5], [17, 20, 4], [15, 21, 4], [16, 21, 4], [17, 21, 3]] as const) at(s, m, x, y, ids.accent, t)
      bubbles([[13, 23], [19, 22]])(s, m, ids)
    },
  },
  {
    id: 'breeze-infusion',
    name: 'Breeze Infusion',
    grade: 3,
    bottle: cone,
    liquid: '#8fdc9a',
    glow: '#e6fff0',
    accent: '#f4fff6',
    motif: (s, m, ids) => {
      // Wind swirls.
      for (const [x, y] of [[11, 21], [12, 20], [13, 20], [14, 20], [15, 21], [14, 22], [13, 22], [17, 23], [18, 22], [19, 22], [20, 22], [21, 23]] as const) at(s, m, x, y, ids.accent, 5)
    },
  },
  {
    id: 'ember-infusion',
    name: 'Ember Infusion',
    grade: 4,
    bottle: squat,
    liquid: '#ff6a2a',
    glow: '#ffb35a',
    accent: '#ffe27a',
    motif: (s, m, ids) => {
      // Embers rising through the liquid.
      for (const [x, y, t] of [[11, 22, 5], [14, 20, 4], [17, 23, 5], [20, 21, 4], [15, 24, 4], [19, 19, 5]] as const) at(s, m, x, y, ids.accent, t)
    },
  },
  {
    id: 'tide-infusion',
    name: 'Tide Infusion',
    grade: 5,
    bottle: tall,
    liquid: '#2d63d4',
    glow: '#79a8ff',
    accent: '#bfe0ff',
    motif: (s, m, ids) => {
      // A breaking wave.
      for (const [x, y] of [[11, 19], [12, 18], [13, 18], [14, 19], [15, 20], [16, 19], [17, 18], [18, 18], [19, 19], [20, 20]] as const) at(s, m, x, y, ids.accent, 5)
      for (const [x, y] of [[12, 22], [13, 22], [16, 23], [17, 23], [19, 22]] as const) at(s, m, x, y, ids.accent, 3)
    },
  },
  {
    id: 'spark-infusion',
    name: 'Spark Infusion',
    grade: 6,
    bottle: diamond,
    liquid: '#f0b51c',
    liquidRamp: { lift: 0.45, drop: 0.32, hueShift: 10, satShift: 0.04 },
    glow: '#fff09a',
    accent: '#ffffff',
    motif: (s, m, ids) => {
      // A lightning bolt.
      for (const [x, y] of [[18, 17], [17, 18], [16, 19], [17, 19], [18, 19], [17, 20], [16, 21], [15, 22]] as const) at(s, m, x, y, ids.accent, 5)
      for (const [x, y] of [[15, 19], [18, 20], [16, 22], [14, 23]] as const) at(s, m, x, y, ids.liquid, 2)
    },
  },
  {
    id: 'glimmer-infusion',
    name: 'Glimmer Infusion',
    grade: 7,
    bottle: square,
    liquid: '#f0d58a',
    liquidRamp: { lift: 0.5, drop: 0.3, hueShift: 10, satShift: 0.03 },
    glow: '#fff3c4',
    accent: '#ffffff',
    stopper: 'wax',
    motif: (s, m, ids) => {
      // Floating sparkles.
      for (const [cx, cy] of [[12, 21], [19, 23]] as const) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) at(s, m, cx + dx, cy + dy, ids.accent, dx === 0 && dy === 0 ? 5 : 4)
      at(s, m, 16, 20, ids.accent, 5)
    },
  },
  {
    id: 'shadow-infusion',
    name: 'Shadow Infusion',
    grade: 8,
    bottle: gourd,
    liquid: '#4a2370',
    liquidRamp: { lift: 0.4, drop: 0.34, hueShift: 12, satShift: 0.05 },
    glow: '#a05cff',
    accent: '#1a0f2a',
    aura: 50,
    motif: (s, m, ids) => {
      // Dark smoke curling inside.
      for (const [x, y] of [[13, 21], [14, 20], [15, 21], [16, 22], [17, 21], [18, 20], [19, 21], [15, 24], [16, 24], [17, 23]] as const) at(s, m, x, y, ids.liquid, 1)
      for (const [x, y] of [[14, 23], [18, 23]] as const) at(s, m, x, y, ids.liquid, 5)
    },
  },
  {
    id: 'aether-infusion',
    name: 'Aether Infusion',
    grade: 9,
    bottle: amphora,
    liquid: '#7fd6f2',
    glow: '#e0c8ff',
    accent: '#f3d9ff',
    aura: 70,
    stopper: 'crystal',
    motif: (s, m) => {
      // Iridescence: the liquid shifts from cyan through lilac to rose.
      const bands = [s.addRamp(ramp('#7fd6f2', { lift: 0.45 })), s.addRamp(ramp('#b9a4f5', { lift: 0.45 })), s.addRamp(ramp('#f2a6d8', { lift: 0.45 }))]
      m.each((x, y) => {
        const k = Math.floor((x + y * 0.8) / 3.2) % 3
        const id = bands[k] ?? bands[0] ?? 0
        s.paint(x, y, id, s.toneAt(x, y))
      })
    },
  },
  {
    id: 'prismatic-infusion',
    name: 'Prismatic Infusion',
    grade: 10,
    bottle: hexFlask,
    liquid: '#ff5a6a',
    glow: '#fff2b0',
    accent: '#d6ecff',
    aura: 80,
    rainbow: true,
    stopper: 'crystal',
    motif: (s, m) => {
      // Rainbow layers.
      const ids = RAINBOW.map((h) => s.addRamp(ramp(h, { lift: 0.42, drop: 0.28 })))
      const [, y0, , y1] = bounds(m)
      m.each((x, y) => {
        const k = Math.min(ids.length - 1, Math.floor(((y - y0) / Math.max(1, y1 - y0 + 1)) * ids.length))
        s.paint(x, y, ids[k] ?? 0, s.toneAt(x, y))
      })
    },
  },
]

export const ESSENCES_REFINED: ItemIcon[] = SPECS.map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: paintInfusion(spec) }))
