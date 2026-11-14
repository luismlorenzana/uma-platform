// Where the look stage's private assets come from (LK1): the packed kit and the cast (`content/authoring/look/pack/`, or
// the platform app's `look/` folder in its private bucket), and our sprite sets (master data's private release). The
// review app reads them from disk; the platform app's Look sub-app through its signed-in content clients.
import type { LookSprite } from './figures.js'

/** The pack's index (`look/index.json`): the kit's hash-named glb and each scene's cast. Private: it names outfits. */
export interface LookPackIndex {
  readonly version: 1
  readonly kit: { readonly path: string; readonly bytes: number; readonly sha256: string }
  /** The kit's format v2 manifest (`formats`' `KitPack`, LK2), beside the glb; absent in packs before it. */
  readonly kitPack?: { readonly path: string; readonly bytes: number; readonly sha256: string }
  /** Each scene's cast: [outfit id, x, z, action?]. */
  readonly cast: Readonly<Record<string, readonly (readonly [number, number, number, string?])[]>>
}

export interface LookAssets {
  index(): Promise<LookPackIndex>
  /** The packed kit's bytes. */
  kit(path: string): Promise<ArrayBuffer>
  /** An outfit's sprite set and decoded pages, or null when the release has none. */
  sprite(outfitId: number): Promise<LookSprite | null>
  /** Bytes fetched so far, for the first-load budget (LR6), when the source can count them. */
  bytes?(): number
}

export function parsePackIndex(value: unknown): LookPackIndex {
  const v = value as Partial<LookPackIndex> | null
  if (!v || v.version !== 1 || typeof v.kit?.path !== 'string' || typeof v.cast !== 'object' || !v.cast) throw new Error('Not a look pack index (version 1)')
  for (const [scene, spots] of Object.entries(v.cast)) {
    if (!Array.isArray(spots) || spots.some((s) => !Array.isArray(s) || typeof s[0] !== 'number' || typeof s[1] !== 'number' || typeof s[2] !== 'number')) throw new Error(`Look pack cast "${scene}" is malformed`)
  }
  return v as LookPackIndex
}
