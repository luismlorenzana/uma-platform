// H73: one earned icon per made item. These are crafting parts, not equipment: the silhouette says which slot the
// part advances, while the grade ladder supplies its material and finish.
import { gemOf, legendaryHalo, jewel } from '../gear/fittings.ts'
import { BRONZE, CLOTHS, GOLD, METALS, SILVER, use, type Material } from '../gear/materials.ts'
import { halo, linePixels } from './refined/workbench-kit.ts'
import { cutStone, Mask, shadeDome, shadeFacets, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

const rect = (s: Sprite, x0: number, y0: number, x1: number, y1: number, id: number, tone: number | ((x: number, y: number) => number)) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.paint(x, y, id, typeof tone === 'number' ? tone : tone(x, y))
}
const line = (s: Sprite, a: readonly [number, number], b: readonly [number, number], id: number, tone = 3) => {
  for (const [x, y] of linePixels(a[0], a[1], b[0], b[1])) s.paint(x, y, id, tone)
}
const inset = (points: readonly Point[], scale: number, cx = 16, cy = 13): Point[] =>
  points.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale])
const cut = (s: Sprite, points: readonly Point[], id: number, table: number, height = 4) =>
  shadeFacets(s, points, cutStone(points, inset(points, table), height), id)
const rivetCode = (s: Sprite, id: number, grade: number, cells: readonly (readonly [number, number])[]) => {
  // A compact binary maker's mark makes every grade structurally distinct without turning the icon into a numeral.
  const code = grade + 5
  cells.forEach(([x, y], bit) => s.paint(x, y, id, code & (1 << bit) ? 5 : 2))
}

function weaponGem(s: Sprite, grade: number): void {
  s.shadow = { cx: 15, cy: 27, rx: 6.5, ry: 1.6, alpha: 72 }
  const stone = use(s, gemOf(grade)), metal = use(s, grade >= 9 ? GOLD : grade >= 7 ? SILVER : METALS[grade - 1]!)
  const rough: readonly Point[][] = [
    [[13, 5], [19, 6], [20, 10], [17, 22], [15, 24], [12, 19], [11, 10]],
    [[12, 6], [18, 5], [21, 10], [18, 20], [16, 24], [13, 20], [11, 11]],
    [[13, 5], [20, 7], [20, 11], [17, 22], [15, 24], [12, 19], [12, 9]],
  ]
  const polished: readonly Point[] = [[13, 5], [19, 5], [21, 10], [18, 20], [16, 24], [13, 20], [11, 10]]
  const points = grade <= 3 ? rough[grade - 1]! : polished
  if (grade <= 3) {
    const mask = Mask.polygon(points)
    shadeDome(s, mask, stone, { contact: false, relief: .55 })
    mask.each((x, y) => { if ((x * 7 + y * 5 + grade) % 13 === 0) s.shift(x, y, -2) })
  } else cut(s, points, stone, grade <= 5 ? .38 : grade === 6 ? .5 : .57)

  // The part reads as a weapon component at 16 px: clasp/crossguard, rivets and a short tang over the crystal.
  rect(s, 9, 15, 22, 17, metal, (x, y) => y === 15 || x <= 11 ? 4 : y === 17 ? 2 : 3)
  rect(s, 8, 16, 9, 17, metal, 2)
  rect(s, 22, 16, 23, 17, metal, 2)
  rect(s, 14, 18, 17, 25, metal, (x, y) => x === 14 || y === 18 ? 4 : x === 17 ? 2 : 3)
  if (grade >= 7) {
    // Mounted grades grip the stone at four points rather than widening the body into another sword.
    for (const [x, y] of [[12, 9], [19, 9], [12, 13], [19, 13]] as const) {
      s.paint(x, y, metal, 4); s.paint(x + (x < 16 ? -1 : 1), y, metal, 3)
    }
    s.paint(15, 23, stone, 5)
  }
  rivetCode(s, metal, grade, [[11, 16], [14, 16], [17, 16], [20, 16]])
  if (grade >= 9) legendaryHalo(s, '#ffd45c', 52)
}

function armorFittings(s: Sprite, grade: number): void {
  s.shadow = { cx: 14, cy: 26.5, rx: 7.5, ry: 1.6, alpha: 72 }
  const strapMaterial: Material = grade <= 5 ? CLOTHS[grade - 1]! : { base: '#6b4b37', opts: { lift: .32, drop: .3, hueShift: 8 } }
  const strap = use(s, strapMaterial), metal = use(s, grade <= 5 ? BRONZE : grade >= 9 ? GOLD : grade >= 7 ? SILVER : METALS[grade - 1]!)
  const y0 = grade <= 2 ? 15 : grade <= 5 ? 14 : 13, y1 = grade <= 2 ? 20 : 21
  const strapMask = Mask.polygon([[5, y0 + 1], [8, y0], [24, y0 + 2], [23, y1], [8, y1 - 1], [5, y1 - 2]])
  shadeDome(s, strapMask, strap, { contact: false, relief: .28 })

  if (grade <= 5) {
    // A broad copper buckle and a separate curved reinforcement plate; later low grades add one more fastening point.
    rect(s, 9, 11, 19, 13, metal, (x, y) => y === 11 || x === 9 ? 5 : 3)
    rect(s, 8, 13, 20, 16, metal, (x, y) => y === 13 ? 4 : y === 16 ? 2 : x < 12 ? 4 : 3)
    rect(s, 10, 14, 18, 17, strap, 2)
  } else {
    const spread = grade - 6
    const plate = Mask.polygon([[7 - Math.min(1, spread), 10], [20 + Math.min(2, spread), 11], [22, 14], [20, 21], [10, 22], [7, 18]])
    shadeDome(s, plate, metal, { contact: false, relief: .42 })
    // The cut stone grows with the plate but remains a fitting, not a second Gem icon.
    const size = grade <= 7 ? 2 : grade <= 9 ? 3 : 4
    jewel(s, 13 - Math.floor(size / 2), 14 - Math.floor(size / 2), size, gemOf(grade))
    if (grade >= 8) {
      line(s, [8, 12], [10, 10], metal, 5); line(s, [19, 20], [21, 17], metal, 2)
    }
  }
  const rivets = [[7, 17], [10, 18], [19, 18], [22, 17]] as const
  rivetCode(s, metal, grade, rivets)
  if (grade >= 9) legendaryHalo(s, '#ffd45c', 48)
}

