// Every gear icon: one painter per type, drawn once per grade with that grade's material.
import type { ItemIcon } from '../items/types.ts'
import type { Sprite } from '../sprite.ts'
import { garb, leather, mail, plate } from './armor.ts'
import { axe, greatsword, shortSword, spear } from './blades.ts'
import { charm, ring } from './jewelry.ts'
import { GEAR_TYPES, GRADES, type GearType } from './spec.ts'
import { summonerTome } from './tome.ts'
import { arcaneStaff, bow, clericStaff, mageStaff } from './woods.ts'

export type GearPainter = (s: Sprite, grade: number) => void

const PAINTERS: Record<string, GearPainter> = {
  'short-sword': shortSword,
  bow,
  spear,
  axe,
  'mage-staff': mageStaff,
  'arcane-staff': arcaneStaff,
  greatsword,
  'cleric-staff': clericStaff,
  'summoner-tome': summonerTome,
  garb,
  leather,
  mail,
  plate,
  ring,
  charm,
}

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
