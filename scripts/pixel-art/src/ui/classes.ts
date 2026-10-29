import { halo } from '../items/refined/workbench-kit.ts'
import { hex } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add, stroke } from '../tiles/props/kit.ts'
import { TIER0, type Class } from './spec.ts'

export function classEmblem(s: Sprite, kind: Class): void {
  s.shadow = { cx: 12, cy: 22, rx: 8, ry: 1, alpha: 62 }
  if ((TIER0 as readonly string[]).includes(kind)) { beginner(s, kind); return }
  const steel = add(s, '#cadde8', { lift: 0.42, drop: 0.26 }), gold = add(s, '#d9b96b'), wood = add(s, '#8c674c')
  const poly = (points: readonly (readonly [number, number])[]) => Mask.polygon(points, 24, 24)
  const dome = (mask: Mask, id: number) => shadeDome(s, mask, id, { bias: 0.12, relief: 0.45, contact: false })
  if (kind === 'brawler') {
    // Axe behind the greatsword, crossed at the centre, with different head silhouettes.
    stroke(s, 5, 4, 20, 21, wood, 4)
    dome(poly([[3, 4], [8, 3], [11, 7], [9, 12], [6, 10], [5, 7], [2, 7]]), steel)
    dome(poly([[7, 17], [17, 4], [20, 2], [19, 7], [10, 19]]), steel)
    stroke(s, 4, 15, 13, 21, gold, 4)
    stroke(s, 7, 19, 4, 22, wood, 3)
  } else if (kind === 'mage') {
    const paper = add(s, '#e5ddc5', { lift: 0.36, drop: 0.2 })
    dome(poly([[3, 8], [8, 6], [12, 8], [16, 6], [21, 8], [21, 20], [16, 18], [12, 20], [8, 18], [3, 20]]), wood)
    dome(poly([[4, 9], [8, 7], [11, 9], [11, 18], [8, 16], [4, 18]]), paper)
    dome(poly([[13, 9], [16, 7], [20, 9], [20, 18], [16, 16], [13, 18]]), paper)
    stroke(s, 12, 8, 12, 19, gold, 3)
    for (const y of [11, 14]) { stroke(s, 5, y, 8, y - 1, paper, 2); stroke(s, 15, y - 1, 18, y, paper, 2) }
    dome(poly([[12, 2], [13, 4], [16, 5], [13, 6], [12, 9], [11, 6], [8, 5], [11, 4]]), gold)
  } else if (kind === 'spellblade' || kind === 'tomeblade') {
    const violet = add(s, '#a28ac8', { lift: 0.38, drop: 0.26 }), flipped = kind === 'tomeblade'
    // A blue-grey steel edge keeps the swapped ring distinct from the violet ring even at native size.
    // The ordinary emblems retain their original dark ramp; only this new steel ring uses the brighter outline.
    if (flipped) s.ramps[steel]![0] = hex('#50627f')
    spellblade(s, flipped ? violet : steel, flipped ? steel : violet, gold, wood, flipped)
  } else if (kind === 'cleric') {
    const shield = add(s, '#73a89e', { lift: 0.34, drop: 0.25 })
    dome(poly([[5, 12], [18, 12], [18, 17], [12, 22], [5, 17]]), shield)
    stroke(s, 11, 14, 11, 19, gold, 4); stroke(s, 8, 16, 15, 16, gold, 3)
    dome(Mask.circle(12, 7, 4, 24, 24).subtract(Mask.circle(12, 7, 2.5, 24, 24)), gold)
    for (const [x, y] of [[12, 1], [6, 7], [18, 7], [8, 3], [16, 3]] as const) s.paint(x, y, gold, 5)
  } else if (kind === 'paladin') {
    // H54: a tall tower shield face on, in the Knight's Bastion banner's blue and gold, a sword's hilt rising behind
    // its flat top. Told apart by silhouette: tall and upright with a cross on top, not a small heater under a halo.
    const blue = add(s, '#3858b8', { lift: 0.18 }), crest = add(s, '#e6b640', { lift: 0.4 })
    const tower = (inset: number) => Mask.from((px, py) => {
      const left = 7 + inset, right = 17 - inset, top = 8 + inset, foot = 21.7 - inset, knee = 18
      if (px < left || px > right || py < top || py > foot) return false
      return py <= knee || ((px - 12) / ((right - left) / 2)) ** 2 + ((py - knee) / (foot - knee)) ** 2 <= 1
    }, 24, 24)
    // The hilt behind the shield: pommel, wrapped grip, crossguard, then a steel stub of blade.
    s.paint(11, 1, crest, 5); s.paint(12, 1, crest, 3)
    stroke(s, 11, 2, 11, 3, wood, 3); stroke(s, 12, 2, 12, 3, wood, 2)
    stroke(s, 8, 4, 11, 4, crest, 4); stroke(s, 12, 4, 15, 4, crest, 3)
    stroke(s, 11, 5, 11, 7, steel, 4); stroke(s, 12, 5, 12, 7, steel, 3)
    dome(tower(0), crest)
    dome(tower(1), blue)
    const star = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 1.8 : 4
      return [12 + r * Math.cos(a), 14.8 + r * Math.sin(a)] as const
    })
    dome(poly(star), crest)
  } else {
    const flipped = kind === 'armsummoner'
    const rune = add(s, flipped ? '#d9b96b' : '#70b6b5')
    const spirit = flipped ? steel : add(s, '#b6d2ea', { lift: 0.45, drop: 0.24 }), eye = add(s, flipped ? '#5b4334' : '#58628b')
    summoner(s, rune, spirit, eye, flipped)
  }
}

