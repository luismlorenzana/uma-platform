// Uma profiles (P131): the owner's picks a character keeps whatever board she is on, and the sisters Claude authors. A
// sister is an outfit of a character that is really another Uma: her sister, running the same career in a fictional age.
// She takes that outfit off her sister's card set and ranks, shows and counts as herself. The file is private (names
// derived from original characters): `ranker/profiles.json` in the app's bucket, never git.
import { isWay, leadOutfit, outfitIndex, type TierCatalog, type UmaCharacter, type UmaOutfit, type Way } from './model.js'

export interface Sister {
  /** The outfit that is hers; her identity id is `s<outfitId>`. */
  outfitId: number
  /** Her sister's character id. */
  characterId: number
  name: string
  /** Who she is to her sister, in a few words: "younger sister", "twin". */
  relation: string
  /** The fictional age she ran her sister's career in. */
  age: string
  /** A short profile, a few sentences. */
  profile: string
}
export interface CharacterProfile {
  /** Her default outfit (P125): her face, the outfit her card opens on, her playstyle. One of her own outfits. */
  defaultOutfit?: number
  /** Her playstyle, when picked against her default outfit's (P117); used where she is one card (Uma NPCs). */
  way?: Way
}
export interface UmaProfiles {
  schemaVersion: 1
  kind: 'uma-profiles'
  revision: number
  updatedAt: string | null
  /** By character id. */
  characters: Record<string, CharacterProfile>
  sisters: Sister[]
}
export const emptyProfiles = (): UmaProfiles => ({ schemaVersion: 1, kind: 'uma-profiles', revision: 0, updatedAt: null, characters: {}, sisters: [] })
export const sisterId = (outfitId: number): string => `s${outfitId}`
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max
const positive = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0

/** Rejects a malformed profiles file before anything changes. */
export function parseProfiles(value: unknown): UmaProfiles {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'uma-profiles' || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 ||
      !(value.updatedAt === null || (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)))) ||
      !object(value.characters) || !Array.isArray(value.sisters)) throw new Error('Expected an Uma profiles JSON file (schemaVersion 1).')
  const characters: Record<string, CharacterProfile> = {}
  for (const [id, p] of Object.entries(value.characters)) {
    if (!/^[1-9][0-9]{0,8}$/.test(id) || !object(p) || (p.defaultOutfit !== undefined && !positive(p.defaultOutfit)) || (p.way !== undefined && !isWay(p.way)) ||
        Object.keys(p).some((k) => k !== 'defaultOutfit' && k !== 'way')) throw new Error('Each character profile holds at most a default outfit id and a playstyle.')
    characters[id] = { ...(p.defaultOutfit !== undefined ? { defaultOutfit: Number(p.defaultOutfit) } : {}), ...(p.way !== undefined ? { way: p.way as Way } : {}) }
  }
  const seen = new Set<number>()
  const sisters = value.sisters.map((s: unknown): Sister => {
    if (!object(s) || !positive(s.outfitId) || !positive(s.characterId) || seen.has(Number(s.outfitId)) || !text(s.name, 80) || !s.name.trim() ||
        !text(s.relation, 80) || !text(s.age, 120) || !text(s.profile, 2000)) throw new Error('Each sister needs a unique outfit id, her sister’s character id, a name, a relation, an age and a profile.')
    seen.add(Number(s.outfitId))
    return { outfitId: Number(s.outfitId), characterId: Number(s.characterId), name: s.name, relation: s.relation, age: s.age, profile: s.profile }
  })
  return { schemaVersion: 1, kind: 'uma-profiles', revision: Number(value.revision), updatedAt: value.updatedAt as string | null, characters, sisters }
}

