import { Sprite } from '../sprite.ts'
import { Img } from '../tiles/image.ts'
import { familiar } from './familiars.ts'
import { hit } from './hits.ts'
import { CELL, FRAME_SPECS, KINDS, type FrameSpec } from './spec.ts'

export interface FxFrame extends FrameSpec { img: Img }
export interface FrameIndex extends FrameSpec { x: number; y: number; anchorX: 16; anchorY: 16 }

export function drawFx(spec: FrameSpec): Img {
  const s = new Sprite(CELL, CELL)
  if (spec.group === 'hit') hit(s, spec.kind, spec.frame)
  else familiar(s, spec.kind, spec.frame)
  return new Img(CELL, CELL, s.render())
}

export const fxFrames = (): FxFrame[] => FRAME_SPECS.map((spec) => ({ ...spec, img: drawFx(spec) }))

export function checkFx(frames: readonly FxFrame[]): string[] {
  const wanted = new Map(FRAME_SPECS.map((s) => [s.id, s])), seen = new Set<string>(), bad: string[] = []
  for (const f of frames) {
    const want = wanted.get(f.id)
    if (!want) bad.push(`Unexpected fx frame ${f.id}`)
    if (seen.has(f.id)) bad.push(`Duplicate fx frame ${f.id}`)
    seen.add(f.id)
    if (f.w !== CELL || f.h !== CELL || f.img.w !== CELL || f.img.h !== CELL || f.img.px.length !== CELL * CELL * 4) bad.push(`${f.id}: expected 32×32`)
    if (f.kind !== want?.kind || f.group !== want.group || f.frame !== want.frame) bad.push(`${f.id}: wrong metadata`)
    let opaque = 0
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      if (f.img.get(x, y)[3] !== 255) continue
      opaque++
      if (x === 0 || y === 0 || x === CELL - 1 || y === CELL - 1) bad.push(`${f.id}: clipped object/outline at ${x},${y}`)
    }
    if (opaque < 10) bad.push(`${f.id}: empty or unreadable pose`)
  }
  for (const id of wanted.keys()) if (!seen.has(id)) bad.push(`Missing fx frame ${id}`)
  return bad
}

/** One row per kind: four impacts, then two familiars. Consumers use frame ids, not hard-coded row numbers. */
export function packFx(frames: readonly FxFrame[]): { atlas: Img; index: Record<string, Omit<FrameIndex, 'id'>> } {
  const atlas = new Img(CELL * 6, CELL * KINDS.length), index: Record<string, Omit<FrameIndex, 'id'>> = {}
  for (const { id, img, ...spec } of frames) {
    const x = (spec.group === 'hit' ? spec.frame : 4 + spec.frame) * CELL, y = KINDS.indexOf(spec.kind) * CELL
    atlas.copy(img, x, y); index[id] = { x, y, ...spec, anchorX: 16, anchorY: 16 }
  }
  return { atlas, index }
}