// Mirror the geometry before shading, so both channels still receive light from the top left.
function geometry(s: Sprite, flipped = false) {
  return {
    x: (x: number) => flipped ? 23 - x : x,
    poly: (points: readonly (readonly [number, number])[]) => Mask.polygon(points.map(([x, y]) => [flipped ? 24 - x : x, y] as const), 24, 24),
    dome: (mask: Mask, id: number) => shadeDome(s, mask, id, { bias: .12, relief: .45, contact: false }),
  }
}
function spellblade(s: Sprite, blade: number, rune: number, gold: number, wood: number, flipped: boolean) {
  const { x, poly, dome } = geometry(s, flipped)
  dome(Mask.circle(12, 12, 8.3, 24, 24).subtract(Mask.circle(12, 12, 6.3, 24, 24)), rune)
  for (const [xx, y] of [[5, 7], [17, 6], [18, 16], [7, 18]] as const) s.paint(x(xx), y, rune, 5)
  dome(poly([[7, 17], [17, 4], [20, 2], [19, 7], [10, 19]]), blade)
  stroke(s, x(4), 15, x(13), 21, gold, 4); stroke(s, x(7), 19, x(4), 22, wood, 3)
  halo(s, '#c4b1ef', 32, 1)
}
function summoner(s: Sprite, rune: number, spirit: number, eye: number, flipped: boolean) {
  const { x, poly, dome } = geometry(s, flipped)
  dome(Mask.ellipse(12, 18, 8.5, 3.2, 0, 24, 24).subtract(Mask.ellipse(12, 18, 6, 1.4, 0, 24, 24)), rune)
  dome(poly([[12, 2], [17, 7], [16, 12], [14, 15], [10, 13], [7, 14], [8, 10], [7, 7]]), spirit)
  s.paint(x(10), 8, eye, 1); s.paint(x(14), 8, eye, 1)
  for (const [xx, y] of [[5, 17], [12, 20], [18, 17]] as const) s.paint(x(xx), y, rune, 5)
  halo(s, flipped ? '#ead9a6' : '#c7e7f3', 28, 1)
}
function beginner(s: Sprite, kind: Class) {
  const iron = add(s, '#9aa3a8', { lift: .35 }), wood = add(s, '#8c674c'), paper = add(s, '#e5ddc5')
  const { poly, dome } = geometry(s)
  const box = (x0: number, y0: number, x1: number, y1: number) => Mask.from((x, y) => x >= x0 && x < x1 && y >= y0 && y < y1, 24, 24)
  if (kind === 'recruit') {
    stroke(s, 13, 4, 13, 21, wood, 3)
    dome(poly([[4, 4], [12, 4], [12, 12], [7, 13], [4, 10]]).subtract(box(6, 6, 11, 10)), iron)
  } else if (kind === 'duelist') {
    dome(poly([[12, 2], [13, 5], [13, 14], [11, 14], [11, 5]]), iron)
    dome(Mask.circle(12, 16, 2.2, 24, 24), iron)
    stroke(s, 11, 18, 11, 21, wood, 3)
  } else if (kind === 'acolyte') {
    dome(poly([[5, 5], [19, 5], [18, 14], [12, 20], [6, 14]])
      .subtract(poly([[7, 7], [17, 7], [16, 13], [12, 17], [8, 13]])), iron)
    dome(Mask.circle(12, 11, 1.3, 24, 24), wood)
  } else if (kind === 'caller') {
    // The larger opening survives the renderer's inner outline as a truly transparent hollow.
    dome(Mask.ellipse(12, 18, 8.5, 3.2, 0, 24, 24).subtract(Mask.ellipse(12, 18, 6.5, 2.2, 0, 24, 24)), iron)
    dome(poly([[12, 10], [14, 13], [12, 14], [11, 13]]), paper)
  } else {
    dome(box(6, 4, 17, 21).subtract(box(8, 6, 15, 19)), wood)
    dome(box(17, 5, 19, 20), paper)
    dome(box(15, 11, 19, 13), iron)
  }
}
