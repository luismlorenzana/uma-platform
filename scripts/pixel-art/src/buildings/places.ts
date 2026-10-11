// The 36 Hub places in uma-rpg's Hub order (its places catalog): the atlas lays them out six across in this order.
import { FARMLANDS } from './farmlands.ts'
import { LEARNING } from './learning.ts'
import { TOWN } from './town.ts'
import type { Place } from './types.ts'
import { WILDS } from './wilds.ts'

export const PLACES: Place[] = [...FARMLANDS, ...WILDS, ...LEARNING, ...TOWN]
