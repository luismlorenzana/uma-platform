// uma-farm F25 part A (P126): native 16px marks for the farm's account bar, goods and calendar, and the seed-packet
// badge drawn over a crop's 32px icon. Each reads by its shape, not only its colour.
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add, stroke } from '../tiles/props/kit.ts'
import type { FarmMark, Season } from './spec.ts'

const poly = (s: Sprite, points: readonly Point[]) => Mask.polygon(points, s.w, s.h)
const dome = (s: Sprite, mask: Mask, color: number, relief = .45) => shadeDome(s, mask, color, { bias: .1, relief, contact: false })

/** A heart whose notch sits at (cx, top + 2), `r` lobes wide; points down to (cx, top + 2.4r + 1). */
function heartMask(s: Sprite, cx: number, top: number, r: number): Mask {
  const lobe = r * .55
  return Mask.from((px, py) => {
    const inLobe = Math.hypot(px - (cx - lobe), py - (top + lobe)) <= lobe + .15 || Math.hypot(px - (cx + lobe), py - (top + lobe)) <= lobe + .15
    const tip = top + lobe + r * 1.35
    const below = py >= top + lobe && py <= tip && Math.abs(px - cx) <= (tip - py) * (r * 1.1 / (tip - top - lobe)) + .2
    return inLobe || below
  }, s.w, s.h)
}

/** The farm's gold: a narrow stack of coins with one more lying flat beside it, unlike Prize Money's single coin face. */
export function goldCoin(s: Sprite): void {
  const gold = add(s, '#e2b13c', { lift: .36, drop: .26 })
  const edge = add(s, '#a8742a', { lift: .24 })
  s.shadow = { cx: 8, cy: 14, rx: 6.6, ry: .9, alpha: 40 }
  // The loose coin first, flat on the ground to the right: a thin side under an elliptical face.
  Mask.ellipse(10.8, 12, 2.9, 1.9, 0, 16, 16).each((x, y) => s.paint(x, y, edge, 2))
  const loose = Mask.ellipse(10.8, 11.2, 2.9, 1.6, 0, 16, 16)
  dome(s, loose, gold, .35)
  s.paint(10, 11, gold, 5)
  // The stack's side: a rounded column, milled into four coins by darker seams.
  const body = Mask.from((px, py) => (py >= 4 && py <= 12 && Math.abs(px - 6.4) <= 4) || Math.hypot((px - 6.4) / 4, (py - 12) / 1.6) <= 1, 16, 16)
  body.each((x, y) => s.paint(x, y, edge, x < 5 ? 4 : x > 8 ? 2 : 3))
  for (const seam of [6, 8, 10]) for (let x = 2; x <= 10; x++) if (body.get(x, seam)) s.paint(x, seam, edge, 1)
  // The top coin's face: bright, with a struck ring.
  const face = Mask.ellipse(6.4, 4, 4, 1.9, 0, 16, 16)
  dome(s, face, gold, .4)
  face.each((x, y) => { if (!face.get(x, y - 1)) s.paint(x, y, gold, 5) })
  for (const [x, y] of [[3, 4], [9, 4], [4, 5], [8, 5]] as const) s.paint(x, y, gold, 2)
  for (const [x, y] of [[5, 4], [6, 4], [6, 3]] as const) s.paint(x, y, gold, 5)
}

/** A paper seed packet with a crimped top and a printed sprout, set low and right to sit on a crop icon's corner. */
export function seedPacket(s: Sprite): void {
  const paper = add(s, '#efe2bf', { lift: .2, drop: .3 })
  const print = add(s, '#5aa346', { lift: .3 })
  const soil = add(s, '#8a5a34')
  const packet = poly(s, [[4, 3], [13, 3], [13, 13], [4, 13]])
  dome(s, packet, paper, .25)
  // Crimped top: a zigzag edge, then a fold line.
  for (let x = 4; x <= 13; x++) s.paint(x, 3, paper, x % 2 ? 2 : 4)
  for (let x = 4; x <= 13; x++) s.paint(x, 4, paper, 2)
  // A printed sprout over a soil line: a stem and two leaves.
  for (let x = 6; x <= 11; x++) s.paint(x, 11, soil, 3)
  stroke(s, 8, 10, 8, 7, print, 3)
  for (const [x, y, t] of [[7, 7, 4], [6, 6, 4], [9, 7, 4], [10, 6, 5], [9, 6, 3], [7, 6, 3]] as const) s.paint(x, y, print, t)
  s.paint(12, 5, paper, 5)
}

