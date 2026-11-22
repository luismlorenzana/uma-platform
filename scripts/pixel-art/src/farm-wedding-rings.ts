import { Sprite } from './sprite.ts'
import { hex } from './color.ts'

const cell = 32
const stones: Readonly<Record<string, string>> = {
  ivory: '483636 825945 c29672 e9c9a1 f8e1bf fff4db',
  mist: '33424a 577477 82a5a6 b1d1cb d7e5d9 f8fff2',
  violet: '343046 584b6b 8d769b b8a2c4 e1c9ec fff0f2',
  diamond: '354863 57708d 85a9c0 bdd6df e3f4f4 f8fff1',
  blue: '253453 3b5789 537db5 72afda b3e6fa f4ffff',
  honey: '573025 955535 c3783e eca658 f9d77e fff0b3',
  green: '305154 39726d 52a88d 81caae b2e5c5 e6ffdc',
  opal: '526472 758f92 a4bfb7 c8dcc8 f0ead4 fff9e6',
}
type RingDesign = readonly [string, string, string, readonly [number, number, number, number, number], string]
const designs: readonly RingDesign[] = [
  ['Copper', 'Hammered band', '5a2b32 8d4139 b65f4c e08363 f5a47c ffd0a8', [12.7, 7, 4, 3.1, 19], 'ivory'],
  ['Tin', 'Twin-groove band', '424955 62747c 8b9a9e abbcbd d7ded4 f0f3e4', [10.9, 8.1, 2.6, 3.8, 18], 'mist'],
  ['Iron', 'Square signet', '252632 414754 5e6673 7d8695 a5b0bc d2dce0', [12.5, 7.6, 4.2, 2.5, 18.5], 'violet'],
  ['Silver', 'Round solitaire', '38435b 5c708e 8699b1 b1c6d2 dfe7ee fdfdfa', [10.8, 8.2, 2.3, 2.6, 18], 'diamond'],
  ['Cobalt', 'Bypass pear', '29274f 393d78 4c5897 607dc0 91ade1 c4d9f6', [12, 7.8, 3.1, 2.4, 19], 'blue'],
  ['Gold', 'Three-stone setting', '653627 8e502d be7838 deaa4b f5cf70 ffe9ae', [12.5, 7.4, 3.9, 3, 19], 'honey'],
  ['Platinum', 'Emerald cut', '35434d 637982 849ba5 b0c6ca d3e5dc f8fff4', [12, 7.5, 3.2, 2.8, 19], 'green'],
  ['Titanium', 'Angular two-tone band', '352e3d 51495c 68637a 9292a6 b8bbcc e4e5ed', [12.3, 7.6, 4.2, 2.7, 18.5], 'violet'],
  ['Mythril', 'Braided marquise', '244657 456b7b 6e94a1 90b8be c0dce3 e9fff9', [11.4, 7.3, 3.6, 2.7, 19], 'blue'],
  ['Orichalcum', 'Leaf shoulders and opal kite', '553b2f 77543a 9b7249 c69d61 e4c186 ffe4ab', [12.8, 7.5, 4.1, 2.9, 19.5], 'opal'],
]

const ramp = (text: string) => text.split(' ').map(color => hex('#' + color))
const circle = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
type Point = readonly [number, number]
function polygon(points: readonly Point[]) {
  return (x: number, y: number) => {
    let inside = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i]!, [xj, yj] = points[j]!
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
}

