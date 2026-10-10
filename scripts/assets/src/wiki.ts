// Chibi, outfit-stand and face art from the owner's local copy of the original's files, named as on the wiki
// (ported from uma-racer T059). Nothing here is fetched: `--source dir:<path>` stages the files into the gitignored
// cache, and every later run builds from that cache.

import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import type { ArtImage } from './art'

export type DressLook = 'gym' | 'summer' | 'winter' | 'casual'

export type WikiFile =
  | { family: 'chibi'; chara: string; dress: string; pose: 'a' | 'b' }
  | { family: 'dress'; chara: string; look: DressLook }

const CHIBI_NAME = /^Game_Asset_petit_chr_(\d{4})_(\d{6})_(0010|0011)\.png$/
const STAND_NAME = /^Game_Asset_chara_stand_(\d{4})_(000001|000002|000005|90\d{4})\.png$/
const LOOK_CODE: Record<string, Exclude<DressLook, 'casual'>> = { '000001': 'gym', '000002': 'summer', '000005': 'winter' }

/** A wiki file's place in the roster, or null for anything else (an outfit's own stand, race dresses, lookalikes). */
export function parseWikiName(name: string): WikiFile | null {
  const chibi = CHIBI_NAME.exec(name)
  if (chibi) return { family: 'chibi', chara: chibi[1]!, dress: chibi[2]!, pose: chibi[3] === '0010' ? 'a' : 'b' }
  const stand = STAND_NAME.exec(name)
  if (!stand) return null
  const [, chara, code] = stand as unknown as [string, string, string]
  // Casual clothes are `90` followed by the character's own id; any other `90…` belongs to someone else.
  if (code.startsWith('90')) return code === `90${chara}` ? { family: 'dress', chara, look: 'casual' } : null
  return { family: 'dress', chara, look: LOOK_CODE[code]! }
}

export const chibiName = (chara: string, dress: string, pose: 'a' | 'b'): string =>
  `Game_Asset_petit_chr_${chara}_${dress}_${pose === 'a' ? '0010' : '0011'}.png`

export const standName = (chara: string, look: DressLook): string =>
  `Game_Asset_chara_stand_${chara}_${{ gym: '000001', summer: '000002', winter: '000005', casual: `90${chara}` }[look]}.png`

export const DRESS_LOOKS: readonly DressLook[] = ['gym', 'summer', 'winter', 'casual']
/** The face is cut from the first of these the roster has: the school uniform's face is the most familiar. */
export const FACE_LOOKS: readonly DressLook[] = ['summer', 'winter', 'gym', 'casual']

export interface WikiPick {
  /** The art key: `<outfitId>-a|b` for a chibi, `<characterId>-<look>` for a stand, `<characterId>` for a face. */
  id: string
  file: string
}

export interface WikiSelection {
  chibi: WikiPick[]
  dress: WikiPick[]
  face: WikiPick[]
  /** Art keys the roster wants that the files don't have, such as the newest outfits. */
  missing: string[]
}

/**
 * What to build for the roster. A chibi file is named by the original's dress id (`Outfit.costumeId`), which differs
 * from the outfit id for about half the outfits.
 */
export function selectWikiArt(
  files: ReadonlySet<string>,
  outfits: readonly { id: number; characterId: number; costumeId: number }[],
): WikiSelection {
  const selection: WikiSelection = { chibi: [], dress: [], face: [], missing: [] }
  const pick = (list: WikiPick[], id: string, file: string) => {
    if (files.has(file)) list.push({ id, file })
    else selection.missing.push(id)
  }
  for (const outfit of outfits) {
    const chara = String(outfit.characterId)
    for (const pose of ['a', 'b'] as const) pick(selection.chibi, `${outfit.id}-${pose}`, chibiName(chara, String(outfit.costumeId), pose))
  }
  for (const chara of [...new Set(outfits.map((outfit) => outfit.characterId))].sort((left, right) => left - right).map(String)) {
    for (const look of DRESS_LOOKS) pick(selection.dress, `${chara}-${look}`, standName(chara, look))
    const face = FACE_LOOKS.map((look) => standName(chara, look)).find((file) => files.has(file))
    if (face) selection.face.push({ id: chara, file: face })
    else selection.missing.push(chara)
  }
  return selection
}

/** Copies the roster's files from the owner's folder into the cache, skipping any already there at the same size. */
export async function stageWikiFiles(sourceDir: string, cacheDir: string): Promise<{ copied: number; kept: number }> {
  const target = resolve(cacheDir, 'wiki')
  await mkdir(target, { recursive: true })
  let copied = 0
  let kept = 0
  for (const name of await readdir(sourceDir)) {
    if (!parseWikiName(name)) continue
    const from = resolve(sourceDir, name)
    const to = resolve(target, name)
    const cached = await stat(to).catch(() => null)
    if (cached && cached.size === (await stat(from)).size) {
      kept += 1
      continue
    }
    await copyFile(from, to)
    copied += 1
  }
  return { copied, kept }
}

/** The staged files, by name; empty when no source has been staged yet. */
export async function stagedWikiFiles(cacheDir: string): Promise<Set<string>> {
  try {
    return new Set((await readdir(resolve(cacheDir, 'wiki'))).filter((name) => parseWikiName(name) !== null))
  } catch {
    return new Set()
  }
}

export const WIKI_FAMILIES = {
  chibi: { family: 'outfit-chibis', maxSize: 256 },
  dress: { family: 'character-dresses', maxSize: 512 },
  // Race tokens: the face, cut from a school-uniform stand and small enough to fetch a field of them at once.
  face: { family: 'character-faces', maxSize: 128 },
} as const

export type WikiKind = keyof typeof WIKI_FAMILIES

/**
 * Where the face sits in a 512 px outfit stand, as shares of its width: every stand is drawn on the same frame, so one
 * square catches the face with the ears, whatever the character's height.
 */
export const FACE_CROP = { left: 150 / 512, top: 40 / 512, size: 210 / 512 } as const

export async function encodeWikiArt(kind: WikiKind, id: string, bytes: Buffer): Promise<ArtImage> {
  const { maxSize } = WIKI_FAMILIES[kind]
  let pipeline = sharp(bytes)
  if (kind === 'face') {
    const { width = 0, height = 0 } = await sharp(bytes).metadata()
    const size = Math.round(Math.min(width, height) * FACE_CROP.size)
    pipeline = pipeline.extract({
      left: Math.min(width - size, Math.round(width * FACE_CROP.left)),
      top: Math.min(height - size, Math.round(width * FACE_CROP.top)),
      width: size,
      height: size,
    })
  }
  const { data, info } = await pipeline
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90, effort: 5 })
    .toBuffer({ resolveWithObject: true })
  return { id, bytes: data, width: info.width, height: info.height }
}

export async function buildWikiFamily(kind: WikiKind, picks: readonly WikiPick[], cacheDir: string): Promise<ArtImage[]> {
  const images: ArtImage[] = []
  for (const pick of picks) images.push(await encodeWikiArt(kind, pick.id, await readFile(resolve(cacheDir, 'wiki', pick.file))))
  return images
}
