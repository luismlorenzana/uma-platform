// Uma Character Art's data (CA1, P135): every outfit in the Ranker's order. The Umas come from the master data release;
// the order, the sisters and their profiles from the Ranker's own files in the app's bucket (`ranker/boards/umas.json`,
// `ranker/profiles.json`), read on every request, so a re-rank shows on the next load. Files, never the Ranker's code (AP1).
import { createReleaseClient, ReleaseSourceError } from '@luismlorenzana/uma-data'
import type { FileSource } from '@luismlorenzana/uma-server/content'
import {
  buildCatalog, emptyBoard, emptyLegacy, emptyProfiles, identityByOutfit, ordered, parseBoard, parseProfiles,
  type AnyTier, type TierCatalog,
} from '@uma-platform/tiers'

export interface ArtOutfit {
  outfitId: number
  characterId: number
  /** The Uma she is: her character, or her sister's `s<outfitId>`. */
  identity: string
  name: string
  sister: { relation: string; age: string; profile: string } | null
  /** Her tier on Playable Umas (T1–T10, F), or null. */
  tier: AnyTier | null
  /** Her place in the whole ranking, 1-based, or null. */
  order: number | null
}
export interface ArtOrder { release: string; rankerRevision: number; profilesRevision: number; outfits: ArtOutfit[] }

const decoder = new TextDecoder()
const json = async (files: FileSource, path: string): Promise<unknown | null> => {
  const bytes = await files.read(path)
  return bytes === null ? null : JSON.parse(decoder.decode(bytes)) as unknown
}

/** A name as one key: letters and digits only, so "Kitasan Black" and "kitasan-black" are the same Uma. */
const nameKey = (name: string): string => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '')

interface Loaded { catalog: TierCatalog; names: Map<string, number> }

export class ArtService {
  private loaded: Promise<Loaded> | undefined
  /** `release`: the master data release; `ranker`: the Ranker's folder (`ranker/` in the bucket, its local copy in dev). */
  constructor(private readonly release: FileSource, private readonly ranker: FileSource) {}

  private load(): Promise<Loaded> {
    this.loaded ??= (async () => {
      const client = createReleaseClient({ source: { read: async (p) => { const b = await this.release.read(p); if (!b) throw new ReleaseSourceError(p, 404, `Release file ${p} not found`); return b } } })
      const manifest = await client.manifest()
      const [characters, outfits, art] = await Promise.all([client.set(manifest, 'characters'), client.set(manifest, 'outfits'), client.art(manifest)])
      // Every name master data has for a character, so an author's "Kitasan Black" finds her whichever text it is.
      const names = new Map<string, number>()
      for (const c of characters) for (const name of [c.name.global, c.name.en, c.name.ja]) { const key = name ? nameKey(name) : ''; if (key && !names.has(key)) names.set(key, c.id as number) }
      return { catalog: buildCatalog({ release: manifest.version, characters, outfits, art, enemies: null, imports: [], legacy: emptyLegacy() }), names }
    })()
    this.loaded.catch(() => { this.loaded = undefined })
    return this.loaded
  }
  private async umas(): Promise<TierCatalog> { return (await this.load()).catalog }

  /** Finds a character by any of her master data names (CA4): the universe looks name her, they don't carry her id. */
  async characterByName(): Promise<(name: string) => number | null> {
    const { names } = await this.load()
    return (name) => names.get(nameKey(name)) ?? null
  }

  async order(): Promise<ArtOrder> {
    const [catalog, boardRaw, profilesRaw] = await Promise.all([this.umas(), json(this.ranker, 'boards/umas.json'), json(this.ranker, 'profiles.json')])
    const board = boardRaw === null ? emptyBoard('umas') : parseBoard(boardRaw, 'umas')
    const profiles = profilesRaw === null ? emptyProfiles() : parseProfiles(profilesRaw)
    const pool = new Set(catalog.umas.flatMap((u) => u.outfits.map((o) => String(o.id))))
    const place = new Map(ordered(board, pool).map((e, i) => [Number(e.id), { tier: e.tier, order: i + 1 }]))
    const identity = identityByOutfit(catalog, profiles)
    const outfits = catalog.umas.flatMap((u) => u.outfits.map((o): ArtOutfit => {
      const who = identity.get(o.id)
      return {
        outfitId: o.id, characterId: Number(u.id), identity: who?.id ?? u.id, name: who?.name ?? u.name,
        sister: who?.sister ? { relation: who.sister.relation, age: who.sister.age, profile: who.sister.profile } : null,
        tier: place.get(o.id)?.tier ?? null, order: place.get(o.id)?.order ?? null,
      }
    }))
    return { release: catalog.release, rankerRevision: board.revision, profilesRevision: profiles.revision, outfits }
  }
}