/** A goods' quality star: five points, gold, with a bright upper-left face. */
export function qualityStar(s: Sprite): void {
  const gold = add(s, '#f2c23a', { lift: .38, drop: .28 })
  s.shadow = { cx: 8, cy: 14.2, rx: 5.5, ry: .7, alpha: 40 }
  const points: Point[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.9 : 6.8
    points.push([8 + Math.cos(a) * r, 8.3 + Math.sin(a) * r])
  }
  const star = poly(s, points)
  dome(s, star, gold, .55)
  star.each((x, y) => { if (x + y < 14 && (!star.get(x - 1, y) || !star.get(x, y - 1))) s.paint(x, y, gold, 5) })
}

/** Bond: two hearts, a smaller one behind, warm red, parted by a dark seam; between two Umas. */
function bondHeart(s: Sprite): void {
  const red = add(s, '#e0443c', { lift: .34, drop: .26 })
  const rose = add(s, '#c0384a', { lift: .3 })
  s.shadow = { cx: 8, cy: 14.4, rx: 6, ry: .7, alpha: 40 }
  const rear = heartMask(s, 10.6, 2.6, 3.2), front = heartMask(s, 6.2, 5, 3.8)
  dome(s, rear, rose, .4)
  dome(s, front, red, .5)
  // Where the front heart meets the rear one, the rear heart darkens into a seam so the pair never merges.
  rear.each((x, y) => {
    if (front.get(x, y)) return
    if ([[0, -1], [-1, 0], [1, 0], [0, 1], [-1, 1]].some(([dx, dy]) => front.get(x + dx!, y + dy!))) s.paint(x, y, rose, 1)
  })
  s.paint(4, 7, red, 5); s.paint(5, 7, red, 5); s.paint(4, 8, red, 5)
}

/** Affinity: one heart, pink-magenta, tilted with a sparkle; yours with one Uma. */
function affinityHeart(s: Sprite): void {
  const pink = add(s, '#e05aa6', { lift: .36, drop: .26 })
  s.shadow = { cx: 8, cy: 14.4, rx: 5.5, ry: .7, alpha: 40 }
  const heart = heartMask(s, 7.5, 3.4, 4.6)
  dome(s, heart, pink, .5)
  s.paint(5, 5, pink, 5); s.paint(4, 6, pink, 5)
  // A small white four-point sparkle off the upper-right lobe.
  s.sparkle(13, 3, 1)
}

/** The Farm Rank: a gold rosette around a green disc, a cream barn gable at its heart, two green ribbon tails below. */
function rankRosette(s: Sprite): void {
  const gold = add(s, '#e0b440', { lift: .34, drop: .28 })
  const green = add(s, '#3f8f46', { lift: .3, drop: .3 })
  const cream = add(s, '#f6ead0', { lift: .18 })
  const barn = add(s, '#b8473a', { lift: .3 })
  // Two tails first, behind the rosette, flaring out and darkened at the ends.
  for (const [x0, dir] of [[6, -1], [9, 1]] as const) {
    for (let y = 10; y <= 13; y++) for (let k = 0; k < 2; k++) s.paint(x0 + dir * Math.floor((y - 10) / 2) + k, y, green, k ? 2 : 4)
  }
  s.paint(5, 13, green, 1); s.paint(10, 13, green, 1)
  // The rosette: a scalloped gold ring, clear of the frame's top row.
  const rosette = Mask.from((px, py) => {
    const a = Math.atan2(py - 7.2, px - 8), r = Math.hypot(px - 8, py - 7.2)
    return r <= 4.6 + .5 * Math.cos(a * 8)
  }, 16, 16)
  dome(s, rosette, gold, .4)
  // The green disc, then the barn: a gable over a square, a red roof, a dark door.
  dome(s, Mask.circle(8, 7.2, 3.1, 16, 16), green, .3)
  const gable = poly(s, [[8, 4.4], [10.4, 6.6], [10.4, 9.6], [5.6, 9.6], [5.6, 6.6]])
  gable.each((x, y) => s.paint(x, y, cream, y < 7 ? 5 : 4))
  s.paint(7, 6, barn, 3); s.paint(8, 6, barn, 3)
  s.paint(7, 8, barn, 2); s.paint(8, 8, barn, 2); s.paint(7, 9, barn, 1); s.paint(8, 9, barn, 1)
}

export function farmMark(s: Sprite, key: FarmMark): void {
  if (key === 'seed-packet') seedPacket(s)
  else if (key === 'star') qualityStar(s)
  else if (key === 'heart-bond') bondHeart(s)
  else if (key === 'heart-affinity') affinityHeart(s)
  else rankRosette(s)
}

