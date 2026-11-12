import { kitMissing, parseKitAtlas, parseRoomDesign, parseTownDesign, type RoomDesign } from '../formats/index.js'
import { describe, expect, it } from 'vitest'
import { TEST_ROOM, TEST_TOWN } from './designs.js'
import { roomGeometry, townGeometry, type Face } from './geometry.js'
import { standInKitAtlas } from './standInKit.js'

const biome = standInKitAtlas('biome'), town = standInKitAtlas('town')
const isTop = (f: Face) => f.corners.every((c) => c.y === f.corners[0]!.y)
const isFront = (f: Face) => f.corners.every((c) => c.z === f.corners[0]!.z)
const tiny = (cells: string[], heights?: string[]): RoomDesign => ({ id: 'tiny', biome: 'forest', cells, ...(heights ? { heights } : {}), sockets: [{ side: 's', at: 1 }], spots: [], tags: [], weight: 1 })

describe('the stand-in kits (Q5)', () => {
  it('are complete kits by the spec, and parse', () => {
    expect(kitMissing(biome)).toEqual([])
    expect(kitMissing(town)).toEqual([])
    expect(parseKitAtlas(structuredClone(biome))).toEqual(biome)
    expect(parseKitAtlas(structuredClone(town))).toEqual(town)
  })
})

describe('the test scenes', () => {
  it('are valid designs', () => {
    expect(parseRoomDesign(structuredClone(TEST_ROOM))).toEqual(TEST_ROOM)
    expect(parseTownDesign(structuredClone(TEST_TOWN))).toEqual(TEST_TOWN)
  })
})

describe('room geometry (DN28)', () => {
  it('builds only tops and south faces: the camera never sees the rest', () => {
    const g = roomGeometry(TEST_ROOM, biome)
    expect(g.faces.every((f) => isTop(f) || isFront(f))).toBe(true)
    expect(g.faces.length).toBeGreaterThan(100)
  })

  it('tops every floor and wall once, a wall two levels above its floor', () => {
    const g = roomGeometry(tiny(['###', '#.#', '#.#']), biome)
    const tops = g.faces.filter(isTop)
    expect(tops).toHaveLength(9)
    expect(tops.filter((f) => f.frame === 'wall-top').every((f) => f.corners[0]!.y === 2)).toBe(true)
    expect(tops.filter((f) => f.frame.startsWith('floor')).every((f) => f.corners[0]!.y === 0)).toBe(true)
  })

  it("faces south only where the tile in front is lower: the wall behind a floor, the room's front edge", () => {
    const g = roomGeometry(tiny(['###', '#.#', '#.#']), biome)
    const fronts = g.faces.filter(isFront)
    // The back wall's middle shows its face over the floor (2 levels); the front row's three tiles show a lip to the drop.
    const wallFaces = fronts.filter((f) => f.frame.startsWith('wall-'))
    expect(wallFaces.some((f) => f.corners[0]!.z === 1 && f.corners[0]!.x === 1 && f.corners[0]!.y === 0 && f.corners[2]!.y === 2)).toBe(true)
    expect(fronts.filter((f) => f.corners[0]!.z === 3).length).toBeGreaterThanOrEqual(3)
    expect(fronts.every((f) => f.corners[2]!.y > f.corners[0]!.y)).toBe(true)
  })

  it('builds stairs as four steps with their risers, climbing a level', () => {
    const g = roomGeometry(tiny(['#.#', '#N#', '#.#'], ['010', '000', '000']), biome)
    const steps = g.faces.filter((f) => f.frame === 'stairs')
    expect(steps).toHaveLength(4)
    expect(steps.map((f) => f.corners[0]!.y)).toEqual([0.25, 0.5, 0.75, 1])
    expect(g.faces.filter((f) => isFront(f) && f.frame.startsWith('riser') && f.corners[0]!.x === 1 && f.corners[0]!.z > 1 && f.corners[0]!.z < 2)).toHaveLength(3)
  })

  it('puts a riser under a raised floor, cut to the levels it shows', () => {
    // Two raised tiles (level 1) with a level-0 floor in front: one riser, from 0 up to 1, on the raised tile's south face.
    const g = roomGeometry(tiny(['#.#', '#.#', '#.#'], ['010', '010', '000']), biome)
    const raised = g.faces.filter((f) => isFront(f) && f.corners[0]!.z === 2 && f.corners[0]!.x === 1)
    expect(raised.map((f) => [f.frame.startsWith('riser'), f.corners[0]!.y, f.corners[2]!.y])).toEqual([[true, 0, 1]])
    // Over stairs that climb to it, no riser.
    const stairs = roomGeometry(tiny(['#.#', '#N#', '#.#'], ['010', '000', '000']), biome)
    expect(stairs.faces.filter((f) => isFront(f) && f.corners[0]!.z === 1 && f.corners[0]!.x === 1)).toEqual([])
  })

  it("draws a drop as nothing, or the kit's void below", () => {
    const g = roomGeometry(tiny(['###', '#_#', '#.#']), biome)
    expect(g.faces.filter((f) => f.frame === 'void')).toHaveLength(1)
    expect(g.faces.find((f) => f.frame === 'void')!.corners[0]!.y).toBe(-1)
  })

  it('stands the dungeon pieces on their spots, with their lights, and blocks where they block', () => {
    const g = roomGeometry(TEST_ROOM, biome)
    const frames = g.props.map((p) => p.frame)
    for (const piece of ['spring', 'waystone', 'chest-closed', 'stairs-down', 'stairs-up']) expect(frames).toContain(piece)
    expect(g.props.find((p) => p.frame === 'spring')!.foot).toEqual({ x: 3.5, y: 1, z: 2.5 })
    expect(g.lights.length).toBeGreaterThanOrEqual(2)
    expect(g.blocked.has('3,2')).toBe(true)
    expect(g.blocked.has('6,1')).toBe(false) // the stairs down are walked onto
    expect(frames).not.toContain('boss')
  })

  it('builds the same room the same way every time', () => expect(roomGeometry(TEST_ROOM, biome)).toEqual(roomGeometry(TEST_ROOM, biome)))
})

