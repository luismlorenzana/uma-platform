// Stained-glass busts (`outfit-glass`, P81): one window per outfit, baked from its bust square by scripts/assets/glass.
// That part is Python because sharp can't segment an image. A bake takes seconds, so the result is cached by everything
// that shapes it and an import only bakes what's new. Phones load a plain WebP; nothing here runs in a game.

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import type { ArtImage, BustCrop } from './art'
import { bustCrop } from './art'
import type { DownloadedImage } from './download'

/** The output is half the working size, which is about what the 307 px a bust really has can carry. */
export const GLASS = { size: 512, quality: 82 } as const
/** A face sheet outside this share of the window means the face was misread, which a pin fixes. */
export const GLASS_FACE_SHARE = { min: 0.03, max: 0.2 } as const
/** For a character the source gives no colours. */
export const GLASS_FALLBACK_COLORS = { main: '8A9BB0', sub: 'D8B15A' } as const

const GLASS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../glass')
const RECIPE_FILES = ['glass.py', 'bake.py', 'requirements.txt'] as const

/** Where the face sits in the bust, as shares of its side, for a face the bake misreads. `tilt` is in degrees, clockwise. */
export interface GlassPin {
  cx: number
  cy: number
  rx: number
  ry: number
  tilt?: number
}

export interface GlassColors {
  main: string
  sub: string
}

export interface GlassJob {
  id: string
  source: string
  box: { left: number; top: number; size: number }
  main: string
  sub: string
  pin: GlassPin | null
  out: string
  size: number
  quality: number
}

export interface GlassResult {
  id: string
  face_share?: number
  pieces?: number
  error?: string
}

export type GlassBaker = (jobs: readonly GlassJob[], onResult: (result: GlassResult) => void) => Promise<void>

/** Whatever changes a window: the code, its dependencies and the output settings. */
export async function glassRecipe(dir = GLASS_DIR): Promise<string> {
  const hash = createHash('sha256').update(JSON.stringify(GLASS))
  for (const file of RECIPE_FILES) hash.update(await readFile(resolve(dir, file)))
  return hash.digest('hex')
}

export function glassKey(recipe: string, source: Buffer, job: Pick<GlassJob, 'box' | 'main' | 'sub' | 'pin'>): string {
  return createHash('sha256')
    .update(recipe)
    .update(source)
    .update(JSON.stringify([job.box, job.main, job.sub, job.pin]))
    .digest('hex')
    .slice(0, 16)
}

/** Reads a bust's source and cut once, so the window always matches the published bust. */
async function bustBox(bytes: Buffer, override?: Partial<BustCrop>): Promise<GlassJob['box']> {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return bustCrop(data, info.width, info.height, override)
}

/** The outfits whose face looks misread and carry no pin yet. */
export function unpinnedFaces(results: readonly { id: string; faceShare: number; pinned: boolean }[]): string[] {
  return results
    .filter(({ faceShare, pinned }) => !pinned && (faceShare < GLASS_FACE_SHARE.min || faceShare > GLASS_FACE_SHARE.max))
    .map(({ id }) => id)
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false)
}

function run(command: string, args: readonly string[]): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'inherit'] })
    child.on('error', fail)
    child.on('close', (code) => (code === 0 ? done() : fail(new Error(`${command} ${args.join(' ')} exited with ${code}`))))
  })
}

