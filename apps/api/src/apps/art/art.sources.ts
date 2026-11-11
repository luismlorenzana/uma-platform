// Each adult traveler's source-art release (CA2, P136; uma-quest's D46): the approved sets ChatGPT drew, archived in the
// master bucket under `source-art/adult-travelers/<batch>/`, one immutable archive per batch with its manifest,
// inventory and publication receipt. Character Art shows the record (batch, approval, revision, personality, her files)
// read from those three JSON files; the archive itself is never unpacked or served.
import type { FileSource } from '@luismlorenzana/uma-server/content'

export interface SourceOutfit {
  revision: string | null
  personality: string | null
  /** The owner's words that approved her set. */
  ownerWord: string | null
  recordedAt: string | null
  /** Her own files in the archive, and their bytes. */
  files: number
  bytes: number
}
export interface SourceRelease {
  batch: string
  version: string
  publishedAt: string | null
  approvedAt: string | null
  ownerWord: string | null
  archive: { bytes: number; sha256: string }
  files: number
  bytes: number
  /** Files every set shares (the references, the body standard), outside any outfit's folder. */
  shared: { files: number; bytes: number }
  outfits: Record<string, SourceOutfit>
}

const ROOT = 'source-art/adult-travelers'
const MAX_BATCHES = 40
const decoder = new TextDecoder()
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const read = async (files: FileSource, path: string): Promise<Record<string, unknown> | null> => {
  const bytes = await files.read(path)
  if (bytes === null) return null
  const value = JSON.parse(decoder.decode(bytes)) as unknown
  return object(value) ? value : null
}
/** A `gs://<bucket>/<path>` URI, as a path inside the bucket. */
const inBucket = (uri: unknown): string | null => (typeof uri === 'string' ? uri.replace(/^gs:\/\/[^/]+\//, '') : null)

/** One batch's release, from its `latest` channel; null when the batch has none. */
export async function sourceRelease(files: FileSource, batch: string): Promise<SourceRelease | null> {
  const channel = await read(files, `${ROOT}/${batch}/channels/latest.json`)
  const manifestPath = inBucket(channel?.manifest)
  if (!channel || !manifestPath || !manifestPath.startsWith(`${ROOT}/${batch}/releases/`)) return null
  const folder = manifestPath.slice(0, manifestPath.lastIndexOf('/'))
  const [manifest, inventory, receipt] = await Promise.all([read(files, manifestPath), read(files, `${folder}/inventory.json`), read(files, `${folder}/publication-receipt.json`)])
  if (!manifest) return null
  const list = Array.isArray(inventory?.files) ? (inventory.files as unknown[]).filter(object) : []
  const outfits: Record<string, SourceOutfit> = {}
  const catalog = Array.isArray(manifest.deliveryCatalog) ? (manifest.deliveryCatalog as unknown[]).filter(object) : []
  const ids = new Set([...(Array.isArray(channel.outfitIds) ? channel.outfitIds : []), ...catalog.map((c) => c.outfitId)].filter((id): id is number => Number.isSafeInteger(id)))
  for (const id of ids) {
    const entry = catalog.find((c) => c.outfitId === id), own = list.filter((f) => typeof f.file === 'string' && f.file.startsWith(`${id}/`))
    outfits[String(id)] = {
      revision: text(entry?.revision), personality: text(entry?.personality), ownerWord: text(entry?.ownerWord), recordedAt: text(entry?.recordedAt),
      files: own.length, bytes: own.reduce((n, f) => n + (Number(f.bytes) || 0), 0),
    }
  }
  const shared = list.filter((f) => typeof f.file === 'string' && !/^[0-9]+\//.test(f.file))
  const archive = object(manifest.archive) ? manifest.archive : {}
  return {
    batch, version: text(manifest.version) ?? text(channel.version) ?? batch,
    publishedAt: text(receipt?.publishedAt), approvedAt: text(manifest.approvedAt), ownerWord: text(manifest.ownerWord),
    archive: { bytes: Number(archive.bytes) || 0, sha256: text(archive.sha256) ?? '' },
    files: list.length, bytes: list.reduce((n, f) => n + (Number(f.bytes) || 0), 0),
    shared: { files: shared.length, bytes: shared.reduce((n, f) => n + (Number(f.bytes) || 0), 0) },
    outfits,
  }
}

/** Every batch's release, batch-1 upward, stopping at the first batch with none. */
export async function sourceReleases(files: FileSource): Promise<SourceRelease[]> {
  const out: SourceRelease[] = []
  for (let n = 1; n <= MAX_BATCHES; n++) {
    const release = await sourceRelease(files, `batch-${n}`)
    if (!release) break
    out.push(release)
  }
  return out
}
