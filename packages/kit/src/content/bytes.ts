// Immutable content is checked on disk hits as well as downloads (SE4). Storage failure is not a boot failure.
import type { ReleaseFile } from '@luismlorenzana/uma-data'
import type { ContentCache } from './client.js'

export const releaseCacheKey = (sha256: string): string => `https://uma-kit.invalid/release/${sha256}`
export async function validBytes(bytes: Uint8Array, file: ReleaseFile): Promise<boolean> {
  if (bytes.byteLength !== file.bytes || !globalThis.crypto?.subtle) return false
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>))
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('') === file.sha256
}
export function defaultCache(name = 'uma-kit-content'): Promise<ContentCache | null> {
  try { return typeof caches === 'undefined' ? Promise.resolve(null) : caches.open(name).catch(() => null) }
  catch { return Promise.resolve(null) }
}
export async function verifiedBytes(file: ReleaseFile, read: () => Promise<Uint8Array>, cache: Promise<ContentCache | null>, key: (hash: string) => string): Promise<Uint8Array> {
  const store = await cache.catch(() => null)
  try {
    const hit = await store?.match(key(file.sha256))
    if (hit) { const bytes = new Uint8Array(await hit.arrayBuffer()); if (await validBytes(bytes, file)) return bytes }
  } catch { /* A damaged/unavailable cache is repaired from the source. */ }
  const bytes = await read()
  if (!await validBytes(bytes, file)) throw Object.assign(new Error('Content hash mismatch'), { name: 'MasterDataError' })
  try { await store?.put(key(file.sha256), new Response(bytes as Uint8Array<ArrayBuffer>)) } catch { /* Memory-only still works. */ }
  return bytes
}
