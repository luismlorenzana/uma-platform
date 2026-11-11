// uma-farm F55 (P126): the romance core's marks. Native pixel art: the homestead's two small houses and the ring bench
// (24px), the Hearts tab's marks (16px) and a Memory's frame (48px, a 12px nine-slice), and the five plays' icons (16px).
// Nothing here depicts the farmer or an Uma (RS2, RM61).
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add, stroke } from '../tiles/props/kit.ts'
import { heartMask } from './farm.ts'
import type { HeartsMark, HomesteadMark, PlayMark } from './spec.ts'

const poly = (s: Sprite, points: readonly Point[]) => Mask.polygon(points, s.w, s.h)
const dome = (s: Sprite, mask: Mask, color: number, relief = .45) => shadeDome(s, mask, color, { bias: .1, relief, contact: false })
const vline = (s: Sprite, id: number, x: number, y0: number, y1: number) => { for (let y = y0; y <= y1; y++) s.paint(x, y, id, 3) }
const rect = (s: Sprite, id: number, x0: number, y0: number, x1: number, y1: number, tone: number) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.paint(x, y, id, tone)
}

// ---- The homestead, small (24px): the same two buildings as the 48px Hub frames, drawn natively at half size ----

export function homesteadSmall(s: Sprite, key: HomesteadMark): void {
  const glass = add(s, '#ffd27a', { lift: .3 })
  const wood = add(s, '#7a4e30')
  const stone = add(s, '#9c9484')
  s.shadow = { cx: 12, cy: 21.5, rx: 9.5, ry: 1.2, alpha: 48 }
  if (key === 'farmhouse') {
    // Two storeys: a terracotta roof, cream plaster upstairs with two windows, honey boards below, a porch, a chimney.
    const roof = add(s, '#b85a3c'), plaster = add(s, '#f0e2c0', { lift: .2 }), boards = add(s, '#c99a5e')
    rect(s, stone, 16, 2, 18, 5, 3); rect(s, stone, 16, 2, 16, 5, 4)
    const roofMask = poly(s, [[5, 3], [19, 3], [22, 7.4], [2, 7.4]])
    roofMask.each((x, y) => s.paint(x, y, roof, y === 3 ? 5 : y === 7 ? 2 : x < 8 ? 4 : 3))
    rect(s, plaster, 4, 8, 19, 13, 4); rect(s, plaster, 19, 8, 19, 13, 2)
    rect(s, boards, 4, 14, 19, 20, 3); rect(s, boards, 4, 14, 4, 20, 4); rect(s, boards, 19, 14, 19, 20, 2)
    for (const x of [6, 15]) { rect(s, glass, x, 9, x + 2, 11, 4); s.paint(x, 9, glass, 5) }
    rect(s, glass, 6, 16, 8, 18, 4)
    rect(s, wood, 12, 16, 14, 20, 2); s.paint(14, 18, glass, 5)
    // The porch: a lean-to roof across the ground floor on two posts.
    for (let x = 10; x <= 17; x++) s.paint(x, 14, roof, 3)
    for (let x = 10; x <= 17; x++) s.paint(x, 15, roof, 2)
    for (const y of [16, 17, 18, 19, 20]) { s.paint(10, y, wood, 4); s.paint(17, y, wood, 2) }
    rect(s, stone, 9, 21, 18, 21, 4)
    return
  }
  // A cottage: one front gable in slate blue, plank walls, a door and a window, a small chimney.
  const roof = add(s, '#6f7f9c'), walls = add(s, '#d8b884')
  rect(s, stone, 15, 3, 16, 8, 3)
  const gable = poly(s, [[12, 3], [21, 12], [3, 12]])
  gable.each((x, y) => s.paint(x, y, roof, y === 12 ? 2 : x < 12 ? 4 : 3))
  rect(s, walls, 5, 12, 18, 20, 3); rect(s, walls, 5, 12, 5, 20, 4); rect(s, walls, 18, 12, 18, 20, 2)
  for (let y = 13; y <= 19; y += 2) for (let x = 6; x <= 17; x++) s.shift(x, y, -1)
  rect(s, wood, 13, 15, 15, 20, 2); s.paint(15, 17, glass, 5)
  rect(s, glass, 7, 14, 9, 16, 4); s.paint(7, 14, glass, 5)
  rect(s, stone, 4, 21, 19, 21, 4)
}