function accessorySetting(s: Sprite, grade: number): void {
  s.shadow = { cx: 15, cy: 26.5, rx: 6.8, ry: 1.5, alpha: 68 }
  const metal = use(s, grade >= 9 ? GOLD : grade >= 7 ? SILVER : METALS[grade - 1]!)
  const cord = use(s, grade <= 3 ? CLOTHS[grade - 1]! : METALS[Math.max(0, grade - 4)]!)

  // Suspension loop above an empty, face-on cup. The open centre is intentional: this is a setting, never a gem.
  const loopOuter = Mask.ellipse(15.5, 7.5, grade <= 3 ? 3 : 3.6, 3.2)
  const loopInner = Mask.ellipse(15.5, 7.5, grade <= 3 ? 1.6 : 2, 1.6)
  const loop = loopOuter.subtract(loopInner)
  shadeDome(s, loop, grade <= 3 ? cord : metal, { contact: false, relief: .35 })
  const radius = grade <= 3 ? 6.2 : grade <= 6 ? 7 : 7.5
  const outer = Mask.circle(15.5, 16.5, radius), inner = Mask.circle(15.5, 16.5, radius - (grade <= 3 ? 1.35 : 2.2))
  const bezel = outer.subtract(inner)
  shadeDome(s, bezel, metal, { contact: false, relief: grade <= 3 ? .25 : .5 })

  // Four open prongs, with fine filigree added around silver/gold cups.
  const prongs: readonly (readonly [number, number, number, number])[] = [[15, 10, 16, 13], [15, 20, 16, 23], [9, 16, 12, 17], [19, 16, 22, 17]]
  if (grade >= 4) for (const [x0, y0, x1, y1] of prongs) rect(s, x0, y0, x1, y1, metal, y0 < 15 || x0 < 15 ? 5 : 2)
  if (grade >= 7) {
    for (const [a, b] of [[[9, 12], [7, 10]], [[22, 12], [24, 10]], [[10, 20], [9, 22]], [[20, 20], [21, 21]]] as const) line(s, a, b, metal, a[0] < 16 ? 4 : 2)
    for (const [x, y] of [[7, 9], [24, 9], [9, 22], [21, 21]] as const) s.paint(x, y, metal, 4)
  }
  rivetCode(s, metal, grade, [[12, 12], [19, 12], [12, 21], [19, 21]])
  if (grade >= 9) legendaryHalo(s, '#ffd45c', 48)
}

function branchGem(s: Sprite): void {
  s.shadow = { cx: 14.5, cy: 27, rx: 7, ry: 1.6, alpha: 74 }
  const teal = use(s, '#38cfc1', { lift: .5, drop: .3, hueShift: 12, satShift: .04 })
  const violet = use(s, '#8a63df', { lift: .48, drop: .3, hueShift: 12, satShift: .04 })
  const gold = use(s, GOLD)
  const left: Point[] = [[7, 6], [12, 8], [16, 16], [13, 18], [9, 13]]
  const right: Point[] = [[24, 5], [23, 12], [17, 17], [14, 14], [18, 8]]
  const stem: Point[] = [[14, 15], [19, 16], [18, 23], [15, 27], [12, 22]]
  cut(s, left, teal, .48, 4.5)
  cut(s, right, violet, .48, 4.5)
  cut(s, stem, teal, .42, 4)
  // A gold Weapon-Gem clasp joins the three crystal branches at the fork.
  rect(s, 11, 15, 20, 17, gold, (x, y) => y === 15 || x < 14 ? 5 : y === 17 ? 2 : 3)
  rect(s, 15, 17, 17, 21, gold, (x) => x === 15 ? 4 : 2)
  s.paint(13, 16, gold, 5); s.paint(18, 16, gold, 2)
  halo(s, (x) => x < 16 ? '#65fff0' : '#c3a5ff', 52, 1)
}

const graded = (line: 'weapon-gem' | 'armor-fittings' | 'accessory-setting', label: string, paint: (s: Sprite, grade: number) => void): ItemIcon[] =>
  Array.from({ length: 10 }, (_, i) => ({ id: `${line}-g${i + 1}`, name: `${label} G${i + 1}`, grade: i + 1, paint: (s) => paint(s, i + 1) }))

export const WEAPON_GEMS = graded('weapon-gem', 'Weapon Gem', weaponGem)
export const ARMOR_FITTINGS = graded('armor-fittings', 'Armor Fittings', armorFittings)
export const ACCESSORY_SETTINGS = graded('accessory-setting', 'Accessory Setting', accessorySetting)
export const BRANCH_GEM: ItemIcon = { id: 'branch-gem', name: 'Branch Gem', grade: 5, paint: branchGem }

