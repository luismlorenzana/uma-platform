// The `enemies` set (uma-quest Q16 part A; docs/master-data.md#enemies): every unit on the owner's enemy boards, by a
// numeric, opaque and stable id, with her franchise, her tier and her name. Optional in a release: an older release
// has none, and a client that doesn't know the set ignores it. Names live only in master data's private release.

import { fail, fields, id, oneOf, text, type Parser } from '../parse.js'

/** The three enemy tiers (the enemy art review's EN1): the board group a unit is cast from. */
export const ENEMY_TIERS = ['regular', 'key', 'boss'] as const
export type EnemyTier = (typeof ENEMY_TIERS)[number]

/** Enemy ids start here, clear of every outfit, card and character id, and are never reused. */
export const ENEMY_ID_MIN = 700001
export const ENEMY_ID_MAX = 799999

export interface Enemy {
  /** Numeric, opaque and stable: a unit keeps it whatever board or rank she moves to. */
  id: number
  /** The franchise's code on the boards: `azurlane`, `nikke`, `genshin`, `wuwa`, `hsr`, `zzz`, `hi3`, `pgr`, … */
  franchise: string
  /** Her tier when the set was generated; a published enemy key's own tier is the one her art was drawn to. */
  tier: EnemyTier
  name: string
}

export const parseEnemy: Parser<Enemy> = (value, path) => {
  const f = fields(value, path)
  const enemyId = f('id', id)
  if (enemyId < ENEMY_ID_MIN || enemyId > ENEMY_ID_MAX) fail(`${path}.id`, `an enemy id from ${ENEMY_ID_MIN} to ${ENEMY_ID_MAX}`)
  const franchise = f('franchise', text)
  if (!/^[a-z][a-z0-9]{1,15}$/.test(franchise)) fail(`${path}.franchise`, 'a lowercase franchise code')
  return { id: enemyId, franchise, tier: f('tier', oneOf(ENEMY_TIERS)), name: f('name', text) }
}
