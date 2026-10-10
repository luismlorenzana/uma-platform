// Every item family, in the catalog's order (uma-rpg docs/design/items.md): eight farming, then eight gathering.
// Each has its ten raw items and their ten refined forms.
import { BONES_HORNS } from './bones-horns.ts'
import { CRYSTALS } from './crystals.ts'
import { ESSENCES } from './essences.ts'
import { FIBERS } from './fibers.ts'
import { FISH } from './fish.ts'
import { FRUITS } from './fruits.ts'
import { GRAINS } from './grains.ts'
import { HERBS_SPICES } from './herbs-spices.ts'
import { HIDES_SCALES } from './hides-scales.ts'
import { MUSHROOMS } from './mushrooms.ts'
import { NUTS_SEEDS } from './nuts-seeds.ts'
import { ORES } from './ores.ts'
import { BONES_HORNS_REFINED } from './refined/bones-horns.ts'
import { CRYSTALS_REFINED } from './refined/crystals.ts'
import { ESSENCES_REFINED } from './refined/essences.ts'
import { FIBERS_REFINED } from './refined/fibers.ts'
import { FISH_REFINED } from './refined/fish.ts'
import { FRUITS_REFINED } from './refined/fruits.ts'
import { GRAINS_REFINED } from './refined/grains.ts'
import { HERBS_SPICES_REFINED } from './refined/herbs-spices.ts'
import { HIDES_SCALES_REFINED } from './refined/hides-scales.ts'
import { MUSHROOMS_REFINED } from './refined/mushrooms.ts'
import { NUTS_SEEDS_REFINED } from './refined/nuts-seeds.ts'
import { ORES_REFINED } from './refined/ores.ts'
import { STONES_REFINED } from './refined/stones.ts'
import { SWEETS_REFINED } from './refined/sweets.ts'
import { VEGETABLES_REFINED } from './refined/vegetables.ts'
import { WOODS_REFINED } from './refined/woods.ts'
import { STONES } from './stones.ts'
import { SWEETS } from './sweets.ts'
import type { ItemIcon } from './types.ts'
import { VEGETABLES } from './vegetables.ts'
import { WOODS } from './woods.ts'

export interface ItemFamily {
  id: string
  name: string
  side: 'farming' | 'gathering'
  effect: string
  raw: ItemIcon[]
  refined: ItemIcon[]
}

export const FAMILIES: ItemFamily[] = [
  { id: 'grains', name: 'Grains', side: 'farming', effect: 'HP', raw: GRAINS, refined: GRAINS_REFINED },
  { id: 'fruits', name: 'Fruits', side: 'farming', effect: 'MP', raw: FRUITS, refined: FRUITS_REFINED },
  { id: 'fish', name: 'Fish', side: 'farming', effect: 'ATK', raw: FISH, refined: FISH_REFINED },
  { id: 'herbs-spices', name: 'Herbs & Spices', side: 'farming', effect: 'M.ATK', raw: HERBS_SPICES, refined: HERBS_SPICES_REFINED },
  { id: 'vegetables', name: 'Vegetables', side: 'farming', effect: 'DEF', raw: VEGETABLES, refined: VEGETABLES_REFINED },
  { id: 'mushrooms', name: 'Mushrooms', side: 'farming', effect: 'M.DEF', raw: MUSHROOMS, refined: MUSHROOMS_REFINED },
  { id: 'sweets', name: 'Sweets', side: 'farming', effect: 'Speed', raw: SWEETS, refined: SWEETS_REFINED },
  { id: 'nuts-seeds', name: 'Nuts & Seeds', side: 'farming', effect: 'Limit Break charge', raw: NUTS_SEEDS, refined: NUTS_SEEDS_REFINED },
  { id: 'hides-scales', name: 'Hides & Scales', side: 'gathering', effect: 'HP', raw: HIDES_SCALES, refined: HIDES_SCALES_REFINED },
  { id: 'essences', name: 'Essences', side: 'gathering', effect: 'MP', raw: ESSENCES, refined: ESSENCES_REFINED },
  { id: 'ores', name: 'Ores', side: 'gathering', effect: 'ATK', raw: ORES, refined: ORES_REFINED },
  { id: 'crystals', name: 'Crystals', side: 'gathering', effect: 'M.ATK', raw: CRYSTALS, refined: CRYSTALS_REFINED },
  { id: 'stones', name: 'Stones', side: 'gathering', effect: 'DEF', raw: STONES, refined: STONES_REFINED },
  { id: 'fibers', name: 'Fibers', side: 'gathering', effect: 'M.DEF', raw: FIBERS, refined: FIBERS_REFINED },
  { id: 'woods', name: 'Woods', side: 'gathering', effect: 'Speed', raw: WOODS, refined: WOODS_REFINED },
  { id: 'bones-horns', name: 'Bones & Horns', side: 'gathering', effect: 'Limit Break charge', raw: BONES_HORNS, refined: BONES_HORNS_REFINED },
]
