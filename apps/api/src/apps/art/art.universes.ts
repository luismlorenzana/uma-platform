// The universe looks (CA4, P162): the owner-approved character art ChatGPT drew of an Uma in another world (Cyberpunk,
// Farm Life, High Fantasy), published by `pnpm art:push` to the app's own bucket under `art/universes/<universe>/`: an
// `index.json` and the approved PNGs, byte for byte, under hash names. Character Art shows exactly what each index lists,
// read on every request; names resolve through master data and the Ranker's sister profiles, retaining outfit identity.
// CA5 (P169) adds the dialogue portraits as pieces: `art/universes/<universe>/portraits/` holds each outfit's neutral crop,
// each expression's face and a recipe (`index.json`). An Uma's page shows her pieces; the games compose the states from
// the recipe at `/api/art/portraits/<universe>`. Nothing here composes a state. Her profile pictures (uma-farm F88, P180)
// sit beside them: `art/universes/<universe>/profiles/` holds the square crops master data ships, published by
// `pnpm profiles:push` with an `index.json` (`kind: universe-profiles`), for the owner's review on her page.
import type { CharacterArtIdentity } from '@luismlorenzana/uma-data'
import type { BlobStore } from '../../store/blob-store'

type CharacterResolver = (name: string) => number | CharacterArtIdentity | null
const identityOf = (name: string, resolve: CharacterResolver): { characterId: number | null; outfitId?: number } => {
  const identity = resolve(name)
  return typeof identity === 'number' || identity === null ? { characterId: identity } : identity
}

export interface UniverseLook {
  category?: 'character-sprites' | 'pajama-outfits' | 'wedding-anniversary-outfits' | 'pajama-splash' | 'wedding-anniversary-splash' | 'weapons' | 'combat-sprites' | 'duo-splash'
  /** One shared image, visible on each participating character's own identity. */
  duo?: { id: string; members: { castId: string; character: string; role: 'character' | 'boss-ally'; characterId: number | null; outfitId?: number }[] }
  id: string
  /** A full-body look, or a splash illustration (P175). */
  kind: 'look' | 'splash'
  character: string
  /** Her real character, resolved by a master or Ranker sister name; null for an unknown name. */
  characterId: number | null
  /** A sister's neutral outfit identity; absent for the original character. */
  outfitId?: number
  outfit: string
  title: string
  /** The picture's pack path, `universes/<universe>/images/<id>.<16 hex>.png`, read at `/api/art/content/…`. */
  path: string
  bytes: number
  sha256: string
  width: number
  height: number
  approvedOn: string | null
  publishedAt: string | null
}
/** One piece of a universe's dialogue portraits (CA5): an outfit's neutral crop, or an expression's face layer; or an
 *  outfit's profile picture (P180). */
export interface PortraitPiece {
  kind: 'crop' | 'face' | 'profile'
  id: string
  /** Her authored name and real character, including names from the Ranker's sister profiles. */
  character: string
  characterId: number | null
  outfitId?: number
  outfit: string | null
  expression: string | null
  /** The pack path, `universes/<universe>/portraits/(bases|faces)/<id>.<16 hex>.png` (a profile's
   *  `universes/<universe>/profiles/<id>.<16 hex>.webp`), read at `/api/art/content/…`. */
  path: string
  bytes: number
  sha256: string
  width: number
  height: number
}
/** What an Uma's page needs of a universe's portraits: its pieces, and how many states the games make of them. */
export interface UniversePortraits { states: number; approvedOn: string | null; publishedAt: string | null; pieces: PortraitPiece[] }
/** Her profile pictures (P180): one square a base, from the master data release named. */
export interface UniverseProfiles { size: number | null; release: string | null; publishedAt: string | null; pieces: PortraitPiece[] }
export interface Universe {
  id: string
  title: string
  style: string | null
  revision: number | null
  publishedAt: string | null
  looks: UniverseLook[]
  portraits: UniversePortraits | null
  profiles: UniverseProfiles | null
}
/** The whole recipe, for the games (`/api/art/portraits/<universe>`): the pieces at their pack paths, and every state. */
export interface PortraitRecipe {
  universe: string
  revision: number | null
  approvedOn: string | null
  publishedAt: string | null
  size: { width: number; height: number }
  faceSize: { width: number; height: number }
  blend: string
  characters: { id: string; name: string; characterId: number | null; outfitId?: number }[]
  outfits: string[]
  expressions: string[]
  bases: PortraitPiece[]
  faces: PortraitPiece[]
  states: { character: string; outfit: string; expression: string; base: string; face: string | null; at: { x: number; y: number } | null }[]
}