/** The calendar's four seasons: a blossom, a sun, a leaf, a snowflake, each in its season's colour. */
export function seasonMark(s: Sprite, key: Season): void {
  if (key === 'spring') {
    const petal = add(s, '#f4a0bf', { lift: .34, drop: .26 })
    const heart = add(s, '#f2c84a', { lift: .3 })
    // Five round petals with real notches between them, so the blossom's outline is a five-lobed star.
    const flower = Mask.from((px, py) => {
      const r = Math.hypot(px - 8, py - 8), at = Math.atan2(py - 8, px - 8)
      for (let i = 0; i < 5; i++) {
        const seam = -Math.PI / 2 + (i + .5) * 2 * Math.PI / 5
        const off = Math.abs(Math.atan2(Math.sin(at - seam), Math.cos(at - seam))) * r
        if (r > 3.3 && off < .9) return false
      }
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 5
        if (Math.hypot(px - (8 + Math.cos(a) * 3.6), py - (8 + Math.sin(a) * 3.6)) <= 2.8) return true
      }
      return false
    }, 16, 16)
    dome(s, flower, petal, .5)
    // Darker seams between the petals, from the heart outward, so five petals read at 1×.
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i + .5) * 2 * Math.PI / 5
      for (const r of [2.2, 3.2, 4.2]) {
        const x = Math.floor(8 + Math.cos(a) * r), y = Math.floor(8 + Math.sin(a) * r)
        if (flower.get(x, y)) s.paint(x, y, petal, r > 4 ? 1 : 2)
      }
    }
    dome(s, Mask.circle(8, 8, 1.6, 16, 16), heart, .3)
    return
  }
  if (key === 'summer') {
    const sun = add(s, '#f5b52e', { lift: .4, drop: .26 })
    const ray = add(s, '#f08a24', { lift: .3 })
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, x0 = 8 + Math.cos(a) * 4.6, y0 = 8 + Math.sin(a) * 4.6, x1 = 8 + Math.cos(a) * 5.8, y1 = 8 + Math.sin(a) * 5.8
      stroke(s, Math.round(x0 - .5), Math.round(y0 - .5), Math.round(x1 - .5), Math.round(y1 - .5), ray, i % 2 ? 3 : 4)
    }
    dome(s, Mask.circle(8, 8, 3.8, 16, 16), sun, .6)
    s.paint(6, 6, sun, 5)
    return
  }
  if (key === 'autumn') {
    const leaf = add(s, '#e0682c', { lift: .34, drop: .28 })
    const vein = add(s, '#9a3a1e')
    const stem = add(s, '#7a4a26')
    // A maple-like leaf, toothed, tilted on its stem as if just fallen, the stem down to the lower left.
    const turn = (pts: readonly Point[]): Point[] => pts.map(([x, y]) => {
      const a = .8, dx = x - 8, dy = y - 7.5
      return [8 + dx * Math.cos(a) - dy * Math.sin(a), 7.5 + dx * Math.sin(a) + dy * Math.cos(a)] as const
    })
    const lobes = poly(s, turn([[8, 1.8], [9.6, 4.4], [12, 3.4], [11.4, 6.2], [14, 6.8], [12.4, 9], [12.8, 10.8], [9.4, 10.4],
      [8.6, 11.6], [7.4, 11.6], [6.6, 10.4], [3.2, 10.8], [3.6, 9], [2, 6.8], [4.6, 6.2], [4, 3.4], [6.4, 4.4]]))
    dome(s, lobes, leaf, .5)
    const line = (pts: Point[], id: number) => stroke(s, Math.round(pts[0]![0]), Math.round(pts[0]![1]), Math.round(pts[1]![0]), Math.round(pts[1]![1]), id, 3)
    line(turn([[8, 4], [8, 11]]), vein)
    line(turn([[8, 8], [4.4, 7]]), vein); line(turn([[8, 8], [11.6, 7]]), vein)
    line(turn([[8, 11.6], [8, 14.2]]), stem)
    return
  }
  const ice = add(s, '#8fd0f0', { lift: .34, drop: .3 })
  // Six arms with a pair of side branches each, around a solid hub.
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 3, ex = 8 + Math.cos(a) * 5.6, ey = 8 + Math.sin(a) * 5.6
    stroke(s, 8, 8, Math.round(ex - .5), Math.round(ey - .5), ice, i < 3 ? 4 : 3)
    const bx = 8 + Math.cos(a) * 4, by = 8 + Math.sin(a) * 4
    for (const side of [-1, 1]) {
      const b = a + side * Math.PI / 3.2
      s.paint(Math.round(bx + Math.cos(b) * 1.6 - .5), Math.round(by + Math.sin(b) * 1.6 - .5), ice, 4)
    }
  }
  dome(s, Mask.circle(8.5, 8.5, 1.6, 16, 16), ice, .3)
}
