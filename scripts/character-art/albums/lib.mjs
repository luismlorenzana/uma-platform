// Shared by the album builders (P181). The albums are the local review pages of private authoring: the code is here, in
// git, and everything an album says or shows (names, titles, notes, pictures, manifests) stays in the collection's
// gitignored folder, in its `album.json` and manifests. Plain Node, no dependencies, so any session can run it.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
/** Where the universes are authored on this machine. */
export const authoring = path.resolve(process.env.UNIVERSES_DIR ?? path.resolve(process.env.UMA_CONTENT_DIR ?? path.join(root, 'content'), 'authoring/character-universes'))

export const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
/** `farm-work` is "Farm Work". */
export const title = (s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
export const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'))
export const readText = async (file) => {
  try { return await fs.readFile(file, 'utf8') } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
export const exists = async (file) => (await readText(file)) !== null

/** An album text with `{name}` or `{a.b}` placeholders filled from `values`; a missing value stops the build. */
export function fill(template, values) {
  return String(template).replace(/\{([A-Za-z0-9_.]+)\}/g, (_, key) => {
    const value = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), values)
    if (value === undefined) throw new Error(`album.json: nothing fills {${key}}`)
    return String(value)
  })
}

/** The block `pnpm art:push` and `art:status` keep at the end of a gallery page (its record and flag scripts). */
export const FLAG_BLOCK = /<!-- publication flags:[\s\S]*?<!-- \/publication flags -->/
export const flagBlockOf = (html) => (html ? html.match(FLAG_BLOCK)?.[0] ?? null : null)
/** A rebuilt page keeps the flag block the previous one had, just before `</body>`. */
export function keepFlags(html, previous) {
  const block = flagBlockOf(previous)
  if (!block || html.includes(block)) return html
  const at = html.lastIndexOf('</body>')
  return at === -1 ? `${html}${block}` : `${html.slice(0, at)}${block}${html.slice(at)}`
}

/** A JS array of strings with single quotes, as the pages' inline scripts write them. */
export const jsList = (list) => `[${list.map((x) => `'${String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(',')}]`

/** One page a builder made: where it goes, its HTML, and whether it differs from the file there now. */
export async function pageResult(file, html) {
  const now = await readText(file)
  return { file, html, changed: now !== html }
}
/** Writes the pages that changed; says which. */
export async function writePages(pages) {
  const written = []
  for (const page of pages) if (page.changed) { await fs.writeFile(page.file, page.html); written.push(page.file) }
  return written
}