/** The only universe files the pack route serves: a look's PNG, named by its hash. */
export const UNIVERSE_PACK_ALLOW = /universes\/[a-z0-9-]+\/images\/[a-z0-9-]+\.[a-f0-9]{16}\.png/
/** A portrait piece's PNG, named by its hash (CA5). */
export const PORTRAIT_PACK_ALLOW = /universes\/[a-z0-9-]+\/portraits\/(?:bases|faces)\/[a-z0-9-]+\.[a-f0-9]{16}\.png/
/** A profile picture's WebP, named by its hash (P180). */
export const PROFILE_PACK_ALLOW = /universes\/[a-z0-9-]+\/profiles\/[a-z0-9-]+\.[a-f0-9]{16}\.webp/

const decoder = new TextDecoder()
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
const whole = (v: unknown): number | null => (typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : null)

/** One look of an index, or null when its entry isn't a hash-named PNG of this universe with its size and hash. */
function duoOf(universe: string, raw: unknown, characterOf: CharacterResolver): UniverseLook['duo'] | null {
  if (!object(raw) || !text(raw.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw.id as string) || !Array.isArray(raw.members) || raw.members.length !== 2) return null
  const members: NonNullable<UniverseLook['duo']>['members'] = []
  for (const member of raw.members) {
    if (!object(member) || !text(member.id) || !text(member.name) || (member.role !== 'character' && member.role !== 'boss-ally')) return null
    members.push({ castId: member.id as string, character: member.name as string, role: member.role,
      ...(member.role === 'character' ? identityOf(member.name as string, characterOf) : { characterId: null }) })
  }
  if (members[0]!.castId === members[1]!.castId) return null
  if (universe === 'farm-life' ? members.some(member => member.role !== 'character') : universe === 'cyberpunk' ? members.filter(member => member.role === 'character').length !== 1 : true) return null
  return { id: raw.id as string, members }
}

