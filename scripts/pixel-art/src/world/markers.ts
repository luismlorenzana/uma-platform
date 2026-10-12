// Stage and place symbols, never canvas text. Kind and progress state have different silhouettes, not just colours.
import { hex } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import { Sprite } from '../sprite.ts'
import { Img } from '../tiles/image.ts'
import { add, box, stroke } from '../tiles/props/kit.ts'
import type { StageKind, StageState } from './spec.ts'

export function stageMarker(kind: StageKind, state: StageState): Img {
  const s = new Sprite(16, 16)
  s.shadow = { cx: 8, cy: 14, rx: 5.5, ry: 1.2, alpha: 75 }
  const base = add(s, state === 'locked' ? '#929da5' : state === 'cleared' ? '#80b16a' : '#dfc497', { lift: 0.34, drop: 0.26 })
  const shape = kind === 'fight' ? Mask.circle(8, 9, 4.8, 16, 16)
    : kind === 'elite' ? Mask.polygon([[8, 2], [14, 8], [8, 14], [2, 8]], 16, 16)
      : Mask.polygon([[2, 5], [5, 7], [8, 2], [11, 7], [14, 5], [12, 14], [4, 14]], 16, 16)
  shadeDome(s, shape, base, { bias: 0.1, relief: 0.5, contact: false })
  const ink = add(s, state === 'cleared' ? '#f8f0ce' : '#4f4e53')
  if (state === 'locked') {
    // A closed shackle is unmistakable even on the grey diamond or crown.
    for (const [x, y] of [[6, 7], [6, 6], [7, 5], [8, 5], [9, 6], [9, 7]] as const) s.paint(x, y, ink, 3)
    box(s, 6, 8, 10, 11, 8, ink)
    s.paint(8, 9, base, 5)
  } else if (state === 'cleared') {
    stroke(s, 5, 9, 7, 11, ink, 5); stroke(s, 7, 11, 11, 6, ink, 5)
    s.paint(6, 10, ink, 4); s.paint(9, 9, ink, 4)
  } else if (kind === 'fight') {
    stroke(s, 5, 6, 10, 11, ink, 3); stroke(s, 10, 6, 5, 11, ink, 4)
    s.paint(4, 10, ink, 2); s.paint(11, 10, ink, 2)
  } else if (kind === 'elite') {
    // One upright blade on the raised diamond, with a broad crossguard.
    stroke(s, 8, 5, 8, 11, ink, 4); stroke(s, 5, 9, 11, 9, ink, 3)
  } else {
    for (const x of [5, 8, 11]) box(s, x, 8, x + 1, 11, 8, ink)
    stroke(s, 5, 12, 12, 12, ink, 3)
  }
  return new Img(16, 16, s.render())
}

export function frontierRing(frame: number): Img {
  const out = new Img(16, 16), outer = frame === 0 ? 6.8 : 7.5, inner = outer - 1
  const ring = Mask.circle(8, 8, outer, 16, 16).subtract(Mask.circle(8, 8, inner, 16, 16))
  ring.each((x, y) => out.set(x, y, hex(frame === 0 ? '#ffe18c' : '#fff3bd', frame === 0 ? 235 : 170)))
  return out
}

