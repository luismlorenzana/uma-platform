// Every gear icon: one painter per type, drawn once per grade with that grade's material.
import type { ItemIcon } from '../items/types.ts'
import type { Sprite } from '../sprite.ts'
import { garb, leather, mail, plate } from './armor.ts'
import { bracers, circlet, cuirass, gauntlets, greaves, helm, leggings, robe } from './armor-pieces.ts'
import { axe, greatsword } from './blades.ts'
import { bow } from './bow.ts'
import { AMULETS, amulet, boots, slippers, TALISMANS, talisman } from './d124.ts'
import { orb } from './element-orb.ts'
import { elementTome } from './element-tome.ts'
import { charm, ring } from './jewelry.ts'
import { katana } from './katana.ts'
import { lance } from './lance.ts'
import { GEAR_TYPES, GRADES, type GearType } from './spec.ts'
import { ELEMENTS, type Element, type Kind } from './symbols.ts'

export type GearPainter = (s: Sprite, grade: number) => void

const PAINTERS: Record<string, GearPainter> = {
  greatsword,
  axe,
  lance,
  bow,
  katana,
  garb,
  leather,
  mail,
  plate,
  ring,
  charm,
  helm, cuirass, greaves, gauntlets, circlet, robe, leggings, bracers,
  boots, slippers,
}
for (const kind of TALISMANS) PAINTERS[`talisman-${kind}`] = (s, g) => talisman(s, g, kind)
for (const kind of AMULETS) PAINTERS[`amulet-${kind}`] = (s, g) => amulet(s, g, kind)
for (const element of Object.keys(ELEMENTS) as Element[]) PAINTERS[`tome-${element}`] = (s, g) => elementTome(s, g, element)
for (const kind of ['greatsword', 'axe', 'lance', 'bow', 'katana', ...Object.keys(ELEMENTS)] as Kind[])
  PAINTERS[`orb-${kind}`] = (s, g) => orb(s, g, kind)

export interface GearIcon extends ItemIcon {
  type: string
  material: string
}

export interface GearRow {
  type: GearType
  icons: GearIcon[]
}

export const GEAR: GearRow[] = GEAR_TYPES.map((type) => ({
  type,
  icons: Array.from({ length: GRADES }, (_, i) => {
    const grade = i + 1
    const painter = PAINTERS[type.type]
    if (!painter) throw new Error(`No painter for gear type ${type.type}`)
    return {
      id: `${type.type}-g${grade}`,
      name: `${type.label}, grade ${grade}`,
      grade,
      type: type.type,
      material: type.materialByGrade[i] ?? '',
      paint: (s: Sprite) => painter(s, grade),
    }
  }),
}))
