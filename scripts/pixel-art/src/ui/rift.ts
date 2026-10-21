// H38 / uma-rpg D161: the Rift's four front crests (16×16) and eleven achievement badges (24×24). Every frame is
// painted at its own grid, never scaled from another. Crests differ by silhouette: a sword, a star, one mask, three.
import { hex } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add } from '../tiles/props/kit.ts'
import { FRONTS, type Achievement, type Front } from './spec.ts'

/** Each front's colour: the wax of its seal, its crest, and its rim stone on the Rift building. */
export const FRONT_COLORS: Record<Front, string> = { iron: '#a6b5bd', arcane: '#a77be0', duel: '#c8443e', horde: '#d98a3a' }
const RIBBON_COLORS: Record<Front, string> = { iron: '#6c7c88', arcane: '#6a4ba6', duel: '#8a2c2c', horde: '#a45c22' }
const BONE = '#ece0c4'
const CLOTH = '#5a50a8'

type Cell = readonly [ramp: number, tone: number]

/** Paints a character grid at (ox, oy); '.' and unknown characters stay empty. */
function grid(s: Sprite, rows: readonly string[], palette: Record<string, Cell>, ox = 0, oy = 0): void {
  for (const [y, row] of rows.entries())
    for (const [x, c] of [...row].entries()) {
      const cell = palette[c]
      if (cell) s.paint(ox + x, oy + y, cell[0], cell[1])
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Front crests, 16×16: a broadsword, a diamond star, one horned mask, three horned masks.

export function frontCrest(s: Sprite, front: Front): void {
  s.shadow = { cx: 8, cy: 14.2, rx: 5.6, ry: 0.8, alpha: 44 }
  if (front === 'iron') {
    const steel = add(s, FRONT_COLORS.iron, { lift: 0.42, drop: 0.26 })
    const iron = add(s, '#6d7480', { lift: 0.36, drop: 0.25 })
    // Point down: pommel, grip, a broad iron guard, then a long blade with a lit left half.
    grid(s, [
      '.......Gg.......',
      '.......gf.......',
      '.......fh.......',
      '.......fh.......',
      '.Gggggggggggggg.',
      '.gfffffffffffff.',
      '......LlBb......',
      '......LlBb......',
      '......LlBb......',
      '......LlBb......',
      '......LlBb......',
      '......LlBb......',
      '.......lB.......',
      '.......lB.......',
    ], {
      G: [iron, 5], g: [iron, 4], f: [iron, 2], h: [iron, 1],
      L: [steel, 4], l: [steel, 5], B: [steel, 3], b: [steel, 2],
    }, 0, 1)
    return
  }
  if (front === 'arcane') {
    const violet = add(s, FRONT_COLORS.arcane, { lift: 0.48, drop: 0.26 })
    // Long rays up and down, short ones across: each ray has a lit and a shaded facet, the core is near white.
    grid(s, [
      '.......h........',
      '.......hb.......',
      '.......hb.....s.',
      '......lhbb...sWs',
      '......lhbb....s.',
      '.....llWWbb.....',
      '.lllllhWWbbbbbb.',
      '..lllhhWWbbbbb..',
      '.....llhbbb.....',
      '......lhbb......',
      '.s....lhbb......',
      'sWs....hb.......',
      '.s.....hb.......',
      '.......hb.......',
      '........b.......',
    ], { W: [violet, 5], h: [violet, 5], l: [violet, 4], b: [violet, 2], s: [violet, 4] }, 0, 0)
    // The two sparks' cores are near white.
    s.overlay(14, 3, hex('#ffffff', 220))
    s.overlay(1, 11, hex('#ffffff', 220))
    return
  }
  if (front === 'duel') {
    const red = add(s, FRONT_COLORS.duel, { lift: 0.36, drop: 0.26 })
    const bone = add(s, BONE, { lift: 0.4, drop: 0.22 })
    const dark = add(s, '#2a1820')
    // One horned mask, face on: short horns from the brow, a bone rim, a crimson face, two slanted eye slits.
    grid(s, [
      '................',
      '.H............h.',
      '.Hh..........hk.',
      '..Hh.RRRrrr.hk..',
      '...hRFFFfffrk...',
      '...RFFFffffdr...',
      '...RFddffdddr...',
      '...RFEEffEEdr...',
      '...RFfEffEfdr...',
      '...RFffffffdr...',
      '...RfffDDfddr...',
      '....Rffffddr....',
      '.....Rfdddr.....',
      '......rrrr......',
    ], {
      H: [bone, 5], h: [bone, 4], k: [bone, 2], R: [bone, 4], r: [bone, 2],
      F: [red, 4], f: [red, 3], d: [red, 2], D: [red, 1], E: [dark, 1],
    })
    return
  }
  const amber = add(s, FRONT_COLORS.horde, { lift: 0.24, drop: 0.26 })
  const bone = add(s, BONE, { lift: 0.4, drop: 0.22 })
  const dark = add(s, '#2e1c14')
  // Three smaller horned masks in a pyramid: the top one behind, the two below in front.
  const mask = ['H.....H', '.hGFfh.', 'GFFFffd', 'FFEfEdd', '.FfffD.', '..fdD..']
  const palette: Record<string, Cell> = {
    H: [bone, 5], h: [bone, 3], G: [amber, 5],
    F: [amber, 4], f: [amber, 3], d: [amber, 2], D: [amber, 1], E: [dark, 1],
  }
  grid(s, mask, palette, 4, 2)
  grid(s, mask, palette, 1, 8)
  grid(s, mask, palette, 7, 8)
}

// ---------------------------------------------------------------------------------------------------------------
// Achievement badges, 24×24.

/** Each front's crest motif simplified for a seal's impression: '#' pressed into the wax. */
const SEAL_MOTIFS: Record<Front, readonly string[]> = {
  iron: [
    '.....#.....',
    '.....#.....',
    '.#########.',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '.....#.....',
  ],
  arcane: [
    '.....#.....',
    '.....#...#.',
    '....###....',
    '...#####...',
    '###########',
    '...#####...',
    '....###....',
    '.#...#.....',
    '.....#.....',
  ],
  duel: [
    '.#.......#.',
    '.##.....##.',
    '..#######..',
    '.#########.',
    '.#..###..#.',
    '.#########.',
    '..#######..',
    '...#####...',
    '....###....',
  ],
  horde: [
    '...#...#...',
    '...#####...',
    '...#.#.#...',
    '....###....',
    '#...#.#...#',
    '#####.#####',
    '#.#.#.#.#.#',
    '#####.#####',
    '.###...###.',
  ],
}

function seal(s: Sprite, front: Front): void {
  const wax = add(s, FRONT_COLORS[front], { lift: 0.36, drop: 0.26 })
  const ribbon = add(s, RIBBON_COLORS[front], { lift: 0.3, drop: 0.26 })
  s.shadow = { cx: 12.5, cy: 22.4, rx: 7.5, ry: 1, alpha: 56 }
  const cx = 12.5, cy = 9.5
  // Two ribbon tails behind the seal, splayed out, each ending in a notch: lit on the left, darker on the right.
  for (const flip of [false, true]) {
    const x = (v: number) => (flip ? 25 - v : v)
    const m = Mask.polygon([[x(8.5), 12], [x(12.6), 13], [x(10.6), 23], [x(8.3), 20.4], [x(5.2), 22.4]], 24, 24)
    m.each((px, py) => {
      const edge = flip ? !m.get(px + 1, py) : !m.get(px - 1, py)
      s.paint(px, py, ribbon, edge ? (flip ? 1 : 4) : flip ? 2 : 3)
    })
  }
  // The pressed wax: a lumpy round blob, lit as a low dome, with a dark seam where it sits on the ribbons.
  const blob = Mask.from((px, py) => {
    const a = Math.atan2(py - cy, px - cx)
    const r = 8.1 + 0.5 * Math.cos(a * 6 + 2.1) + 0.2 * Math.cos(a * 11 + 0.6)
    return Math.hypot(px - cx, py - cy) <= r
  }, 24, 24)
  shadeDome(s, blob, wax, { contact: true, relief: 0.55, bias: 0.04 })
  // The crest, pressed in: the recess is dark, its upper-left wall darker still, its lower-right wall catches light.
  const rows = SEAL_MOTIFS[front]
  const ox = Math.round(cx - rows[0]!.length / 2), oy = Math.round(cy - rows.length / 2)
  const pressed = (x: number, y: number) => rows[y - oy]?.[x - ox] === '#'
  for (let y = oy - 1; y <= oy + rows.length; y++)
    for (let x = ox - 1; x <= ox + rows[0]!.length; x++) {
      if (pressed(x, y)) s.paint(x, y, wax, !pressed(x - 1, y) || !pressed(x, y - 1) ? 1 : 2)
      else if (pressed(x - 1, y) || pressed(x, y - 1)) s.paint(x, y, wax, 4)
    }
}

function crown(s: Sprite): void {
  const gold = add(s, '#e3b448', { lift: 0.42, drop: 0.25 })
  const gems = FRONTS.map(f => add(s, FRONT_COLORS[f], { lift: 0.45 }))
  s.shadow = { cx: 12, cy: 20.6, rx: 8, ry: 1, alpha: 52 }
  // A short lilac glow under and behind the crown, kept off the frame's corners.
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 24; x++) {
      const d = Math.hypot((x + 0.5 - 12) / 10.5, (y + 0.5 - 15) / 7.5)
      if (d < 1) s.overlay(x, y, hex('#cfb3ef', Math.round(120 * (1 - d) ** 1.4)))
    }
  // Three tall points and two short ones over a deep band.
  const body = Mask.polygon([[3, 19], [3, 8], [6.5, 12.5], [8, 9], [12, 3], [16, 9], [17.5, 12.5], [21, 8], [21, 19]], 24, 24)
  shadeDome(s, body, gold, { contact: false, relief: 0.45, bias: 0.06 })
  // The band: a lit top rim, a darker field, and four gems in the fronts' colours.
  for (let x = 3; x <= 20; x++) {
    s.paint(x, 13, gold, x < 6 ? 5 : 4)
    for (let y = 14; y <= 17; y++) s.paint(x, y, gold, y === 17 ? 2 : 3)
    s.paint(x, 18, gold, 1)
  }
  ;[5, 9, 13, 17].forEach((x, i) => {
    s.paint(x, 15, gems[i]!, 5)
    s.paint(x + 1, 15, gems[i]!, 3)
    s.paint(x, 16, gems[i]!, 3)
    s.paint(x + 1, 16, gems[i]!, 2)
  })
  // Pearls on the three tall points.
  for (const [x, y] of [[3, 7], [12, 2], [20, 7]] as const) {
    s.paint(x, y, gold, 5)
    s.paint(x, y + 1, gold, 4)
  }
  s.sparkle(8, 10, 1)
}

/**
 * Title pictograms, 12×12, on the shared banner: 'i' light ink, 'I' its highlight, 's' its shade, 'a' the title's
 * accent, 'A' / 'b' its light / dark. Crossover's pips '1'–'6' take the six class hues instead of an accent.
 */
export const TITLE_PICTOGRAMS: Record<Exclude<Achievement, `seal-${Front}` | 'rift-conquered'>, { accent: string; rows: readonly string[] }> = {
  'iron-will': {
    accent: '#9fb6cf',
    rows: [
      '............',
      '..II.II.II..',
      '.iIIbIIbIIi.',
      '.iiibiibiis.',
      '.IIIIIIIbis.',
      '.iiiiiiibis.',
      '..iiiiiiis..',
      '...ssssss...',
      '...aAAAAa...',
      '...aaaaaa...',
      '...bbbbbb...',
      '............',
    ],
  },
  'arcane-purity': {
    accent: '#a77be0',
    rows: [
      '.....i....i.',
      '.....i...iIi',
      '....iai...i.',
      '....iaai....',
      '...iaaaai...',
      '..iAAaaaai..',
      '..iAaaaaai..',
      '..iaaaaabi..',
      '..iaaaabbi..',
      '...iabbbi...',
      '....iiii....',
      '............',
    ],
  },
  untouched: {
    accent: '#ef6f86',
    rows: [
      '...iIIIIi...',
      '..s......s..',
      '...siiiis...',
      '............',
      '.aAa....aaa.',
      'aAAaa..aaaab',
      'aAaaaaaaaaab',
      'aaaaaaaaaaab',
      '.aaaaaaaaab.',
      '..aaaaaaab..',
      '...aaaaab...',
      '....abbb....',
    ],
  },
  'swift-convergence': {
    accent: '#e6b23c',
    rows: [
      '............',
      '...IIIIII...',
      'II..iaai..II',
      'iII.iaai.IIi',
      '.iII.aa.IIi.',
      '..ss.ia.ss..',
      '....i..i....',
      '....iaai....',
      '...iaaaai...',
      '...IIIIII...',
      '............',
      '............',
    ],
  },
  bestiary: {
    accent: '#d8474a',
    rows: [
      '............',
      '.iii....iii.',
      'iIIIIisIIIIi',
      'iIIIaisaIIai',
      'iIIaIiaIIaIi',
      'iIaIIasIaIIi',
      'iaIIaisaIIIi',
      'iIIIIisIIIIi',
      'iiiiiisiiiii',
      '.sssss.ssss.',
      '............',
      '............',
    ],
  },
  crossover: {
    accent: '#efe6d2',
    rows: [
      '.....11.....',
      '.....11.....',
      '.66......22.',
      '.66......22.',
      '.....ii.....',
      '....iIIi....',
      '....iIIs....',
      '.55..ss..33.',
      '.55......33.',
      '.....44.....',
      '.....44.....',
      '............',
    ],
  },
}
/** Crossover's six pips: the six classes' hues, one each. */
const CROSSOVER_PIPS = ['#e0564a', '#e6b23c', '#7cc65a', '#4fc6b0', '#6fa8f2', '#d77ce0']

function banner(s: Sprite, key: keyof typeof TITLE_PICTOGRAMS): void {
  const cloth = add(s, CLOTH, { lift: 0.3, drop: 0.28 })
  const gold = add(s, '#e3b448', { lift: 0.42, drop: 0.25 })
  const ink = add(s, '#efe6d2', { lift: 0.5, drop: 0.2 })
  const { accent, rows } = TITLE_PICTOGRAMS[key]
  const acc = add(s, accent, { lift: 0.4, drop: 0.25 })
  const pips = CROSSOVER_PIPS.map(c => add(s, c, { lift: 0.4 }))
  s.shadow = { cx: 12, cy: 22.6, rx: 7, ry: 0.9, alpha: 50 }
  // The swallow-tailed cloth: lit left edge, a shaded right edge and tails, a shadow line under the rod.
  const body = Mask.polygon([[5, 3], [19, 3], [19, 22.5], [12, 17.5], [5, 22.5]], 24, 24)
  body.each((x, y) => {
    let tone = x === 5 ? 4 : x === 18 ? 2 : 3
    if (y === 4) tone = 2
    if (y >= 18) tone = Math.min(tone, x < 12 ? 3 : 2)
    if (!body.get(x, y + 1)) tone = Math.min(tone, 2)
    s.paint(x, y, cloth, tone)
  })
  // The rod, with round finials past the cloth.
  for (let x = 4; x <= 19; x++) {
    s.paint(x, 2, gold, x < 8 ? 5 : 4)
    s.paint(x, 3, gold, 2)
  }
  for (const x of [3, 20] as const) {
    s.paint(x, 1, gold, 4)
    s.paint(x, 2, gold, x === 3 ? 5 : 3)
    s.paint(x, 3, gold, 2)
  }
  // The pictogram, with a one-pixel shadow cast on the cloth for legibility.
  const palette: Record<string, Cell> = {
    i: [ink, 4], I: [ink, 5], s: [ink, 2], a: [acc, 3], A: [acc, 5], b: [acc, 2],
    ...Object.fromEntries(pips.map((id, n) => [String(n + 1), [id, 4] as Cell])),
  }
  const ox = 6, oy = 5
  const on = (x: number, y: number) => palette[rows[y - oy]?.[x - ox] ?? '.'] !== undefined
  for (let y = oy; y < oy + 13; y++)
    for (let x = ox; x < ox + 13; x++) if (!on(x, y) && on(x - 1, y - 1) && body.get(x, y)) s.paint(x, y, cloth, 1)
  grid(s, rows, palette, ox, oy)
  // Each pip is lit on its upper left and shaded on its lower right.
  for (const [y, row] of rows.entries())
    for (const [x, c] of [...row].entries()) {
      if (!/[1-6]/.test(c)) continue
      if (rows[y - 1]?.[x] !== c && row[x - 1] !== c) s.shift(ox + x, oy + y, 1)
      if (rows[y + 1]?.[x] !== c && row[x + 1] !== c) s.shift(ox + x, oy + y, -1)
    }
}

export function achievementBadge(s: Sprite, key: Achievement): void {
  if (key.startsWith('seal-')) seal(s, key.slice(5) as Front)
  else if (key === 'rift-conquered') crown(s)
  else banner(s, key as keyof typeof TITLE_PICTOGRAMS)
}
