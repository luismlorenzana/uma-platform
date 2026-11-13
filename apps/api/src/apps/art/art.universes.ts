// The universe looks (CA4, P162): the owner-approved character art ChatGPT drew of an Uma in another world (Cyberpunk,
// Farm Life, High Fantasy), published by `pnpm art:push` to the app's own bucket under `art/universes/<universe>/`: an
// `index.json` and the approved PNGs, byte for byte, under hash names. Character Art shows exactly what each index lists,
// read on every request; a look is tied to her character by name, from master data, so nothing here knows a game's ids.
import type { BlobStore } from '../../store/blob-store'

export interface UniverseLook {
  id: string
  character: string
  /** Her character in master data, by name; null when no character has that name. */
  characterId: number | null
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
export interface Universe {
  id: string
  title: string
  style: string | null
  revision: number | null
  publishedAt: string | null
  looks: UniverseLook[]
}

/** The only universe files the pack route serves: a look's PNG, named by its hash. */
export const UNIVERSE_PACK_ALLOW = /universes\/[a-z0-9-]+\/images\/[a-z0-9-]+\.[a-f0-9]{16}\.png/

const decoder = new TextDecoder()
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
const whole = (v: unknown): number | null => (typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : null)

/** One look of an index, or null when its entry isn't a hash-named PNG of this universe with its size and hash. */
function lookOf(universe: string, raw: unknown, characterOf: (name: string) => number | null): UniverseLook | null {
  if (!object(raw)) return null
  const id = text(raw.id), character = text(raw.character), path = text(raw.path), sha256 = text(raw.sha256)
  const bytes = whole(raw.bytes), width = whole(raw.width), height = whole(raw.height)
  if (!id || !character || !path || !sha256 || !bytes || !width || !height) return null
  if (!/^[a-f0-9]{64}$/.test(sha256) || path !== `images/${id}.${sha256.slice(0, 16)}.png` || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return null
  return {
    id, character, characterId: characterOf(character), outfit: text(raw.outfit) ?? id, title: text(raw.title) ?? id,
    path: `universes/${universe}/${path}`, bytes, sha256, width, height, approvedOn: text(raw.approvedOn), publishedAt: text(raw.publishedAt),
  }
}

/** Every published universe, by name, each with the looks its index lists, in the index's order. */
export async function universes(store: Pick<BlobStore, 'read' | 'list'>, characterOf: (name: string) => number | null): Promise<Universe[]> {
  const ids = (await store.list('universes')).flatMap((p) => /^universes\/([a-z0-9]+(?:-[a-z0-9]+)*)\/index\.json$/.exec(p)?.[1] ?? []).sort()
  const out: Universe[] = []
  for (const id of ids) {
    const blob = await store.read(`universes/${id}/index.json`)
    if (!blob) continue
    let index: unknown
    try { index = JSON.parse(decoder.decode(blob.bytes)) } catch { continue }
    if (!object(index) || index.kind !== 'universe-art' || index.universe !== id || !Array.isArray(index.looks)) continue
    const looks = (index.looks as unknown[]).flatMap((raw) => lookOf(id, raw, characterOf) ?? [])
    if (looks.length === 0) continue
    out.push({ id, title: text(index.title) ?? id, style: text(index.style), revision: typeof index.revision === 'number' ? index.revision : null, publishedAt: text(index.publishedAt), looks })
  }
  return out
}
