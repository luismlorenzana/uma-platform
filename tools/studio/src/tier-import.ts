// pnpm tiers:import <genshin|wuwa> [--offline]
//
// The local import for the new boss boards (P115). It reads the franchise's public character list, keeps the female
// characters, downloads each one's released face, portrait and splash once into the ignored download cache, re-encodes
// them as WebP beside the Azur Lane and NIKKE references, and writes `content/authoring/enemies/imports/<franchise>.json`.
// Everything lands in the gitignored content folder; nothing is published.
//
// Owner-supplied images go through the same step: list them in `content/authoring/enemies/inbox/<franchise>.json`
// (`{ "units": [{ "key", "name", "category", "face"?, "art"?, "splash"? }] }`, image paths relative to that folder)
// and they import as `<prefix>x-<key>`, beside the downloaded roster. `--offline` uses only the cache and the inbox.
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { content as defaultContent } from '@uma-platform/sprite-pipeline'
import { IMPORT_PREFIX, IMPORTED, parseEnemyImport, type EnemyImport, type ImportedFranchise, type ImportUnit } from './tier-catalog.js'
import { CATEGORIES, type Category } from './tier-model.js'
import { encode, genshinCandidates, wuwaCandidates, type AmberAvatar, type Candidate, type EncoreDetail, type EncoreRole, type Kind, type Source } from './tier-sources.js'

const AGENT = 'uma-studio-import/1.0 (local authoring tool)'

const content = resolve(process.env.UMA_CONTENT_DIR ?? defaultContent), enemies = resolve(content, 'authoring/enemies')
let offline = false
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function cached(url: string, franchise: ImportedFranchise, json = false): Promise<Buffer | null> {
  const file = resolve(enemies, '.cache', franchise, sha(url).slice(0, 20) + (json ? '.json' : extname(new URL(url).pathname) || '.bin'))
  try { return await readFile(file) } catch { /* not cached yet */ }
  if (offline) return null
  await pause(150)
  const response = await fetch(url, { headers: { 'user-agent': AGENT, accept: json ? 'application/json' : 'image/*' } })
  if (response.status === 404) return null
  const type = response.headers.get('content-type') ?? ''
  if (!response.ok || (json ? !type.includes('json') : !type.startsWith('image/'))) throw new Error(`${url}: ${response.status} ${type}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  await mkdir(resolve(enemies, '.cache', franchise), { recursive: true })
  await writeFile(file, bytes)
  return bytes
}
async function json<T>(url: string, franchise: ImportedFranchise): Promise<T> {
  const bytes = await cached(url, franchise, true)
  if (!bytes) throw new Error(`${url}: not found${offline ? ' in the cache' : ''}`)
  return JSON.parse(bytes.toString('utf8')) as T
}

// ---- Genshin Impact: Project Amber's character list ----

// ---- Owner-supplied images ----

interface InboxUnit { key: string; name: string; category?: string; details?: string[]; face?: string; art?: string; splash?: string }
async function inbox(franchise: ImportedFranchise): Promise<Candidate[]> {
  let raw: { units?: InboxUnit[] }
  try { raw = JSON.parse(await readFile(resolve(enemies, 'inbox', `${franchise}.json`), 'utf8')) as { units?: InboxUnit[] } } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  return (raw.units ?? []).map((u): Candidate => {
    if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(u.key) || !u.name?.trim()) throw new Error(`inbox/${franchise}.json: each unit needs a lowercase key and a name`)
    const category = CATEGORIES.some((c) => c.id === u.category) ? u.category as Category : 'boss'
    const file = (path: string) => { const full = resolve(enemies, path); if (!full.startsWith(resolve(enemies, 'inbox') + '/')) throw new Error(`${path}: keep inbox images inside inbox/`); return full }
    const images: Candidate['images'] = {}
    if (u.face) images.face = { file: file(u.face), cut: 'face' }
    if (u.art) images.art = { file: file(u.art), cut: 'trim-figure' }
    if (u.splash) images.splash = { file: file(u.splash), cut: 'splash' }
    return { key: `x-${u.key}`, name: u.name, category, details: u.details?.slice(0, 4) ?? [], images }
  })
}

async function atomic(path: string, value: unknown): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true })
  await writeFile(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`)
  await rename(`${path}.tmp`, path)
}

