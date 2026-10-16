import { Sprite } from '../sprite.ts'
import { laurelMark } from '../laurel.ts'
import { Img } from '../tiles/image.ts'
import { classEmblem } from './classes.ts'
import { statusBadge } from './statuses.ts'
import { currencyMark, tierCrest } from './racer.ts'
import { CLASSES, CURRENCIES, FRAME_SPECS, STATUSES, TIERS, type FrameSpec } from './spec.ts'

export type UiFrame = FrameSpec & { img: Img }
export interface FrameIndex { x: number; y: number; w: number; h: number; group: FrameSpec['group']; key: string }

export function drawUi(spec: FrameSpec): Img {
  const s = new Sprite(spec.w, spec.h)
  let cutout: ReturnType<typeof currencyMark>
  if (spec.group === 'class') classEmblem(s, spec.key)
  else if (spec.group === 'status') statusBadge(s, spec.key)
  else if (spec.group === 'currency') {
    if (spec.key === 'laurel') laurelMark(s)
    else cutout = currencyMark(s, spec.key)
  }
  else tierCrest(s, spec.key)
  const img = new Img(spec.w, spec.h, s.render())
  cutout?.each((x, y) => img.set(x, y, [0, 0, 0, 0]))
  return img
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
  // Append below H11's 120×36 cutout. Never repack the published class/status rows.
  const atlas = new Img(120, 52), index: Record<string, FrameIndex> = {}
  for (const { id, group, key, w, h, img } of frames) {
    const x = group === 'class' ? CLASSES.indexOf(key as typeof CLASSES[number]) * 24
      : group === 'status' ? STATUSES.indexOf(key as typeof STATUSES[number]) * 12
      : group === 'currency' ? key === 'laurel' ? 84 : CURRENCIES.indexOf(key as typeof CURRENCIES[number]) * 16
      : 48 + TIERS.indexOf(key as typeof TIERS[number]) * 12
    const y = group === 'class' ? 0 : group === 'status' ? 24 : 36
    atlas.copy(img, x, y); index[id] = { x, y, w, h, group, key }
  }
  return { atlas, index }
}
