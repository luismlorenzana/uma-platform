// Pure atlas assembly; builds and tests use the same frame list and packer, without importing a file-writing CLI.
import { Img } from '../tiles/image.ts'
import { biomeGround } from './ground.ts'
import { biomeIcon } from './icons.ts'
import { liquidTile } from './liquids.ts'
import { capital, flag, frontierRing, spring, stageMarker } from './markers.ts'
import { drawWorldProp, worldProp } from './props.ts'
import { roadTile } from './roads.ts'
import { worldFrameSpecs, type Biome, type FrameSpec, type Liquid, type Road, type StageKind, type StageState } from './spec.ts'

export interface WorldFrame extends FrameSpec { img: Img }
export interface AtlasFrame extends FrameSpec { x: number; y: number }

function drawFrame(spec: FrameSpec): Img {
  const name = spec.id.split('/').at(-1)!
  if (spec.group === 'ground') return biomeGround(spec.biome!, Number(name.at(-1)))
  if (spec.group === 'prop') return drawWorldProp(worldProp(name))
  if (spec.group === 'icon') return biomeIcon(spec.biome!)
  const dash = name.lastIndexOf('-'), kind = name.slice(0, dash), suffix = name.slice(dash + 1)
  if (spec.group === 'liquid') return liquidTile(kind as Liquid, Number(suffix))
  if (spec.group === 'road') return roadTile(kind as Road, Number(suffix))
  if (name.startsWith('frontier-')) return frontierRing(Number(suffix))
  if (name === 'spring' || name === 'spring-dry') return spring(name.endsWith('-dry'))
  if (name === 'flag' || name === 'flag-cleared') return flag(name.endsWith('-cleared'))
  if (name === 'capital') return capital()
  return stageMarker(kind as StageKind, suffix as StageState)
}

export function worldFrames(biomes?: readonly Biome[]): WorldFrame[] {
  return worldFrameSpecs(biomes).map((spec) => ({ ...spec, img: drawFrame(spec) }))
}

/** 16 px-aligned shelves; variable-size frames retain native pixels and never overlap a tall neighbour. */
export function packWorld(frames: readonly WorldFrame[]): { atlas: Img; index: Record<string, Omit<AtlasFrame, 'id'>> } {
  const width = 256, placed: { frame: WorldFrame; x: number; y: number }[] = []
  let x = 0, y = 0, rowHeight = 0
  for (const frame of frames) {
    if (x + frame.w > width) { x = 0; y += rowHeight; rowHeight = 0 }
    placed.push({ frame, x, y })
    x += frame.w; rowHeight = Math.max(rowHeight, frame.h)
  }
  const atlas = new Img(width, y + rowHeight), index: Record<string, Omit<AtlasFrame, 'id'>> = {}
  for (const { frame: { id, img, ...spec }, x: px, y: py } of placed) {
    atlas.copy(img, px, py); index[id] = { x: px, y: py, ...spec }
  }
  return { atlas, index }
}
