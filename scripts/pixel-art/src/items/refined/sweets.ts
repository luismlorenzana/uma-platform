// Refined Sweets (Pantry, Speed family): uma-rpg docs/design/items.md#sweets. Each sweetener in its own pantry form:
// a honey pot with its dipper, sugars in a bowl, as cubes or as stacked cakes, syrups in bottles, a chocolate bar; the
// legendary ones glow (fairy honey in a winged jar, ambrosia in a golden amphora).
import { ramp } from '../../color.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import {
  band,
  bowl,
  box,
  capsule,
  glassVessel,
  GOLD,
  halo,
  leafPlate,
  lid,
  motes,
  PAPER,
  pix,
  rays,
  roundBox,
  shadeCylinder,
  shine,
  speckle,
  type Tones,
} from './pantry-kit.ts'

const HONEY = ramp('#f0a01a', { lift: 0.42, drop: 0.3 })

/** A round honey pot with a wide rim, a dipper standing in it and a drip down the front. Returns the glass. */
function honeyPot(s: Sprite, contents: Tones, o: { glass?: Tones; label: Tones; motif: readonly string[]; key: Record<string, readonly [number, number]>; dipper?: Tones }): void {
  const body = Mask.ellipse(16, 20.2, 7.8, 6.6).union(box(10, 14, 21, 16))
  const neck = box(11, 12, 20, 13)
  const g = glassVessel(s, { body, neck, fill: 15, contents, glass: o.glass, bias: 0.08 })
  // Rim of the pot.
  const rim = s.addRamp(o.glass ?? ramp('#cfe0e6', { lift: 0.42 }))
  for (let x = 10; x <= 21; x++) s.paint(x, 11, rim, x < 13 ? 5 : x < 19 ? 4 : 3)
  // The dipper: a turned wooden handle rising out of the honey.
  const wood = s.addRamp(o.dipper ?? ramp('#b07a42', { lift: 0.32 }))
  const handle = capsule(18, 11, 23.4, 3.6, 0.75)
  handle.each((x, y) => s.paint(x, y, wood, !handle.get(x - 1, y) ? 4 : 2))
  pix(s, 22, 2, ['ab', 'bc'], { a: [wood, 5], b: [wood, 3], c: [wood, 2] })
  // A drip of honey running from the rim down the front.
  for (let y = 12; y <= 16; y++) s.paint(12, y, g.contentsId, y === 16 ? 3 : 4)
  s.paint(12, 17, g.contentsId, 3)
  const l = band(s, body, 18, 22, o.label, { inset: 1 })
  pix(s, 14, 19, o.motif, o.key)
  shine(s, g.shell, { skip: l.mask, from: 13, to: 24 })
}