/** The ring bench: a small anvil on a stump, a gold ring resting on its face. */
export function ringBench(s: Sprite): void {
  const iron = add(s, '#6c7682', { lift: .34, drop: .28 })
  const stump = add(s, '#8a5a36')
  const gold = add(s, '#f2c23a', { lift: .4, drop: .26 })
  s.shadow = { cx: 12, cy: 21.4, rx: 8.5, ry: 1.1, alpha: 44 }
  // The stump: a short log with a lit top ring.
  rect(s, stump, 8, 15, 16, 20, 3); rect(s, stump, 8, 15, 8, 20, 4); rect(s, stump, 16, 15, 16, 20, 2)
  for (let x = 8; x <= 16; x++) s.paint(x, 15, stump, x % 3 ? 4 : 5)
  // The anvil: a horn to the left, a flat face, a waist and a foot.
  const anvil = poly(s, [[3, 9], [7, 8], [19, 8], [20, 9], [20, 11], [16, 11], [15, 13], [17, 15], [7, 15], [9, 13], [8, 11], [6, 11]])
  dome(s, anvil, iron, .5)
  for (let x = 7; x <= 19; x++) s.paint(x, 8, iron, 5)
  // The ring: a gold band seen at an angle, a bright glint.
  const ring = Mask.ellipse(13, 6, 3, 1.8, 0, 24, 24).subtract(Mask.ellipse(13, 6, 1.6, .8, 0, 24, 24))
  dome(s, ring, gold, .4)
  s.paint(11, 5, gold, 5)
  s.sparkle(16, 3, 1)
}

// ---- The Hearts tab (16px) ----

/** The three stage hearts share one outline, so only the colour (and the spouse's band) tells the stage. */
export const STAGE_COLORS = { friendship: '#f27d5a', romance: '#e34f7d', spouse: '#e8b43a' } as const
const stageHeart = (s: Sprite) => heartMask(s, 8, 3.2, 5)

export function heartsMark(s: Sprite, key: HeartsMark): void {
  if (key === 'friendship' || key === 'romance' || key === 'spouse') {
    const color = add(s, STAGE_COLORS[key], { lift: .36, drop: .26 })
    s.shadow = { cx: 8, cy: 14.4, rx: 5.6, ry: .7, alpha: 40 }
    const heart = stageHeart(s)
    dome(s, heart, color, .5)
    // A lit inner rim along the upper left, the same on all three.
    heart.each((x, y) => { if ((!heart.get(x - 1, y) || !heart.get(x, y - 1)) && x + y < 13) s.paint(x, y, color, 5) })
    if (key === 'spouse') {
      // A pale band across the heart: the wedding ring's gold, lighter.
      const band = add(s, '#fff1c4', { lift: .1 })
      heart.each((x, y) => { if (y === 8 || y === 9) s.paint(x, y, band, y === 8 ? 4 : 3) })
    }
    return
  }
  if (key === 'banked') {
    // A heart to the left with a stack of three small gold bars beside it: points past a full bar.
    const rose = add(s, STAGE_COLORS.romance, { lift: .36 })
    const gold = add(s, '#e8b43a', { lift: .36 })
    s.shadow = { cx: 8, cy: 14.4, rx: 6.4, ry: .7, alpha: 40 }
    dome(s, heartMask(s, 6, 3.8, 3.6), rose, .5)
    for (const [i, y] of [10, 7, 4].entries()) {
      rect(s, gold, 10, y + 1, 13, y + 2, 3)
      for (let x = 10; x <= 13; x++) s.paint(x, y + 1, gold, i === 2 ? 5 : 4)
    }
    return
  }
  if (key === 'ready') {
    // A heart with a bright gold dot at its upper right, like a waiting notice: her event can play.
    const rose = add(s, STAGE_COLORS.romance, { lift: .36 })
    const dot = add(s, '#f6c638', { lift: .45, drop: .25 })
    s.shadow = { cx: 7, cy: 14.4, rx: 5.4, ry: .7, alpha: 40 }
    dome(s, heartMask(s, 6.8, 5, 4.1), rose, .5)
    dome(s, Mask.circle(11.4, 4.6, 2.7, 16, 16), dot, .6)
    s.paint(10, 3, dot, 5); s.paint(11, 3, dot, 5); s.paint(10, 4, dot, 5)
    return
  }
  if (key === 'evening') {
    // A pale crescent moon, a small heart beside its open side.
    const moon = add(s, '#f3e3a2', { lift: .2, drop: .3 })
    const rose = add(s, STAGE_COLORS.romance, { lift: .36 })
    const crescent = Mask.circle(7, 7.6, 5, 16, 16).subtract(Mask.circle(9.6, 6.2, 4, 16, 16))
    dome(s, crescent, moon, .4)
    dome(s, heartMask(s, 11.4, 8.6, 2.6), rose, .4)
    return
  }
  if (key === 'invitation') {
    // A sealed envelope: cream paper, the flap's V, a heart seal at its tip.
    const paper = add(s, '#f4ead2', { lift: .14, drop: .3 })
    const rose = add(s, STAGE_COLORS.romance, { lift: .36 })
    s.shadow = { cx: 8, cy: 13.6, rx: 6.4, ry: .7, alpha: 40 }
    const envelope = poly(s, [[1.6, 3.6], [14.4, 3.6], [14.4, 12.6], [1.6, 12.6]])
    dome(s, envelope, paper, .25)
    stroke(s, 2, 4, 7, 8, paper, 2); stroke(s, 13, 4, 8, 8, paper, 2)
    stroke(s, 2, 12, 6, 9, paper, 3); stroke(s, 13, 12, 9, 9, paper, 3)
    dome(s, heartMask(s, 8, 6.8, 2.6), rose, .4)
    return
  }
  memoryFrame(s)
}

