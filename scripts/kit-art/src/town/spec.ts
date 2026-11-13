// A town kit's frames (uma-quest Q32): exactly `kit-town-warrior`'s 32, by name, size, role, foot and blocking, so a town
// design written for the Warrior kit takes any region's. Only the lantern's light colour is the region's. Pure.
import type { FrameSpec } from '../farm/spec.js'

const tile = (name: string, role: FrameSpec['role'], weight?: number): FrameSpec => ({ name, role, w: 128, h: 128, ...(weight ? { weight } : {}) })
const prop = (name: string, w: number, h: number, foot: [number, number]): FrameSpec => ({ name, role: 'prop', w, h, foot: { x: foot[0], y: foot[1] }, blocks: true })

export function townSpecs(lamp: { color: string; flicker: boolean }): FrameSpec[] {
  return [
    tile('floor-1', 'floor', 4), tile('floor-2', 'floor', 2), tile('floor-3', 'floor', 2), tile('floor-4', 'floor', 1),
    { name: 'wall-1', role: 'wall', w: 128, h: 256 }, { name: 'wall-2', role: 'wall', w: 128, h: 256 }, tile('wall-top', 'wall-top'),
    tile('riser-1', 'riser'), tile('riser-2', 'riser'), tile('stairs', 'stairs'),
    tile('building-wall-1', 'building-wall'), tile('building-wall-2', 'building-wall'), tile('building-wall-3', 'building-wall'),
    tile('window-1', 'window'), tile('window-2', 'window'), { name: 'door', role: 'door', w: 128, h: 256 }, tile('roof-1', 'roof'), tile('roof-2', 'roof'),
    { name: 'sign-inn', role: 'sign', w: 128, h: 112, foot: { x: 64, y: 100 } }, { name: 'sign-shop', role: 'sign', w: 128, h: 112, foot: { x: 64, y: 100 } },
    prop('tree-1', 352, 352, [172, 340]), prop('well', 224, 272, [107, 260]), prop('stall-1', 288, 256, [134, 244]), prop('stall-2', 288, 256, [139, 244]),
    prop('fence', 160, 144, [80, 132]), prop('barrel', 112, 144, [56, 132]), prop('crate', 128, 128, [55, 116]), prop('bench', 192, 128, [95, 116]),
    prop('flower-box', 176, 128, [88, 116]), prop('noticeboard', 160, 224, [80, 212]), prop('banner', 112, 256, [56, 244]),
    { ...prop('lantern', 96, 256, [49, 244]), light: { color: lamp.color, radius: 4, ...(lamp.flicker ? { flicker: true } : {}) } },
  ]
}
