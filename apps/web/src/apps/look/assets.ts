// Look's private files through the signed-in API (P161): the pack (the kit, hash-checked and kept on the device, and the
// cast) from /api/look/content, our sprite sets from master data through /api/master. Bytes are counted for the
// first-load budget. Copied patterns, not imports, from Character Art (AP1).
import { idToken } from '@luismlorenzana/uma-kit/auth'
import { createContentClient } from '@luismlorenzana/uma-kit/content'
import { parsePackIndex, type LookAssets } from '@luismlorenzana/uma-stage/look'
import { FIREBASE } from '../../app/firebase-config'
import { CONTENT } from '../../content/client'

const LOOK = createContentClient({ base: '/api/look', token: () => idToken(FIREBASE), cacheName: 'platform-look' })

async function image(bytes: Uint8Array): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/webp' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally { URL.revokeObjectURL(url) }
}

export function hostedAssets(): LookAssets {
  let bytes = 0
  const count = (b: Uint8Array) => { bytes += b.byteLength; return b }
  let kitFile: { path: string; bytes: number; sha256: string } | null = null
  return {
    async index() {
      const index = parsePackIndex(JSON.parse(new TextDecoder().decode(count(await LOOK.pack('index.json')))))
      kitFile = index.kit
      return index
    },
    async kit(path) {
      const b = count(await LOOK.pack(path, kitFile?.path === path ? kitFile : undefined))
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
    },
    async sprite(outfitId) {
      const client = await CONTENT.release(), manifest = await CONTENT.manifest(), art = await client.art(manifest)
      const set = art ? await client.spriteSet(manifest, art, outfitId) : null
      if (!set) return null
      const pages = await Promise.all(set.pages.map(async (p) => image(count(await client.file(manifest, p.path)))))
      return { set, pages }
    },
    bytes: () => bytes,
  }
}