/**
 * A Memory's frame: 48px, transparent inside, its border a 12px nine-slice. The straight runs between the corners are
 * the same in every row or column, so the frame stretches to any tile; the corners carry a small gold heart each.
 */
export function memoryFrame(s: Sprite): void {
  const wood = add(s, '#9a6236', { lift: .3, drop: .3 })
  const gold = add(s, '#e8b43a', { lift: .38, drop: .26 })
  const rose = add(s, STAGE_COLORS.romance, { lift: .36 })
  const n = 48, edge = 1, band = 8
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.min(x, y, n - 1 - x, n - 1 - y)
    if (d < edge || d > edge + band) continue
    // A gold bead on the outer lip, the wood moulding lit top-left, shaded bottom-right, a gold inner fillet.
    const k = d - edge
    const lit = (y === d || x === d) && x + y < n - 1
    if (k === 0) s.paint(x, y, gold, lit ? 4 : 2)
    else if (k === band) s.paint(x, y, gold, lit ? 3 : 4)
    else s.paint(x, y, wood, k === 1 || k === 4 ? (lit ? 5 : 2) : lit ? 4 : k === 7 ? 1 : 3)
  }
  // The corners: a small gold heart on each, inside the 12px corner cells.
  for (const [cx, cy] of [[6, 6], [42, 6], [6, 42], [42, 42]] as const) {
    const heart = heartMask(s, cx, cy - 2.4, 2.4)
    heart.each((x, y) => s.paint(x, y, rose, x + y < cx + cy - 1 ? 5 : 3))
  }
}

// ---- The five plays (16px) ----

