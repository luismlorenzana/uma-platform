// `pnpm look:pack` (LK1): the look slice's kit packed for the phone. Every piece the scenes name
// (packages/stage/src/look/pieces.ts) is read from the private CC0 kits (content/authoring/licensed/quaternius/, P159),
// wrapped in a node named after it, and merged into one glb: shared materials and textures deduplicated, textures cut to
// 128 texels (the slice redraws them at 64), positions quantized. With the cast (content/authoring/look/cast.json) it
// writes content/authoring/look/pack/: index.json and kit.<hash>.glb. Private, never in git; `pnpm look:upload` sends it
// to the platform app's bucket for the phone test.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document, Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, mergeDocuments, prune, quantize, textureCompress, unpartition } from '@gltf-transform/functions'
import sharp from 'sharp'
import { PIECES } from '../../../packages/stage/src/look/pieces.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const licensed = resolve(root, 'content/authoring/licensed/quaternius')
const DIRS = {
  village: resolve(licensed, 'medieval-village-megakit-standard/Medieval Village MegaKit[Standard]/glTF'),
  nature: resolve(licensed, 'stylized-nature-megakit-standard/glTF'),
} as const
const look = resolve(root, 'content/authoring/look')
const out = resolve(look, 'pack')
// Twice the slice's 64-texel grid, so the review page's slider has room; the phone downloads less.
const TEXELS = Number(process.env.LOOK_TEXELS ?? 128)

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const target = new Document().setLogger(new Logger(Logger.Verbosity.ERROR))
let pieces = 0
for (const [kit, names] of Object.entries(PIECES) as [keyof typeof DIRS, readonly string[]][]) {
  for (const name of names) {
    const doc = await io.read(resolve(DIRS[kit], `${name}.gltf`))
    const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
    if (!scene) throw new Error(`${name} has no scene`)
    const wrapper = doc.createNode(name)
    for (const child of scene.listChildren()) { scene.removeChild(child); wrapper.addChild(child) }
    scene.addChild(wrapper)
    mergeDocuments(target, doc)
    pieces++
  }
}
// One scene holding every piece, then one buffer, shared materials and textures, small textures, quantized geometry.
const scenes = target.getRoot().listScenes()
const main = scenes[0]!
for (const s of scenes.slice(1)) { for (const c of s.listChildren()) { s.removeChild(c); main.addChild(c) } s.dispose() }
target.getRoot().setDefaultScene(main)
await target.transform(unpartition(), dedup(), prune(), textureCompress({ encoder: sharp, resize: [TEXELS, TEXELS], targetFormat: 'png' }), quantize())
const glb = await io.writeBinary(target)
const sha256 = createHash('sha256').update(glb).digest('hex')
const path = `kit.${sha256.slice(0, 16)}.glb`

const cast = JSON.parse(readFileSync(resolve(look, 'cast.json'), 'utf8')) as Record<string, unknown>
mkdirSync(out, { recursive: true })
for (const f of readdirSync(out)) if (/^kit\.[a-f0-9]{16}\.glb$/.test(f) && f !== path) rmSync(resolve(out, f))
writeFileSync(resolve(out, path), glb)
writeFileSync(resolve(out, 'index.json'), `${JSON.stringify({ version: 1, kit: { path, bytes: glb.byteLength, sha256 }, cast }, null, 2)}\n`)
const root2 = target.getRoot()
console.log(`Packed ${pieces} pieces into ${path}: ${(glb.byteLength / 2 ** 20).toFixed(2)} MB, ${root2.listMeshes().length} meshes, ${root2.listMaterials().length} materials, ${root2.listTextures().length} textures.`)