function paintRing([, , material, dimensions, stoneKey]: RingDesign, grade: number) {
  const sprite = new Sprite(cell, cell)
  const metal = sprite.addRamp(ramp(material))
  const stone = sprite.addRamp(ramp(stones[stoneKey]!))
  const accent = sprite.addRamp(ramp('3f304a 665074 8d719a a98db9 cbb0db f2ddf2'))
  const [rx, ry, width, depth, cy] = dimensions
  const cx = 15.5
  const ellipse = grade === 8 ? (x: number, y: number) =>
    (Math.abs(x - cx) / rx) ** 3 + (Math.abs(y - cy) / ry) ** 3 <= 1 : circle(cx, cy, rx, ry)
  const hole = grade === 1 ? circle(cx, cy - 2.3, rx - width, 2.65) : circle(cx, cy - .65, rx - width, ry - depth)
  const paint = (shape: (x: number, y: number) => boolean, palette: number, light: number | ((x: number, y: number) => number)) => {
    for (let y = 2; y <= 29; y++) {
      for (let x = 2; x <= 29; x++) {
        if (shape(x + .5, y + .5)) sprite.paint(x, y, palette, typeof light === 'function' ? light(x, y) : light)
      }
    }
  }
  const poly = (points: readonly Point[], palette: number, light: Parameters<typeof paint>[2]) => paint(polygon(points), palette, light)
  const shank = (x: number, y: number) => ellipse(x, y) && !hole(x, y)
  const profileLight = (x: number, y: number) => {
    const slope = (x - cx) * .065
    const edge = Math.abs(y + .5 - cy)
    const yOnFace = (y - cy) / ry
    return 4.8 - slope - edge * .21 + (yOnFace > .25 ? .75 : -.05)
  }
  paint(shank, metal, profileLight)

  const brush = (x: number, y: number) => ((x * 13 + y * 7) % 11 === 0 ? -1 : 0)
  if (grade === 1) {
    paint((x, y) => shank(x, y) && y > 19, metal, (x, y) => profileLight(x, y) + brush(x, y))
    paint(circle(18.6, 22, 2.2, 1.9), metal, 2)
    paint(circle(18.4, 21.7, 1.3, 1.3), stone, 4)
  }
  if (grade === 2) {
    paint((x, y) => shank(x, y) && x > 7 && x < 24 && Math.floor(y) === 23, metal, 2)
    paint((x, y) => shank(x, y) && x > 8 && x < 23 && Math.floor(y) === 24, metal, 5)
    for (const x of [11.2, 15.5, 19.8]) paint(circle(x, 12.5, 1.25, 1.2), stone, 4)
  }
  if (grade === 3) {
    poly([[8, 12], [10, 7], [20, 7], [23, 10], [23, 16], [9, 16]], metal, profileLight)
    poly([[10, 10], [12, 8], [19, 8], [21, 10], [20, 13], [11, 13]], stone, (x, y) => x < 13 || y === 8 ? 5 : y > 11 ? 2 : 4)
  }
  if (grade === 4) {
    paint(circle(15.5, 9.2, 4.9, 4.8), metal, 3)
    paint(circle(15.5, 9.2, 3.9, 3.8), stone, (x, y) => x + y < 23 ? 5 : 3)
    for (const [x, y] of [[12, 6], [19, 6], [12, 12], [19, 12]] as const) sprite.paint(x, y, metal, 5)
  }
  if (grade === 5) {
    poly([[4, 17], [8, 11], [13, 8], [15, 8], [13, 13], [9, 16], [7, 20]], metal, (x, y) => y < 14 ? 5 : 4)
    poly([[26, 17], [23, 13], [20, 12], [17, 13], [15, 16], [21, 15], [25, 19]], metal, 5)
    poly([[14, 4], [17, 6], [20, 10], [18, 13], [15, 14], [12, 12], [12, 9]], stone, (x, y) => x < 15 ? 5 : y < 9 ? 4 : 3)
  }
  if (grade === 6) {
    for (const [x, y, r] of [[8.2, 11.8, 2.8], [22.8, 11.8, 2.8], [15.5, 8.2, 4.7]] as const) {
      const center = x === 15.5
      paint(circle(x, y, r + .7, r + .5), metal, 4)
      paint(circle(x, y, r - .5, r - .7), stone, (px, py) => {
        const facet = px < x && py < y ? 1 : py > y ? -1 : 0
        return (center ? 4 : 3) + facet
      })
    }
  }
  if (grade === 7) {
    for (const side of [-1, 1]) {
      const at = (v: number, y: number): Point => [cx + side * v, y]
      poly([at(5, 8), at(11, 11), at(12, 16), at(7, 13), at(5, 13)], metal, profileLight)
    }
    poly([[12, 4], [19, 4], [21, 7], [21, 13], [18, 16], [12, 16], [10, 13], [10, 7]], metal, 4)
    poly([[12, 6], [18, 6], [20, 8], [20, 12], [18, 14], [12, 14], [11, 12], [11, 8]], stone, (x, y) => x === 11 || y === 6 ? 5 : x > 17 || y > 12 ? 3 : 4)
  }
  if (grade === 8) {
    paint((x, y) => shank(x, y) && y > 18 && y < 23, metal, 2)
    poly([[4, 13], [9, 10], [14, 11], [17, 9], [24, 8], [27, 10], [24, 15], [17, 15], [12, 17], [5, 16]], metal, (x, y) => y + x * .2 < 15 ? 5 : 3)
    poly([[17, 10], [23, 9], [24, 11], [22, 13], [16, 13]], stone, (x, y) => y < 11 ? 5 : 3)
  }
  if (grade === 9) {
    for (const side of [-1, 1]) {
      const at = (v: number, y: number): Point => [cx + side * v, y]
      poly([at(3, 11), at(7, 12), at(11, 16), at(12, 20), at(8, 17), at(5, 17), at(2, 14)], metal, 4)
      poly([at(4, 12), at(8, 12), at(10, 14), at(8, 15), at(5, 15)], stone, 4)
    }
    poly([[6, 9], [12, 5], [20, 5], [25, 9], [20, 13], [11, 13]], metal, 4)
    poly([[8, 9], [13, 6], [19, 6], [23, 9], [19, 12], [12, 12]], stone, (x, y) => y <= 8 ? 5 : x > 18 ? 3 : 4)
  }
  if (grade === 10) {
    for (const side of [-1, 1]) {
      const at = (v: number, y: number): Point => [cx + side * v, y]
      poly([at(3, 7), at(7, 8), at(11, 12), at(13.4, 18), at(10, 17), at(5, 15)], metal, (x, y) => y < 12 || x < cx ? 5 : 3)
      poly([at(4, 11), at(8, 11), at(11.5, 14), at(9.5, 15), at(5, 14)], metal, 4)
      poly([at(5, 13), at(9, 14), at(11.5, 17), at(8, 17)], metal, 5)
    }
    poly([[15.5, 2], [22, 10], [15.5, 18], [9, 10]], metal, (x, y) => x < 15 || y < 7 ? 5 : 3)
    poly([[15.5, 4], [20.3, 10], [15.5, 16], [10.7, 10]], stone, (x, y) => y < 9 ? 5 : x < 14 ? 3 : 4)
    poly([[16, 9], [20.3, 10], [15.5, 15.5]], accent, 4)
  }

  return sprite.render()
}

/** Stable Farm wedding-ring keys. Each metal has its own band and stone setting. */
export function farmWeddingRings() {
  return designs.map((design, i) => ({ id: 'ring-g' + (i + 1), rgba: paintRing(design, i + 1) }))
}
