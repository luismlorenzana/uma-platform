// A cast album (P200): an enemy authoring app's cast, read from its folders, so a picture ChatGPT adds to a character's
// folder shows on her card at the next build, or at once through the Local Art Gallery, which builds this page fresh on
// every visit. The folders are `pnpm art:cast`'s: <app>/cast/tier-<n>/<NN>-<uma>/<enemy>/ with a character.json (who she
// is, the Uma she opposes, her references) and references/ (the Ranker's pictures of her). Every other picture under her
// folder is her work, newest first. Her approved looks come from the app's approved/manifest.json (matched by her unit
// id), badged Approved, and Published when the app's publication.json says so; a work picture identical to an approved
// one is badged with it. The page's words come from cast/album.json beside it (title, header, footer, noun, plural, empty;
// {characters}, {umas}, {withWork}, {approved}, {published}, {revision}); names come from each character.json. Nothing
// here names a character, faction or franchise.
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { escape, fill, pageResult, readJson, readText } from './lib.mjs'
import { ALBUM_CSS } from './styles.mjs'

const IMAGE = /\.(png|webp|jpe?g)$/i
const CAST_CSS = '.tier{margin-top:30px}.umas{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--block,240px),1fr));gap:16px}'
  + '.uma{background:#fbf6ee;border:1px solid #ded5c6;border-left:5px solid var(--c,#b9ae9d);border-radius:12px;padding:12px}'
  + '.uma>header{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin:0 0 10px}.uma>header b{font-family:Georgia,serif;font-size:18px;font-weight:400}'
  + '.chip{font-size:11px;border-radius:999px;padding:2px 8px;background:var(--c,#ddd);color:#fff}.chars{display:grid;grid-template-columns:repeat(var(--n,1),minmax(0,1fr));gap:10px}'
  + '.char{display:flex;flex-direction:column}.char .ref{display:block;background:#eee5d8;aspect-ratio:2/3}.char .ref img{width:100%;height:100%;object-fit:contain}'
  + '.char figcaption{padding:9px 10px;font-size:12px;line-height:1.5}.char strong{display:block;font-size:14px}.meta,.refs{display:block;color:#8a8073}.refs a{margin-right:8px}'
  + '.state{display:inline-block;margin-top:4px;font-size:10px;text-transform:uppercase;letter-spacing:.07em;padding:3px 6px;border-radius:4px;background:#eef0f4;color:#5b6578}'
  + '.char[data-state=work] .state{background:#fdf0d5;color:#8a5300}.char[data-state=approved] .state{background:#e7eddf;color:#4e6947}.char[data-state=published] .state{background:#e1ecfb;color:#1d4f91}'
  + '.thumbs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:0 10px 10px}.thumbs a{position:relative;display:block;background:#eee5d8;border-radius:6px;overflow:hidden;aspect-ratio:2/3}'
  + '.thumbs img{width:100%;height:100%;object-fit:contain}.tag{position:absolute;left:3px;bottom:3px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;padding:2px 4px;border-radius:3px;background:#e7eddf;color:#4e6947}'
  + '.tag.pub{background:#e1ecfb;color:#1d4f91}.tag.new{background:#fdf0d5;color:#8a5300}@media(max-width:620px){.umas{grid-template-columns:1fr}.chars{grid-template-columns:repeat(min(var(--n,1),2),minmax(0,1fr))}}'

/** A path relative to the page, each part URL-encoded. */
const href = (rel) => rel.split('/').map(encodeURIComponent).join('/')
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const hashes = new Map()
/** A file's SHA-256, kept while its size and time stay the same (the gallery server renders this page often). */
async function sha256Of(file, stat) {
  const key = `${file}|${stat.size}|${stat.mtimeMs}`
  if (!hashes.has(key)) hashes.set(key, createHash('sha256').update(await fs.readFile(file)).digest('hex'))
  return hashes.get(key)
}