/** What doesn't fit the catalog: a sister's outfit that isn't her sister's, or a default that isn't one of a character's own. */
export function profileProblems(profiles: UmaProfiles, catalog: TierCatalog): string[] {
  const outfits = outfitIndex(catalog), sisters = new Set(profiles.sisters.map((s) => s.outfitId)), problems: string[] = []
  for (const s of profiles.sisters) {
    if (String(outfits.get(s.outfitId)?.uma.id) !== String(s.characterId)) problems.push(`Sister ${s.name}: outfit ${s.outfitId} is not one of character ${s.characterId}'s.`)
  }
  for (const [id, p] of Object.entries(profiles.characters)) {
    if (p.defaultOutfit === undefined) continue
    if (outfits.get(p.defaultOutfit)?.uma.id !== id) problems.push(`Character ${id}: default outfit ${p.defaultOutfit} is not hers.`)
    else if (sisters.has(p.defaultOutfit)) problems.push(`Character ${id}: default outfit ${p.defaultOutfit} belongs to a sister.`)
  }
  return problems
}

/** Her own outfits: every outfit of hers that isn't a sister's. */
export function ownOutfits(uma: UmaCharacter, profiles: UmaProfiles): UmaOutfit[] {
  const sisters = new Set(profiles.sisters.map((s) => s.outfitId))
  return uma.outfits.filter((o) => !sisters.has(o.id))
}
/** Her default outfit (P125): the pick when it is one of her own, else the lead rule among her own. */
export function defaultOutfit(uma: UmaCharacter, profiles: UmaProfiles): UmaOutfit | undefined {
  const own = ownOutfits(uma, profiles), pick = profiles.characters[uma.id]?.defaultOutfit
  return own.find((o) => o.id === pick) ?? leadOutfit(own) ?? own[0] ?? uma.outfits[0]
}
/** The owner's default-outfit pick, when it is still one of her own. */
export function outfitPick(uma: UmaCharacter, profiles: UmaProfiles): number | null {
  const pick = profiles.characters[uma.id]?.defaultOutfit
  return ownOutfits(uma, profiles).some((o) => o.id === pick) ? pick! : null
}
/** A character's playstyle where she is one card: the pick when one of her own outfits has it, else her default outfit's. */
export function playstyleOf(uma: UmaCharacter, profiles: UmaProfiles): Way {
  const pick = profiles.characters[uma.id]?.way
  if (pick && ownOutfits(uma, profiles).some((o) => o.way === pick)) return pick
  return defaultOutfit(uma, profiles)?.way ?? 'front'
}
/** Locks in her default outfit (P125), kept even when it's the one the rule would choose. Refuses a sister's outfit. */
export function setDefaultOutfit(profiles: UmaProfiles, uma: UmaCharacter, outfit: number): UmaProfiles {
  if (!ownOutfits(uma, profiles).some((o) => o.id === outfit) || profiles.characters[uma.id]?.defaultOutfit === outfit) return profiles
  return { ...profiles, characters: { ...profiles.characters, [uma.id]: { ...profiles.characters[uma.id], defaultOutfit: outfit } } }
}

/** One Uma as the game and the art see her: a character with her own outfits, or a sister with hers. */
export interface UmaIdentity {
  /** The character id, or `s<outfitId>` for a sister. */
  id: string
  characterId: string
  name: string
  sister: Sister | null
  outfits: UmaOutfit[]
  defaultOutfit: number
}
/** Every identity: each character with at least one outfit of her own, then each sister. */
export function identities(catalog: TierCatalog, profiles: UmaProfiles): UmaIdentity[] {
  const outfits = outfitIndex(catalog)
  const mains = catalog.umas.flatMap((uma): UmaIdentity[] => {
    const own = ownOutfits(uma, profiles)
    return own.length ? [{ id: uma.id, characterId: uma.id, name: uma.name, sister: null, outfits: own, defaultOutfit: defaultOutfit(uma, profiles)!.id }] : []
  })
  const sisters = profiles.sisters.flatMap((s): UmaIdentity[] => {
    const found = outfits.get(s.outfitId)
    return found ? [{ id: sisterId(s.outfitId), characterId: found.uma.id, name: s.name, sister: s, outfits: [found.outfit], defaultOutfit: s.outfitId }] : []
  })
  return [...mains, ...sisters]
}
/** Each outfit's identity: her sister's when the outfit is a sister's, else her character's. */
export function identityByOutfit(catalog: TierCatalog, profiles: UmaProfiles): Map<number, UmaIdentity> {
  return new Map(identities(catalog, profiles).flatMap((i) => i.outfits.map((o) => [o.id, i] as const)))
}
