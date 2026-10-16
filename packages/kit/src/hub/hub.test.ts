import { describe, expect, it } from 'vitest'
import { hubGrid, placeAnchor, placeCell } from './grid.js'
import { sceneKey } from './HubMap.js'
import { neighbourPage, swipeDirection } from './swipe.js'
import { E, layTerrain, N, S, TILE_PROPS, W } from './terrain.js'
import type { PlaceAt } from './types.js'

// Two invented pages: one like uma-rpg's Wilds (a stream, a building on the road), one like uma-racer's Town (a plaza).
const WILDS: { id: string; at: PlaceAt }[] = [
  { id: 'a', at: { x: 0.24, y: 0.1 } }, { id: 'b', at: { x: 0.74, y: 0.12 } }, { id: 'c', at: { x: 0.2, y: 0.3 } }, { id: 'd', at: { x: 0.76, y: 0.32 } },
  { id: 'e', at: { x: 0.22, y: 0.51 } }, { id: 'road', at: { x: 0.5, y: 0.5 } }, { id: 'f', at: { x: 0.78, y: 0.51 } },
  { id: 'g', at: { x: 0.22, y: 0.71 } }, { id: 'h', at: { x: 0.78, y: 0.7 } }, { id: 'i', at: { x: 0.26, y: 0.9 } }, { id: 'j', at: { x: 0.74, y: 0.9 } },
]
const TOWN: { id: string; at: PlaceAt }[] = [
  { id: 'stable', at: { x: 0.24, y: 0.18 } }, { id: 'library', at: { x: 0.76, y: 0.18 } }, { id: 'warehouse', at: { x: 0.24, y: 0.72 } }, { id: 'exchange', at: { x: 0.76, y: 0.72 } },
]

describe('the Hub grid', () => {
  it('has an odd number of columns centred on the screen, and places sit on their cells', () => {
    for (const w of [375, 390, 393, 430]) {
      const grid = hubGrid(w, 700, 2)
      expect(grid.cols % 2).toBe(1)
      expect(grid.tile).toBe(24)
      expect(grid.left).toBeGreaterThanOrEqual(0)
    }
    const grid = hubGrid(390, 700, 2)
    expect(placeCell({ x: 0.5, y: 0.5 }, grid.cols, grid.rows).col).toBe(Math.floor(grid.cols / 2))
    expect(placeAnchor({ x: 0.5, y: 0.5 }, grid).x).toBeCloseTo(195, 0)
  })
})

describe('page swipes', () => {
  it('needs a long, mostly horizontal drag and stops at the ends of the bar order', () => {
    expect(swipeDirection({ x: 200, y: 300 }, { x: 120, y: 310 })).toBe(1)
    expect(swipeDirection({ x: 100, y: 300 }, { x: 180, y: 290 })).toBe(-1)
    expect(swipeDirection({ x: 200, y: 300 }, { x: 150, y: 300 })).toBe(0)
    expect(swipeDirection({ x: 200, y: 300 }, { x: 110, y: 380 })).toBe(0)
    const pages = ['town', 'learning', 'battle', 'wilds'] as const
    expect(neighbourPage(pages, 'town', -1)).toBeNull()
    expect(neighbourPage(pages, 'town', 1)).toBe('learning')
    expect(neighbourPage(pages, 'wilds', 1)).toBeNull()
  })
})

describe('terrain', () => {
  for (const [name, places, tiles, stream, rows] of [['wilds', WILDS, 'wilds', true, 30], ['wilds', WILDS, 'wilds', true, 21], ['town', TOWN, 'town', false, 30]] as const) {
    it(`lays out ${name} (${rows} rows): deterministic, every door on the road network, joined masks, props on free ground`, () => {
      const cols = 17
      const opts = { page: name, tiles, places, cols, rows, stream, clearings: name === 'town' ? [{ x: 0.5, y: 0.45 }] : [] }
      const t = layTerrain(opts)
      expect(layTerrain(opts)).toEqual(t)
      expect(t.cells).toHaveLength(cols * rows)
      const kindAt = (c: number, r: number) => (c < 0 || r < 0 || c >= cols || r >= rows ? 'edge' : t.cells[r * cols + c]!.split('/')[1]!.split('-')[0]!)
      const maskAt = (c: number, r: number) => Number(t.cells[r * cols + c]!.split('-').pop())
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const k = kindAt(c, r)
        if (k !== 'path' && k !== 'water') continue
        for (const [bit, dc, dr] of [[N, 0, -1], [E, 1, 0], [S, 0, 1], [W, -1, 0]] as const) {
          const n = kindAt(c + dc, r + dr)
          expect(Boolean(maskAt(c, r) & bit), `${c},${r}`).toBe(n === k || n === 'edge')
        }
      }
      // Every door is a path cell that reaches the map's edge through paths.
      const seen = new Set<string>()
      const queue: [number, number][] = []
      for (let c = 0; c < cols; c++) for (const r of [0, rows - 1]) if (kindAt(c, r) === 'path') queue.push([c, r])
      while (queue.length) {
        const [c, r] = queue.pop()!
        const key = `${c},${r}`
        if (seen.has(key) || kindAt(c, r) !== 'path') continue
        seen.add(key)
        queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1])
      }
      for (const p of places) {
        const { col, row } = t.footprints[p.id]!
        if (row + 1 >= rows) continue
        expect(seen.has(`${col},${row + 1}`), `${p.id}'s door`).toBe(true)
      }
      // The stream never touches a building; props stand only on ground.
      if (stream) expect(t.cells.some((f) => f.startsWith('wilds/water-'))).toBe(true)
      for (const p of places) {
        const { col, row } = t.footprints[p.id]!
        for (let c = col - 1; c <= col + 1; c++) for (let r = row - 2; r <= row; r++) expect(kindAt(c, r), `${p.id} at ${c},${r}`).not.toBe('water')
      }
      for (const prop of t.props) {
        expect(kindAt(prop.col, prop.row)).toBe('ground')
        expect(TILE_PROPS[tiles]!.some((x) => prop.frame === `${tiles}/${x.id}`)).toBe(true)
      }
    })
  }
})

describe('sceneKey (0.1.2)', () => {
  it('ignores what ticks and changes with what the scene draws', () => {
    const a = [{ id: 'mine', frame: 'buildings/mine', at: { x: 0.2, y: 0.4 }, count: 1 }]
    const b = [{ id: 'mine', frame: 'buildings/mine', at: { x: 0.2, y: 0.4 }, count: 2 }]
    expect(sceneKey(a)).toBe(sceneKey(b))
    expect(sceneKey([{ ...a[0]!, at: { x: 0.3, y: 0.4 } }])).not.toBe(sceneKey(a))
    expect(sceneKey([{ ...a[0]!, frame: 'buildings/forge' }])).not.toBe(sceneKey(a))
  })
})