/** Its own virtual environment under the cache, rebuilt only when requirements.txt changes. */
async function glassPython(cacheDir: string): Promise<string> {
  const venv = resolve(cacheDir, 'glass-venv')
  const python = resolve(venv, 'bin/python')
  const requirements = resolve(GLASS_DIR, 'requirements.txt')
  const wanted = createHash('sha256').update(await readFile(requirements)).digest('hex')
  const stamp = resolve(venv, 'requirements.sha256')
  if ((await readFile(stamp, 'utf8').catch(() => '')) === wanted && (await exists(python))) return python
  console.log('outfit-glass: installing the Python tools, once')
  await rm(venv, { recursive: true, force: true })
  await run('python3', ['-m', 'venv', venv])
  await run(python, ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', requirements])
  await writeFile(stamp, wanted, 'utf8')
  return python
}

/** The real baker: bake.py, one JSON result a line. */
export function pythonBaker(cacheDir: string): GlassBaker {
  return async (jobs, onResult) => {
    const python = await glassPython(cacheDir)
    const jobsPath = resolve(cacheDir, 'outfit-glass', 'jobs.json')
    await writeFile(jobsPath, JSON.stringify(jobs), 'utf8')
    const child = spawn(python, [resolve(GLASS_DIR, 'bake.py'), jobsPath], { stdio: ['ignore', 'pipe', 'inherit'] })
    const lines = createInterface({ input: child.stdout })
    lines.on('line', (line) => onResult(JSON.parse(line) as GlassResult))
    await new Promise<void>((done, fail) => {
      child.on('error', fail)
      child.on('close', (code) => (code === 0 ? done() : fail(new Error(`bake.py exited with ${code}`))))
    })
    await rm(jobsPath, { force: true })
  }
}

export interface BuildGlassOptions {
  cacheDir: string
  /** Portrait sources, by the download cache. */
  portraits: readonly DownloadedImage[]
  colors: ReadonlyMap<string, GlassColors>
  bustCrops?: Readonly<Record<string, Partial<BustCrop>>>
  pins?: Readonly<Record<string, GlassPin>>
  baker?: GlassBaker
  onProgress?: (done: number, total: number) => void
}

export interface BuiltGlass {
  images: ArtImage[]
  baked: number
  cacheHits: number
  bytes: number
  /** Outfits whose bake failed; games fall back to the bust. */
  failed: { id: string; reason: string }[]
  /** Outfits to pin in `content/overrides/glass-pins.json`. */
  unpinned: string[]
}

interface GlassMeta {
  faceShare: number
  pieces: number
}

export async function buildGlassFamily(options: BuildGlassOptions): Promise<BuiltGlass> {
  const { cacheDir, portraits, colors, pins = {}, bustCrops = {} } = options
  const dir = resolve(cacheDir, 'outfit-glass')
  await mkdir(dir, { recursive: true })
  const recipe = await glassRecipe()

  const planned: { job: GlassJob; key: string }[] = []
  for (const portrait of portraits) {
    const { main, sub } = colors.get(portrait.id) ?? GLASS_FALLBACK_COLORS
    const shape = { box: await bustBox(portrait.bytes, bustCrops[portrait.id]), main, sub, pin: pins[portrait.id] ?? null }
    const key = glassKey(recipe, portrait.bytes, shape)
    planned.push({
      key,
      job: {
        ...shape,
        id: portrait.id,
        source: resolve(cacheDir, 'outfit-portraits', `${portrait.id}.source`),
        out: resolve(dir, `${portrait.id}.${key}.webp`),
        size: GLASS.size,
        quality: GLASS.quality,
      },
    })
  }

  const metaPath = (job: GlassJob) => job.out.replace(/\.webp$/, '.json')
  const todo: GlassJob[] = []
  for (const { job } of planned) if (!(await exists(job.out)) || !(await exists(metaPath(job)))) todo.push(job)
  const failed: BuiltGlass['failed'] = []
  if (todo.length > 0) {
    const byId = new Map(todo.map((job) => [job.id, job]))
    const baker = options.baker ?? pythonBaker(cacheDir)
    const writes: Promise<void>[] = []
    let done = 0
    await baker(todo, (result) => {
      done += 1
      options.onProgress?.(done, todo.length)
      if (result.error !== undefined || result.face_share === undefined || result.pieces === undefined) {
        failed.push({ id: result.id, reason: result.error ?? 'no result' })
        return
      }
      const meta: GlassMeta = { faceShare: result.face_share, pieces: result.pieces }
      writes.push(writeFile(metaPath(byId.get(result.id)!), JSON.stringify(meta), 'utf8'))
    })
    await Promise.all(writes)
  }

  const missing = new Set(failed.map(({ id }) => id))
  const images: ArtImage[] = []
  const faces: { id: string; faceShare: number; pinned: boolean }[] = []
  for (const { job } of planned) {
    if (missing.has(job.id)) continue
    const bytes = await readFile(job.out)
    const meta = JSON.parse(await readFile(metaPath(job), 'utf8')) as GlassMeta
    const { width = 0, height = 0 } = await sharp(bytes).metadata()
    images.push({ id: job.id, bytes, width, height })
    faces.push({ id: job.id, faceShare: meta.faceShare, pinned: job.pin !== null })
  }

  // One window an outfit: a changed recipe or pin leaves its old bake behind, and it's never read again.
  const kept = new Set(planned.flatMap(({ job }) => [job.out, metaPath(job)]))
  for (const entry of await readdir(dir)) {
    const path = resolve(dir, entry)
    if (!kept.has(path)) await rm(path, { force: true })
  }

  return {
    images,
    baked: todo.length - failed.length,
    cacheHits: planned.length - todo.length,
    bytes: images.reduce((sum, image) => sum + image.bytes.length, 0),
    failed,
    unpinned: unpinnedFaces(faces),
  }
}
