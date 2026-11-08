import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { hash, inside, relativePath, readJson } from './io.js'
import { haze, smallClusters } from './pixels.js'
import { runtimeFiles, type ExportConfig, type NativeAtlas, type Pixels, type Recipe } from './types.js'

export async function decode(file: string): Promise<Pixels> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}
export function parseConfig(value: unknown): ExportConfig {
  if (!value || typeof value !== 'object') throw new Error('Expected an export config')
  const c = value as ExportConfig
  if (c.schemaVersion !== 2 || typeof c.atlasText !== 'string' || !c.outputs || !['skin', 'glove'].includes(c.handPalette)) throw new Error('Invalid export config v2')
  const a = JSON.parse(c.atlasText) as NativeAtlas
  if (a.cell !== 256 || !Number.isSafeInteger(a.id) || !Number.isSafeInteger(a.revision) || !a.actions || !a.faces) throw new Error('Invalid config atlas')
  for (const file of runtimeFiles(a).filter(f => f !== 'atlas.json')) if (!c.outputs[file]) throw new Error(`No recipe for ${file}`)
  for (const [file, r] of Object.entries(c.outputs)) {
    relativePath('/config', file); relativePath('/config', r.source)
    if (!/^[a-f0-9]{64}$/.test(r.sha256)) throw new Error(`Unpinned recipe ${file}`)
    if (r.literal !== undefined && !r.literal.trim()) throw new Error('A literal needs a reason')
    for (const dim of [r.crop, r.pad, r.resize, r.extract]) if (dim && (!Number.isSafeInteger(dim.width) || !Number.isSafeInteger(dim.height) || dim.width <= 0 || dim.height <= 0)) throw new Error('Invalid raster dimensions')
    for (const p of [r.crop && { x: r.crop.left, y: r.crop.top }, r.translate, r.extract && { x: r.extract.left, y: r.extract.top }]) if (p && (!Number.isSafeInteger(p.x) || !Number.isSafeInteger(p.y))) throw new Error('Invalid raster offset')
    if (r.binary !== undefined && typeof r.binary !== 'boolean') throw new Error('Invalid binary-alpha option')
    if (r.cleanup !== undefined && !['all-alpha', 'opaque-haze'].includes(r.cleanup)) throw new Error('Invalid cleanup mode')
    if (r.threshold !== undefined && (!Number.isSafeInteger(r.threshold) || r.threshold < 0 || r.threshold > 255)) throw new Error('Invalid alpha threshold')
    if (r.breathe && (!Number.isSafeInteger(r.breathe.dy) || !Number.isSafeInteger(r.breathe.below) || r.breathe.below < 0 || r.breathe.below > 256)) throw new Error('Invalid breathing rig')
    if (r.lock) {
      relativePath('/config', r.lock.source)
      for (const n of [r.lock.box.x, r.lock.box.y, r.lock.box.w, r.lock.box.h, r.lock.offset.x, r.lock.offset.y]) if (!Number.isSafeInteger(n)) throw new Error('Invalid face stamp')
      if (r.lock.box.w <= 0 || r.lock.box.h <= 0 || r.lock.box.x < 0 || r.lock.box.y < 0 || r.lock.box.x + r.lock.box.w > 256 || r.lock.box.y + r.lock.box.h > 256) throw new Error('Invalid face box')
    }
  }
  return c
}
export async function renderRecipe(root: string, r: Recipe): Promise<Buffer> {
  const source = await inside(root, r.source), bytes = await readFile(source)
  if (hash(bytes) !== r.sha256) throw new Error(`Source hash changed: ${r.source}`)
  if (r.literal) return bytes
  let p = await decode(source)
  if (r.binary) for (let n = 0; n < p.data.length; n += 4) { if (p.data[n + 3]! >= 128) p.data[n + 3] = 255; else p.data.fill(0, n, n + 4) }
  if (r.crop) {
    p = { data: await sharp(p.data, { raw: { width: p.width, height: p.height, channels: 4 } }).extract(r.crop).raw().toBuffer(), width: r.crop.width, height: r.crop.height }
  }
  if (r.pad) {
    const out = Buffer.alloc(r.pad.width * r.pad.height * 4)
    for (let y = 0; y < p.height; y++) p.data.copy(out, y * r.pad.width * 4, y * p.width * 4, (y + 1) * p.width * 4)
    p = { data: out, ...r.pad }
  }
  if (r.resize) p = { data: await sharp(p.data, { raw: { width: p.width, height: p.height, channels: 4 } }).resize(r.resize.width, r.resize.height, { kernel: 'lanczos3' }).raw().toBuffer(), ...r.resize }
  if (r.threshold) for (let n = 0; n < p.data.length; n += 4) if (p.data[n + 3]! < r.threshold) p.data.fill(0, n, n + 4)
  if (r.translate) {
    const out = Buffer.alloc(256 * 256 * 4)
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
      const from = (y * p.width + x) * 4, nx = x + r.translate.x, ny = y + r.translate.y
      if (nx < 1 || nx > 254 || ny < 1 || ny > 254) { if (p.data[from + 3]! >= 128) throw new Error('Opaque clipping during export'); continue }
      p.data.copy(out, (ny * 256 + nx) * 4, from, from + 4)
    }
    p = { data: out, width: 256, height: 256 }
  }
  if (r.breathe) {
    const src = Buffer.from(p.data)
    for (let y = 0; y < r.breathe.below; y++) {
      const sy = y - r.breathe.dy
      if (sy >= 0 && sy < p.height) src.copy(p.data, y * p.width * 4, sy * p.width * 4, (sy + 1) * p.width * 4)
      else p.data.fill(0, y * p.width * 4, (y + 1) * p.width * 4)
    }
  }
  if (r.cleanup) {
    for (const c of smallClusters(p, r.cleanup === 'all-alpha' ? 1 : 128)) for (const n of c) p.data.fill(0, n * 4, n * 4 + 4)
    if (r.cleanup === 'opaque-haze') for (const n of haze(p)) p.data.fill(0, n * 4, n * 4 + 4)
  }
  if (r.lock) {
    const key = await decode(await inside(root, r.lock.source)), b = r.lock.box, o = r.lock.offset
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      const from = (y * key.width + x) * 4, nx = x + o.x, ny = y + o.y
      if (nx < 0 || nx >= p.width || ny < 0 || ny >= p.height) throw new Error('Face stamp outside cell')
      if (!r.lock.opaqueOnly || key.data[from + 3]) key.data.copy(p.data, (ny * p.width + nx) * 4, from, from + 4)
    }
  }
  let image = sharp(p.data, { raw: { width: p.width, height: p.height, channels: 4 } })
  if (r.extract) image = image.extract(r.extract)
  return image.png().toBuffer()
}
export async function exportRevision(root: string, configPath: string, destination: string) {
  if (resolve(root) === resolve(destination) || resolve(destination).startsWith(resolve(root) + sep)) throw new Error('Export to a separate destination; revisions are immutable')
  const c = parseConfig(await readJson<unknown>(configPath)), hashes: Record<string, string> = {}, literals: { file: string; reason: string }[] = []
  for (const [file, recipe] of Object.entries(c.outputs)) {
    const bytes = await renderRecipe(root, recipe), target = relativePath(resolve(destination), file)
    await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes)
    hashes[file] = hash(bytes)
    if (recipe.literal) literals.push({ file, reason: recipe.literal })
  }
  await mkdir(destination, { recursive: true }); await writeFile(resolve(destination, 'atlas.json'), c.atlasText)
  hashes['atlas.json'] = hash(c.atlasText)
  return { hashes, literals }
}
export async function repeatRevision(root: string, config: string) {
  const dir = await mkdtemp(resolve(tmpdir(), 'uma-sprite-repeat-'))
  try {
    const result = await exportRevision(root, config, dir), differences: string[] = []
    for (const [file, digest] of Object.entries(result.hashes)) if (hash(await readFile(await inside(root, file))) !== digest) differences.push(file)
    return { ...result, byteIdentical: differences.length === 0, differences, filesCompared: Object.keys(result.hashes).length }
  } finally { await rm(dir, { recursive: true, force: true }) }
}
