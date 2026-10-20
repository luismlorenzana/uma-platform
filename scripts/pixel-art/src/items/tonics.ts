// A04: ten original herbal/sports tonics. The flat shoulders, paper stride label and ribbed stopper are not potion art.
import { ramp } from '../color.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

const GLASS = ramp('#8eb2b7', { lift: 0.5, drop: 0.27, satShift: 0.02 })
const PAPER = ramp('#eee3c8', { lift: 0.45, drop: 0.23 })
const CORK = ramp('#a97c4a', { lift: 0.34, drop: 0.25 })
const BODY = Mask.polygon([[13, 10], [19, 10], [23, 13], [23, 25], [21, 27], [11, 27], [9, 25], [9, 13]])

const SPECS = [
  ['Warm-Up Tonic', '#8fa75b', '#65783b'],
  ['Practice Tonic', '#65a55b', '#427a48'],
  ['Paddock Tonic', '#47a77d', '#32765f'],
  ['Gallop Tonic', '#38a6a9', '#28737e'],
  ['Stride Tonic', '#448fc5', '#355c9a'],
  ['Stretch Tonic', '#797dc4', '#52518c'],
  ['Spurt Tonic', '#ac72b4', '#7d4a85'],
  ['Derby Tonic', '#cf747b', '#9b485c'],
  ["Champion's Tonic", '#dca245', '#a5772e'],
  ["Legend's Tonic", '#f0c555', '#c58c32'],
] as const

function rect(s: Sprite, material: number, x0: number, y0: number, x1: number, y1: number, tone: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s.paint(x, y, material, tone)
}

function painter(grade: number, liquidColor: string, labelColor: string): ItemIcon['paint'] {
  return (s) => {
    const glass = s.addRamp(GLASS), paper = s.addRamp(PAPER), cork = s.addRamp(CORK)
    const liquid = s.addRamp(ramp(liquidColor, { lift: 0.35, drop: 0.25 }))
    const label = s.addRamp(ramp(labelColor, { lift: 0.4, drop: 0.25 }))
    const metal = s.addRamp(ramp(grade >= 9 ? '#d7ad55' : grade === 8 ? '#aabac3' : '#b68552'))

    shadeDome(s, BODY, glass, { contact: false, relief: 0.6 })
    // Broad, straight-sided liquid window, no magical particles or halo.
    BODY.each((x, y) => {
      if (y >= 14 && BODY.get(x - 1, y) && BODY.get(x + 1, y) && BODY.get(x, y + 1)) {
        s.paint(x, y, liquid, x <= 12 ? 4 : x >= 20 ? 2 : 3)
        if (y === 14) s.paint(x, y, liquid, 5)
      }
    })
    rect(s, glass, 13, 8, 18, 11, 3)
    rect(s, glass, 13, 8, 14, 11, 5)
    rect(s, glass, 12, 8, 19, 8, 4)
    // An opaque ribbed stopper, upgraded to a metal cap in the last four grades.
    const cap = grade >= 7 ? metal : cork
    rect(s, cap, 12, 4, 19, 7, 3)
    rect(s, cap, 12, 4, 19, 4, 5)
    rect(s, cap, 12, 5, 12, 6, 4)
    for (const x of [14, 17, 19]) rect(s, cap, x, 5, x, 7, 2)
    if (grade === 10) rect(s, metal, 13, 3, 18, 3, 4)

    // Paper wrap and a simple forward-stride chevron; the large pale patch survives 16px chips.
    rect(s, paper, 10, 17, 21, 22, 3)
    rect(s, paper, 10, 17, 20, 17, 5)
    rect(s, paper, 10, 18, 11, 21, 4)
    rect(s, label, 12, 18, 13, 21, 3)
    for (const [x, y] of [[15, 18], [16, 19], [17, 20], [16, 21], [18, 19], [19, 20], [18, 21]] as const) s.paint(x, y, label, 2)
    // One/two/three lower ribs differentiate grades within each finish, not only by colour.
    const ribs = (grade - 1) % 3 + 1
    for (let n = 0; n < ribs; n++) rect(s, glass, 12 + n * 3, 24, 12 + n * 3, 25, 4)
    rect(s, glass, 10, 13, 10, 15, 5)
    rect(s, glass, 10, 23, 10, 24, 4)

    // G4 adds a cloth neck ribbon; G7 adds its wax seal; G9–10 get drawIcon's shared legendary glints.
    if (grade >= 4) {
      rect(s, label, 12, 10, 20, 11, 3)
      for (const [x, y] of [[21, 11], [21, 12], [22, 13], [22, 14], [23, 15], [23, 16]] as const) s.paint(x, y, label, 4)
    }
    if (grade >= 7) {
      for (const [x, y] of [[21, 20], [22, 19], [22, 20], [22, 21], [23, 20]] as const) s.paint(x, y, label, 2)
      s.paint(22, 20, metal, 5)
    }
    if (grade === 10) {
      rect(s, metal, 12, 26, 19, 26, 4)
      rect(s, metal, 12, 16, 20, 16, 4)
    }
  }
}

/** Art identity only: no recipes, economy, unlocks or game rules. */
export const TONICS: readonly ItemIcon[] = SPECS.map(([name, liquid, label], index) => ({
  id: `tonic-${index + 1}`, name, grade: index + 1, paint: painter(index + 1, liquid, label),
}))
