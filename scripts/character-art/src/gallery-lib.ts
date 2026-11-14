// The Local Art Gallery's front page and its files (CA4, AP80): one page that lists every universe in private authoring
// with its approved gallery, how many looks are approved and how many are published, served from this machine only. The
// galleries themselves are the author's own pages (`<universe>/approved/review.html`), shown as they are.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { approvedDir, GALLERY, MANIFEST, RECORD, universesIn, type Publication } from './lib.js'

const TYPES: Readonly<Record<string, string>> = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
  md: 'text/plain; charset=utf-8', txt: 'text/plain; charset=utf-8', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml',
}
export const typeOf = (path: string): string => TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream'

/** The file a request path names under the gallery's root, or null: no traversal, no hidden files, files only. */
export function fileFor(base: string, urlPath: string): string | null {
  let path: string
  try { path = decodeURIComponent(urlPath.split('?')[0]!.split('#')[0]!) } catch { return null }
  const parts = path.split('/').filter((p) => p !== '')
  if (parts.length === 0 || parts.some((p) => p === '..' || p.startsWith('.') || p.includes('\\') || p.includes(':'))) return null
  const root = resolve(base), file = resolve(root, ...parts)
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) return null
  return file
}

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const words = (id: string) => id.split('-').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ')

export interface GalleryRow {
  universe: string; approved: number; published: number; waiting: number; publishedAt: string | null; studies: string[]
  /** The dialogue portraits' flag (CA5), when a push or a status wrote one. */
  portraits: { state: string; states: number; bases: number; faces: number; publishedAt: string | null } | null
}
/** Each universe's numbers: its manifest's looks, and its published record when a push or a status wrote one. */
export function galleryRows(base: string): GalleryRow[] {
  return universesIn(base).map((universe) => {
    const dir = approvedDir(universe, base)
    const manifest = JSON.parse(readFileSync(join(dir, MANIFEST), 'utf8')) as { assets?: unknown[] }
    const record = existsSync(join(dir, RECORD)) ? JSON.parse(readFileSync(join(dir, RECORD), 'utf8')) as Publication : null
    const portraitRecord = join(base, universe, 'dialogue-portraits', RECORD)
    const p = existsSync(portraitRecord) ? JSON.parse(readFileSync(portraitRecord, 'utf8')) as { state: string; states: number; bases: number; faces: number; publishedAt: string | null } : null
    const studies = readdirSync(join(base, universe), { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'approved' && !(p && e.name === 'dialogue-portraits') && existsSync(join(base, universe, e.name, GALLERY))).map((e) => e.name).sort()
    return {
      universe, approved: Array.isArray(manifest.assets) ? manifest.assets.length : 0, published: record?.counts.published ?? 0,
      waiting: record ? record.counts.unpublished + record.counts.changed : 0, publishedAt: record?.publishedAt ?? null, studies,
      portraits: p ? { state: p.state, states: p.states, bases: p.bases, faces: p.faces, publishedAt: p.publishedAt } : null,
    }
  })
}

/** The front page: a card for each universe, its approved gallery first, then its study pages. */
export function indexPage(base: string, site: string): string {
  const rows = galleryRows(base)
  const cards = rows.map((r) => {
    const flag = r.published === r.approved && r.approved > 0 ? `<span class="pub">All ${r.approved} published</span>`
      : r.published > 0 ? `<span class="pub part">${r.published} of ${r.approved} published</span>` : `<span class="pub none">Not published</span>`
    const studies = r.studies.map((s) => `<a href="/${r.universe}/${s}/${GALLERY}">${escape(s)}</a>`).join('')
    const q = r.portraits
    const portraits = q ? `<p><b>${q.states}</b> dialogue portrait states ${q.state === 'published' ? `<span class="pub">Published as ${q.bases + q.faces} pieces</span>${q.publishedAt ? ` <span class="when">${q.publishedAt.slice(0, 10)}</span>` : ''}` : `<span class="pub ${q.state === 'changed' ? 'part' : 'none'}">${q.state === 'changed' ? 'Changed since published' : 'Not published'}</span>`} · <a href="/${r.universe}/dialogue-portraits/${GALLERY}">Open them</a></p>` : ''
    return `<article data-universe="${r.universe}"><h2>${escape(words(r.universe))}</h2><p><b>${r.approved}</b> approved look${r.approved === 1 ? '' : 's'} ${flag}${r.publishedAt ? ` <span class="when">${r.publishedAt.slice(0, 10)}</span>` : ''}</p>`
      + `<p><a class="main" href="/${r.universe}/approved/${GALLERY}">Open the approved gallery</a></p>${portraits}${studies ? `<p class="studies">Studies: ${studies}</p>` : ''}</article>`
  }).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Art Gallery</title><style>
*{box-sizing:border-box}body{margin:0;padding:28px clamp(16px,4vw,56px);background:#edf0f6;color:#202a3b;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
header,main{max-width:1100px;margin-inline:auto}h1{font-size:clamp(27px,4vw,38px);letter-spacing:-.035em;margin:0 0 6px}header p{color:#526074;margin:0 0 22px;line-height:1.6}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}article{border:1px solid #ccd3df;border-radius:12px;background:#f9faff;padding:16px;box-shadow:0 4px 16px #18243d09}
h2{font-size:20px;margin:0 0 8px}article p{margin:8px 0;color:#526074;font-size:14px;line-height:1.6}a{color:#234f79;text-underline-offset:3px}
a.main{display:inline-flex;align-items:center;min-height:44px;padding:8px 14px;border:1px solid #ccd3df;border-radius:6px;background:#fff;font-weight:650;text-decoration:none}
.pub{display:inline-block;border-radius:4px;font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.07em;padding:4px 6px;border:1px solid #bcd3f2;color:#1d4f91;background:#e1ecfb;margin-left:6px}
.pub.part{color:#8a5300;background:#fdf0d5;border-color:#f0d9a4}.pub.none{color:#5b6578;background:#eef0f4;border-color:#d5dae3}.when{font-size:12px}
.studies a{display:inline-block;margin:0 10px 0 0;font-size:13px}
</style></head><body><header><h1>Local Art Gallery</h1><p>${rows.length} universe${rows.length === 1 ? '' : 's'} in private authoring on this machine. Published looks are in <a href="${escape(site)}" target="_blank" rel="noopener">Uma Character Art</a>, on each Uma’s page.</p></header><main>${cards || '<p>No approved collection yet.</p>'}</main></body></html>`
}
