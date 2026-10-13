// Four-tile destinations, painted at native 64px rather than enlarged 16px symbols.
import { hex } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import { Sprite } from '../sprite.ts'
import { Img } from '../tiles/image.ts'
import { add, box, stroke } from '../tiles/props/kit.ts'
import { BIOMES, type Biome, type StageKind, type StageState } from './spec.ts'

type Theme = { wall: string; roof: string; style?: 'dome' | 'spire' | 'flat'; snow?: boolean; vines?: boolean; crystal?: boolean; bone?: boolean }
const THEMES: Record<Biome, Theme> = {
  meadow: { wall: '#c7b796', roof: '#789954' }, forest: { wall: '#aa9976', roof: '#497657', vines: true },
  coast: { wall: '#d8c6a2', roof: '#508ca1' }, swamp: { wall: '#9d9f7c', roof: '#69775d', vines: true },
  jungle: { wall: '#b3a179', roof: '#467e65', vines: true }, desert: { wall: '#dac08a', roof: '#b7734d', style: 'dome' },
  canyon: { wall: '#c08c70', roof: '#765663', style: 'flat' }, volcano: { wall: '#68616e', roof: '#b74b39', style: 'spire' },
  geyser: { wall: '#e0c7a5', roof: '#739c96', style: 'dome' }, tundra: { wall: '#abb7bd', roof: '#638798', snow: true },
  glacier: { wall: '#c4d7df', roof: '#5e8eb0', snow: true, crystal: true }, peaks: { wall: '#9b9ea6', roof: '#62718e', style: 'spire' },
  highlands: { wall: '#bcb2aa', roof: '#8d7097' }, sky: { wall: '#e1d5b8', roof: '#8dabc1', style: 'spire', crystal: true },
  underworld: { wall: '#8d819e', roof: '#5e426f', style: 'spire', bone: true }, moor: { wall: '#9e99a6', roof: '#66637e', vines: true },
  crystal: { wall: '#a1b9c1', roof: '#579da9', crystal: true }, ruins: { wall: '#b1aa96', roof: '#758176', style: 'flat' },
  rift: { wall: '#959ab8', roof: '#60558f', style: 'spire', crystal: true },
}

