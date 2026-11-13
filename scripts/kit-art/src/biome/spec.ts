// A biome kit's frames (uma-quest Q33): the forest kit's roles, sizes and feet for every piece a dungeon and its fights
// need, and each biome's five decorations by the names Q24's stand-ins scatter. Pure.
import type { FrameSpec } from '../farm/spec.js'

const tile = (name: string, role: FrameSpec['role'], weight?: number): FrameSpec => ({ name, role, w: 128, h: 128, ...(weight ? { weight } : {}) })
const prop = (name: string, w: number, h: number, foot: [number, number], blocks: boolean, light?: FrameSpec['light']): FrameSpec =>
  ({ name, role: 'prop', w, h, foot: { x: foot[0], y: foot[1] }, blocks, ...(light ? { light } : {}) })

export type BiomeId = 'meadow' | 'ruins' | 'marsh' | 'coast'
/** Every biome's decorations (Q33's table), with sizes at the forest kit's density. */
export const DECORATIONS: Readonly<Record<BiomeId, FrameSpec[]>> = {
  meadow: [prop('flowers', 128, 80, [64, 68], false), prop('grass', 96, 80, [48, 68], false), prop('bush-1', 160, 128, [80, 116], true),
    prop('rock-1', 96, 96, [48, 84], true), prop('fence', 160, 144, [80, 132], true)],
  ruins: [prop('pillar-broken', 128, 256, [64, 244], true), prop('rubble', 160, 96, [80, 84], true), prop('urn', 96, 128, [48, 116], true),
    prop('bookcase', 160, 224, [80, 212], true), prop('grass', 96, 80, [48, 68], false)],
  marsh: [prop('reeds', 128, 160, [64, 148], false), prop('stump', 128, 128, [64, 116], true), prop('lily', 128, 64, [64, 52], false),
    prop('log', 224, 112, [112, 100], true), prop('mushrooms', 96, 96, [48, 84], false)],
  coast: [prop('rock-1', 96, 96, [48, 84], true), prop('rock-2', 128, 112, [64, 100], true), prop('shell', 64, 48, [32, 36], false),
    prop('driftwood', 224, 96, [112, 84], true), prop('seaweed', 96, 80, [48, 68], false)],
}

export function biomeSpecs(id: BiomeId): FrameSpec[] {
  return [
    tile('floor-1', 'floor', 4), tile('floor-2', 'floor', 2), tile('floor-3', 'floor', 2), tile('floor-4', 'floor', 1),
    { name: 'wall-1', role: 'wall', w: 128, h: 256 }, { name: 'wall-2', role: 'wall', w: 128, h: 256 }, { name: 'wall-3', role: 'wall', w: 128, h: 256 },
    tile('wall-top', 'wall-top'), tile('riser-1', 'riser'), tile('riser-2', 'riser'), tile('stairs', 'stairs'), tile('void', 'void'),
    prop('chest-closed', 128, 112, [64, 100], true), prop('chest-open', 128, 144, [64, 132], true),
    prop('spring', 192, 144, [91, 132], false, { color: '#81ceff', radius: 3 }), prop('waystone', 112, 224, [54, 212], true, { color: '#b7e0c5', radius: 3 }),
    prop('stairs-down', 192, 160, [95, 148], false), prop('stairs-up', 192, 192, [93, 180], false),
    prop('lantern', 80, 224, [27, 212], true, { color: '#ffc46b', radius: 4, flicker: true }),
    { name: 'battle-ground', role: 'battle-ground', w: 1024, h: 256 }, { name: 'battle-back', role: 'battle-back', w: 2048, h: 512 },
    { name: 'battle-mid-1', role: 'battle-mid', w: 320, h: 352, foot: { x: 151, y: 340 } }, { name: 'battle-mid-2', role: 'battle-mid', w: 256, h: 160, foot: { x: 137, y: 148 } },
    { name: 'battle-mid-3', role: 'battle-mid', w: 288, h: 224, foot: { x: 44, y: 212 } },
    ...DECORATIONS[id],
  ]
}
