// Every kit kit-art draws (P147): its id, kind, frames and drawings, and how its page is encoded. kit-farm keeps the
// plain encoding it shipped with (its bytes are frozen); later kits use the filtered one, to stay under uma-quest's
// 3 MB page budget (its D30). Pure.
import type { KitKind } from './atlas.js'
import { biomeDrawers } from './biome/draw.js'
import { biomeSpecs, type BiomeId } from './biome/spec.js'
import { DRAWERS } from './farm/index.js'
import { WAVE_1, type FrameSpec } from './farm/spec.js'
import type { Canvas } from './paint.js'
import { townDrawers } from './town/draw.js'
import { townSpecs } from './town/spec.js'
import { TOWN_STYLES } from './town/styles.js'

export interface KitDef { id: string; kind: KitKind; specs: readonly FrameSpec[]; drawers: Readonly<Record<string, () => Canvas>>; filtered: boolean }

const town = (id: keyof typeof TOWN_STYLES): KitDef => ({ id: `kit-town-${id}`, kind: 'town', specs: townSpecs(TOWN_STYLES[id].lamp), drawers: townDrawers(TOWN_STYLES[id]), filtered: true })
const biome = (id: BiomeId): KitDef => ({ id: `kit-${id}`, kind: 'biome', specs: biomeSpecs(id), drawers: biomeDrawers(id), filtered: true })

export const KITS: readonly KitDef[] = [
  { id: 'kit-farm', kind: 'farm', specs: WAVE_1, drawers: DRAWERS, filtered: false },
  town('spellblade'), town('mage'), town('summoner'), town('healer'),
  biome('meadow'), biome('ruins'), biome('marsh'), biome('coast'),
]
export const kitById = (id: string): KitDef => {
  const k = KITS.find((x) => x.id === id)
  if (!k) throw new Error(`no kit ${id}`)
  return k
}
