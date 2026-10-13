import { packWorld, type WorldFrame } from './atlas.ts'
import { compactFrontier, compactStage } from './compact-stages.ts'
import { BIOME_IDS, STAGE_KINDS, STAGE_STATES } from './spec.ts'

export function compactStageFrames(): WorldFrame[] {
  const frames: WorldFrame[] = []
  for (const biome of BIOME_IDS) for (const kind of STAGE_KINDS) for (const state of STAGE_STATES) {
    frames.push({ id: `stage-compact/${biome}/${kind}-${state}`, w:32, h:32, group:'stage', biome, anchorY:28,
      img: compactStage(biome,kind,state) })
  }
  for (let pose=0; pose<2; pose++) frames.push({ id:`stage-compact/frontier-${pose}`, w:32,h:32,group:'stage',img:compactFrontier(pose) })
  return frames
}

export const compactStageAtlas = () => packWorld(compactStageFrames())