describe('town geometry', () => {
  it('builds buildings from modules: a door, walls and windows a level each, a roof, a sign', () => {
    const g = townGeometry(TEST_TOWN, town)
    const inn = TEST_TOWN.buildings[0]!
    const front = g.faces.filter((f) => isFront(f) && f.corners[0]!.z === inn.z + inn.d && f.corners[0]!.x >= inn.x && f.corners[0]!.x < inn.x + inn.w)
    expect(front.filter((f) => f.frame === 'door')).toHaveLength(1)
    // A wall and a window a storey a column, but the door's column downstairs: 4 + 5.
    expect(front.filter((f) => f.frame.startsWith('building-wall')).length).toBe(9)
    expect(front.filter((f) => f.frame.startsWith('window')).length).toBe(9)
    expect(g.faces.filter((f) => f.frame.startsWith('roof') && !isTop(f)).length).toBe(TEST_TOWN.buildings.reduce((n, b) => n + b.w, 0))
    expect(g.faces.some((f) => f.frame === 'sign-inn')).toBe(true)
    expect(g.faces.some((f) => f.frame === 'sign-shop')).toBe(true)
  })
  it('blocks the buildings and the props that block', () => {
    const g = townGeometry(TEST_TOWN, town)
    expect(g.blocked.has('3,3')).toBe(true)
    expect(g.blocked.has('7,10')).toBe(true) // the well
    expect(g.blocked.has('8,6')).toBe(false) // flowers
    expect(g.lights.length).toBe(3)
  })
})

describe('front walls cut away (D18)', () => {
  // A room with a pillar, its south wall row, and a corridor leaving through it flanked by walls.
  const room = tiny(['#####', '#...#', '#.#.#', '#...#', '##.##', '_#.#_'])
  const g = roomGeometry(room, biome)
  const topAt = (x: number, z: number) => g.faces.find((f) => isTop(f) && f.corners[0]!.x === x && f.corners[2]!.z === z)?.corners[0]!.y
  it('cuts a south-edge wall down to a kerb, and the corridor flanks behind it', () => {
    expect(topAt(1, 4)).toBe(0.25)
    expect(topAt(3, 4)).toBe(0.25)
    expect(topAt(1, 5)).toBe(0.25)
    expect(topAt(3, 5)).toBe(0.25)
  })
  it('keeps back walls, side walls and pillars full height', () => {
    expect(topAt(2, 0)).toBe(2)
    expect(topAt(0, 2)).toBe(2)
    expect(topAt(2, 2)).toBe(2)
  })
})
