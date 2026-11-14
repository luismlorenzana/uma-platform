// `pnpm look:pack` (LK1): the look slice's kit packed for the phone. Every piece the scenes name
// (packages/stage/src/look/pieces.ts) is read from the private CC0 kits (content/authoring/licensed/quaternius/, P159),
// wrapped in a node named after it, and merged into one glb: shared materials and textures deduplicated, textures cut to
// 128 texels (the slice redraws them at 64), positions quantized. With the cast (content/authoring/look/cast.json) it
// writes content/authoring/look/pack/: index.json, kit.<hash>.glb and its kit format v2 manifest, kit.<hash>.json (LK2). Private, never in git; `pnpm look:upload` sends it
// to the platform app's bucket for the phone test.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document, getBounds, Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, mergeDocuments, prune, quantize, textureCompress, unpartition } from '@gltf-transform/functions'
import sharp from 'sharp'
import { parseKitPack, pieceRole, wallSockets, type KitPack, type KitPiece } from '../../../packages/stage/src/formats/kitPack.js'
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
const sources = new Map<string, { kit: string; file: string }>()
for (const [kit, names] of Object.entries(PIECES) as [keyof typeof DIRS, readonly string[]][]) {
  for (const name of names) {
    sources.set(name, { kit: kit === 'village' ? 'quaternius-medieval-village-megakit' : 'quaternius-stylized-nature-megakit', file: `${name}.gltf` })
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
// Kit format v2 (LK2): each piece measured about its origin before the transforms, its role and sockets by the kits' naming.
const round = (n: number) => Math.round(n * 1000) / 1000
const names = new Set(main.listChildren().map((n) => n.getName()))
const manifest: Record<string, KitPiece> = {}
for (const node of main.listChildren()) {
  const name = node.getName(), { min, max } = getBounds(node)
  const bounds = [...min, ...max].map(round) as KitPiece['bounds']
  const sockets = pieceRole(name) === 'wall' ? wallSockets(name, (n) => names.has(n)) : []
  manifest[name] = {
    role: pieceRole(name), kind: '3d',
    footprint: { w: Math.max(1, Math.ceil((max[0] - min[0]) / 2 - 0.05)), d: Math.max(1, Math.ceil((max[2] - min[2]) / 2 - 0.05)) },
    height: round(max[1] - min[1]), bounds, ...(sockets.length ? { sockets } : {}),
    source: { ...sources.get(name)!, licence: 'CC0-1.0' },
  }
}
await target.transform(unpartition(), dedup(), prune(), textureCompress({ encoder: sharp, resize: [TEXELS, TEXELS], targetFormat: 'png' }), quantize())
const glb = await io.writeBinary(target)
const sha256 = createHash('sha256').update(glb).digest('hex')
const path = `kit.${sha256.slice(0, 16)}.glb`

const cast = JSON.parse(readFileSync(resolve(look, 'cast.json'), 'utf8')) as Record<string, unknown>
mkdirSync(out, { recursive: true })
for (const f of readdirSync(out)) if (/^kit\.[a-f0-9]{16}\.glb$/.test(f) && f !== path) rmSync(resolve(out, f))
writeFileSync(resolve(out, path), glb)
// The slice redraws textures at 64 texels with 24 colour steps (uma-stage's PIXEL_DEFAULTS, LK1).
const pack: KitPack = parseKitPack({ formatVersion: 2, id: 'kit-pack-village', glb: { path, bytes: glb.byteLength, sha256 }, grid: 2, storey: 3.12, pixel: { texels: 64, levels: 24 }, pieces: manifest })
const packJson = `${JSON.stringify(pack)}\n`, packSha = createHash('sha256').update(packJson).digest('hex'), packPath = `kit.${packSha.slice(0, 16)}.json`
for (const f of readdirSync(out)) if (/^kit\.[a-f0-9]{16}\.json$/.test(f) && f !== packPath) rmSync(resolve(out, f))
writeFileSync(resolve(out, packPath), packJson)
writeFileSync(resolve(out, 'index.json'), `${JSON.stringify({ version: 1, kit: { path, bytes: glb.byteLength, sha256 }, kitPack: { path: packPath, bytes: Buffer.byteLength(packJson), sha256: packSha }, cast }, null, 2)}\n`)
const root2 = target.getRoot()
const roles = Object.values(pack.pieces).reduce<Record<string, number>>((r, x) => ({ ...r, [x.role]: (r[x.role] ?? 0) + 1 }), {})
console.log(`Kit format v2: ${packPath}, ${Object.entries(roles).map(([k, v]) => `${v} ${k}`).join(', ')}; ${Object.values(pack.pieces).filter((x) => x.sockets).length} walls with sockets.`)
console.log(`Packed ${pieces} pieces into ${path}: ${(glb.byteLength / 2 ** 20).toFixed(2)} MB, ${root2.listMeshes().length} meshes, ${root2.listMaterials().length} materials, ${root2.listTextures().length} textures.`)