export function stageBuilding(biome: Biome, kind: StageKind, state: StageState): Img {
  const theme = THEMES[biome], s = new Sprite(64, 64)
  s.shadow = { cx: 32, cy: 60, rx: kind === 'elite' ? 19 : 28, ry: 2.3, alpha: 70 }
  const wall = add(s, theme.wall), roof = add(s, theme.roof), timber = add(s, '#806347')
  const dark = add(s, '#34414a'), trim = add(s, '#ddbd78'), lamp = add(s, '#f6ce72', { lift: 0.22, drop: 0.32 })
  const accent = add(s, BIOMES[biome].base), pale = add(s, '#d8e8ed')
  const roofAt = (cx: number, top: number, base: number, half: number) => {
    const m = theme.style === 'dome'
      ? Mask.ellipse(cx, base, half, base - top, 0, 64, 64).subtract(Mask.polygon([[0,base+1],[63,base+1],[63,63],[0,63]],64,64))
      : theme.style === 'flat'
        ? Mask.polygon([[cx-half,base-5],[cx+half,base-5],[cx+half,base],[cx-half,base]],64,64)
        : Mask.polygon([[cx,top],[cx+half,base],[cx-half,base]],64,64)
    shadeDome(s, m, roof, { bias: 0.1, relief: 0.48, contact: false })
    m.each((x, y) => { if (y > top + 4 && y % 4 === 0 && (x + Math.floor(y / 4) * 3) % 8 < 4) s.shift(x, y, -1) })
    stroke(s, cx-half, base, cx+half, base, trim, 3)
    if (theme.style === 'flat') for (let x = cx-half; x <= cx+half; x += 6) box(s, x, base-8, x+3, base-5, base-7, wall)
    if (theme.snow) {
      const snow = Mask.polygon([[cx,top],[cx+half*.6,top+(base-top)*.6],[cx+2,top+(base-top)*.46],[cx-half*.7,top+(base-top)*.7]],64,64)
      shadeDome(s, snow, pale, { relief: 0.32, contact: false })
    }
  }
  const windowAt = (x: number, y: number) => {
    box(s, x-1, y-1, x+4, y+6, y, timber)
    box(s, x, y, x+3, y+5, y, state === 'open' ? lamp : dark)
    stroke(s, x+1, y, x+1, y+5, timber, 2)
    stroke(s, x, y+2, x+3, y+2, timber, 2)
  }
  // Distinct silhouettes: low barracks, tall lone tower, fortified three-tower keep.
  if (kind === 'fight') {
    box(s, 9, 30, 55, 57, 32, wall)
    roofAt(32, theme.style === 'spire' ? 9 : 16, 34, 26)
    for (const x of [13, 44]) windowAt(x, 39)
    box(s, 49, 14, 53, 27, 15, wall)
    stroke(s, 9, 51, 54, 51, timber, 2)
  } else if (kind === 'elite') {
    box(s, 19, 21, 45, 58, 23, wall)
    box(s, 16, 54, 48, 58, 55, wall)
    roofAt(32, 5, 24, 19)
    for (const y of [30, 41]) { windowAt(23, y); windowAt(37, y) }
    stroke(s, 19, 39, 45, 39, trim, 3)
  } else {
    box(s, 6, 27, 17, 58, 29, wall); box(s, 47, 27, 58, 58, 29, wall)
    box(s, 15, 38, 49, 58, 40, wall); box(s, 22, 22, 42, 58, 24, wall)
    roofAt(12, 15, 29, 10); roofAt(52, 15, 29, 10); roofAt(32, 4, 25, 16)
    for (const [x,y] of [[9,36],[50,36],[26,29],[35,29]] as const) windowAt(x,y)
    for (let x = 17; x <= 45; x += 7) box(s,x,35,x+3,39,36,wall)
  }
  // Shared entrance and pavement line: door open and lit only at the frontier.
  box(s, 27, 48, 37, 58, 49, timber)
  box(s, 29, 49, 35, 58, 49, state === 'open' ? dark : timber)
  if (state !== 'open') { stroke(s, 29, 51, 35, 56, trim, 2); stroke(s, 35, 51, 29, 56, trim, 2) }
  box(s, 25, 58, 39, 58, 58, wall)
  for (let y=38; y<56; y+=5) for (let x=11+(y%2)*3; x<54; x+=9) if (s.mat[y*64+x] === wall) stroke(s,x,y,x+3,y,wall,2)
  // Themed details, not only hue swaps.
  if (theme.vines) for (const x of [11,46]) for (let y=36; y<55; y+=3) {
    s.paint(x,y,accent,3); s.paint(x+1,y+1,accent,4); s.paint(x-1,y+2,accent,2)
  }
  if (theme.crystal) for (const [x,y] of [[14,56],[49,55]] as const) {
    const m=Mask.polygon([[x,y-10],[x+3,y-4],[x+2,y],[x-3,y-1]],64,64)
    shadeDome(s,m,accent,{relief:0.5,contact:false}); s.paint(x-1,y-7,pale,5)
  }
  if (theme.bone) for (const x of [23,40]) { stroke(s,x,43,x,48,pale,4); stroke(s,x-1,45,x+1,45,pale,3) }
  if (biome === 'volcano') for (const [x,y] of [[14,53],[44,50],[41,56]] as const) {
    stroke(s,x,y,x+2,y+2,lamp,state==='open'?4:2)
  }
  if (biome === 'ruins') { stroke(s,20,42,18,47,dark,2); stroke(s,18,47,21,50,dark,2) }
  // One banner carries the biome colour. Cleared sprites are desaturated after all lighting/outline/shadow work.
  const flagX = kind === 'elite' ? 32 : 42, flagY = kind === 'boss' ? 5 : kind === 'elite' ? 2 : 10
  stroke(s,flagX,flagY,flagX,flagY+10,timber,4)
  shadeDome(s,Mask.polygon([[flagX+1,flagY],[flagX+9,flagY+1],[flagX+7,flagY+4],[flagX+1,flagY+5]],64,64),accent,{contact:false,relief:0.3})
  const out = new Img(64,64,s.render())
  for(let i=0;i<out.px.length;i+=4) {
    const gray=Math.round(out.px[i]!*0.2126+out.px[i+1]!*0.7152+out.px[i+2]!*0.0722)
    if(state==='cleared') out.px[i]=out.px[i+1]=out.px[i+2]=gray
    else if(state==='locked') for(let k=0;k<3;k++) out.px[i+k]=Math.round((out.px[i+k]!*0.78+gray*0.22)*0.8)
  }
  return out
}

export function stageFrontier(pose: number): Img {
  const out = new Img(64,64), outer=pose===0?31:32
  const m=Mask.circle(32,32,outer,64,64).subtract(Mask.circle(32,32,outer-1.5,64,64))
  m.each((x,y)=>out.set(x,y,hex(pose===0?'#ffe18c':'#fff3bd',pose===0?225:165)))
  return out
}
