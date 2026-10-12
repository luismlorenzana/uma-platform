// Eight-pixel glyphs on twelve-pixel badges. Red-violet debuffs and gold-teal buffs still differ by glyph, not colour.
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add } from '../tiles/props/kit.ts'
import { STATUSES, type Status } from './spec.ts'

export const GLYPHS: Record<Status, readonly string[]> = {
  'armor-break': ['.######.', '.##.###.', '.##.###.', '.###.##.', '..##.##.', '..#.#...', '...##...', '...#....'],
  'mind-break': ['...#....', '..#.#...', '.##.##..', '###.###.', '.###.#..', '..#.##..', '...##...', '...#....'],
  enfeeble: ['##......', '.##.....', '..####..', '..#..#..', '..####..', '...#....', '..###...', '...#....'],
  shatter: ['#....#..', '.#..#...', '..#...#.', '...#.#..', '.#.#....', '#....#..', '..#...#.', '....#...'],
  hex: ['........', '..####..', '.#....#.', '#..##..#', '#..##..#', '.#....#.', '..####..', '........'],
  brave: ['...#....', '..###...', '..###...', '..###...', '..###...', '.#####..', '...#....', '..###...'],
  faith: ['...#....', '..###...', '.#####..', '###.###.', '.#####..', '..###...', '..#.#...', '.#...#..'],
  aegis: ['#..#..#.', '.######.', '.######.', '.######.', '..####..', '..####..', '...##...', '...#....'],
  breaker: ['......#.', '...#.###', '..#####.', '..#####.', '.######.', '.#####..', '..###...', '...#....'],
  clarity: ['...#....', '..###...', '..###...', '.#####..', '.#####..', '.#####..', '..###...', '........'],
}

export function statusBadge(s: Sprite, key: Status): void {
  const buff = STATUSES.indexOf(key) >= 5, base = add(s, buff ? '#438d82' : '#9b5577', { lift: 0.3, drop: 0.25 })
  const rim = add(s, buff ? '#c8ad70' : '#b16a88', { lift: 0.32, drop: 0.24 }), ink = add(s, '#f4e7c9', { lift: 0.35, drop: 0.18 })
  s.shadow = { cx: 6, cy: 10.7, rx: 4.4, ry: 0.6, alpha: 48 }
  const badge = Mask.polygon(buff ? [[2, 1], [9, 1], [10, 2], [10, 9], [9, 10], [2, 10], [1, 9], [1, 2]]
    : [[3, 1], [8, 1], [10, 3], [10, 8], [8, 10], [3, 10], [1, 8], [1, 3]], 12, 12)
  shadeDome(s, badge, base, { bias: 0.08, relief: 0.35, contact: false })
  badge.each((x, y) => {
    if (!badge.get(x, y - 1) || !badge.get(x - 1, y)) s.paint(x, y, rim, 4)
  })
  for (const [y, row] of GLYPHS[key].entries())
    for (const [x, c] of [...row].entries()) if (c === '#') s.paint(2 + x, 2 + y, ink, y < 3 ? 5 : x < 4 ? 4 : 3)
}
