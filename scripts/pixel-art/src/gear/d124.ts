// H28: feet and defensive pendants. All masks share the 32px house light/shadow/outline helpers.
import { linePixels } from '../items/refined/workbench-kit.ts'
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { gemOf, glowPixels, jewel, legendaryHalo } from './fittings.ts'
import { CLOTHS, CORD, GOLD, HIDES, METALS, SILVER, use } from './materials.ts'

export const TALISMANS = ['vital', 'vampire', 'bulwark', 'iron', 'thorn'] as const
export const AMULETS = ['spring', 'siphon', 'veil', 'ward', 'mirror'] as const
type Pendant = typeof TALISMANS[number] | typeof AMULETS[number]
const band = (x: number, y: number, w: number, h: number) => Mask.polygon([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
function line(s: Sprite, points: readonly Point[], id: number, tone: number): void {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    for (const [x, y] of linePixels(a[0], a[1], b[0], b[1])) s.paint(x, y, id, tone)
  }
}
function finish(s: Sprite, g: number, glow: string, x: number, y: number): void {
  if (g >= 8) glowPixels(s, [[x - 1, y], [x, y - 1], [x, y + 1]], glow, g === 8 ? 25 : 45)
  if (g >= 9) legendaryHalo(s, glow, 45)
}

// A staggered pair: identical boot/slipper bounds, well above the bottom-right reserved square.
const SHOE = (x: number, y: number) => Mask.polygon([
  [x, y], [x + 6, y], [x + 6, y + 10], [x + 5, y + 14],
  [x - 3, y + 14], [x - 3, y + 11], [x, y + 9],
])
export function boots(s: Sprite, g: number): void { footwear(s, g, false) }
export function slippers(s: Sprite, g: number): void { footwear(s, g, true) }
function footwear(s: Sprite, g: number, magical: boolean): void {
  s.shadow = { cx: 15, cy: 27.5, rx: 10, ry: 1.6, alpha: 70 }
  const metal = METALS[g - 1]!, gem = gemOf(g)
  const main = use(s, magical ? CLOTHS[g - 1]! : metal)
  const lining = use(s, magical ? '#433754' : HIDES[g - 1]!)
  const trim = use(s, magical ? gem : g >= 7 ? GOLD : g >= 4 ? SILVER : metal)
  for (const [x, y] of [[18, 7], [7, 10]] as const) {
    const shoe = SHOE(x, y)
    shadeDome(s, shoe, main, { bias: x === 7 ? 0.15 : 0, relief: magical ? 0.65 : 1.05, contact: false })
    line(s, [[x - 2, y + 13], [x + 4, y + 13]], lining, 2) // sole
    shadeDome(s, band(x + 1, y, 4, 2), lining, { bias: 0.08, contact: false }) // open cuff
    if (magical) {
      line(s, [[x + 2, y + 3], [x + 1, y + 8], [x - 1, y + 10]], main, 4)
      // Cloth has a stitched vamp, not the sabaton's overlapping metal lames.
      for (let k = 0; k < 3; k++) s.paint(x - 1 + k * 2, y + 11, trim, k === 0 ? 4 : 3)
    } else {
      for (const dy of [5, 8, 11]) {
        line(s, [[x, y + dy], [x + 4, y + dy]], main, 2)
        line(s, [[x, y + dy - 1], [x + 4, y + dy - 1]], main, 4)
      }
    }
    if (g >= 2) s.paint(x + 4, y + 3, trim, 5)
    if (g >= 3) s.paint(x + 4, y + 7, trim, 4)
    if (g >= 4) {
      line(s, [[x, y + 2], [x + 5, y + 2]], trim, 4)
      line(s, [[x - 1, y + 10], [x + 4, y + 10]], trim, 3)
      if (magical) jewel(s, x + 1, y + 4, 2, gem)
    }
    if (g >= 7) {
      shadeDome(s, Mask.polygon([[x - 1, y], [x, y - 2], [x + 2, y], [x + 5, y - 1], [x + 6, y + 2], [x, y + 3]]), trim, { bias: 0.1, contact: false })
      jewel(s, x + 1, y + 4, 3, gem)
      line(s, [[x - 2, y + 12], [x + 3, y + 12]], trim, 4)
    }
  }
  finish(s, g, magical ? gem.glow ?? '#cfeefb' : metal.glow ?? '#b6c9ff', 9, 16)
}

function stroke(points: readonly Point[]): Mask {
  const out = new Mask()
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    for (const [x, y] of linePixels(a[0], a[1], b[0], b[1])) out.union(Mask.circle(x + 0.5, y + 0.5, 1.35))
  }
  return out
}
const SPIRAL: readonly Point[] = [[22, 13], [19, 10], [13, 10], [9, 13], [8, 18], [11, 23], [16, 24], [20, 21], [20, 17], [17, 14], [14, 15], [13, 18], [15, 20], [17, 18]]
const VINE: readonly Point[] = [[9, 24], [11, 20], [17, 17], [19, 13], [17, 10], [13, 11], [10, 14], [12, 17], [17, 20], [20, 24]]
const SHAPES: Record<Pendant, Mask> = {
  vital: Mask.polygon([[15, 12], [11, 9], [8, 10], [7, 14], [9, 18], [15, 25], [22, 17], [23, 13], [21, 10], [18, 9]]),
  vampire: Mask.polygon([[10, 10], [21, 10], [22, 14], [20, 18], [16, 22], [10, 25], [13, 20], [14, 15], [10, 14]]),
  bulwark: Mask.polygon([[8, 10], [22, 10], [22, 19], [20, 23], [15, 27], [10, 23], [8, 19]]),
  iron: Mask.polygon([[6, 11], [24, 11], [23, 14], [20, 17], [17, 17], [17, 21], [21, 23], [21, 25], [8, 25], [8, 23], [12, 21], [12, 17], [8, 17], [6, 15]]),
  thorn: stroke(VINE).union(Mask.polygon([[7, 18], [11, 18], [10, 22]]), Mask.polygon([[16, 13], [22, 11], [20, 16]]), Mask.polygon([[17, 21], [20, 19], [21, 23]])),
  spring: Mask.polygon([[15, 10], [22, 18], [22, 21], [20, 24], [15, 26], [10, 24], [8, 20], [9, 17]]),
  siphon: stroke(SPIRAL),
  veil: Mask.ellipse(15, 18, 8, 8).subtract(Mask.ellipse(19, 15, 7, 7)),
  ward: Mask.circle(15, 18, 8).subtract(Mask.circle(15, 18, 5.5)),
  mirror: new Mask().union(Mask.ellipse(14, 16, 7, 7), Mask.polygon([[12, 21], [16, 21], [18, 26], [15, 27], [12, 24]])),
}

