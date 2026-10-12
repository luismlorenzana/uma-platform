import { Sprite } from '../sprite.ts'
import { Img } from '../tiles/image.ts'
import { classEmblem } from './classes.ts'
import { statusBadge } from './statuses.ts'
import { CLASSES, FRAME_SPECS, STATUSES, type FrameSpec } from './spec.ts'

export type UiFrame = FrameSpec & { img: Img }
export interface FrameIndex { x: number; y: number; w: number; h: number; group: 'class' | 'status'; key: string }

export function drawUi(spec: FrameSpec): Img {
  const s = new Sprite(spec.w, spec.h)
  if (spec.group === 'class') classEmblem(s, spec.key)
  else statusBadge(s, spec.key)
  return new Img(spec.w, spec.h, s.render())
}
export const uiFrames = (): UiFrame[] => FRAME_SPECS.map((spec) => ({ ...spec, img: drawUi(spec) }))

export function checkUi(frames: readonly UiFrame[]): string[] {
  const expected = new Map(FRAME_SPECS.map((s) => [s.id, s])), seen = new Set<string>(), bad: string[] = []
  for (const frame of frames) {
    const spec = expected.get(frame.id)
    if (!spec) bad.push(`Unexpected ui frame ${frame.id}`)
    if (seen.has(frame.id)) bad.push(`Duplicate ui frame ${frame.id}`)
    seen.add(frame.id)
    if (frame.w !== spec?.w || frame.h !== spec.h || frame.img.w !== frame.w || frame.img.h !== frame.h) bad.push(`${frame.id}: wrong native size`)
    if (frame.group !== spec?.group || frame.key !== spec.key) bad.push(`${frame.id}: wrong group/key`)
    if (!frame.img.px.some((v, i) => i % 4 === 3 && v === 255)) bad.push(`${frame.id}: empty icon`)
  }
  for (const id of expected.keys()) if (!seen.has(id)) bad.push(`Missing ui frame ${id}`)
  return bad
}

export function packUi(frames: readonly UiFrame[]): { atlas: Img; index: Record<string, FrameIndex> } {
  const atlas = new Img(120, 36), index: Record<string, FrameIndex> = {}
  for (const { id, group, key, w, h, img } of frames) {
    const x = group === 'class' ? CLASSES.indexOf(key as typeof CLASSES[number]) * 24 : STATUSES.indexOf(key as typeof STATUSES[number]) * 12
    const y = group === 'class' ? 0 : 24
    atlas.copy(img, x, y); index[id] = { x, y, w, h, group, key }
  }
  return { atlas, index }
}
