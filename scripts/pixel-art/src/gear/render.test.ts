import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { drawIcon } from '../icon.ts'
import type { ItemIcon } from '../items/types.ts'
import { use } from './materials.ts'
import { GEAR } from './index.ts'
import { ACCENT_START, checkGearContract, drawGearIcon } from './render.ts'
import { GEAR_TYPES } from './spec.ts'

const ROWS = [
  'greatsword', 'axe', 'lance', 'bow', 'katana',
  'tome-fire', 'tome-ice', 'tome-lightning', 'tome-light', 'tome-dark',
  'garb', 'leather', 'mail', 'plate', 'ring', 'charm',
  'orb-greatsword', 'orb-axe', 'orb-lance', 'orb-bow', 'orb-katana',
  'orb-fire', 'orb-ice', 'orb-lightning', 'orb-light', 'orb-dark',
  'helm', 'cuirass', 'greaves', 'gauntlets', 'circlet', 'robe', 'leggings', 'bracers',
  'boots', 'slippers', 'talisman-vital', 'talisman-vampire', 'talisman-bulwark', 'talisman-iron', 'talisman-thorn',
  'amulet-spring', 'amulet-siphon', 'amulet-veil', 'amulet-ward', 'amulet-mirror',
  'greatsword-hue', 'axe-hue', 'lance-hue', 'bow-hue', 'katana-hue',
  'orb-greatsword-hue', 'orb-axe-hue', 'orb-lance-hue', 'orb-bow-hue', 'orb-katana-hue',
]
const signature = (px: Uint8Array) => Buffer.from(px).toString('base64')

describe('D86/D103/D124 gear atlas contract', () => {
  it('pins all 56 rows and their primary drawing material', () => {
    expect(GEAR_TYPES.map((t) => t.type)).toEqual(ROWS)
    expect(GEAR_TYPES.map((t) => t.mainFamily)).toEqual([
      ...Array<string>(5).fill('ores'), ...Array<string>(5).fill('crystals'),
      'woods', 'hides-scales', 'ores', 'ores', 'crystals', 'bones-horns',
      ...Array<string>(5).fill('ores'), ...Array<string>(5).fill('crystals'),
      ...Array<string>(4).fill('ores'), ...Array<string>(4).fill('crystals'),
      'ores', 'crystals', ...Array<string>(5).fill('ores'), ...Array<string>(5).fill('crystals'),
      ...Array<string>(10).fill('ores'),
    ])
    expect(() => checkGearContract(GEAR)).not.toThrow()
    expect(() => checkGearContract(GEAR.slice(1))).toThrow('56 gear rows')
    expect(new Set(GEAR.flatMap((r) => r.icons.map((i) => i.id))).size).toBe(560)
  })

  it('matches every checked-in JSON frame, including grade material', () => {
    const atlas = JSON.parse(readFileSync(new URL('../../../../packages/art/gear/atlas.json', import.meta.url), 'utf8')) as {
      width: number; height: number; frames: Record<string, { x: number; y: number; w: number; h: number; type: string; grade: number; slot: string; material: string }>
    }
    expect([atlas.width, atlas.height]).toEqual([320, 1792])
    expect(Object.keys(atlas.frames)).toHaveLength(560)
    GEAR.forEach((row, r) => row.icons.forEach((icon) => {
      expect(atlas.frames[icon.id]).toEqual({ x: (icon.grade - 1) * 32, y: r * 32, w: 32, h: 32, type: row.type.type, grade: icon.grade, slot: row.type.slot, material: icon.material })
    }))
  })

  for (const row of GEAR) it(`${row.type.type}: deterministic, ten distinct grades and a transparent accent corner`, () => {
    const grades = row.icons.map((icon) => {
      const px = drawGearIcon(icon)
      expect(px).toEqual(drawGearIcon(icon))
      for (let y = ACCENT_START; y < 32; y++)
        for (let x = ACCENT_START; x < 32; x++) expect([...px.subarray((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)]).toEqual([0, 0, 0, 0])
      return signature(px)
    })
    expect(new Set(grades).size).toBe(10)
  })

  it('has five distinct Tome symbols and fifteen distinct Orbs at every grade', () => {
    for (let g = 0; g < 10; g++) {
      const books = GEAR.filter((r) => r.type.type.startsWith('tome-')).map((r) => signature(drawGearIcon(r.icons[g]!)))
      const orbs = GEAR.filter((r) => r.type.type.startsWith('orb-')).map((r) => signature(drawGearIcon(r.icons[g]!)))
      expect(new Set(books).size).toBe(5)
      expect(new Set(orbs).size).toBe(15)
    }
  })

  it('rejects object ink and outlines rather than silently clipping them', () => {
    for (const x of [22, 23]) {
      const icon: ItemIcon = { id: 'bad-corner', name: 'Synthetic', grade: 1, paint: (s) => s.paint(x, 23, use(s, '#888888'), 3) }
      expect(() => drawGearIcon(icon)).toThrow('object or outline enters accent corner')
    }
  })

  it('only removes soft effects in the reserved area', () => {
    const icon = GEAR.find((r) => r.type.type === 'orb-fire')!.icons[9]!
    const before = drawIcon(icon), after = drawGearIcon(icon)
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        if (x >= ACCENT_START && y >= ACCENT_START) continue
        const i = (y * 32 + x) * 4
        expect(after.subarray(i, i + 4)).toEqual(before.subarray(i, i + 4))
      }
  })
})