export const SWEETS_REFINED: ItemIcon[] = [
  {
    id: 'honey',
    name: 'Honey',
    grade: 1,
    paint: (s) => {
      const bee = s.addRamp(ramp('#f2c230'))
      const black = s.addRamp(ramp('#3a3030'))
      const wing = s.addRamp(ramp('#dfe8f0', { lift: 0.4 }))
      honeyPot(s, HONEY, { label: PAPER, motif: ['.ww.', 'ykyk', '.yk.'], key: { w: [wing, 5], y: [bee, 4], k: [black, 3] } })
    },
  },
  {
    id: 'cane-sugar',
    name: 'Cane Sugar',
    grade: 2,
    paint: (s) => {
      // A length of sugar cane behind a cream bowl heaped with golden-brown crystals.
      const cane = s.addRamp(ramp('#a8b85a', { lift: 0.32 }))
      const cm = capsule(18.6, 18, 24, 4.6, 1.3)
      shadeDome(s, cm, cane, { relief: 1.2 })
      for (const y of [8, 13]) for (let x = 19; x <= 24; x++) if (cm.get(x, y)) s.paint(x, y, cane, 2)
      pix(s, 22, 3, ['.a', 'ab'], { a: [cane, 5], b: [cane, 4] })
      const { contents } = bowl(s, { cx: 15, rim: 19.4, rx: 8, ry: 3, depth: 6.6, bowl: ramp('#efe3cf', { lift: 0.36, drop: 0.24 }), mound: 3.4, contents: ramp('#cf9548', { lift: 0.4 }), foot: true, bias: 0.1 })
      speckle(s, 'cane-a', contents, 10, 2, 2)
      speckle(s, 'cane-b', contents, 6, -1, 3)
    },
  },
  {
    id: 'beet-sugar',
    name: 'Beet Sugar',
    grade: 3,
    paint: (s) => {
      // A pyramid of white sugar cubes, and the little beet they came from.
      const beet = s.addRamp(ramp('#9a2050', { lift: 0.32 }))
      shadeDome(s, Mask.circle(22.6, 21.6, 3.2), beet)
      const leaf = s.addRamp(ramp('#5fae3c'))
      pix(s, 22, 16, ['a.b', '.ab', '.a.'], { a: [leaf, 3], b: [leaf, 4] })
      s.paint(22, 25, beet, 2)
      const white = s.addRamp(ramp('#eef0f6', { lift: 0.5, drop: 0.16, hueShift: 10 }))
      const cube = (x: number, y: number) => {
        for (let dy = 0; dy < 5; dy++)
          for (let dx = 0; dx < 5; dx++) {
            const top = dy < 2 && dx >= dy - 0 && dx <= 3 + dy
            const right = dx === 4 || (dx === 3 && dy >= 2 && false)
            s.paint(x + dx, y + dy, white, dy === 0 ? 5 : top ? 5 : right ? 2 : dx === 0 ? 4 : 3)
          }
        s.paint(x + 1, y + 3, white, 4)
        s.paint(x + 3, y + 2, white, 4)
      }
      for (const [x, y] of [[7, 21], [12, 21], [17, 21], [9, 16], [14, 16], [12, 11]] as const) cube(x, y)
    },
  },
  {
    id: 'maple-syrup',
    name: 'Maple Syrup',
    grade: 4,
    paint: (s) => {
      // A glass jug with a loop handle, amber syrup, a red maple leaf on the label.
      const body = Mask.ellipse(15, 20.4, 7.2, 6.4).union(box(11, 14, 18, 16))
      const neck = box(13, 9, 16, 13)
      const handle = Mask.ellipse(20.6, 14.4, 2.8, 3.4).subtract(Mask.ellipse(20.6, 14.4, 1.4, 2))
      const glass = s.addRamp(ramp('#d8e4e6', { lift: 0.42 }))
      handle.each((x, y) => {
        if (x >= 19) s.paint(x, y, glass, x < 21 && y < 14 ? 4 : 2)
      })
      const g = glassVessel(s, { body, neck, fill: 13, contents: ramp('#c2621a', { lift: 0.4, drop: 0.3 }), bias: 0.08 })
      lid(s, 12, 6, 17, 8, ramp('#c8302a'))
      const l = band(s, body, 18, 23, PAPER, { inset: 1 })
      const red = s.addRamp(ramp('#d23a26'))
      pix(s, 12, 18, ['..a..', 'a.a.a', 'aaaaa', '.aaa.', '..b..'], { a: [red, 3], b: [red, 2] })
      shine(s, g.shell, { skip: l.mask, from: 10, to: 24 })
    },
  },
  {
    id: 'chocolate',
    name: 'Chocolate',
    grade: 5,
    paint: (s) => {
      // A bar lying at an angle, its squares bevelled, the lower half still in red paper over gold foil.
      const choc = s.addRamp(ramp('#6a3a22', { lift: 0.3, drop: 0.3 }))
      const a = (-18 * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
      const local = (px: number, py: number): [number, number] => {
        const dx = px - 16, dy = py - 16.6
        return [dx * c + dy * sn, -dx * sn + dy * c]
      }
      const bar = Mask.from((px, py) => {
        const [u, v] = local(px, py)
        return Math.abs(u) <= 9.6 && Math.abs(v) <= 5.2
      })
      bar.each((x, y) => {
        const [u, v] = local(x + 0.5, y + 0.5)
        const cu = ((u + 9.6) % 3.2 + 3.2) % 3.2, cv = ((v + 5.2) % 3.47 + 3.47) % 3.47
        const tone = cu < 0.9 || cv < 0.9 ? 4 : cu > 2.5 || cv > 2.6 ? 2 : 3
        s.paint(x, y, choc, tone)
      })
      const paper = s.addRamp(ramp('#c42a38', { lift: 0.32 }))
      const foil = s.addRamp(GOLD)
      bar.each((x, y) => {
        const [u] = local(x + 0.5, y + 0.5)
        if (u > 2.6) s.paint(x, y, paper, u > 8.6 ? 2 : (x + y) % 7 === 0 ? 4 : 3)
        else if (u > 1.4) s.paint(x, y, foil, 4 + ((x + y) % 2))
      })
      const ink = s.addRamp(ramp('#f2e2b0', { lift: 0.4 }))
      pix(s, 19, 16, ['aaa', 'a..', 'aaa'], { a: [ink, 4] })
    },
  },
  {
    id: 'vanilla-extract',
    name: 'Vanilla Extract',
    grade: 6,
    paint: (s) => {
      // Two dark vanilla pods in front of a small brown-glass bottle with a black cap and an orchid label.
      const body = roundBox(11, 12, 20, 24, 2)
      const neck = box(14, 9, 17, 11)
      const g = glassVessel(s, { body, neck, fill: 12, contents: ramp('#6e3a16', { lift: 0.34, drop: 0.3 }), glass: ramp('#8a5a32'), bias: 0.1, surface: false })
      lid(s, 13, 5, 18, 8, ramp('#2e2a2e', { lift: 0.3 }), { ridges: true })
      const l = band(s, body, 15, 21, ramp('#3a2a26', { lift: 0.3 }), { inset: 0, bias: 0.1 })
      const petal = s.addRamp(ramp('#f6f0d8', { lift: 0.4 }))
      const lip = s.addRamp(ramp('#f2c84a'))
      pix(s, 13, 16, ['.a.a.', 'aabaa', '.aaa.', '..a..'], { a: [petal, 3], b: [lip, 4] })
      shine(s, g.shell, { skip: l.mask, from: 11, to: 23 })
      // A vanilla pod lying across the front, curling up at one end.
      const pod = s.addRamp(ramp('#3e2616', { lift: 0.34 }))
      for (let x = 8; x <= 23; x++) {
        const y = x < 20 ? 25 : 25 - (x - 19)
        s.paint(x, y, pod, x % 4 === 0 ? 3 : 4)
        s.paint(x, y + 1, pod, 2)
      }
    },
  },
  {
    id: 'agave-syrup',
    name: 'Agave Syrup',
    grade: 7,
    paint: (s) => {
      // A tall slim bottle of pale gold syrup with a pour spout, an agave rosette on its label.
      const body = roundBox(11, 11, 20, 26, 2)
      const neck = box(13, 8, 18, 10)
      const g = glassVessel(s, { body, neck, fill: 12, contents: ramp('#e8ae3a', { lift: 0.45 }), bias: 0.1 })
      const cap = s.addRamp(ramp('#3f8a5a', { lift: 0.3 }))
      const capM = roundBox(12, 5, 19, 7, 1)
      shadeCylinder(s, capM, cap, { bias: 0.12 })
      pix(s, 17, 3, ['ab', 'bc'], { a: [cap, 4], b: [cap, 3], c: [cap, 2] })
      const l = band(s, body, 16, 22, PAPER, { inset: 0 })
      const green = s.addRamp(ramp('#4f9a6a', { lift: 0.3 }))
      pix(s, 13, 17, ['a...a', '.a.a.', 'a.a.a', '.bab.', '..b..'], { a: [green, 4], b: [green, 2] })
      shine(s, g.shell, { skip: l.mask, from: 9, to: 25 })
    },
  },
  {
    id: 'palm-sugar',
    name: 'Palm Sugar',
    grade: 8,
    paint: (s) => {
      // Three cakes of dark caramel sugar stacked on a palm leaf, the top one broken.
      leafPlate(s, ramp('#5a9a3a', { lift: 0.3 }), { cx: 16, cy: 23.4, rx: 10, ry: 3, rot: -6 })
      const sugar = s.addRamp(ramp('#7a3c16', { lift: 0.38, drop: 0.3 }))
      const disc = (cy: number, rx: number, cut = false) => {
        const side = Mask.ellipse(16, cy + 2, rx, 2.4).union(box(Math.ceil(16 - rx), Math.round(cy), Math.floor(16 + rx) - 1, Math.round(cy + 2)))
        const top = Mask.ellipse(16, cy, rx, 2.4)
        if (cut) {
          const notch = Mask.polygon([[19, cy - 4], [26, cy - 4], [26, cy + 6], [21, cy + 6]])
          side.subtract(notch)
          top.subtract(notch)
        }
        shadeCylinder(s, side, sugar, { bias: -0.05 })
        top.each((x, y) => s.paint(x, y, sugar, (x + 0.5 - 16) / rx + (y + 0.5 - cy) / 2.4 < -0.4 ? 5 : 4))
      }
      disc(20.4, 7.2)
      disc(16.6, 6.8)
      disc(12.8, 6.4, true)
      speckle(s, 'palm', Mask.ellipse(16, 16.6, 7.2, 8), 10, -1, 4)
    },
  },
  {
    id: 'fairy-honey',
    name: 'Fairy Honey',
    grade: 9,
    paint: (s) => {
      // Gauzy wings on either side of the jar: pale, veined, lit along the top edge.
      const wing = s.addRamp(ramp('#cfe6ff', { lift: 0.45, drop: 0.2, hueShift: 4 }))
      for (const [cx, dir] of [[9.2, -1], [22.8, 1]] as const) {
        const upper = Mask.ellipse(cx, 14.2, 2.4, 4, dir * 28)
        const lower = Mask.ellipse(cx + dir * 0.2, 19.2, 1.7, 2.3, dir * -30)
        upper.union(lower).each((x, y) => s.paint(x, y, wing, upper.get(x, y - 1) || lower.get(x, y - 1) ? 4 : 5))
        for (let k = 0; k < 4; k++) s.paint(Math.round(cx - dir * 0.6 + dir * k * 0.4), 16 - k * 2, wing, 3)
      }
      const flower = s.addRamp(ramp('#ffd6f0', { lift: 0.4 }))
      const center = s.addRamp(ramp('#ffd84a'))
      honeyPot(s, ramp('#f5a0d2', { lift: 0.45, drop: 0.24, hueShift: 4 }), {
        glass: ramp('#e8dcff', { lift: 0.45 }),
        label: ramp('#fff4fb', { lift: 0.4 }),
        motif: ['.a.a', 'aaba', '.aa.'],
        key: { a: [flower, 4], b: [center, 5] },
        dipper: ramp('#d8b8f0', { lift: 0.4 }),
      })
      halo(s, 16, 17, 11.5, 11, '#ffc6ec', 90)
      motes(s, [[8, 9], [24, 7], [25, 19], [10, 25]], '#fff0fa', 220)
    },
  },
  {
    id: 'ambrosia',
    name: 'Ambrosia',
    grade: 10,
    paint: (s) => {
      // A golden amphora brimming with radiant nectar: rounded belly, two handles, flared lip.
      const gold = s.addRamp(GOLD)
      const handles = Mask.ellipse(10.4, 14.6, 2.2, 3.4).subtract(Mask.ellipse(10.4, 14.6, 1, 2.2)).union(Mask.ellipse(21.6, 14.6, 2.2, 3.4).subtract(Mask.ellipse(21.6, 14.6, 1, 2.2)))
      handles.each((x, y) => {
        if (y <= 16) s.paint(x, y, gold, x < 16 ? 4 : 2)
      })
      const vessel = Mask.ellipse(16, 18.8, 6.8, 6.2).union(Mask.polygon([[13, 13], [19, 13], [18.2, 9.6], [13.8, 9.6]]), box(14, 25, 17, 26), box(13, 26, 18, 26))
      shadeDome(s, vessel, gold, { bias: 0.05 })
      const lip = roundBox(11, 7, 20, 9, 1)
      shadeCylinder(s, lip, gold, { bias: 0.15 })
      const nectar = s.addRamp(ramp('#fff1a6', { lift: 0.6, drop: 0.2 }))
      for (let x = 12; x <= 19; x++) s.paint(x, 7, nectar, x < 17 ? 5 : 4)
      // An engraved band around the belly.
      for (let x = 10; x <= 22; x++) if (vessel.get(x, 18)) s.paint(x, 18, gold, (x % 2 === 0 ? 5 : 2))
      halo(s, 16, 15, 12, 12, '#ffd34d', 95)
      rays(s, 15.5, 7, 3, 7, [-90, -60, -120, -35, -145], '#fff1a6', 170)
      motes(s, [[9, 4], [23, 3], [25, 21]], '#ffffff', 220)
    },
  },
]