function necklace(s: Sprite, g: number, magical: boolean): void {
  const cord = use(s, g >= 7 ? GOLD : g >= 4 ? SILVER : CORD)
  line(s, [[7, 4], [10, 7], [15, 9], [20, 7], [24, 4]], cord, 3)
  if (g >= 2) for (const [x, y] of [[9, 6], [12, 8], [18, 8], [22, 6]] as const) s.paint(x, y, cord, 5)
  if (g >= 4) shadeDome(s, Mask.circle(15, 9, 2), cord, { bias: 0.12, contact: false })
  if (g >= 7) jewel(s, 14, 7, 3, magical ? gemOf(g) : METALS[g - 1]!)
}

export function talisman(s: Sprite, g: number, kind: typeof TALISMANS[number]): void { pendant(s, g, kind, false) }
export function amulet(s: Sprite, g: number, kind: typeof AMULETS[number]): void { pendant(s, g, kind, true) }
function pendant(s: Sprite, g: number, kind: Pendant, magical: boolean): void {
  s.shadow = { cx: 15, cy: 28, rx: 8, ry: 1.7, alpha: 70 }
  const metal = METALS[g - 1]!, gem = gemOf(g), main = use(s, magical ? gem : metal)
  const trim = use(s, g >= 7 ? GOLD : g >= 4 ? SILVER : magical ? CLOTHS[g - 1]! : '#a49c87')
  const dark = use(s, magical ? '#35466c' : '#434652')
  necklace(s, g, magical)
  const shape = SHAPES[kind]
  shadeDome(s, shape, main, { bias: 0.14, relief: magical ? 1 : 0.85, contact: false })
  // Every silhouette has its own construction, rather than a symbol on the same generic disk.
  if (kind === 'vital') {
    const inset = Mask.polygon([[15, 15], [12, 12], [10, 13], [10, 16], [15, 22], [20, 16], [20, 13], [18, 12]])
    shadeDome(s, inset, trim, { bias: 0.14, relief: 0.7, contact: false })
    line(s, [[11, 14], [13, 14], [14, 17], [16, 15], [18, 15]], main, 4)
  } else if (kind === 'vampire') {
    shadeDome(s, Mask.polygon([[12, 13], [20, 13], [18, 18], [12, 23], [15, 17]]), trim, { bias: 0.2, contact: false })
    line(s, [[11, 11], [20, 11]], main, 5)
  } else if (kind === 'bulwark') {
    shadeDome(s, Mask.polygon([[11, 13], [19, 13], [19, 20], [15, 24], [11, 20]]), trim, { bias: 0.1, contact: false })
    line(s, [[15, 13], [15, 22]], main, 4)
    if (g >= 4) line(s, [[12, 17], [18, 17]], main, 4)
  } else if (kind === 'iron') {
    line(s, [[7, 12], [22, 12]], main, 5)
    line(s, [[10, 24], [19, 24]], trim, 4)
    line(s, [[14, 17], [14, 21]], dark, 2)
  } else if (kind === 'thorn') {
    line(s, [[10, 23], [12, 20], [17, 17], [19, 13]], trim, 4)
    if (g >= 4) for (const [x, y] of [[9, 19], [20, 13], [19, 21]] as const) s.paint(x, y, main, 5)
  } else if (kind === 'spring') {
    line(s, [[14, 14], [11, 18], [11, 21], [13, 23]], main, 5)
    if (g >= 4) line(s, [[13, 22], [17, 22]], trim, 4)
  } else if (kind === 'siphon') {
    // A light ridge along the open spiral preserves its negative space at native size.
    line(s, SPIRAL, main, 4)
  } else if (kind === 'veil') {
    const cloth = use(s, CLOTHS[g - 1]!)
    shadeDome(s, Mask.polygon([[8, 15], [11, 17], [18, 24], [14, 26], [9, 23]]), cloth, { bias: 0.1, relief: 0.6, contact: false })
    line(s, [[9, 17], [11, 21], [15, 24]], trim, 4)
  } else if (kind === 'ward') {
    line(s, [[12, 18], [15, 14], [18, 18], [15, 22], [12, 18]], trim, 4)
    line(s, [[15, 15], [15, 21]], main, 5)
  } else {
    const glass = use(s, '#a2d7ef', { lift: 0.5, drop: 0.32 })
    shadeDome(s, Mask.ellipse(14, 16, 4.8, 4.8), glass, { bias: 0.15, relief: 0.8, contact: false })
    line(s, [[12, 13], [15, 16]], glass, 5)
    line(s, [[12, 17], [16, 13]], glass, 4)
    line(s, [[14, 23], [16, 25]], trim, 4)
  }
  if (g >= 4) for (const [x, y] of [[11, 11], [20, 11]] as const) if (shape.get(x, y)) s.paint(x, y, trim, x === 11 ? 5 : 3)
  if (g >= 7) {
    for (const [x, y] of [[10, 8], [20, 8]] as const) jewel(s, x, y, 2, magical ? gem : metal)
  }
  finish(s, g, magical ? gem.glow ?? '#cfeefb' : metal.glow ?? '#b6c9ff', 15, 10)
}
