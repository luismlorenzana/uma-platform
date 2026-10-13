import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { encodePng } from '../png.ts'
import { packWorld, worldFrames } from './atlas.ts'
import { checkWorldFrames } from './check.ts'
import { BIOME_IDS, STAGE_KINDS, STAGE_STATES } from './spec.ts'
import { stageBuilding, stageFrontier } from './stage-buildings.ts'

describe('four-tile stage destinations', () => {
  it.each(BIOME_IDS)('%s: native buildings, complete grayscale clears and deterministic bytes', (biome) => {
    const signatures = new Set<string>()
    for(const kind of STAGE_KINDS) for(const state of STAGE_STATES) {
      const image=stageBuilding(biome,kind,state)
      expect([image.w,image.h]).toEqual([64,64])
      expect(encodePng(64,64,image.px)).toEqual(encodePng(64,64,stageBuilding(biome,kind,state).px))
      signatures.add(createHash('sha256').update(image.px).digest('hex'))
      let gray=true,opaque=0
      for(let i=0;i<image.px.length;i+=4) if(image.px[i+3]) {
        if(image.px[i]!==image.px[i+1] || image.px[i+1]!==image.px[i+2]) gray=false
        if(image.px[i+3]===255) opaque++
      }
      expect(opaque).toBeGreaterThan(400); expect(gray).toBe(state==='cleared')
      expect(image.get(0,0)[3]).toBe(0)
    }
    expect(signatures.size).toBe(9)
  })
  it('appends 173 frames without changing any published 2.2 frame position or RGBA pixel', () => {
    const before=packWorld(worldFrames(BIOME_IDS,true,true)), frames=worldFrames(BIOME_IDS,true,true,true), after=packWorld(frames)
    expect(frames).toHaveLength(502); expect(checkWorldFrames(frames,BIOME_IDS,true,true,true)).toEqual([])
    for(const [id,f] of Object.entries(before.index)) {
      expect(after.index[id]).toEqual(f)
      expect(after.atlas.crop(f.x,f.y,f.w,f.h).px).toEqual(before.atlas.crop(f.x,f.y,f.w,f.h).px)
    }
    expect(frames.filter(f=>f.group==='stage' && f.biome)).toHaveLength(19*3*3)
    const hash=(biome: typeof BIOME_IDS[number])=>createHash('sha256').update(stageBuilding(biome,'fight','open').px).digest('hex')
    expect(new Set(BIOME_IDS.map(hash)).size).toBe(19)
    expect(stageFrontier(0).px).not.toEqual(stageFrontier(1).px)
  })
})
