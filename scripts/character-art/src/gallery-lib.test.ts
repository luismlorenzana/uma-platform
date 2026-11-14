import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { fileFor, galleryRows, indexPage, typeOf } from './gallery-lib.js'

const folders: string[] = []
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'art-gallery-')); folders.push(dir); return dir }
afterEach(() => { for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })

/** An invented authoring root: universes with a manifest of `approved` looks, a gallery page and, maybe, a record. */
function root(universes: Record<string, { approved: number; published?: number; waiting?: number; studies?: string[] }>): string {
  const base = temp()
  for (const [name, u] of Object.entries(universes)) {
    const dir = join(base, name, 'approved')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ assets: Array.from({ length: u.approved }, (_, i) => ({ id: `look-${i}` })) }))
    writeFileSync(join(dir, 'review.html'), '<html><body>gallery</body></html>')
    if (u.published !== undefined) writeFileSync(join(dir, 'publication.json'), JSON.stringify({ publishedAt: '2026-01-03T10:00:00.000Z', counts: { published: u.published, changed: 0, unpublished: u.waiting ?? 0, refused: 0 } }))
    for (const study of u.studies ?? []) { mkdirSync(join(base, name, study), { recursive: true }); writeFileSync(join(base, name, study, 'review.html'), '<html></html>') }
  }
  return base
}

describe('the Local Art Gallery', () => {
  it('lists each universe with its approved looks, how many are published, and its study pages', () => {
    const base = root({ 'sky-city': { approved: 4, published: 4, studies: ['wardrobe-v001', 'helmet-v001'] }, 'old-road': { approved: 3, published: 1, waiting: 2 }, 'new-world': { approved: 2 } })
    mkdirSync(join(base, 'sky-city', 'notes'))
    mkdirSync(join(base, 'sky-city', 'dialogue-portraits'))
    writeFileSync(join(base, 'sky-city', 'dialogue-portraits', 'publication.json'), JSON.stringify({ state: 'published', states: 384, bases: 24, faces: 30, publishedAt: '2026-01-04T10:00:00.000Z' }))
    expect(galleryRows(base)).toEqual([
      { universe: 'new-world', approved: 2, published: 0, waiting: 0, publishedAt: null, studies: [], portraits: null, characters: [] },
      { universe: 'old-road', approved: 3, published: 1, waiting: 2, publishedAt: '2026-01-03T10:00:00.000Z', studies: [], portraits: null, characters: [] },
      { universe: 'sky-city', approved: 4, published: 4, waiting: 0, publishedAt: '2026-01-03T10:00:00.000Z', studies: ['helmet-v001', 'wardrobe-v001'], portraits: { state: 'published', states: 384, bases: 24, faces: 30, publishedAt: '2026-01-04T10:00:00.000Z' }, characters: [] },
    ])
    const page = indexPage(base, 'https://example.test/art')
    expect(page).toContain('<title>Local Art Gallery</title>')
    expect(page).toContain('<h2>Sky City</h2><p><b>4</b> approved looks <span class="pub">All 4 published</span> <span class="when">2026-01-03</span>')
    expect(page).toContain('<span class="pub part">1 of 3 published</span>')
    expect(page).toContain('<h2>New World</h2><p><b>2</b> approved looks <span class="pub none">Not published</span></p>')
    expect(page).toContain('href="/sky-city/approved/review.html"')
    expect(page).toContain('<a href="/sky-city/helmet-v001/review.html">helmet-v001</a>')
    expect(page).toContain('href="https://example.test/art"')
    expect(page).toContain('<p><b>384</b> dialogue portrait states <span class="pub">Published as 54 pieces</span> <span class="when">2026-01-04</span> · <a href="/sky-city/dialogue-portraits/review.html">Open them</a></p>')
    expect(indexPage(temp(), 'https://example.test/art')).toContain('No approved collection yet.')
  })

  it('lists each character’s own collection with her looks, her portraits and her album (P174)', () => {
    const base = root({ 'sky-city': { approved: 1, published: 1 } })
    const folder = join(base, 'sky-city', 'characters', 'rider-two')
    mkdirSync(join(folder, 'v002'), { recursive: true })
    writeFileSync(join(folder, 'active-study.json'), JSON.stringify({ activeVersion: 'v002', ownerApproved: true }))
    writeFileSync(join(folder, 'v002', 'manifest.json'), JSON.stringify({ characterNames: { 'rider-two': 'Rider Two' }, fullBodyAssets: [{}, {}, {}] }))
    writeFileSync(join(folder, 'v002', 'review.html'), '<html></html>')
    writeFileSync(join(folder, 'publication.json'), JSON.stringify({ counts: { published: 3, changed: 0, unpublished: 0, refused: 0 } }))
    writeFileSync(join(folder, 'portraits-publication.json'), JSON.stringify({ state: 'published', states: 48 }))
    expect(galleryRows(base)[0]!.characters).toEqual([{ key: 'rider-two', name: 'Rider Two', approved: 3, published: 3, portraits: { state: 'published', states: 48 }, page: '/sky-city/characters/rider-two/v002/review.html' }])
    expect(indexPage(base, 'https://example.test/art')).toContain('<p data-character="rider-two"><b>Rider Two</b> · 3 approved looks <span class="pub">All 3 published</span> · <b>48</b> portrait states <span class="pub">Published</span> · <a href="/sky-city/characters/rider-two/v002/review.html">Open her album</a></p>')
  })

  it('serves only files under its root: no traversal, no hidden files, no folders', () => {
    const base = root({ 'sky-city': { approved: 1 } })
    writeFileSync(join(base, '.secret'), 'x')
    expect(fileFor(base, '/sky-city/approved/review.html?v=2')).toBe(join(base, 'sky-city', 'approved', 'review.html'))
    expect(fileFor(base, '/sky-city/approved/review.html')!.startsWith(base + sep)).toBe(true)
    for (const path of ['/', '/sky-city', '/sky-city/approved', '/../etc/passwd', '/sky-city/../../x', '/%2e%2e/x', '/.secret', '/sky-city/approved/missing.png', '/c:/windows/win.ini', '/sky-city%5Capproved%5Creview.html', '/%E0%A4%A'])
      expect(fileFor(base, path)).toBeNull()
  })

  it('names each file’s type', () => {
    expect([typeOf('a/review.html'), typeOf('x.PNG'), typeOf('publication.js'), typeOf('manifest.json'), typeOf('prompt.txt'), typeOf('x.bin')]).toEqual([
      'text/html; charset=utf-8', 'image/png', 'text/javascript; charset=utf-8', 'application/json; charset=utf-8', 'text/plain; charset=utf-8', 'application/octet-stream',
    ])
  })
})
