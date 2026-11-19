import { characterArtKey, parseSet, type Character, type CharacterArtIdentity, type Outfit, type ReleaseManifest } from '@luismlorenzana/uma-data'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { characterLookup, nameKey } from './character-names'
import { DEFAULT_CONTENT_DIR, readVerifiedFile } from './release-dir'

/** Private authoring aliases select real outfit identities; names never enter the shared schema. */
export function artIdentityLookup(characters: readonly Character[], outfits: readonly Outfit[], value: unknown = null): (name: string) => CharacterArtIdentity | null {
  const original = characterLookup(characters)
  const aliases = new Map<string, CharacterArtIdentity>()
  if (value !== null) {
    const input = value as { identities?: unknown }
    if (!input || typeof input !== 'object' || !input.identities || typeof input.identities !== 'object' || Array.isArray(input.identities)) throw new Error('Art identities must contain an identities object')
    for (const [name, raw] of Object.entries(input.identities)) {
      if (!raw || typeof raw !== 'object') throw new Error(`Invalid art identity for ${name}`)
      const identity = raw as CharacterArtIdentity
      characterArtKey(identity.characterId, identity.outfitId)
      if (identity.outfitId === undefined || !characters.some(c => c.id === identity.characterId) ||
          !outfits.some(o => o.id === identity.outfitId && o.characterId === identity.characterId)) throw new Error(`${name}: its outfit must belong to its master-data character`)
      if (original(name) !== null || !nameKey(name) || aliases.has(nameKey(name))) throw new Error(`${name}: art identity shadows an existing name`)
      aliases.set(nameKey(name), { characterId: identity.characterId, outfitId: identity.outfitId })
    }
  }
  return name => aliases.get(nameKey(name)) ?? (original(name) === null ? null : { characterId: original(name)! })
}

export async function artIdentityOverrides(universe: string): Promise<unknown> {
  const file = resolve(DEFAULT_CONTENT_DIR, 'authoring/art-identities', `${universe}.json`)
  if (!existsSync(file)) return null
  const input: unknown = JSON.parse(await readFile(file, 'utf8'))
  if ((input as { universe?: unknown } | null)?.universe !== universe) throw new Error(`Not the ${universe} art identities`)
  return input
}

export async function localArtIdentityLookup(universe: string, releaseDir: string, manifest: ReleaseManifest): Promise<(name: string) => CharacterArtIdentity | null> {
  const bytes = async (name: 'characters' | 'outfits') => {
    const entry = manifest.files.find(f => f.path === manifest.sets[name])
    if (!entry) throw new Error(`No ${name} set in the local manifest`)
    return JSON.parse((await readVerifiedFile(releaseDir, entry)).toString('utf8')) as unknown
  }
  const aliases = await artIdentityOverrides(universe)
  const characters = parseSet('characters', await bytes('characters'))
  return artIdentityLookup(characters, aliases === null ? [] : parseSet('outfits', await bytes('outfits')), aliases)
}

/** Checks a family-map identity against the neutral sets before the client reads it. */
export function artIdentityOfKey(key: string, characters: readonly Character[], outfits: readonly Outfit[]): CharacterArtIdentity {
  if (/^[1-9]\d*$/.test(key) && characters.some(c => c.id === Number(key))) return { characterId: Number(key) }
  const match = /^outfit:([1-9]\d*)$/.exec(key)
  const outfit = match ? outfits.find(o => o.id === Number(match[1])) : undefined
  if (!outfit || !characters.some(c => c.id === outfit.characterId)) throw new Error(`Unknown character art identity ${key}`)
  return { characterId: outfit.characterId, outfitId: outfit.id }
}
