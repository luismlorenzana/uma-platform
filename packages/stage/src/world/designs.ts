// The stage's two scenes for Q4–Q6 (Q5): a test room in the room-design format the dungeon generator reads (Q10), and a
// small test town in the town format (Q12 builds the real one). Both are parsed by the domain's own parsers in tests.
import type { RoomDesign, TownDesign } from '../formats/index.js'

/** A forest hall: a raised back (level 1) up a flight of stairs, a drop at the front left, pillars, and every dungeon spot. */
export const TEST_ROOM: RoomDesign = {
  id: 'test-hall', biome: 'forest',
  cells: [
    '##############',
    '#............#',
    '#............#',
    '#............#',
    '#.....NN.....#',
    '#............#',
    '#..#......#..#',
    '#............#',
    '#__..........#',
    '#__..........#',
    '######..######',
  ],
  heights: [
    '00000000000000',
    '01111111111110',
    '01111111111110',
    '01111111111110',
    '00000000000000',
    '00000000000000',
    '00000000000000',
    '00000000000000',
    '00000000000000',
    '00000000000000',
    '00000000000000',
  ],
  sockets: [{ side: 's', at: 6 }],
  spots: [
    { kind: 'spring', x: 3, z: 2 }, { kind: 'waystone', x: 10, z: 2 }, { kind: 'chest', x: 12, z: 1 }, { kind: 'exit-down', x: 6, z: 1 },
    { kind: 'entrance', x: 7, z: 9 }, { kind: 'prop', x: 1, z: 5 }, { kind: 'prop', x: 12, z: 5 }, { kind: 'prop', x: 4, z: 8 },
    { kind: 'prop', x: 11, z: 8 }, { kind: 'prop', x: 1, z: 2 }, { kind: 'prop', x: 8, z: 7 }, { kind: 'boss', x: 8, z: 2 },
  ],
  tags: ['rest'], weight: 1,
}

/** A corner of the Warrior region's inner town: an inn, a shop and a house, a square with a well, and a terrace. */
export const TEST_TOWN: TownDesign = {
  id: 'test-town', region: 'warrior',
  cells: [
    '######################',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '#.........NN.........#',
    '#....................#',
    '#....................#',
    '#....................#',
    '#....................#',
    '##########..##########',
  ],
  heights: [
    '0000000000000000000000',
    '0111111111111111111110',
    '0111111111111111111110',
    '0111111111111111111110',
    '0111111111111111111110',
    '0111111111111111111110',
    '0111111111111111111110',
    '0111111111111111111110',
    '0000000000000000000000',
    '0000000000000000000000',
    '0000000000000000000000',
    '0000000000000000000000',
    '0000000000000000000000',
    '0000000000000000000000',
  ],
  buildings: [
    { id: 'inn', kind: 'inn', x: 2, z: 2, w: 5, d: 4, storeys: 2, door: 2 },
    { id: 'house', kind: 'house', x: 9, z: 2, w: 3, d: 3, storeys: 1, door: 1 },
    { id: 'shop', kind: 'shop', x: 14, z: 2, w: 4, d: 3, storeys: 1, door: 1 },
  ],
  paths: [
    { id: 'square', points: [{ x: 3, z: 10 }, { x: 18, z: 10 }, { x: 18, z: 12 }, { x: 3, z: 12 }], loop: true },
    { id: 'terrace', points: [{ x: 2, z: 7 }, { x: 19, z: 7 }], loop: true },
  ],
  markers: [
    { kind: 'spawn', x: 10, z: 12 }, { kind: 'inn', x: 4, z: 6 }, { kind: 'shop', x: 15, z: 5 }, { kind: 'chapter', x: 13, z: 7 },
    { kind: 'world-map', x: 11, z: 13 },
  ],
  props: [
    { name: 'well', x: 7, z: 10 }, { name: 'lantern', x: 8, z: 8 }, { name: 'lantern', x: 13, z: 8 }, { name: 'stall', x: 15, z: 10 },
    { name: 'barrel', x: 19, z: 3 }, { name: 'tree-1', x: 1, z: 11 }, { name: 'tree-1', x: 20, z: 11 }, { name: 'flowers', x: 8, z: 6 },
    { name: 'fence', x: 20, z: 6 }, { name: 'lantern', x: 7, z: 6 },
  ],
}

/** Auto-walk's loops for a measured play: round each scene, up its stairs and back down. */
export const TEST_ROOM_LOOP = [
  { x: 5.5, z: 9.5 }, { x: 9.5, z: 9.5 }, { x: 9.5, z: 5.5 }, { x: 7.3, z: 5.5 }, { x: 7.3, z: 2.5 }, { x: 6.6, z: 2.5 }, { x: 6.6, z: 5.5 },
  { x: 5.5, z: 5.5 },
] as const
export const TEST_TOWN_LOOP = [
  { x: 10.5, z: 12.5 }, { x: 18.5, z: 12.5 }, { x: 18.5, z: 9.5 }, { x: 11.6, z: 9.5 }, { x: 11.6, z: 7.5 }, { x: 2.5, z: 7.5 }, { x: 10.4, z: 7.5 },
  { x: 10.4, z: 9.5 },
] as const
