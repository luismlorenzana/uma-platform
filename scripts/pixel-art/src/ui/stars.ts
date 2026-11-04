// H141 / uma-rpg PP30. Native 24px celestial crests and 16px stat marks, never resampled from one another.
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add, stroke } from '../tiles/props/kit.ts'
import type { StarBody, StatMark } from './spec.ts'

export const STAR_COLORS: Record<StarBody, string> = {
  planet: '#ffd84d', prowess: '#ff9a6b', vigor: '#ff8fb6', guard: '#8fd3ff', template: '#f0b8ff',
}
export const STAT_COLORS: Record<StatMark, string> = {
  hp: STAR_COLORS.vigor, mp: '#79b4ff', atk: STAR_COLORS.prowess, matk: '#aaa0ff',
  def: '#b8c8dc', mdef: '#b8c8dc', evasion: STAR_COLORS.guard, limit: STAR_COLORS.planet,
}
const poly = (s: Sprite, points: readonly Point[]) => Mask.polygon(points, s.w, s.h)
const dome = (s: Sprite, mask: Mask, color: number) => shadeDome(s, mask, color, { bias: .1, relief: .45, contact: false })
const material = (s: Sprite, color: string) => add(s, color, { lift: .34, drop: .24 })

function heart(s: Sprite, color: number): void {
  const points: readonly Point[] = s.w === 24
    ? [[12, 7], [9, 4], [5, 4], [2, 7], [2, 11], [5, 16], [12, 22], [19, 16], [22, 11], [22, 7], [19, 4], [15, 4]]
    : [[8, 5], [6, 3], [3, 3], [2, 5], [2, 8], [4, 11], [8, 14], [12, 11], [14, 8], [14, 5], [13, 3], [10, 3]]
  dome(s, poly(s, points), color)
}

function shield(s: Sprite, color: number): void {
  const points: readonly Point[] = s.w === 24
    ? [[12, 2], [20, 5], [20, 12], [18, 16], [12, 21], [6, 16], [4, 12], [4, 5]]
    : [[8, 2], [13, 4], [13, 8], [11, 11], [8, 14], [5, 11], [3, 8], [3, 4]]
  const mask = poly(s, points)
  dome(s, mask, color)
  // A narrow bright upper/left rim; the recessed right face sits in its contact shadow.
  mask.each((x, y) => {
    if (!mask.get(x - 1, y) || !mask.get(x, y - 1)) s.paint(x, y, color, 4)
    else if (!mask.get(x + 1, y)) s.paint(x, y, color, 2)
  })
}

function spark(s: Sprite, cx: number, cy: number, radius: number): Mask {
  const neck = radius * .3
  return poly(s, [[cx, cy - radius], [cx + neck, cy - neck], [cx + radius, cy], [cx + neck, cy + neck],
    [cx, cy + radius], [cx - neck, cy + neck], [cx - radius, cy], [cx - neck, cy - neck]])
}

function planet(s: Sprite, gold: number): void {
  const brass = material(s, '#ffe7a3')
  const tilt = -24 * Math.PI / 180
  const ring = Mask.ellipse(12, 12, 10.3, 3.8, -24, 24, 24).subtract(Mask.ellipse(12, 12, 8.8, 2.3, -24, 24, 24))
  const near = (x: number, y: number) => -(x - 12) * Math.sin(tilt) + (y - 12) * Math.cos(tilt) >= 0
  const back = Mask.from((x, y) => ring.get(Math.floor(x), Math.floor(y)) && !near(x, y), 24, 24)
  dome(s, back, brass)
  const body = Mask.circle(12, 11.8, 6.8, 24, 24)
  // Keep a round, dark bevel between the globe and the rear ring: one gold silhouette would read as a cut gem.
  body.each((x, y) => s.paint(x, y, gold, 1))
  shadeDome(s, Mask.circle(12, 11.8, 5.8, 24, 24), gold, { bias: .08, relief: .9, contact: false })
  // The front arc crosses the sphere; a one-pixel contact seam sits just beneath it.
  ring.each((x, y) => {
    if (!near(x + .5, y + .5)) return
    if (body.get(x, y + 1)) s.paint(x, y + 1, gold, 1)
  })
  ring.each((x, y) => { if (near(x + .5, y + .5)) s.paint(x, y, brass, x < 12 ? 5 : 3) })
}