async function run(franchise: ImportedFranchise): Promise<void> {
  const prefix = IMPORT_PREFIX[franchise]
  let roster: Candidate[], source: string
  if (franchise === 'genshin') {
    const list = await json<{ data: { items: Record<string, AmberAvatar> } }>('https://gi.yatta.moe/api/v2/en/avatar', franchise)
    roster = genshinCandidates(Object.values(list.data.items))
    source = 'Project Amber (gi.yatta.moe): body type GIRL, LADY or LOLI, released'
  } else {
    const list = await json<{ roleList: EncoreRole[] }>('https://api.encore.moe/en/character', franchise), details = []
    for (const role of list.roleList) details.push({ role, detail: await json<EncoreDetail>(`https://api.encore.moe/en/character/${role.Id}`, franchise) })
    roster = wuwaCandidates(details)
    source = 'Encore (api.encore.moe): playable resonators listed as female'
  }
  const extra = await inbox(franchise), units: ImportUnit[] = [], problems: string[] = []
  await mkdir(resolve(enemies, 'assets/enemies'), { recursive: true })
  for (const c of [...roster, ...extra]) {
    const id = `${prefix}${c.key}`, images: ImportUnit['images'] = {}
    for (const [kind, src] of Object.entries(c.images) as [Kind, Source][]) {
      try {
        let bytes: Buffer | null = null
        if ('url' in src) { for (const url of [src.url, ...(src.fallbacks ?? [])]) if ((bytes = await cached(url, franchise))) break } else bytes = await readFile(src.file)
        if (!bytes) { problems.push(`${c.name}: no ${kind} image`); continue }
        const out = await encode(bytes, src.cut), path = `assets/enemies/${id}-${kind}.${sha(out).slice(0, 8)}.webp`
        await writeFile(resolve(enemies, path), out)
        images[kind] = path
      } catch (error) { problems.push(`${c.name}: ${kind}: ${error instanceof Error ? error.message : error}`) }
    }
    if (!images.face && !images.art && !images.splash) { problems.push(`${c.name}: skipped, no image`); continue }
    units.push({ id, name: c.name, category: c.category, details: c.details, images })
    process.stdout.write('.')
  }
  const result: EnemyImport = parseEnemyImport({ schemaVersion: 1, kind: 'enemy-import', franchise, source: source + (extra.length ? `; ${extra.length} from the inbox` : ''), filter: 'female characters', importedAt: new Date().toISOString(), units })
  await atomic(resolve(enemies, 'imports', `${franchise}.json`), result)
  // Drop this franchise's images that the new import no longer names (an older crop, a removed character).
  const keep = new Set(units.flatMap((u) => Object.values(u.images)).map((p) => p!.slice('assets/enemies/'.length)))
  for (const file of await readdir(resolve(enemies, 'assets/enemies'))) if (file.startsWith(prefix) && !keep.has(file)) await unlink(resolve(enemies, 'assets/enemies', file))
  console.log(`\n${franchise}: ${units.length} characters (${roster.length} from the list, ${extra.length} from the inbox) → content/authoring/enemies/imports/${franchise}.json`)
  for (const p of problems) console.log(`  · ${p}`)
  console.log('Restart the Studio to see them.')
}

const args = process.argv.slice(2).filter((a) => a !== '--')
offline = args.includes('--offline')
const franchise = args.find((a) => !a.startsWith('--'))
if (!IMPORTED.includes(franchise as ImportedFranchise)) {
  console.error(`Usage: pnpm tiers:import <${IMPORTED.join('|')}> [--offline]`)
  process.exitCode = 1
} else run(franchise as ImportedFranchise).catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
