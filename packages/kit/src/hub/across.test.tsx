// @vitest-environment jsdom
// The Hub map across a landscape stage (0.20.0, uma-farm's F74): `flow="across"` lays the grid's odd rows centred down the
// map and the trunk road across its middle row; every door joins it, a building on the road gets a lane under it so the
// road runs from edge to edge, and the browser pans the map sideways (`touch-pan-x`) while a mostly vertical drag on the
// stage changes page. Without `flow` the map is as before (hub.test.ts).
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KitStage, type StageTurn } from '../ui/stage.js'
import { hubGrid, placeAnchor, placeCell } from './grid.js'
import { HubMap, type HubMapPlace } from './HubMap.js'
import { PALETTES } from './palettes.js'
import { swipeDirectionAcross } from './swipe.js'
import { E, layTerrain, N, S, TILE_PROPS, W } from './terrain.js'
import type { PageGround, PlaceAt } from './types.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

// An invented farm, wide and short: places above the road, on it (one on its roof row) and below it.
const FARM: { id: string; at: PlaceAt }[] = [
  { id: 'fields', at: { x: 0.08, y: 0.25 } }, { id: 'coop', at: { x: 0.3, y: 0.22 } }, { id: 'barn', at: { x: 0.55, y: 0.28 } },
  { id: 'gate', at: { x: 0.22, y: 0.5 } }, { id: 'well', at: { x: 0.68, y: 0.62 } },
  { id: 'mine', at: { x: 0.12, y: 0.85 } }, { id: 'forge', at: { x: 0.42, y: 0.82 } }, { id: 'pond', at: { x: 0.86, y: 0.9 } },
]

describe('the across grid', () => {
  it('has an odd number of rows centred down the map, columns from its left edge, and places on their cells', () => {
    for (const h of [320, 360, 375, 393, 430]) {
      const grid = hubGrid(1200, h, 2, 'across')
      expect(grid.rows % 2).toBe(1)
      expect(grid.tile).toBe(24)
      expect(grid.left).toBe(0)
      expect(grid.cols).toBe(Math.ceil(1200 / 24))
      expect(grid.top).toBeGreaterThanOrEqual(0)
      expect(grid.top).toBeLessThan(grid.tile)
      // The middle row is the map's middle.
      const middle = placeCell({ x: 0.5, y: 0.5 }, grid.cols, grid.rows).row
      expect(middle).toBe(Math.floor(grid.rows / 2))
      expect((middle + 0.5) * grid.tile - grid.top!).toBeCloseTo(h / 2, 0)
      expect(placeAnchor({ x: 0.5, y: 0.5 }, grid).y).toBeCloseTo(placeAnchor({ x: 0.5, y: 0.5 }, { ...grid, top: 0 }).y - grid.top!, 6)
    }
  })

  it('is the down grid without `flow`', () => {
    expect(hubGrid(390, 844, 2, 'down')).toEqual(hubGrid(390, 844, 2))
    expect(hubGrid(390, 844, 2)).not.toHaveProperty('top')
  })
})

