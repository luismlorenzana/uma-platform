import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { encodePng } from '../png.ts'
import { compactStageAtlas, compactStageFrames } from './compact-atlas.ts'
import { compactStage } from './compact-stages.ts'
import { BIOME_IDS, STAGE_KINDS, STAGE_STATES } from './spec.ts'

function pngRows(png: Buffer): Buffer {
  const data: Buffer[] = []
  for (let at=8; at<png.length;) {
    const size=png.readUInt32BE(at)
    if(png.toString('ascii',at+4,at+8)==='IDAT') data.push(png.subarray(at+8,at+8+size))
    at+=size+12
  }
  return inflateSync(Buffer.concat(data))
}
describe('additive native two-tile stage towers', () => {
  it.each(BIOME_IDS)('%s: nine distinct native states, complete grayscale clears and deterministic bytes', (biome) => {
    const hashes = new Set<string>()
    for (const kind of STAGE_KINDS) for (const state of STAGE_STATES) {
      const img=compactStage(biome,kind,state)
      expect([img.w,img.h]).toEqual([32,32])
      expect(encodePng(32,32,img.px)).toEqual(encodePng(32,32,compactStage(biome,kind,state).px))
      hashes.add(createHash('sha256').update(img.px).digest('hex'))
      let gray=true, ink=0
      for (let i=0;i<img.px.length;i+=4) if(img.px[i+3]) {
        if(img.px[i]!==img.px[i+1] || img.px[i+1]!==img.px[i+2]) gray=false
        if(img.px[i+3]===255) { ink++; expect(Math.floor(i/4/32)).toBeLessThanOrEqual(29) }
      }
      expect(gray).toBe(state==='cleared'); expect(ink).toBeGreaterThan(180)
      expect(img.get(0,0)[3]).toBe(0)
    }
    expect(hashes.size).toBe(9)
  })
  it('packs all 173 frames in their own sheet and matches saved RGBA/index', () => {
    const frames=compactStageFrames(), {atlas,index}=compactStageAtlas()
    expect(frames).toHaveLength(173); expect(new Set(frames.map(f=>f.id)).size).toBe(173)
    expect([atlas.w,atlas.h]).toEqual([256,704])
    const root=new URL('../../../../packages/art/world/',import.meta.url)
    expect(JSON.parse(readFileSync(new URL('stages-compact.json',root),'utf8'))).toEqual({schemaVersion:1,width:atlas.w,height:atlas.h,frames:index})
    expect(pngRows(readFileSync(new URL('stages-compact.png',root)))).toEqual(pngRows(encodePng(atlas.w,atlas.h,atlas.px)))
    expect(frames.filter(f=>f.biome).every(f=>f.anchorY===28 && f.w===32 && f.h===32)).toBe(true)
    expect(frames.at(-1)!.img.px).not.toEqual(frames.at(-2)!.img.px)
  }, 20_000) // Exhaustive packing/PNG comparison of 173 frames exceeds 5s on shared CI.
  it('retains the exact published 2.3.0 world sheet/index and every 4×4 structure preview', () => {
    const root=new URL('../../../../',import.meta.url)
    const frozen: Record<string,string> = {
      'packages/art/world/atlas.png':'ee9c00019f670537452c005315aa664acb9bc04dbdf10de276f4733be760a7d0',
      'packages/art/world/atlas.json':'a55773f8d81d42ac8fb60234294ad3ac20abd4404db614451b01743a5a02cb46',
      'assets/previews/stage-buildings-1x.png':'17c27ddeac6757be3ec45d803fc624fa0578da7264a43c89b65abbcb6db92bec',
      'assets/previews/stage-buildings-2x.png':'1b5027da480662dc333dcc39e1879a4a62a68fec770eb691480fffc5b767262d',
      'assets/previews/stage-buildings-sample.png':'3c8fdfcd47c74078ec22c3c23f88857ecc4522a19515db3e7090fd48fd415431',
      'assets/previews/stage-buildings.html':'a1a2b6938d5cad1f9e3ebe6803545bab9b653b899ef673addfae80ec25ba05f9',
    }
    for (const [path,hash] of Object.entries(frozen)) expect(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'),path).toBe(hash)
  })
})
