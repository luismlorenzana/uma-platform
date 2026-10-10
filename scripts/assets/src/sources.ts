// Where each art family comes from. uma-racer stored an `imageSource` URL in its packs; master records stay free of
// source URLs, so the GameTora paths are derived here from the original's ids.

import type { Outfit, Scenario, Skill, SupportCard } from '@luismlorenzana/uma-data'
import type { ImageSource } from './download'

const GAMETORA_IMAGES = 'https://gametora.com/images/umamusume'
const GAMETORA_MEDIA = 'https://media.gametora.com/umamusume'

/** 128 px stand thumbnail. */
export const outfitIconUrl = (outfit: Pick<Outfit, 'id' | 'characterId'>): string =>
  `${GAMETORA_IMAGES}/characters/thumb/chara_stand_${outfit.characterId}_${outfit.id}.png`

/** The full stand beside the thumbnail (about 512 px). Busts are cut from it. */
export const outfitPortraitUrl = (outfit: Pick<Outfit, 'id' | 'characterId'>): string =>
  `${GAMETORA_IMAGES}/characters/chara_stand_${outfit.characterId}_${outfit.id}.png`

export const supportCardIconUrl = (cardId: number): string => `${GAMETORA_IMAGES}/supports/support_card_s_${cardId}.png`

/** The card's full illustration. */
export const supportCardArtUrl = (cardId: number): string => `${GAMETORA_IMAGES}/supports/tex_support_card_${cardId}.png`

export const skillIconUrl = (iconId: number): string => `${GAMETORA_IMAGES}/skill_icons/utx_ico_skill_${iconId}.png`

export const scenarioIconUrl = (scenarioId: number): string => `${GAMETORA_MEDIA}/scenarios/hero/thumb/${scenarioId}.png`

export interface ArtSources {
  outfitIcons: ImageSource[]
  outfitPortraits: ImageSource[]
  supportCardIcons: ImageSource[]
  supportCardArt: ImageSource[]
  skillIcons: ImageSource[]
  scenarioIcons: ImageSource[]
}

/** Every source the art families need. `scenarioOverrides` replaces a scenario crest URL by scenario id. */
export function artSources(
  sets: { outfits: readonly Outfit[]; supportCards: readonly SupportCard[]; skills: readonly Skill[]; scenarios: readonly Scenario[] },
  scenarioOverrides: ReadonlyMap<number, string> = new Map(),
): ArtSources {
  const iconIds = new Set<number>()
  for (const skill of sets.skills) {
    iconIds.add(skill.iconId)
    if (skill.globalIconId !== null) iconIds.add(skill.globalIconId)
  }
  return {
    outfitIcons: sets.outfits.map((outfit) => ({ id: String(outfit.id), url: outfitIconUrl(outfit) })),
    outfitPortraits: sets.outfits.map((outfit) => ({ id: String(outfit.id), url: outfitPortraitUrl(outfit) })),
    supportCardIcons: sets.supportCards.map((card) => ({ id: String(card.id), url: supportCardIconUrl(card.id) })),
    supportCardArt: sets.supportCards.map((card) => ({ id: String(card.id), url: supportCardArtUrl(card.id) })),
    skillIcons: [...iconIds].sort((left, right) => left - right).map((iconId) => ({ id: String(iconId), url: skillIconUrl(iconId) })),
    scenarioIcons: sets.scenarios.map((scenario) => ({
      id: String(scenario.id),
      url: scenarioOverrides.get(scenario.id) ?? scenarioIconUrl(scenario.id),
    })),
  }
}