export function spring(dry = false): Img {
  const s = new Sprite(16, 32)
  s.shadow = { cx: 8, cy: 30.2, rx: 6, ry: 1.4, alpha: 75 }
  const stone = add(s, '#a2ada8'), roof = add(s, '#578c99'), pool = add(s, dry ? '#8c8071' : '#63c5c8', { lift: 0.4, drop: 0.26 })
  for (const x of [3, 11]) box(s, x, 14, x + 2, 27, 16, stone)
  const arch = Mask.ellipse(8, 15, 5, 5, 0, 16, 32).subtract(Mask.ellipse(8, 16, 3, 4, 0, 16, 32))
  shadeDome(s, arch, stone, { relief: 0.45, contact: false })
  shadeDome(s, Mask.polygon([[2, 12], [8, 6], [14, 12]], 16, 32), roof, { relief: 0.55, contact: false })
  shadeDome(s, Mask.ellipse(8, 27, 6, 3, 0, 16, 32), stone, { relief: 0.4, contact: false })
  shadeDome(s, Mask.ellipse(8, 26, 4.5, 1.8, 0, 16, 32), pool, { relief: 0.3, contact: false })
  if (dry) { stroke(s, 6, 25, 8, 27, pool, 1); stroke(s, 8, 27, 11, 26, pool, 1) }
  else {
    s.paint(6, 25, pool, 5); s.paint(7, 25, pool, 5)
    for (const [x, y] of [[7, 18], [8, 20], [8, 22], [9, 24]] as const) s.paint(x, y, pool, 5)
  }
  return new Img(16, 32, s.render())
}

export function flag(cleared = false): Img {
  const s = new Sprite(16, 32)
  s.shadow = { cx: 7, cy: 30, rx: 5, ry: 1.1, alpha: 70 }
  const pole = add(s, '#a47f4f'), fabric = add(s, cleared ? '#81b968' : '#dfa45a'), white = add(s, '#fff2d6')
  stroke(s, 4, 2, 4, 29, pole, 4)
  shadeDome(s, Mask.polygon([[5, 4], [14, 4], [12, 8], [14, 13], [5, 12]], 16, 32), fabric, { relief: 0.3, contact: false })
  if (cleared) { stroke(s, 7, 8, 8, 10, white, 5); stroke(s, 8, 10, 11, 6, white, 5) }
  else { s.paint(9, 7, white, 5); s.paint(9, 8, white, 4); s.paint(9, 10, white, 4) }
  box(s, 2, 29, 7, 29, 29, pole)
  return new Img(16, 32, s.render())
}

export function capital(): Img {
  const s = new Sprite(48, 48)
  s.shadow = { cx: 24, cy: 45, rx: 20, ry: 2, alpha: 80 }
  const wall = add(s, '#b7afa0', { lift: 0.3, drop: 0.25 }), roof = add(s, '#557b9a'), gold = add(s, '#d9aa51'), door = add(s, '#6b4c39')
  // Three towers sit on one shared y=44 plaza line, using the Hub's 48 px building convention.
  box(s, 5, 21, 14, 43, 23, wall); box(s, 34, 21, 43, 43, 23, wall)
  box(s, 14, 26, 34, 44, 27, wall); box(s, 18, 18, 30, 44, 20, wall)
  for (const [cx, top, bottom, half] of [[10, 8, 22, 7], [38, 8, 22, 7], [24, 5, 19, 10]] as const) {
    const m = Mask.polygon([[cx, top], [cx + half, bottom], [cx - half, bottom]], 48, 48)
    shadeDome(s, m, roof, { bias: 0.1, relief: 0.55, contact: false })
    stroke(s, cx - half, bottom, cx + half, bottom, gold, 3)
  }
  for (const [x, y] of [[8, 26], [37, 26], [22, 23], [27, 23], [16, 32], [31, 32]] as const) box(s, x, y, x + 2, y + 4, y, door)
  box(s, 22, 36, 27, 44, 36, door)
  const top = Mask.ellipse(25, 36, 3, 3, 0, 48, 48)
  shadeDome(s, top, door, { relief: 0.3, contact: false })
  for (let y = 29; y <= 40; y += 4)
    for (const x of [6, 10, 35, 39]) stroke(s, x, y, x + 2, y, wall, 2)
  for (const x of [10, 38]) {
    stroke(s, x, 3, x, 10, gold, 4)
    for (let y = 3; y <= 5; y++) for (let dx = 1; dx <= 5 - (y - 3); dx++) s.paint(x + dx, y, roof, 4)
  }
  stroke(s, 4, 44, 43, 44, wall, 3)
  return new Img(48, 48, s.render())
}
