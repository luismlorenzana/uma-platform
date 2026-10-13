import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '../color.ts'
import { encodePng } from '../png.ts'
import { Img } from '../tiles/image.ts'
import { packWorld } from './atlas.ts'
import { compactStageFrames } from './compact-atlas.ts'
import { BIOME_IDS } from './spec.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..','..','..','..')
const dir = join(root,'packages/art/world'), previews = join(root,'assets/previews')
const frames = compactStageFrames(), { atlas,index } = packWorld(frames)
mkdirSync(dir,{recursive:true}); mkdirSync(previews,{recursive:true})
writeFileSync(join(dir,'stages-compact.png'),encodePng(atlas.w,atlas.h,atlas.px))
writeFileSync(join(dir,'stages-compact.json'),JSON.stringify({schemaVersion:1,width:atlas.w,height:atlas.h,frames:index},null,1)+'\n')
const bg = hex('#0f141b'), buildings = frames.filter(f=>f.biome)
const sheet = new Img(9*40+8,BIOME_IDS.length*40+8).fill(bg)
buildings.forEach((f,i)=>sheet.draw(f.img,8+(i%9)*40,8+Math.floor(i/9)*40))
for (const scale of [1,2]) { const img=sheet.scaled(scale); writeFileSync(join(previews,`stage-compact-${scale}x.png`),encodePng(img.w,img.h,img.px)) }
const sample = new Img(6*40+8,5*40+8).fill(bg)
;['meadow','coast','volcano','glacier','underworld'].forEach((b,row)=>['fight','elite','boss'].forEach((k,col)=>['open','cleared'].forEach((s,pair)=>{
  sample.draw(buildings.find(f=>f.id===`stage-compact/${b}/${k}-${s}`)!.img,8+(col*2+pair)*40,8+row*40)
})))
const zoom = sample.scaled(3)
writeFileSync(join(previews,'stage-compact-sample.png'),encodePng(zoom.w,zoom.h,zoom.px))
const uri = (img:Img)=>`data:image/png;base64,${encodePng(img.w,img.h,img.px).toString('base64')}`
writeFileSync(join(previews,'stage-compact.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>Compact stage towers</title><style>body{background:#0f141b;color:#eee;font:14px system-ui}.row{display:flex;flex-wrap:wrap;gap:8px}img{image-rendering:pixelated}figure{margin:0}figcaption{font-size:11px}</style><h1>2×2-tile stage towers</h1><p>Native 32px regular chess towers, elite towers and castles. The original 64px buildings are retained unchanged.</p>${BIOME_IDS.map(b=>`<h2>${b}</h2><div class="row">${buildings.filter(f=>f.biome===b).map(f=>`<figure><img src="${uri(f.img)}" width="96" height="96" alt="${f.id}"><figcaption>${f.id.split('/').at(-1)}</figcaption></figure>`).join('')}</div>`).join('')}</html>`)
console.log(`Wrote ${frames.length} native compact stage frames (${atlas.w}×${atlas.h}); original world atlas untouched`)