function lookOf(universe: string, raw: unknown, characterOf: CharacterResolver): UniverseLook | null {
  if (!object(raw)) return null
  const id = text(raw.id), character = text(raw.character), path = text(raw.path), sha256 = text(raw.sha256)
  const bytes = whole(raw.bytes), width = whole(raw.width), height = whole(raw.height)
  if (!id || !character || !path || !sha256 || !bytes || !width || !height) return null
  if (!/^[a-f0-9]{64}$/.test(sha256) || path !== `images/${id}.${sha256.slice(0, 16)}.png` || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return null
  const farmCategory = universe === 'farm-life' && (raw.category === 'character-sprites' || raw.category === 'pajama-outfits' || raw.category === 'wedding-anniversary-outfits' || raw.category === 'pajama-splash' || raw.category === 'wedding-anniversary-splash')
  const cyberpunkCategory = universe === 'cyberpunk' && (raw.category === 'weapons' || raw.category === 'combat-sprites')
  const duo = raw.category === 'duo-splash' ? duoOf(universe, raw.duo, characterOf) : null
  if (raw.category === 'duo-splash' && (!duo || raw.kind !== 'splash' || !duo.members.some(member => member.role === 'character' && member.character === character))) return null
  return {
    id, kind: raw.kind === 'splash' ? 'splash' : 'look', character, ...identityOf(character, characterOf), outfit: text(raw.outfit) ?? id, title: text(raw.title) ?? id,
    ...(farmCategory || cyberpunkCategory || duo ? { category: raw.category as UniverseLook['category'] } : {}),
    ...(duo ? { duo } : {}),
    path: `universes/${universe}/${path}`, bytes, sha256, width, height, approvedOn: text(raw.approvedOn), publishedAt: text(raw.publishedAt),
  }
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const words = (id: string) => id.split('-').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ')
const readJson = async (store: Pick<BlobStore, 'read'>, path: string): Promise<Record<string, unknown> | null> => {
  const blob = await store.read(path)
  if (!blob) return null
  try { const v = JSON.parse(decoder.decode(blob.bytes)) as unknown; return object(v) ? v : null } catch { return null }
}

/** A universe's portrait recipe as published, its pieces at their pack paths; null when it has none or it doesn't hold. */
export async function portraitRecipe(store: Pick<BlobStore, 'read'>, universe: string, characterOf: CharacterResolver): Promise<PortraitRecipe | null> {
  if (!KEBAB.test(universe)) return null
  const index = await readJson(store, `universes/${universe}/portraits/index.json`)
  if (!index || index.kind !== 'universe-portraits' || index.universe !== universe) return null
  const characters = (Array.isArray(index.characters) ? index.characters as unknown[] : []).filter(object)
    .flatMap((c) => (typeof c.id === 'string' && KEBAB.test(c.id) && typeof c.name === 'string' ? [{ id: c.id, name: c.name, ...identityOf(c.name, characterOf) }] : []))
  const nameOf = new Map(characters.map((c) => [c.id, c]))
  const piece = (kind: 'crop' | 'face', raw: unknown): PortraitPiece | null => {
    if (!object(raw)) return null
    const id = text(raw.id), who = nameOf.get(String(raw.character)), path = text(raw.path), sha256 = text(raw.sha256)
    const bytes = whole(raw.bytes), width = whole(raw.width), height = whole(raw.height)
    if (!id || !KEBAB.test(id) || !who || !path || !sha256 || !/^[a-f0-9]{64}$/.test(sha256) || !bytes || !width || !height) return null
    if (path !== `${kind === 'crop' ? 'bases' : 'faces'}/${id}.${sha256.slice(0, 16)}.png`) return null
    return {
      kind, id, character: who.name, characterId: who.characterId, ...(who.outfitId === undefined ? {} : { outfitId: who.outfitId }), outfit: kind === 'crop' ? text(raw.outfit) : null, expression: kind === 'face' ? text(raw.expression) : null,
      path: `universes/${universe}/portraits/${path}`, bytes, sha256, width, height,
    }
  }
  const bases = (Array.isArray(index.bases) ? index.bases as unknown[] : []).flatMap((b) => piece('crop', b) ?? [])
  const faces = (Array.isArray(index.faces) ? index.faces as unknown[] : []).flatMap((f) => piece('face', f) ?? [])
  const known = new Set([...bases, ...faces].map((p) => p.id))
  const states = (Array.isArray(index.states) ? index.states as unknown[] : []).filter(object).flatMap((s) => {
    const at = object(s.at) && Number.isSafeInteger(s.at.x) && Number.isSafeInteger(s.at.y) ? { x: s.at.x as number, y: s.at.y as number } : null
    const base = text(s.base), face = s.face === null ? null : text(s.face)
    if (!base || !known.has(base) || (face !== null && (!known.has(face) || !at)) || typeof s.character !== 'string' || typeof s.outfit !== 'string' || typeof s.expression !== 'string') return []
    return [{ character: s.character, outfit: s.outfit, expression: s.expression, base, face, at: face === null ? null : at }]
  })
  if (bases.length === 0) return null
  const size = (v: unknown) => (object(v) && whole(v.width) && whole(v.height) ? { width: v.width as number, height: v.height as number } : { width: 0, height: 0 })
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return {
    universe, revision: typeof index.revision === 'number' ? index.revision : null, approvedOn: text(index.approvedOn), publishedAt: text(index.publishedAt),
    size: size(index.size), faceSize: size(index.faceSize), blend: text(index.blend) ?? '', characters, outfits: strings(index.outfits), expressions: strings(index.expressions),
    bases, faces, states,
  }
}

/** A universe's profile pictures as published (P180), each tied to her character by name; null when it has none. */
export async function profilePictures(store: Pick<BlobStore, 'read'>, universe: string, characterOf: CharacterResolver): Promise<UniverseProfiles | null> {
  if (!KEBAB.test(universe)) return null
  const index = await readJson(store, `universes/${universe}/profiles/index.json`)
  if (!index || index.kind !== 'universe-profiles' || index.universe !== universe) return null
  const names = new Map((Array.isArray(index.characters) ? index.characters as unknown[] : []).filter(object)
    .flatMap((c) => (typeof c.id === 'string' && KEBAB.test(c.id) && typeof c.name === 'string' ? [[c.id, c.name] as const] : [])))
  const pieces = (Array.isArray(index.profiles) ? index.profiles as unknown[] : []).flatMap((raw): PortraitPiece[] => {
    if (!object(raw)) return []
    const id = text(raw.id), name = names.get(String(raw.character)), path = text(raw.path), sha256 = text(raw.sha256)
    const bytes = whole(raw.bytes), width = whole(raw.width), height = whole(raw.height)
    if (!id || !KEBAB.test(id) || !name || !path || !sha256 || !/^[a-f0-9]{64}$/.test(sha256) || !bytes || !width || !height) return []
    if (path !== `profiles/${id}.${sha256.slice(0, 16)}.webp`) return []
    return [{ kind: 'profile', id, character: name, ...identityOf(name, characterOf), outfit: text(raw.outfit), expression: null, path: `universes/${universe}/${path}`, bytes, sha256, width, height }]
  })
  if (pieces.length === 0) return null
  return { size: whole(index.size), release: text(index.release), publishedAt: text(index.publishedAt), pieces }
}

/** Every published universe, by name: the looks its index lists, in the index's order, and its portrait pieces (CA5). */
export async function universes(store: Pick<BlobStore, 'read' | 'list'>, characterOf: CharacterResolver): Promise<Universe[]> {
  const files = await store.list('universes')
  const ids = [...new Set(files.flatMap((p) => /^universes\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?:portraits\/)?index\.json$/.exec(p)?.[1] ?? []))].sort()
  const out: Universe[] = []
  for (const id of ids) {
    const index = await readJson(store, `universes/${id}/index.json`)
    const valid = !!index && index.kind === 'universe-art' && index.universe === id && Array.isArray(index.looks)
    const looks = valid ? (index.looks as unknown[]).flatMap((raw) => lookOf(id, raw, characterOf) ?? []) : []
    const recipe = files.includes(`universes/${id}/portraits/index.json`) ? await portraitRecipe(store, id, characterOf) : null
    const profiles = files.includes(`universes/${id}/profiles/index.json`) ? await profilePictures(store, id, characterOf) : null
    if (looks.length === 0 && !recipe) continue
    out.push({
      id, title: (valid ? text(index.title) : null) ?? words(id), style: valid ? text(index.style) : null, revision: valid && typeof index.revision === 'number' ? index.revision : null,
      publishedAt: valid ? text(index.publishedAt) : null, looks,
      portraits: recipe ? { states: recipe.states.length, approvedOn: recipe.approvedOn, publishedAt: recipe.publishedAt, pieces: [...recipe.bases, ...recipe.faces] } : null,
      profiles,
    })
  }
  return out
}
