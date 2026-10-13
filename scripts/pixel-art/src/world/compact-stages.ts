// Native 32px destinations; the 64px painters/frames stay unchanged for other uses.
import { hex } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import { Sprite } from '../sprite.ts'
import { Img } from '../tiles/image.ts'
import { add, box, stroke } from '../tiles/props/kit.ts'
import { BIOMES, type Biome, type StageKind, type StageState } from './spec.ts'
import { THEMES } from './stage-buildings.ts'

export function compactStage(biome: Biome, kind: StageKind, state: StageState): Img {
  const theme = THEMES[biome], s = new Sprite(32, 32)
  s.shadow = { cx: 16, cy: 29.5, rx: kind === 'elite' ? 10 : 14, ry: 1.4, alpha: 70 }
  const wall = add(s, theme.wall), roof = add(s, theme.roof), timber = add(s, '#806347')
  const dark = add(s, '#34414a'), trim = add(s, '#ddbd78'), lamp = add(s, '#f6ce72')
  const accent = add(s, BIOMES[biome].base), snow = add(s, '#d8e8ed')
  const roofAt = (cx: number, top: number, base: number, half: number) => {
    shadeDome(s, Mask.polygon([[cx,top],[cx+half,base],[cx-half,base]]), roof, { relief: 0.48, contact: false })
    stroke(s, cx-half, base, cx+half, base, trim, 3)
    if (theme.snow) stroke(s, cx, top, cx-half+2, base-2, snow, 4)
  }
  const windowAt = (x: number, y: number) => {
    box(s, x-1, y-1, x+2, y+3, y, wall)
    box(s, x, y, x+1, y+2, y, state === 'open' ? lamp : dark)
  }
  if (kind === 'fight') {
    // A low, house-width chess rook: square masonry, projecting crown and four crenels, no hut roof.
    box(s, 6, 11, 26, 28, 12, wall)
    box(s, 4, 9, 28, 13, 10, wall)
    for (const x of [5,11,17,23]) box(s, x, 5, x+3, 10, 6, wall)
    stroke(s, 7, 15, 25, 15, roof, 3)
    windowAt(9, 18); windowAt(22, 18)
  } else if (kind === 'elite') {
    box(s, 10, 10, 22, 28, 11, wall)
    box(s, 8, 26, 24, 28, 27, wall)
    roofAt(16, 2, 12, 10)
    windowAt(13, 15); windowAt(18, 15)
    stroke(s, 10, 20, 22, 20, trim, 3)
  } else {
    box(s, 3, 14, 9, 28, 15, wall); box(s, 23, 14, 29, 28, 15, wall)
    box(s, 8, 20, 24, 28, 21, wall); box(s, 11, 10, 21, 28, 11, wall)
    roofAt(6, 8, 15, 5); roofAt(26, 8, 15, 5); roofAt(16, 1, 12, 8)
    windowAt(5, 19); windowAt(25, 19); windowAt(15, 15)
    for (const x of [9,20]) box(s, x, 18, x+2, 21, 19, wall)
  }
  // Brick courses and staggered joints retain a castle texture at native resolution.
  for (let y = 17; y < 28; y += 4) for (let x = 5+(y%3); x < 28; x += 6) {
    if (s.mat[y*32+x] === wall) stroke(s, x, y, x+2, y, wall, 2)
  }
  box(s, 13, 23, 19, 28, 24, timber)
  box(s, 14, 24, 18, 28, 24, state === 'open' ? dark : timber)
  if (state !== 'open') { stroke(s,14,24,18,27,trim,2); stroke(s,18,24,14,27,trim,2) }
  stroke(s, 12, 28, 20, 28, wall, 4)
  if (theme.snow && kind === 'fight') for (const x of [5,11,17,23]) stroke(s,x,5,x+3,5,snow,5)
  if (theme.vines) for (let y = 16; y < 25; y += 3) { s.paint(7,y,accent,3); s.paint(8,y+1,accent,4) }
  if (theme.crystal) shadeDome(s, Mask.polygon([[26,22],[29,26],[28,28],[24,28]]), accent, { relief: 0.5, contact: false })
  if (theme.bone) { stroke(s,23,20,23,24,snow,4); stroke(s,22,22,24,22,snow,4) }
  if (biome === 'volcano') { stroke(s,8,24,10,26,lamp,3); s.paint(10,27,lamp,4) }
  if (biome === 'ruins') { stroke(s,23,22,21,25,dark,2); s.paint(22,26,dark,2) }
  // A small biome pennant keeps similar stone towers recognisable even without a roof.
  const fx = kind === 'fight' ? 26 : 20, fy = kind === 'fight' ? 3 : 1
  stroke(s,fx,fy,fx,fy+6,timber,4)
  shadeDome(s,Mask.polygon([[fx+1,fy],[fx+4,fy+1],[fx+3,fy+3],[fx+1,fy+3]]),accent,{contact:false})
  const image = new Img(32,32,s.render())
  for (let i=0; i<image.px.length; i+=4) {
    const gray = Math.round(image.px[i]!*0.2126 + image.px[i+1]!*0.7152 + image.px[i+2]!*0.0722)
    if (state === 'cleared') image.px[i] = image.px[i+1] = image.px[i+2] = gray
    else if (state === 'locked') for (let k=0; k<3; k++) image.px[i+k] = Math.round((image.px[i+k]!*0.78+gray*0.22)*0.8)
  }
  return image
}

export function compactFrontier(pose: number): Img {
  const image = new Img(32,32), outer = pose === 0 ? 15 : 16
  const ring = Mask.circle(16,16,outer).subtract(Mask.circle(16,16,outer-1))
  ring.each((x,y) => image.set(x,y,hex(pose === 0 ? '#ffe18c' : '#fff3bd',pose === 0 ? 225 : 165)))
  return image
}
