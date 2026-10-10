// Ores (Mine, ATK family): uma-rpg docs/design/items.md#ores. A faceted rock chunk carrying metal deposits.
import { ramp, type RampOptions } from '../color.ts'
import { rng } from '../rng.ts'
import { cutStone, Mask, shadeDome, shadeFacets, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

interface OreSpec {
  id: string
  name: string
  grade: number
  rock: string
  metal: string
  metalRamp?: RampOptions
  /** Rounded metal lumps: count and radius. */
  clusters?: { count: number; radius: number }
  /** Groups of upright crystal shards. */
  shards?: number
  /** Thin metal veins running across the rock. */
  veins?: number
  /** Specks on the rock: copper's patina, iron's rust. */
  stain?: string
}

function rockChunk(s: Sprite, seed: string, rockId: number): Mask {
  const r = rng(seed)
  const cx = 16, cy = 17.2, n = 7
  const outer: Point[] = []
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2 + (r() - 0.5) * 0.5
    const rad = 10.2 + (r() - 0.5) * 2.6
    outer.push([cx + Math.cos(a) * rad * 1.05, Math.min(26.4, cy + Math.sin(a) * rad * 0.92)])
  }
  const inner = outer.map(([x, y]) => [cx - 2.4 + (x - cx) * 0.5, cy - 3.6 + (y - cy) * 0.5] as const)
  shadeFacets(s, outer, cutStone(outer, inner, 7), rockId)
  return Mask.polygon(outer)
}

/** Every pixel of `m` is rock, with a one-pixel rock margin all around. */
function fitsOnRock(s: Sprite, rock: Mask, m: Mask, taken: Mask): boolean {
  let ok = true
  m.each((x, y) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (!rock.get(x + dx, y + dy) || taken.get(x + dx, y + dy)) ok = false
    if (!s.filled(x, y)) ok = false
  })
  return ok
}

/** Darkens the rock just below-right of a deposit, so it sits in the stone. */
function castShadow(s: Sprite, m: Mask, rockId: number): void {
  const cells: [number, number][] = []
  m.each((x, y) => {
    for (const [dx, dy] of [[1, 1], [1, 0], [0, 1]] as const) if (!m.get(x + dx, y + dy)) cells.push([x + dx, y + dy])
  })
  for (const [x, y] of cells) if (s.filled(x, y) && s.ramps[rockId] && s.toneAt(x, y) > 1) s.shift(x, y, -1)
}

function paintOre(spec: OreSpec): (s: Sprite) => void {
  return (s) => {
    const rockId = s.addRamp(ramp(spec.rock, { satShift: 0.02, hueShift: 5, lift: 0.3, drop: 0.26 }))
    const metalId = s.addRamp(ramp(spec.metal, spec.metalRamp ?? { lift: 0.4, drop: 0.3 }))
    const rock = rockChunk(s, spec.id, rockId)
    const r = rng(`${spec.id}-deposits`)
    const taken = new Mask()
    const place = (make: (x: number, y: number) => Mask, tries = 300): Mask | null => {
      for (let i = 0; i < tries; i++) {
        const m = make(7 + r() * 18, 8 + r() * 16)
        if (fitsOnRock(s, rock, m, taken)) {
          taken.union(m)
          return m
        }
      }
      return null
    }
    for (let v = 0; v < (spec.veins ?? 0); v++) {
      const x0 = 9 + r() * 6, y0 = 12 + r() * 8, len = 6 + Math.floor(r() * 4)
      let x = x0, y = y0
      for (let k = 0; k < len; k++) {
        const px = Math.round(x), py = Math.round(y)
        if (rock.get(px - 1, py) && rock.get(px + 1, py) && rock.get(px, py + 1) && s.filled(px, py)) s.paint(px, py, metalId, k % 3 === 0 ? 4 : 3)
        x += 1
        y += r() < 0.5 ? 0 : r() < 0.5 ? -1 : 1
      }
    }
    for (let c = 0; c < (spec.clusters?.count ?? 0); c++) {
      const radius = (spec.clusters?.radius ?? 1.8) * (0.85 + r() * 0.3)
      const m = place((x, y) => Mask.circle(Math.round(x) + 0.5, Math.round(y) + 0.5, radius))
      if (!m) continue
      castShadow(s, m, rockId)
      shadeDome(s, m, metalId, { contact: false, bias: 0.12, relief: 1.4 })
    }
    for (let g = 0; g < (spec.shards ?? 0); g++) {
      const m = place((x, y) => Mask.polygon([[x - 2.2, y + 2.5], [x - 1.4, y - 2.2], [x - 0.5, y - 3.6], [x + 0.6, y - 1.6], [x + 2.2, y - 2.6], [x + 2.6, y + 2.5]]))
      if (!m) continue
      castShadow(s, m, rockId)
      let minX = 99, maxX = -1
      m.each((x) => {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
      })
      const mid = (minX + maxX) / 2
      m.each((x, y) => {
        const top = !m.get(x, y - 1)
        const tone = top ? 5 : x < mid - 0.5 ? 4 : x <= mid + 0.5 ? 3 : 2
        s.paint(x, y, metalId, tone)
      })
    }
    if (spec.stain) {
      const stainId = s.addRamp(ramp(spec.stain))
      for (let i = 0, placed = 0; placed < 5 && i < 300; i++) {
        const x = Math.floor(7 + r() * 18), y = Math.floor(9 + r() * 16)
        const m = new Mask()
        m.set(x, y)
        if (!fitsOnRock(s, rock, m, taken)) continue
        taken.set(x, y)
        s.paint(x, y, stainId, s.toneAt(x, y) >= 3 ? 3 : 2)
        placed++
      }
    }
  }
}

