// D103's paired slots. Shared anchors/footprints make the slot readable; material and construction distinguish the kind.
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { gemOf, glowPixels, jewel, legendaryHalo } from './fittings.ts'
import { BONES, CLOTHS, GOLD, HIDES, METALS, SILVER, use } from './materials.ts'

const band = (x0: number, y0: number, x1: number, y1: number) => Mask.polygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])
function palette(s: Sprite, g: number, magical: boolean) {
  s.shadow = { cx: 15.5, cy: 28, rx: 9, ry: 1.8, alpha: 70 }
  const metal = METALS[g - 1]!, cloth = CLOTHS[g - 1]!, hide = HIDES[g - 1]!, bone = BONES[g - 1]!
  return { main: use(s, magical ? cloth : metal), lining: use(s, magical ? bone : hide),
    trim: use(s, magical ? bone : g >= 7 ? GOLD : g >= 4 ? SILVER : hide),
    dark: use(s, magical ? '#433754' : '#423332'), glow: magical ? gemOf(g).glow ?? '#cfeefb' : metal.glow ?? '#b6c9ff' }
}
function line(s: Sprite, x0: number, y0: number, x1: number, y1: number, id: number, tone: number) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= n; i++) s.paint(Math.round(x0 + (x1 - x0) * i / Math.max(1, n)), Math.round(y0 + (y1 - y0) * i / Math.max(1, n)), id, tone)
}
function finish(s: Sprite, g: number, glow: string, x: number, y: number) {
  if (g >= 8) glowPixels(s, [[x - 1, y], [x, y - 1], [x + 1, y], [x, y + 1]], glow, g === 8 ? 30 : 55)
  if (g >= 9) legendaryHalo(s, glow, 48)
}
const HEAD = Mask.ellipse(15.5, 13, 8, 8)

export function helm(s: Sprite, g: number): void {
  const p = palette(s, g, false)
  const shell = new Mask().union(HEAD).subtract(band(12, 13, 19, 22))
  shadeDome(s, shell, p.main, { bias: 0.12, relief: 0.95, contact: false })
  shadeDome(s, band(11, 11, 20, 14), p.dark, { bias: 0.04, contact: false })
  line(s, 10, 10, 21, 10, p.main, 4)
  line(s, 10, 18, 11, 22, p.lining, 3); line(s, 20, 18, 19, 22, p.lining, 2)
  if (g >= 2) { s.paint(9, 16, p.trim, 5); s.paint(21, 16, p.trim, 3) }
  if (g >= 4) {
    line(s, 15, 6, 15, 10, p.trim, 5)
    line(s, 10, 19, 10, 21, p.main, 4); line(s, 20, 19, 20, 21, p.main, 3)
  }
  if (g >= 7) {
    shadeDome(s, Mask.polygon([[14, 4], [17, 4], [19, 8], [12, 8]]), p.main, { bias: 0.15, contact: false })
    line(s, 8, 13, 9, 19, p.trim, 4); line(s, 22, 13, 21, 19, p.trim, 3)
    jewel(s, 14, 7, 3, gemOf(g))
  }
  finish(s, g, p.glow, 15, 7)
}

export function circlet(s: Sprite, g: number): void {
  const p = palette(s, g, true)
  // An open brow band following the same head oval, not a flat ring viewed from above.
  const rim = new Mask().union(HEAD).subtract(Mask.ellipse(15.5, 11.5, 6.5, 6.5))
  rim.each((x, y) => { if (y < 12 || y > 19) rim.set(x, y, false) })
  shadeDome(s, rim, p.lining, { bias: 0.18, relief: 0.75, contact: false })
  line(s, 9, 14, 14, 17, p.trim, 4); line(s, 16, 17, 21, 14, p.trim, 3)
  const crown = Mask.polygon([[12, 17], [13, g >= 7 ? 8 : 12], [15, 11], [18, g >= 4 ? 9 : 13], [19, 17]])
  shadeDome(s, crown, p.lining, { bias: 0.12, contact: false })
  jewel(s, 14, g >= 7 ? 12 : 14, g >= 7 ? 4 : g >= 4 ? 3 : 2, gemOf(g))
  if (g >= 4) { jewel(s, 9, 14, 2, gemOf(g)); jewel(s, 20, 13, 2, gemOf(g)) }
  if (g >= 7) { line(s, 10, 12, 9, 17, p.main, 4); line(s, 21, 11, 22, 16, p.main, 3) }
  finish(s, g, p.glow, 15, 13)
}

const SHOULDERS = new Mask().union(Mask.ellipse(8, 10, 3.5, 3), Mask.ellipse(23, 10, 3.5, 3))
const BODY = Mask.polygon([[10, 7], [13, 7], [13, 9], [18, 9], [18, 7], [21, 7], [23, 14], [20, 23], [11, 23], [8, 14]])
export function cuirass(s: Sprite, g: number): void {
  const p = palette(s, g, false)
  shadeDome(s, new Mask().union(BODY, SHOULDERS), p.lining, { bias: 0.08, contact: false })
  const plate = Mask.polygon([[11, 9], [20, 9], [22, 15], [20, 21], [11, 21], [9, 15]])
  shadeDome(s, plate, p.main, { bias: 0.12, relief: 1.05, contact: false })
  line(s, 15, 10, 15, 19, p.main, 4); line(s, 16, 11, 16, 19, p.main, 2)
  line(s, 11, 21, 20, 21, p.lining, 2)
  if (g >= 2) for (const x of [11, 20]) s.paint(x, 11, p.trim, x < 16 ? 5 : 3)
  if (g >= 4) {
    shadeDome(s, SHOULDERS, p.main, { bias: 0.08, relief: 0.85, contact: false })
    for (const y of [18, 20]) line(s, 11, y, 20, y, p.trim, y === 18 ? 4 : 3)
  }
  if (g >= 7) {
    for (const x of [6, 22]) { line(s, x, 9, x + 3, 8, p.trim, 4); line(s, x + 1, 11, x + 3, 11, p.trim, 3) }
    jewel(s, 14, 12, 3, gemOf(g))
  }
  finish(s, g, p.glow, 15, 13)
}