describe('across terrain', () => {
  for (const [rows, stream] of [[15, false], [17, true], [13, false]] as const) {
    it(`lays the farm across (${rows} rows${stream ? ', a stream' : ''}): deterministic, the road across the middle, every door on it, joined masks, no 2 × 2`, () => {
      const cols = 41
      const opts = { page: 'farm', tiles: 'farmlands', places: FARM, cols, rows, stream, flow: 'across' as const }
      const t = layTerrain(opts)
      expect(layTerrain(opts)).toEqual(t)
      expect(t.cells).toHaveLength(cols * rows)
      expect(t).not.toEqual(layTerrain({ ...opts, flow: 'down' }))
      const kindAt = (c: number, r: number) => (c < 0 || r < 0 || c >= cols || r >= rows ? 'edge' : t.cells[r * cols + c]!.split('/')[1]!.split('-')[0]!)
      const maskAt = (c: number, r: number) => Number(t.cells[r * cols + c]!.split('-').pop())
      const trunk = Math.floor(rows / 2)
      const blocked = (c: number, r: number) => Object.values(t.footprints).some((f) => c >= f.col - 1 && c <= f.col + 1 && r >= f.row - 2 && r <= f.row)
      // The road runs across the middle row, but for buildings standing on it and the stream.
      for (let c = 0; c < cols; c++) if (!blocked(c, trunk) && kindAt(c, trunk) !== 'water') expect(kindAt(c, trunk), `${c},${trunk}`).toBe('path')
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const k = kindAt(c, r)
        if (k !== 'path' && k !== 'water') continue
        for (const [bit, dc, dr] of [[N, 0, -1], [E, 1, 0], [S, 0, 1], [W, -1, 0]] as const) {
          const n = kindAt(c + dc, r + dr)
          expect(Boolean(maskAt(c, r) & bit), `${c},${r}`).toBe(n === k || n === 'edge')
        }
        if (k === 'path') expect(kindAt(c + 1, r) === 'path' && kindAt(c, r + 1) === 'path' && kindAt(c + 1, r + 1) === 'path', `2 × 2 at ${c},${r}`).toBe(false)
      }
      // Every door reaches the map's west (or east) edge through paths: the road runs on under the gate.
      const seen = new Set<string>()
      const queue: [number, number][] = []
      for (let r = 0; r < rows; r++) for (const c of [0, cols - 1]) if (kindAt(c, r) === 'path') queue.push([c, r])
      while (queue.length) {
        const [c, r] = queue.pop()!
        const key = `${c},${r}`
        if (seen.has(key) || kindAt(c, r) !== 'path') continue
        seen.add(key)
        queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1])
      }
      for (const p of FARM) {
        const { col, row } = t.footprints[p.id]!
        if (row + 1 >= rows) continue
        expect(seen.has(`${col},${row + 1}`), `${p.id}'s door`).toBe(true)
      }
      if (!stream) expect(seen.has(`${cols - 1},${trunk}`) && seen.has(`0,${trunk}`)).toBe(true)
      // Buildings never stand in water; props stand only on ground.
      for (const p of FARM) {
        const { col, row } = t.footprints[p.id]!
        for (let c = col - 1; c <= col + 1; c++) for (let r = row - 2; r <= row; r++) expect(kindAt(c, r)).not.toBe('water')
      }
      for (const prop of t.props) {
        expect(kindAt(prop.col, prop.row)).toBe('ground')
        expect(TILE_PROPS.farmlands!.some((x) => prop.frame === `farmlands/${x.id}`)).toBe(true)
      }
    })
  }

  it('runs the road on under a building standing on it, along its door row', () => {
    const cols = 21
    const rows = 15
    const t = layTerrain({ page: 'farm', tiles: 'farmlands', places: [{ id: 'gate', at: { x: 0.5, y: 0.5 } }], cols, rows, props: [], flow: 'across' })
    const { col, row } = t.footprints.gate!
    expect(row).toBe(Math.floor(rows / 2))
    const path = (c: number, r: number) => t.cells[r * cols + c]!.startsWith('farmlands/path-')
    for (let c = col - 2; c <= col + 2; c++) expect(path(c, row + 1), `${c}`).toBe(true)
    for (let c = 0; c < cols; c++) if (Math.abs(c - col) > 1) expect(path(c, row), `${c}`).toBe(true)
  })
})

describe('across page swipes', () => {
  it('needs a long, mostly vertical drag: up for the next page, down for the previous', () => {
    expect(swipeDirectionAcross({ x: 300, y: 300 }, { x: 310, y: 220 })).toBe(1)
    expect(swipeDirectionAcross({ x: 300, y: 200 }, { x: 290, y: 280 })).toBe(-1)
    expect(swipeDirectionAcross({ x: 300, y: 300 }, { x: 300, y: 250 })).toBe(0)
    expect(swipeDirectionAcross({ x: 300, y: 300 }, { x: 200, y: 300 })).toBe(0)
    expect(swipeDirectionAcross({ x: 300, y: 300 }, { x: 380, y: 210 })).toBe(0)
  })
})

