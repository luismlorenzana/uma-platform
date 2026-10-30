// The 36 Hub places in uma-rpg's Hub order (its places catalog), then each later addition: the atlas lays them out six
// across in this order.
import { FARMLANDS } from './farmlands.ts'
import { LEARNING } from './learning.ts'
import { LAPIDARY } from './lapidary.ts'
import { RACER } from './racer.ts'
import { RIFT } from './rift.ts'
import { HEALER_SANCTUM } from './sanctum.ts'
import { TRIOS } from './trios.ts'
import { TOWN } from './town.ts'
import type { Place } from './types.ts'
import { WILDS } from './wilds.ts'

// Always append: published frames must never move when a new game adds places.
export const PLACES: Place[] = [...FARMLANDS, ...WILDS, ...LEARNING, ...TOWN, ...RACER, LAPIDARY, RIFT, ...TRIOS, HEALER_SANCTUM]