export function robe(s: Sprite, g: number): void {
  const p = palette(s, g, true)
  const skirt = Mask.polygon([[12, 16], [19, 16], [22, 26], [9, 26]])
  const sleeves = new Mask().union(Mask.polygon([[6, 9], [10, 9], [9, 17], [4, 17]]), Mask.polygon([[21, 9], [25, 9], [27, 17], [22, 17]]))
  shadeDome(s, new Mask().union(BODY, SHOULDERS, skirt, sleeves), p.main, { bias: 0.09, relief: 0.8, contact: false })
  // Woven folds are darker at the seam and lit on the side facing the shared top-left light.
  for (const x of [12, 16, 19]) for (let y = 19; y <= 25; y++) { s.shift(x, y, -1); s.shift(x - 1, y, 1) }
  line(s, 12, 9, 15, 12, p.lining, 4); line(s, 19, 9, 16, 12, p.lining, 3)
  line(s, 11, 17, 20, 17, p.trim, 3)
  if (g >= 2) jewel(s, 14, 16, 2, gemOf(g))
  if (g >= 4) {
    for (const [x0, x1] of [[5, 8], [23, 26]]) line(s, x0!, 16, x1!, 16, p.trim, x0! < 16 ? 4 : 3)
    line(s, 10, 25, 21, 25, p.lining, 3)
  }
  if (g >= 7) {
    jewel(s, 14, 10, 3, gemOf(g))
    for (const x of [12, 19]) { line(s, x, 21, x, 24, p.trim, 4); s.paint(x + 1, 22, p.trim, 4) }
  }
  finish(s, g, p.glow, 15, 11)
}

const LEG = (x: number) => Mask.polygon([[x, 5], [x + 6, 5], [x + 6, 12], [x + 5, 23], [x + 5, 26], [x - 1, 26], [x - 1, 23], [x + 1, 13]])
export function greaves(s: Sprite, g: number): void { legs(s, g, false) }
export function leggings(s: Sprite, g: number): void { legs(s, g, true) }
function legs(s: Sprite, g: number, magical: boolean) {
  const p = palette(s, g, magical)
  for (const x of [8, 16]) {
    shadeDome(s, LEG(x), magical ? p.main : p.lining, { bias: x === 8 ? 0.14 : 0, relief: 0.85, contact: false })
    const shin = Mask.polygon([[x + 1, 11], [x + 5, 11], [x + 4, 23], [x, 23]])
    if (!magical) shadeDome(s, shin, p.main, { bias: x === 8 ? 0.12 : 0, relief: 0.95, contact: false })
    else { line(s, x + 2, 9, x + 1, 22, p.main, 4); line(s, x + 4, 9, x + 3, 22, p.main, 2) }
    line(s, x, 7, x + 5, 7, p.lining, x === 8 ? 4 : 3)
    if (g >= 2) line(s, x, 24, x + 4, 24, p.trim, x === 8 ? 4 : 3)
    if (g >= 4) {
      shadeDome(s, Mask.ellipse(x + 3, 12, 2.5, 2.5), magical ? p.lining : p.main, { bias: x === 8 ? 0.15 : 0, relief: 0.9, contact: false })
      line(s, x, 18, x + 4, 18, p.trim, 3)
    }
    if (g >= 7) { jewel(s, x + 1, 11, 2, gemOf(g)); line(s, x, 15, x + 3, 15, p.trim, 4) }
  }
  // The magical pair is joined by cloth at the hip, unlike the independent armored boot guards.
  if (magical) { shadeDome(s, band(8, 5, 22, 9), p.main, { bias: 0.1, contact: false }); line(s, 9, 6, 20, 6, p.lining, 4) }
  finish(s, g, p.glow, 10, 12)
}

const ARM = (x: number) => Mask.polygon([[x - 1, 6], [x + 6, 6], [x + 6, 11], [x + 4, 20], [x, 20], [x - 1, 11]])
export function gauntlets(s: Sprite, g: number): void { arms(s, g, false) }
export function bracers(s: Sprite, g: number): void { arms(s, g, true) }
function arms(s: Sprite, g: number, magical: boolean) {
  const p = palette(s, g, magical)
  for (const x of [7, 17]) {
    shadeDome(s, ARM(x), p.main, { bias: x === 7 ? 0.15 : 0, relief: magical ? 0.65 : 1.05, contact: false })
    shadeDome(s, band(x, 18, x + 4, 24), magical ? p.main : p.lining, { bias: x === 7 ? 0.1 : 0, contact: false })
    line(s, x, 8, x + 4, 8, p.trim, x === 7 ? 4 : 3)
    if (!magical) { line(s, x + 1, 21, x + 1, 24, p.dark, 2); line(s, x + 3, 21, x + 3, 24, p.dark, 2) }
    else { line(s, x + 1, 12, x + 1, 17, p.lining, 4); line(s, x + 3, 12, x + 3, 17, p.lining, 3) }
    if (g >= 2) s.paint(x + 2, 10, p.trim, 4)
    if (g >= 4) for (const y of [11, 17]) line(s, x, y, x + 4, y, p.trim, x === 7 ? 4 : 3)
    if (g >= 7) { jewel(s, x + 1, 12, 3, gemOf(g)); line(s, x, 7, x + 3, 6, p.trim, 5) }
  }
  finish(s, g, p.glow, 9, 13)
}
