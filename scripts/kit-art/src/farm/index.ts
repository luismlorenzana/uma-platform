// kit-farm's frames (P147; uma-farm F9): every wave-1 name drawn by code, checked against its spec. Pure.
import type { Canvas } from '../paint.js'
import { BUILDING_DRAWERS } from './buildings.js'
import { CROP_DRAWERS } from './crops.js'
import { forestFloor, grass, path, paving, riserBank, riserGrass, tilled, water } from './ground.js'
import { PROP_DRAWERS } from './props.js'
import { WAVE_1, type FrameSpec } from './spec.js'

const GROUND_DRAWERS: Readonly<Record<string, () => Canvas>> = {
  ...Object.fromEntries([1, 2, 3, 4].map((v) => [`grass-${v}`, () => grass(v)])),
  'path-1': () => path(1), 'path-2': () => path(2), 'tilled-1': () => tilled(1), 'tilled-2': () => tilled(2),
  'forest-floor-1': () => forestFloor(1), 'forest-floor-2': () => forestFloor(2), 'water-1': () => water(1), 'water-2': () => water(2),
  'paving-1': () => paving(1), 'paving-2': () => paving(2),
  'riser-grass-1': () => riserGrass(1), 'riser-grass-2': () => riserGrass(2), 'riser-bank': riserBank,
}
export const DRAWERS: Readonly<Record<string, () => Canvas>> = { ...GROUND_DRAWERS, ...BUILDING_DRAWERS, ...PROP_DRAWERS, ...CROP_DRAWERS }

export interface DrawnFrame { spec: FrameSpec; canvas: Canvas }
/** Draws every frame of a wave, refusing one whose drawing doesn't match its spec's size. */
export function drawWave(specs: readonly FrameSpec[] = WAVE_1): DrawnFrame[] {
  return specs.map((spec) => {
    const draw = DRAWERS[spec.name]
    if (!draw) throw new Error(`no drawing for ${spec.name}`)
    const canvas = draw()
    if (canvas.w !== spec.w || canvas.h !== spec.h) throw new Error(`${spec.name} is ${canvas.w} × ${canvas.h}, not ${spec.w} × ${spec.h}`)
    return { spec, canvas }
  })
}
