// pnpm tiers:import <genshin|wuwa|hsr|zzz|hi3|pgr> [--offline]
//
// The local import for the new boss boards (P115). It reads the franchise's public character list, keeps the female
// characters (Honkai Impact 3rd and Punishing: Gray Raven come unfiltered from their wikis, P120), downloads each one's
// released face, portrait and splash once into the ignored download cache, re-encodes them as WebP beside the Azur Lane
// and NIKKE references, and writes `content/authoring/enemies/imports/<franchise>.json`. Everything lands in the
// gitignored content folder; nothing is published.
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
import { encode, genshinCandidates, hi3Candidates, hi3Images, HSR_GENDER, hsrCandidates, pgrCandidates, pgrImages, pgrInfobox, pronounGender, wuwaCandidates, zzzCandidates, type AmberAvatar, type Candidate, type EncoreDetail, type EncoreRole, type EnkaAgent, type Kind, type Source, type StarRailResCharacter, type WikiImages, type WikiPage, type YattaStarRail } from './tier-sources.js'

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
  if (!response.ok || (json ? !/json|text\/plain/.test(type) : !type.startsWith('image/'))) throw new Error(`${url}: ${response.status} ${type}`)
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

// ---- MediaWiki: a category's pages, and the URLs of named files ----

type Query = Record<string, string | number>
interface WikiResponse { query?: { pages?: { title: string; missing?: boolean; categories?: { title: string }[]; revisions?: { slots: { main: { content: string } } }[]; imageinfo?: { url: string }[] }[]; normalized?: { from: string; to: string }[] }; continue?: Query }
async function wikiQuery(api: string, params: Query, franchise: ImportedFranchise): Promise<WikiResponse> {
  const url = new URL(api)
  for (const [k, v] of Object.entries({ action: 'query', format: 'json', formatversion: 2, ...params })) url.searchParams.set(k, String(v))
  return json<WikiResponse>(url.href, franchise)
}
/** Every page in a category (main namespace), with its categories or its wikitext, following the API's continuation. */
async function wikiPages(api: string, category: string, prop: 'categories' | 'revisions', franchise: ImportedFranchise): Promise<WikiPage[]> {
  const pages = new Map<string, WikiPage>()
  const params: Query = { generator: 'categorymembers', gcmtitle: `Category:${category}`, gcmnamespace: 0, gcmlimit: 50, prop,
    ...(prop === 'categories' ? { cllimit: 'max' } : { rvprop: 'content', rvslots: 'main' }) }
  let more: Query = {}
  for (let i = 0; i < 40; i++) {
    const d = await wikiQuery(api, { ...params, ...more }, franchise)
    for (const p of d.query?.pages ?? []) {
      const page = pages.get(p.title) ?? { title: p.title }
      if (p.categories) page.categories = [...(page.categories ?? []), ...p.categories.map((c) => c.title)]
      if (p.revisions?.[0]) page.content = p.revisions[0].slots.main.content
      pages.set(p.title, page)
    }
    if (!d.continue) break
    more = d.continue
  }
  return [...pages.values()]
}
/** The download URL of each named file that exists, fifty names a request. */
async function wikiFiles(api: string, specs: WikiImages[], franchise: ImportedFranchise): Promise<Map<string, string>> {
  const names = [...new Set(specs.flatMap((s) => Object.values(s).flatMap((x) => x.files)))].sort(), urls = new Map<string, string>()
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50), d = await wikiQuery(api, { titles: batch.map((n) => `File:${n}`).join('|'), prop: 'imageinfo', iiprop: 'url' }, franchise)
    const to = new Map((d.query?.normalized ?? []).map((n) => [n.from, n.to]))
    const found = new Map((d.query?.pages ?? []).flatMap((p) => (p.imageinfo?.[0]?.url ? [[p.title, p.imageinfo[0].url] as const] : [])))
    for (const n of batch) { const u = found.get(to.get(`File:${n}`) ?? `File:${n}`); if (u) urls.set(n, u) }
  }
  return urls
}

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
  const prefix = IMPORT_PREFIX[franchise], problems: string[] = []
  let roster: Candidate[], source: string, filter = 'female characters'
  if (franchise === 'hi3') {
    const api = 'https://honkaiimpact3.fandom.com/api.php', pages = await wikiPages(api, 'Battlesuits', 'categories', franchise)
    const files = await wikiFiles(api, pages.map((p) => hi3Images(p.title)), franchise)
    roster = hi3Candidates(pages, (f) => files.get(f))
    source = 'The Honkai Impact 3rd wiki (honkaiimpact3.fandom.com): every page in Category:Battlesuits'
    filter = 'every battlesuit, unfiltered'
  } else if (franchise === 'pgr') {
    const api = 'https://grayravens.com/w/api.php', pages = await wikiPages(api, 'Character', 'revisions', franchise)
    const files = await wikiFiles(api, pages.flatMap((p) => { const frame = pgrInfobox(p.content ?? '').Frame; return frame ? [pgrImages(frame)] : [] }), franchise)
    roster = pgrCandidates(pages, (f) => files.get(f))
    source = 'GRAY RAVENS, the Punishing: Gray Raven wiki (grayravens.com): every page in Category:Character with a frame infobox'
    filter = 'every frame, unfiltered'
  } else if (franchise === 'genshin') {
    const list = await json<{ data: { items: Record<string, AmberAvatar> } }>('https://gi.yatta.moe/api/v2/en/avatar', franchise)
    roster = genshinCandidates(Object.values(list.data.items))
    source = 'Project Amber (gi.yatta.moe): body type GIRL, LADY or LOLI, released'
  } else if (franchise === 'hsr') {
    const list = Object.values((await json<{ data: { items: Record<string, YattaStarRail> } }>('https://sr.yatta.moe/api/v2/en/avatar', franchise)).data.items)
    const res = await json<Record<string, StarRailResCharacter>>('https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_min/en/characters.json', franchise)
    const gender = new Map<number, 'female' | 'male' | null>(), unclear: string[] = []
    for (const a of list.filter((x) => x.id < 8000 && x.release * 1000 <= Date.now())) {
      const d = (await json<{ data: { fetter?: { description?: string }; script?: { story?: { text: string }[] } } }>(`https://sr.yatta.moe/api/v2/en/avatar/${a.id}`, franchise)).data
      const g = pronounGender([d.fetter?.description ?? '', ...(d.script?.story ?? []).map((s) => s.text)].join(' '))
      gender.set(a.id, g)
      if (!g && !HSR_GENDER[a.id]) unclear.push(`${a.name} (${a.id})`)
    }
    if (unclear.length) problems.push(`unclear from their stories, left out: ${unclear.join(', ')}`)
    roster = hsrCandidates(list, res, gender)
    source = 'Project Yatta (sr.yatta.moe) and StarRailRes: female by the pronouns in each character’s own stories, released'
  } else if (franchise === 'zzz') {
    const agents = await json<Record<string, EnkaAgent>>('https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz/avatars.json', franchise)
    const locs = await json<{ en: Record<string, string> }>('https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz/locs.json', franchise)
    roster = zzzCandidates(agents, locs.en)
    source = 'Enka (EnkaNetwork/API-docs): agents whose internal name is Avatar_Female'
  } else {
    const list = await json<{ roleList: EncoreRole[] }>('https://api.encore.moe/en/character', franchise), details = []
    for (const role of list.roleList) details.push({ role, detail: await json<EncoreDetail>(`https://api.encore.moe/en/character/${role.Id}`, franchise) })
    roster = wuwaCandidates(details)
    source = 'Encore (api.encore.moe): playable resonators listed as female'
  }
  const extra = await inbox(franchise), units: ImportUnit[] = []
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
  const result: EnemyImport = parseEnemyImport({ schemaVersion: 1, kind: 'enemy-import', franchise, source: source + (extra.length ? `; ${extra.length} from the inbox` : ''), filter, importedAt: new Date().toISOString(), units })
  await atomic(resolve(enemies, 'imports', `${franchise}.json`), result)
  // Drop this franchise's images that the new import no longer names (an older crop, a removed character).
  const keep = new Set(units.flatMap((u) => Object.values(u.images)).map((p) => p!.slice('assets/enemies/'.length)))
  for (const file of await readdir(resolve(enemies, 'assets/enemies'))) if (file.startsWith(prefix) && !keep.has(file)) await unlink(resolve(enemies, 'assets/enemies', file))
  console.log(`\n${franchise}: ${units.length} units (${roster.length} from the list, ${extra.length} from the inbox) → content/authoring/enemies/imports/${franchise}.json`)
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