export function playIcon(s: Sprite, key: PlayMark): void {
  s.shadow = { cx: 8, cy: 14.4, rx: 5.8, ry: .7, alpha: 40 }
  if (key === 'cast') {
    // A rod from the lower left, its line falling to a red and white float.
    const rod = add(s, '#8a5a36', { lift: .3 })
    const line = add(s, '#dfe8ee', { lift: .1 })
    const float = add(s, '#e0443c', { lift: .34 })
    stroke(s, 2, 13, 10, 2, rod, 3); stroke(s, 3, 13, 11, 2, rod, 4)
    rect(s, rod, 2, 12, 4, 13, 2)
    stroke(s, 11, 2, 12, 9, line, 4)
    dome(s, Mask.circle(12.4, 10.8, 1.7, 16, 16), float, .4)
    s.paint(12, 9, line, 5); s.paint(13, 9, line, 5)
    return
  }
  if (key === 'pick') {
    // A woven basket with a gold star over it.
    const wicker = add(s, '#c08a4a', { lift: .3, drop: .3 })
    const gold = add(s, '#f2c23a', { lift: .4 })
    const basket = poly(s, [[2, 8], [14, 8], [12.6, 14], [3.4, 14]])
    dome(s, basket, wicker, .3)
    basket.each((x, y) => { if ((x + y) % 3 === 0) s.shift(x, y, -1) })
    for (let x = 2; x <= 13; x++) s.paint(x, 8, wicker, 5)
    stroke(s, 4, 8, 6, 5, wicker, 4); stroke(s, 6, 5, 10, 5, wicker, 4); stroke(s, 10, 5, 12, 8, wicker, 3)
    const star: Point[] = []
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.3 : 3; star.push([8 + Math.cos(a) * r, 4.2 + Math.sin(a) * r]) }
    dome(s, poly(s, star), gold, .4)
    return
  }
  if (key === 'rhythm') {
    // A small drum: a red shell, a pale head, two sticks crossed above it.
    const shell = add(s, '#c94a3c', { lift: .34, drop: .28 })
    const head = add(s, '#f2e6c8', { lift: .2 })
    const stick = add(s, '#9a6a3c', { lift: .3 })
    rect(s, shell, 3, 9, 12, 13, 3); rect(s, shell, 3, 9, 3, 13, 4); rect(s, shell, 12, 9, 12, 13, 2)
    for (const x of [5, 8, 11]) for (let y = 10; y <= 12; y++) s.paint(x, y, head, (x + y) % 2 ? 3 : 4)
    dome(s, Mask.ellipse(7.5, 8.6, 5, 1.8, 0, 16, 16), head, .3)
    stroke(s, 2, 3, 8, 7, stick, 4); stroke(s, 13, 3, 7, 7, stick, 3)
    s.paint(2, 3, stick, 5); s.paint(13, 3, stick, 5)
    return
  }
  if (key === 'walk') {
    // A pale path forking in two between grass tufts, a dark signpost at the fork with arrow boards pointing apart.
    const path = add(s, '#e6d4a8', { lift: .16, drop: .3 })
    const grass = add(s, '#5aa346', { lift: .3 })
    const post = add(s, '#6e4628', { lift: .3 })
    const fork = poly(s, [[6, 13.6], [10, 13.6], [9.2, 10.4], [13.6, 7.4], [12.6, 6.2], [8, 9.4], [3.4, 6.2], [2.4, 7.4], [6.8, 10.4]])
    dome(s, fork, path, .15)
    for (const [x, y] of [[3, 12], [4, 11], [12, 12], [11, 11], [2, 13], [13, 13]] as const) s.paint(x, y, grass, (x + y) % 2 ? 4 : 3)
    vline(s, post, 8, 2, 9)
    // The boards: left one higher pointing left, right one lower pointing right, each with an arrow tip.
    for (let x = 3; x <= 7; x++) { s.paint(x, 2, post, 4); s.paint(x, 3, post, 3) }
    s.paint(2, 3, post, 3)
    for (let x = 9; x <= 12; x++) { s.paint(x, 5, post, 4); s.paint(x, 6, post, 2) }
    s.paint(13, 5, post, 4)
    return
  }
  // Choose: three small boxes; the middle one lifted inside a gold ring, the one chosen.
  const box = add(s, '#7a9cc6', { lift: .3, drop: .28 })
  const ribbon = add(s, '#f2e6c8', { lift: .2 })
  const gold = add(s, '#f2c23a', { lift: .4 })
  const ring = Mask.circle(8, 6.4, 4.4, 16, 16).subtract(Mask.circle(8, 6.4, 3.2, 16, 16))
  ring.each((x, y) => s.paint(x, y, gold, x + y < 13 ? 5 : 3))
  for (const [x0, y0, w] of [[2, 10, 3], [6, 5, 4], [11, 10, 3]] as const) {
    rect(s, box, x0, y0, x0 + w - 1, y0 + w - 1, 3)
    for (let x = x0; x < x0 + w; x++) s.paint(x, y0, box, 5)
    s.paint(x0, y0 + 1, box, 4)
    s.paint(x0 + 1, y0 + 1, ribbon, 5); s.paint(x0 + 2, y0 + 1, ribbon, 4)
  }
}
