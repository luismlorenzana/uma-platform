// ST2's walkers (uma-farm F57's ask 9, FR10): grid path-finding by the step rule, keeping to the farm's paths.
import { describe, expect, it } from 'vitest'
import { farmGrid, gridOf } from '../formats/index.js'
import { farmGeometry } from './farm.js'
import { SAMPLE_FARM } from './farmSample.js'
import { farmStepCost, findPath, pathPoints } from './path.js'
import { standInFarmAtlas } from './standInFarm.js'

const world = farmGeometry(SAMPLE_FARM, standInFarmAtlas())
const gate = { x: 4, z: 24 }

describe('walkers (F57 ask 9)', () => {
  it('finds a shortest legal way, start and end included', () => {
    const g = gridOf({ cells: ['.....', '.###.', '.....'] })
    const path = findPath(g, { x: 0, z: 1 }, { x: 4, z: 1 })!
    expect(path[0]).toEqual({ x: 0, z: 1 })
    expect(path.at(-1)).toEqual({ x: 4, z: 1 })
    expect(path).toHaveLength(7)
    for (let i = 1; i < path.length; i++) expect(Math.abs(path[i]!.x - path[i - 1]!.x) + Math.abs(path[i]!.z - path[i - 1]!.z)).toBe(1)
  })

  it('climbs only by stairs, and answers null when there is no way', () => {
    const g = gridOf({ cells: ['...', '...', '...'], heights: ['111', '000', '000'] })
    expect(findPath(g, { x: 0, z: 2 }, { x: 0, z: 0 })).toBeNull()
    const s = gridOf({ cells: ['...', 'N..', '...'], heights: ['111', '000', '000'] })
    expect(findPath(s, { x: 0, z: 2 }, { x: 0, z: 0 })).toEqual([{ x: 0, z: 2 }, { x: 0, z: 1 }, { x: 0, z: 0 }])
  })

  it('walks a farm from the gate to a slot round buildings and blocking props', () => {
    const path = findPath(world.grid, gate, { x: 1, z: 6 }, farmStepCost(world.grid))!
    expect(path[0]).toEqual(gate)
    expect(path.at(-1)).toEqual({ x: 1, z: 6 })
    expect(path.every((t) => world.grid.walkable(t.x, t.z))).toBe(true)
    expect(findPath(world.grid, gate, { x: 1, z: 0 })).toBeNull()
  })

  it('keeps to the paths: round by the path rather than across the grass', () => {
    const g = farmGrid({ cells: ['ppppp', 'pgggp', 'pgggp'], buildings: [] })
    const path = findPath(g, { x: 0, z: 2 }, { x: 4, z: 2 }, farmStepCost(g))!
    expect(path).toHaveLength(9)
    expect(path.every((t) => g.ground(t.x, t.z) === 'path')).toBe(true)
    expect(findPath(g, { x: 0, z: 2 }, { x: 4, z: 2 })).toHaveLength(5)
  })

  it("heads for each tile's middle", () => expect(pathPoints([{ x: 2, z: 3 }])).toEqual([{ x: 2.5, z: 3.5 }]))

  it("is deterministic: the same way every time", () => {
    const g = farmGrid(SAMPLE_FARM, world.blocked)
    expect(findPath(g, gate, { x: 4, z: 2 }, farmStepCost(g))).toEqual(findPath(g, gate, { x: 4, z: 2 }, farmStepCost(g)))
  })
})
