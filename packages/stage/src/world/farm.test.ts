// ST2's farm builder (uma-farm F57's asks 5 and 6, KF3, KF4): ground by family, risers by what lies below, buildings from
// their sets with one- or two-column doors, and mounted pieces placed by the design.
import { describe, expect, it } from 'vitest'
import type { FarmDesign } from '../formats/index.js'
import { doorFrame, farmGeometry, farmProblems, roofShape } from './farm.js'
import { SAMPLE_FARM } from './farmSample.js'
import type { Face } from './geometry.js'
import { standInKitAtlas } from './standInKit.js'

const kit = standInKitAtlas('farm')
const world = farmGeometry(SAMPLE_FARM, kit)
const isFront = (f: Face) => f.corners.every((c) => c.z === f.corners[0]!.z)
const facesAt = (fz: number, x0: number, x1: number) => world.faces.filter((f) => isFront(f) && f.corners[0]!.z === fz && f.corners[0]!.x >= x0 && f.corners[1]!.x <= x1)
const sample = (): FarmDesign => structuredClone(SAMPLE_FARM)

describe('the farm builder (F57 asks 5, 6)', () => {
  it('builds the sample with nothing missing', () => {
    expect(farmProblems(SAMPLE_FARM, kit)).toEqual([])
    expect(world.buildings.map((b) => b.id)).toEqual(['mill', 'sawmill', 'barn', 'smokehouse', 'warehouse', 'dorm', 'farmhouse', 'house-1', 'house-2', 'shop'])
  })

  it('tops each tile from its ground family, the pond a level down', () => {
    const tops = world.faces.filter((f) => f.corners.every((c) => c.y === f.corners[0]!.y))
    const at = (x: number, z: number) => tops.find((f) => f.corners[3]!.x === x && f.corners[3]!.z === z)!
    expect(at(0, 0).frame).toMatch(/^tilled-\d$/)
    expect(at(4, 3).frame).toMatch(/^path-\d$/)
    expect(at(1, 8).frame).toMatch(/^water-\d$/)
    expect(at(1, 8).corners[0]!.y).toBe(0)
    expect(at(4, 12).frame).toMatch(/^paving-\d$/)
  })

  it('banks the pond with riser-bank, and edges a drop elsewhere with a grassy lip', () => {
    const bank = world.faces.filter((f) => isFront(f) && f.corners[0]!.z === 8 && f.corners[0]!.x < 3)
    expect(bank.length).toBe(3)
    expect(bank.every((f) => f.frame === 'riser-bank')).toBe(true)
    const front = world.faces.filter((f) => isFront(f) && f.corners[0]!.z === 25)
    expect(front.every((f) => f.frame.startsWith('riser-grass'))).toBe(true)
  })

  it('makes a building from its sets: plank walls and windows, a red roof', () => {
    const barn = facesAt(6, 6, 9)
    const walls = barn.filter((f) => !f.frame.startsWith('door'))
    expect(walls.length).toBe(1 * 2 + 3 * 2)
    expect(walls.every((f) => /^(building-wall|window)-plank-\d$/.test(f.frame))).toBe(true)
    const roofs = world.faces.filter((f) => f.frame.startsWith('roof') && f.corners[0]!.x >= 6 && f.corners[0]!.z === 6)
    expect(roofs.length).toBe(3)
    expect(roofs.every((f) => /^roof-red-\d$/.test(f.frame))).toBe(true)
    const mill = facesAt(2, 3, 5)
    expect(mill.every((f) => /plaster/.test(f.frame))).toBe(true)
  })

  it('hangs a two-column door across both columns, two levels tall', () => {
    const door = facesAt(6, 6, 9).filter((f) => f.frame.startsWith('door'))
    expect(door).toHaveLength(1)
    expect(door[0]!.frame).toBe('door-wide-plank')
    expect([door[0]!.corners[0]!.x, door[0]!.corners[1]!.x]).toEqual([6, 8])
    expect([door[0]!.corners[0]!.y, door[0]!.corners[2]!.y]).toEqual([1, 3])
  })

  it("picks the set's own door, or the one a design names", () => {
    expect(doorFrame(kit, { walls: 'plaster', door: { column: 0 }, x: 0, z: 0 })).toBe('door-plaster')
    expect(doorFrame(kit, { walls: 'plaster', door: { column: 0, frame: 'door-shop' }, x: 0, z: 0 })).toBe('door-shop')
    expect(doorFrame(kit, { walls: 'plaster', door: { column: 0, wide: true }, x: 0, z: 0 })).toBeNull()
    expect(doorFrame(kit, { walls: 'plank', door: null, x: 0, z: 0 })).toBeNull()
  })

  it('mounts pieces on a front at a level and column, and on a roof up its slope', () => {
    const owned = world.props.filter((p) => p.owner)
    const sails = owned.find((p) => p.frame === 'mill-sails')!
    expect(sails).toMatchObject({ owner: 'mill', blocks: false })
    expect(sails.foot.x).toBe(4.5)
    expect(sails.foot.y).toBe(3)
    expect(sails.foot.z).toBeCloseTo(2.03)
    const chimney = owned.find((p) => p.owner === 'barn')!
    const { run, rise } = roofShape(2)
    expect(chimney.foot.x).toBe(8.5)
    expect(chimney.foot.y).toBeCloseTo(1 + 4 + rise)
    expect(chimney.foot.z).toBeCloseTo(6 - run + 0.03)
    expect(owned.filter((p) => p.owner === 'dorm').map((p) => [p.frame, p.foot.x, p.foot.y])).toEqual([['flower-box', 6.5, 2], ['flower-box', 8.5, 2]])
  })

  it('places props, blocking where they block, and casts their light', () => {
    expect(world.blocked.has('1,0')).toBe(true)
    expect(world.blocked.has('4,24')).toBe(false)
    expect(world.lights).toHaveLength(2)
    expect(world.grid.walkable(1, 0)).toBe(false)
  })

  it('names what a kit lacks for a design, and slots a prop cuts off', () => {
    const d = sample()
    d.buildings[0] = { ...d.buildings[0]!, walls: 'stone-blue', door: { column: 0, wide: true } }
    d.buildings[1]!.mounts.push({ name: 'weathervane', face: 'roof', column: 0, level: 1 })
    d.props!.push({ name: 'barrel', x: 1, z: 2 })
    expect(farmProblems(d, kit)).toEqual([
      'mill: no building-wall in the stone-blue set', 'mill: no window in the stone-blue set', 'mill: no 256-wide door in the stone-blue set',
      'sawmill: no sign or prop frame weathervane to mount', 'the slot fields-1 is under a blocking prop',
    ])
  })
})