export function starCrest(s: Sprite, body: StarBody): void {
  const color = material(s, STAR_COLORS[body])
  if (body === 'planet') planet(s, color)
  else if (body === 'vigor') heart(s, color)
  else if (body === 'guard') shield(s, color)
  else if (body === 'prowess') {
    // Upright blade, short crossguard and wrapped grip; the small spark is separate at the upper right.
    stroke(s, 11, 17, 11, 20, color, 3); stroke(s, 12, 17, 12, 20, color, 2)
    dome(s, poly(s, [[12, 2], [14, 5], [14, 15], [10, 15], [10, 5]]), color)
    for (let x = 7; x <= 16; x++) { s.paint(x, 15, color, x < 12 ? 5 : 4); s.paint(x, 16, color, 2) }
    dome(s, Mask.circle(12, 21, 1.2, 24, 24), color)
    // The tiny rays meet on a pixel centre, so they remain a cross rather than rounding into a dot.
    dome(s, spark(s, 19.5, 6.5, 2.5), color)
  } else {
    const crescent = Mask.circle(11.5, 12, 9.5, 24, 24).subtract(Mask.circle(15.5, 9.8, 8.5, 24, 24))
    dome(s, crescent, color)
    dome(s, spark(s, 18.5, 9.5, 2.5), color)
  }
}

export function statMark(s: Sprite, stat: StatMark): void {
  const color = material(s, STAT_COLORS[stat])
  if (stat === 'hp') heart(s, color)
  else if (stat === 'mp') {
    dome(s, poly(s, [[8, 2], [11, 6], [13, 10], [12, 12], [10, 14], [6, 14], [4, 12], [3, 10], [5, 6]]), color)
  } else if (stat === 'atk') {
    stroke(s, 5, 11, 3, 13, color, 2)
    dome(s, poly(s, [[13, 2], [13, 5], [7, 11], [5, 9], [11, 3]]), color)
    stroke(s, 4, 8, 8, 12, color, t => t < .5 ? 5 : 3)
  } else if (stat === 'matk') dome(s, spark(s, 8, 8, 6), color)
  else if (stat === 'def' || stat === 'mdef') {
    shield(s, color)
    if (stat === 'mdef') {
      const violet = material(s, STAT_COLORS.matk), inset = spark(s, 7.5, 7.5, 3.5)
      // Incised, rather than a second shield shape: dark upper/left wall, lit lower/right lip.
      inset.each((x, y) => s.paint(x, y, violet, !inset.get(x - 1, y) || !inset.get(x, y - 1) ? 2 : 4))
    }
  } else if (stat === 'evasion') {
    dome(s, poly(s, [[2, 12], [5, 10], [8, 7], [10, 2], [11, 4], [11, 7], [14, 6], [13, 9], [11, 11], [7, 13], [2, 13]]), color)
    stroke(s, 4, 11, 9, 6, color, 5)
    stroke(s, 8, 11, 10, 9, color, 2)
  } else {
    // Eight rays, distinct from M.ATK's four-point spark, with a small bright core.
    const points = Array.from({ length: 16 }, (_, i): Point => {
      const angle = -Math.PI / 2 + i * Math.PI / 8, radius = i % 2 ? 2.8 : 6.2
      return [8 + Math.cos(angle) * radius, 8 + Math.sin(angle) * radius]
    })
    dome(s, poly(s, points), color)
    s.paint(7, 7, color, 5)
  }
}