describe('HubMap flow="across"', () => {
  const GROUND: PageGround = { id: 'farm', tiles: 'farmlands', palette: PALETTES.farmlands! }
  const PLACES: HubMapPlace[] = [{ id: 'barn', name: 'Barn', frame: 'barn', at: { x: 0.3, y: 0.3 }, to: '/?peek=barn', label: 'Barn' }]
  const map = (props: { flow?: 'across'; onPage?: (page: string) => void } = {}) => (
    <HubMap label="Farm map" page="b" pages={['a', 'b', 'c']} onPage={props.onPage ?? (() => {})} ground={GROUND} places={PLACES}
      covered={false} reducedMotion flow={props.flow} />
  )
  const main = (node: ReactNode) => new DOMParser().parseFromString(renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>), 'text/html')
    .querySelector('main[data-kit="page"]')!

  it('pans sideways, and marks its flow', () => {
    const across = main(map({ flow: 'across' }))
    expect(across.getAttribute('data-flow')).toBe('across')
    expect(across.className.split(' ')).toContain('touch-pan-x')
    expect(across.className.split(' ')).not.toContain('touch-pan-y')
    expect(across.querySelector('a[data-place="barn"]')).not.toBeNull()
    const down = main(map())
    expect(down.hasAttribute('data-flow')).toBe(false)
    expect(down.className).toBe('absolute inset-0 touch-pan-y overflow-hidden select-none')
  })

  let root: Root | undefined
  afterEach(async () => {
    await act(async () => root?.unmount())
    root = undefined
    document.body.innerHTML = ''
  })
  async function drag(node: ReactNode, from: { x: number; y: number }, to: { x: number; y: number }) {
    root ??= createRoot(document.body.appendChild(document.createElement('div')))
    await act(async () => { root!.render(<MemoryRouter>{node}</MemoryRouter>) })
    const target = document.querySelector('main[data-kit="page"]')!
    const fire = (type: string, at: { x: number; y: number }) =>
      target.dispatchEvent(Object.assign(new MouseEvent(type, { bubbles: true, clientX: at.x, clientY: at.y }), { pointerId: 1 }))
    await act(async () => {
      fire('pointerdown', from)
      fire('pointerup', to)
    })
  }
  const onStage = (turn: StageTurn, node: ReactNode) => <KitStage turn={turn}>{node}</KitStage>

  // On a stage turned 90°, up the stage is rightward on the viewport, and across it is down the viewport.
  it.each([
    [0, { x: 300, y: 300 }, { x: 300, y: 180 }, { x: 300, y: 420 }, { x: 180, y: 300 }],
    [90, { x: 180, y: 300 }, { x: 300, y: 300 }, { x: 60, y: 300 }, { x: 180, y: 420 }],
  ] as const)('turns the page on a drag up or down the stage turned %i°, and not on one across it', async (turn, from, up, down, across) => {
    const onPage = vi.fn()
    await drag(onStage(turn, map({ flow: 'across', onPage })), from, up)
    expect(onPage).toHaveBeenCalledExactlyOnceWith('c')
    onPage.mockClear()
    await drag(onStage(turn, map({ flow: 'across', onPage })), from, down)
    expect(onPage).toHaveBeenCalledExactlyOnceWith('a')
    onPage.mockClear()
    // Across the stage is the map's own panning: no page change.
    await drag(onStage(turn, map({ flow: 'across', onPage })), from, across)
    expect(onPage).not.toHaveBeenCalled()
  })

  it('still turns the page on a sideways drag without a flow', async () => {
    const onPage = vi.fn()
    await drag(map({ onPage }), { x: 300, y: 300 }, { x: 180, y: 300 })
    expect(onPage).toHaveBeenCalledExactlyOnceWith('c')
  })
})
