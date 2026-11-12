import { describe, expect, it } from 'vitest'
import { canStep, gridOf, parseRoomDesign, parseTownDesign, reachable, socketTile, townGrid, type RoomDesign, type TownDesign } from './design.js'

// A room with a raised back (level 1) up a flight of stairs, a drop at the front left, and two sockets.
const ROOM: RoomDesign = {
  id: 'forest-hall-01', biome: 'forest',
  cells: [
    '###..###',
    '#......#',
    '#......#',
    '#..NN..#',
    '#......#',
    '#__....#',
    '###..###',
  ],
  heights: [
    '00011000',
    '01111110',
    '01111110',
    '00000000',
    '00000000',
    '00000000',
    '00000000',
  ],
  sockets: [{ side: 's', at: 3 }, { side: 'n', at: 3 }],
  spots: [{ kind: 'chest', x: 2, z: 1 }, { kind: 'entrance', x: 4, z: 5 }],
  tags: ['start'], weight: 5,
}

describe('room designs (Q5)', () => {
  it('parses a room with stairs, a drop and two sockets', () => expect(parseRoomDesign(structuredClone(ROOM))).toEqual(ROOM))

  it('climbs only by stairs, and never off their sides', () => {
    const g = gridOf(ROOM)
    expect(canStep(g, { x: 3, z: 4 }, 'n')).toBe(true) // onto the stairs' foot
    expect(canStep(g, { x: 3, z: 3 }, 'n')).toBe(true) // up to the raised floor
    expect(canStep(g, { x: 3, z: 2 }, 's')).toBe(true) // back down onto the stairs
    expect(canStep(g, { x: 2, z: 3 }, 'e')).toBe(false) // onto the stairs from their side
    expect(canStep(g, { x: 3, z: 3 }, 'e')).toBe(true) // across the two-wide flight
    expect(canStep(g, { x: 4, z: 3 }, 'e')).toBe(false) // off the flight's side
    expect(canStep(g, { x: 2, z: 2 }, 's')).toBe(false) // off the ledge without stairs
    expect(canStep(g, { x: 1, z: 4 }, 's')).toBe(false) // into the drop
  })

  it('reaches every walkable tile from a socket', () => {
    const g = gridOf(ROOM)
    const seen = reachable(g, socketTile(g, ROOM.sockets[0]!))
    expect(seen.has('3,0')).toBe(true)
    expect(seen.has('1,1')).toBe(true)
  })

  it('refuses a tile no socket reaches', () => {
    const walled = { ...ROOM, cells: ROOM.cells.map((r, z) => (z === 3 ? '#..##..#' : r)) }
    expect(() => parseRoomDesign(walled)).toThrow(/not reachable|stairs must climb/)
    const island = { ...ROOM, heights: ROOM.heights!.map((r, z) => (z === 3 ? '00000000' : r)), cells: ROOM.cells.map((r, z) => (z === 3 ? '#......#' : r)) }
    expect(() => parseRoomDesign(island)).toThrow('not reachable')
  })

  it('refuses stairs that climb nowhere, sockets on walls and spots off the floor', () => {
    expect(() => parseRoomDesign({ ...ROOM, heights: undefined })).toThrow('stairs must climb')
    expect(() => parseRoomDesign({ ...ROOM, sockets: [{ side: 'w', at: 3 }] })).toThrow('walkable edge tile')
    expect(() => parseRoomDesign({ ...ROOM, spots: [{ kind: 'chest', x: 0, z: 0 }] })).toThrow('reachable floor tile')
    expect(() => parseRoomDesign({ ...ROOM, spots: [{ kind: 'chest', x: 3, z: 3 }] })).toThrow('reachable floor tile')
  })

  it('refuses bad shapes and unknown keys', () => {
    expect(() => parseRoomDesign({ ...ROOM, cells: ['###', '#.#'] })).toThrow('at least 3 rows')
    expect(() => parseRoomDesign({ ...ROOM, cells: [...ROOM.cells.slice(0, 6), '##.###'] })).toThrow('one length')
    expect(() => parseRoomDesign({ ...ROOM, cells: Array.from({ length: 17 }, () => '#'.repeat(8)) })).toThrow('at most 16')
    expect(() => parseRoomDesign({ ...ROOM, colour: 'red' })).toThrow('unknown keys colour')
    expect(() => parseRoomDesign({ ...ROOM, tags: ['huge'] })).toThrow('room.tags[0]')
  })
})

const TOWN: TownDesign = {
  id: 'warrior-inner', region: 'warrior',
  cells: [
    '############',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#####..#####',
  ],
  buildings: [
    { id: 'inn', kind: 'inn', x: 1, z: 1, w: 3, d: 2, storeys: 2, door: 1 },
    { id: 'shop', kind: 'shop', x: 8, z: 1, w: 3, d: 2, storeys: 1, door: 1 },
  ],
  paths: [{ id: 'square', points: [{ x: 2, z: 4 }, { x: 9, z: 4 }], loop: true }],
  markers: [{ kind: 'spawn', x: 5, z: 5 }, { kind: 'inn', x: 2, z: 3 }, { kind: 'chapter', x: 6, z: 2 }, { kind: 'world-map', x: 5, z: 6 }],
}

describe('town designs (Q5)', () => {
  it('parses a town with buildings, a path and markers', () => expect(parseTownDesign(structuredClone(TOWN))).toEqual(TOWN))
  it('blocks walking where buildings stand', () => {
    const g = townGrid(TOWN)
    expect(g.walkable(2, 1)).toBe(false)
    expect(g.walkable(2, 3)).toBe(true)
  })
  it('needs a spawn, reachable doors, and buildings on clear floor', () => {
    expect(() => parseTownDesign({ ...TOWN, markers: TOWN.markers.filter((m) => m.kind !== 'spawn') })).toThrow('expected a spawn')
    expect(() => parseTownDesign({ ...TOWN, buildings: [{ ...TOWN.buildings[0]!, z: 4, d: 3 }] })).toThrow('level floor tiles')
    expect(() => parseTownDesign({ ...TOWN, buildings: [...TOWN.buildings, { ...TOWN.buildings[0]!, id: 'twin' }] })).toThrow('overlap')
    expect(() => parseTownDesign({ ...TOWN, markers: [...TOWN.markers, { kind: 'shop', x: 9, z: 1 }] })).toThrow('walkable tile')
    expect(() => parseTownDesign({ ...TOWN, paths: [{ id: 'p', points: [{ x: 2, z: 4 }], loop: false }] })).toThrow('at least two')
  })
})
