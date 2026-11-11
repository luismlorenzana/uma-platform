// Copied from uma-quest at 6c572e6 (apps/web/src/sprites/keys.ts), unchanged but for this line.
// The adult travelers in fights (Q45, D38, D42): each traveler's key set from uma-quest's private pack, built from the
// owner-approved sets (Q44's pilot, Q46's batches) by `tools/traveler-keys/pack.mjs` and served to the signed-in owner at
// /api/content/traveler-keys/…. The index names each set and the shared weapons with their length and SHA-256, so every
// file is checked as it arrives (uma-kit's pack loader) and cached on the device by its hashed name.

/** A rectangle on one of a set's pages, in pack texels (one texel a device pixel, HD4). */
export interface KeyRect { page: number; x: number; y: number; w: number; h: number }
export interface KeyPoint { x: number; y: number }

export interface KeyPose {
  /** Her body, trimmed; `foot` and the anchors are in this rectangle's texels, y down. */
  cell: KeyRect
  foot: KeyPoint
  hit: KeyPoint | null
  cast: KeyPoint | null
  /** A locked head takes the standard expressions (D38 call 7). */
  locked: boolean
  /** Her weapon behind her body or before it (her fingers then drawn again over the handle). */
  hold: 'before' | 'behind'
  weapon: { state: 'shown' | 'dropped'; grip: KeyPoint; angle: number } | { state: 'hidden' }
  hand?: { cell: KeyRect; at: KeyPoint }
  /** Each expression but `default` as a patch over the face, placed at `at` in the body's rectangle. */
  faces?: { at: KeyPoint; cells: Record<string, KeyRect> }
}

export interface KeyPage { path: string; width: number; height: number; bytes: number; sha256: string }

/** Her baseline stills for menus and other places outside fights (Q53, D47): her approved ready key as the owner approved
 * it, no weapon, her default face and ears; each its own hash-named WebP. */
export interface KeyStills {
  /** Her whole figure, 1024 px tall; `foot` in its pixels. */
  stand: KeyPage & { foot: KeyPoint }
  /** A 384 px square bust, ears to below her chin. */
  head: KeyPage
  /** A 192 px square face, as master data's `outfit-faces`. */
  face: KeyPage
}

export interface KeySet {
  schema: 1
  outfitId: number
  revision: string
  /** Her personality (D38 call 8): her blinks, her ears at rest, her face as she strikes. */
  archetype: string
  /** The review weapon her set was drawn with. */
  weapon: string
  /** Pack texels per master texel. */
  texelScale: number
  /** Her standing figure's height in texels. */
  figure: number
  pages: KeyPage[]
  poses: Record<string, KeyPose>
  /** Absent in packs built before Q53. */
  stills?: KeyStills
}

export interface KeyWeapons { schema: 1; pages: KeyPage[]; weapons: Record<string, { cell: KeyRect; grip: KeyPoint }> }

interface PackFile { path: string; bytes: number; sha256: string }
export interface KeyIndex { schema: 1; builtAt: string; sets: Record<string, PackFile>; weapons: PackFile | null }

export const KEY_POSES = ['ready', 'weary', 'windup', 'strike', 'follow', 'cast-charge', 'cast-release', 'guard', 'limit', 'hurt', 'down', 'victory'] as const

/** A set as the pack writes it, or an error naming what's wrong. */
export function parseKeySet(value: unknown): KeySet {
  const s = value as KeySet
  if (!s || s.schema !== 1 || typeof s.outfitId !== 'number' || !Array.isArray(s.pages) || !s.poses) throw new Error('Not a key set')
  for (const pose of KEY_POSES) {
    const p = s.poses[pose]
    if (!p?.cell || !p.foot) throw new Error(`${s.outfitId}: ${pose} is missing`)
    for (const r of [p.cell, p.hand?.cell, ...Object.values(p.faces?.cells ?? {})]) {
      if (!r) continue
      const page = s.pages[r.page]
      if (!page || r.x < 0 || r.y < 0 || r.x + r.w > page.width || r.y + r.h > page.height) throw new Error(`${s.outfitId}: ${pose} is off its page`)
    }
  }
  return s
}

/** The weapon art a held kind draws with: the review greatsword for blades of its size, the katana, the tome. */
export function keyWeaponKind(kind: string | null | undefined): string | null {
  if (!kind) return null
  if (kind === 'greatsword' || kind === 'axe') return 'greatsword'
  if (kind === 'katana') return 'katana'
  if (kind.startsWith('tome')) return 'tome'
  return null
}

export interface LoadedKeys<Img> { set: KeySet; pages: Img[]; weapons: { set: KeyWeapons; pages: Img[] } | null }

export interface KeyFiles { pack(path: string, file?: PackFile): Promise<Uint8Array> }
export type Decode<Img> = (bytes: Uint8Array, type: string) => Promise<Img>

const json = (bytes: Uint8Array): unknown => JSON.parse(new TextDecoder().decode(bytes))

let indexPromise: Promise<KeyIndex> | null = null
let weaponsPromise: Promise<{ set: KeyWeapons; pages: unknown[] } | null> | null = null

/** The pack's index, read once a session (it isn't hash-named, so it's revalidated). */
function keyIndex(files: KeyFiles): Promise<KeyIndex> {
  indexPromise ??= files.pack('traveler-keys/index.json').then((b) => json(b) as KeyIndex)
  indexPromise.catch(() => { indexPromise = null })
  return indexPromise
}

/** An outfit's key set and its decoded pages, or null when the pack has none for her. */
export async function loadKeySet<Img>(files: KeyFiles, outfitId: number, decode: Decode<Img>): Promise<LoadedKeys<Img> | null> {
  const index = await keyIndex(files)
  const entry = index.sets[String(outfitId)]
  if (!entry) return null
  const set = parseKeySet(json(await files.pack(entry.path, entry)))
  const pages = await Promise.all(set.pages.map(async (p) => decode(await files.pack(p.path, p), 'image/webp')))
  if (index.weapons) {
    const w = index.weapons
    weaponsPromise ??= files.pack(w.path, w).then(async (b) => {
      const ws = json(b) as KeyWeapons
      return { set: ws, pages: await Promise.all(ws.pages.map(async (p) => decode(await files.pack(p.path, p), 'image/webp'))) }
    })
    weaponsPromise.catch(() => { weaponsPromise = null })
  }
  const weapons = weaponsPromise ? ((await weaponsPromise.catch(() => null)) as { set: KeyWeapons; pages: Img[] } | null) : null
  return { set, pages, weapons }
}

/** The outfits the pack has keys for (the Album's adult travelers, Q52). */
export async function keyOutfitIds(files: KeyFiles): Promise<number[]> {
  return Object.keys((await keyIndex(files)).sets).map(Number).sort((a, b) => a - b)
}

/** Test seam: forget the session's index and weapons. */
export function resetKeyCache(): void { indexPromise = null; weaponsPromise = null }