const SPECS: OreSpec[] = [
  { id: 'copper-ore', name: 'Copper Ore', grade: 1, rock: '#7d675c', metal: '#e07a3a', clusters: { count: 3, radius: 1.9 }, stain: '#4fae93' },
  { id: 'tin-ore', name: 'Tin Ore', grade: 2, rock: '#6e6c74', metal: '#b3bcc2', metalRamp: { lift: 0.28, drop: 0.24 }, clusters: { count: 4, radius: 1.5 } },
  { id: 'iron-ore', name: 'Iron Ore', grade: 3, rock: '#6d5e55', metal: '#8a93a0', clusters: { count: 3, radius: 1.9 }, stain: '#b0552c' },
  { id: 'silver-ore', name: 'Silver Ore', grade: 4, rock: '#525667', metal: '#e4e8f1', metalRamp: { lift: 0.55, drop: 0.34 }, clusters: { count: 2, radius: 1.8 }, veins: 2 },
  { id: 'cobalt-ore', name: 'Cobalt Ore', grade: 5, rock: '#555b6c', metal: '#3a6ae0', shards: 2 },
  { id: 'gold-ore', name: 'Gold Ore', grade: 6, rock: '#71624f', metal: '#f4c534', metalRamp: { lift: 0.45, drop: 0.3 }, clusters: { count: 3, radius: 2 }, veins: 1 },
  { id: 'platinum-ore', name: 'Platinum Ore', grade: 7, rock: '#5d6470', metal: '#d6ecf2', metalRamp: { lift: 0.55, drop: 0.36 }, clusters: { count: 2, radius: 2.5 } },
  { id: 'titanium-ore', name: 'Titanium Ore', grade: 8, rock: '#464c58', metal: '#9a96dc', metalRamp: { lift: 0.42, drop: 0.3 }, clusters: { count: 3, radius: 2 } },
  { id: 'mythril-ore', name: 'Mythril Ore', grade: 9, rock: '#3d4a58', metal: '#5ff2c8', metalRamp: { lift: 0.42, drop: 0.32 }, shards: 3 },
  { id: 'orichalcum-ore', name: 'Orichalcum Ore', grade: 10, rock: '#5c3b35', metal: '#ff8d2c', metalRamp: { lift: 0.45, drop: 0.3 }, clusters: { count: 3, radius: 2.2 }, veins: 1 },
]

export const ORES: ItemIcon[] = SPECS.map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: paintOre(spec) }))