/** Every character folder under cast/, by its character.json. */
async function characterFolders(dir, depth = 0) {
  const out = []
  if (depth > 4) return out
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'references') continue
    const folder = path.join(dir, e.name), record = await readText(path.join(folder, 'character.json'))
    if (record !== null) out.push({ folder, record: JSON.parse(record) })
    else out.push(...await characterFolders(folder, depth + 1))
  }
  return out
}
/** Every picture under her folder but her references, newest first. */
async function workOf(folder) {
  const out = []
  const walk = async (dir, depth) => {
    if (depth > 5) return
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (e.name.startsWith('.')) continue
      const file = path.join(dir, e.name)
      if (e.isDirectory()) { if (!(depth === 0 && e.name === 'references')) await walk(file, depth + 1) }
      else if (IMAGE.test(e.name)) { const stat = await fs.stat(file); out.push({ file, stat }) }
    }
  }
  await walk(folder, 0)
  return out.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs || a.file.localeCompare(b.file))
}

export async function renderCastAlbum(appDir) {
  const castDir = path.join(appDir, 'cast'), file = path.join(castDir, 'review.html')
  const text = await readJson(path.join(castDir, 'album.json'))
  const manifestText = await readText(path.join(appDir, 'approved', 'manifest.json'))
  const approvedAssets = manifestText ? (JSON.parse(manifestText).assets ?? []).filter((a) => a.approval?.status === 'approved' && a.approval?.by === 'owner') : []
  const recordText = await readText(path.join(appDir, 'approved', 'publication.json'))
  const published = new Set(recordText ? (JSON.parse(recordText).looks ?? []).filter((l) => l.state === 'published').map((l) => l.id) : [])
  const found = (await characterFolders(castDir)).filter((c) => c.record?.kind === 'enemy-cast-character')
  const cards = []
  for (const { folder, record } of found) {
    const rel = path.relative(castDir, folder).split(path.sep).join('/')
    const approved = approvedAssets.filter((a) => a.unitId === record.id)
    const approvedHashes = new Set(approved.map((a) => a.sha256))
    const work = []
    for (const w of await workOf(folder)) {
      // A work picture identical to an approved one shows once, as the approved one.
      if (approved.length && approvedHashes.has(await sha256Of(w.file, w.stat))) continue
      work.push(path.relative(castDir, w.file).split(path.sep).join('/'))
    }
    const shown = [
      ...approved.map((a) => ({ src: `../approved/${a.image}`, tag: published.has(a.id) ? 'Published' : 'Approved', cls: published.has(a.id) ? 'tag pub' : 'tag', title: a.look ?? a.id })),
      ...work.map((w) => ({ src: w, tag: 'New', cls: 'tag new', title: w.slice(rel.length + 1) })),
    ]
    const state = approved.some((a) => published.has(a.id)) ? 'published' : approved.length ? 'approved' : work.length ? 'work' : 'empty'
    cards.push({ record, rel, shown, state, approved: approved.length, published: approved.filter((a) => published.has(a.id)).length, work: work.length })
  }
  // In the Ranker's order: tier, then the Uma's place in it.
  const tierNumber = (t) => Number(String(t).replace(/\D/g, '')) || 99
  cards.sort((a, b) => tierNumber(a.record.uma.tier) - tierNumber(b.record.uma.tier) || a.record.uma.order - b.record.uma.order || a.rel.localeCompare(b.rel))
  const tiers = []
  for (const c of cards) {
    let tier = tiers.find((t) => t.tier === c.record.uma.tier)
    if (!tier) tiers.push(tier = { tier: c.record.uma.tier, umas: [] })
    let uma = tier.umas.find((u) => u.id === c.record.uma.id)
    if (!uma) tier.umas.push(uma = { id: c.record.uma.id, name: c.record.uma.name, order: c.record.uma.order, faction: c.record.faction, cards: [] })
    uma.cards.push(c)
  }
  const most = Math.max(1, ...tiers.flatMap((t) => t.umas.map((u) => u.cards.length)))
  const card = (c) => {
    const r = c.record, art = r.references.find((x) => x.kind === 'art') ?? r.references[0]
    const status = c.state === 'empty' ? 'No pictures yet' : [c.work ? plural(c.work, 'new picture', 'new pictures') : null, c.approved ? `${c.approved} approved` : null, c.published ? `${c.published} published` : null].filter(Boolean).join(' · ')
    const thumbs = c.shown.length ? `<div class="thumbs">${c.shown.map((s) => `<a href="${href(s.src)}" target="_blank" rel="noopener" title="${escape(s.title)}"><img src="${href(s.src)}" alt="${escape(r.name)}: ${escape(s.title)}" loading="lazy"><span class="${s.cls}">${s.tag}</span></a>`).join('')}</div>` : ''
    return `<figure class="char" data-id="${escape(r.id)}" data-state="${c.state}">`
      + (art ? `<a class="ref" href="${href(`${c.rel}/${art.file}`)}" target="_blank" rel="noopener"><img src="${href(`${c.rel}/${art.file}`)}" alt="${escape(r.name)}, her Ranker reference" loading="lazy"></a>` : '')
      + `<figcaption><strong>${escape(r.name)}</strong><span class="meta">${escape([r.franchise, r.rankerTier, r.id].filter(Boolean).join(' · '))}</span>`
      + `<span class="refs">${r.references.map((x) => `<a href="${href(`${c.rel}/${x.file}`)}" target="_blank" rel="noopener">${escape(x.kind)}</a>`).join('')}<a href="${href(`${c.rel}/character.json`)}" target="_blank" rel="noopener">record</a></span>`
      + `<span class="state">${escape(status)}</span></figcaption>${thumbs}</figure>`
  }
  const sections = tiers.map((t) => `<section class="tier" aria-label="${escape(t.tier)}"><h2>Tier ${escape(String(tierNumber(t.tier)))}</h2><div class="umas" style="--block:${most * 200}px">`
    + t.umas.map((u) => `<article class="uma" style="--c:${escape(u.faction?.color ?? '#b9ae9d')};--n:${u.cards.length}"><header><b>${String(u.order).padStart(2, '0')} · ${escape(u.name)}</b>${u.faction ? `<span class="chip">${escape(u.faction.title)}</span>` : ''}</header><div class="chars">${u.cards.map(card).join('')}</div></article>`).join('')
    + '</div></section>').join('\n')
  const umas = new Set(cards.map((c) => c.record.uma.id)).size
  const values = {
    characters: plural(cards.length, text.noun ?? 'character', text.plural ?? 'characters'), umas: plural(umas, 'Uma', 'Umas'),
    withWork: cards.filter((c) => c.work).length, approved: cards.filter((c) => c.approved).length, published: cards.filter((c) => c.published).length,
    revision: Math.max(0, ...cards.map((c) => c.record.castRevision ?? 0)),
  }
  const body = sections || `<p>${escape(text.empty ?? 'Nobody is cast here yet.')}</p>`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(text.title ?? 'Cast')}</title><style>${ALBUM_CSS}${CAST_CSS}</style></head><body><header>${fill(text.header ?? '<h1>Cast</h1>', values)}</header>${body}${fill(text.footer ?? '', values)}</body></html>\n`
  return pageResult(file, html)
}

/** The app folders of a universe that hold a cast album (cast/album.json), up to three folders deep. */
export async function castApps(universeDir) {
  const out = []
  const walk = async (dir, depth) => {
    if (depth > 3) return
    if (await readText(path.join(dir, 'cast', 'album.json')) !== null) out.push(dir)
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (e.isDirectory() && !e.name.startsWith('.') && !['cast', 'approved', 'references', 'images', 'prompts'].includes(e.name)) await walk(path.join(dir, e.name), depth + 1)
    }
  }
  await walk(universeDir, 0)
  return out.sort()
}
