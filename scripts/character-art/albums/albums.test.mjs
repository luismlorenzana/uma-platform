// The album builders (P181) on invented collections: invented riders, words and file names, no pictures. Each page's
// words come from its album.json, a rebuilt page keeps its flag block, and nothing but the pages is written.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { renderCharacterAlbum } from './character-album.mjs'
import { fill, jsList, keepFlags } from './lib.mjs'
import { renderUniverseAlbums } from './universe-album.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const folders = []
const temp = () => { const d = mkdtempSync(join(tmpdir(), 'albums-test-')); folders.push(d); return d }
afterEach(() => { for (const d of folders.splice(0)) rmSync(d, { recursive: true, force: true }) })
const put = (file, value) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)) }
const APPROVED = { status: 'approved', by: 'owner', on: '2026-01-02', imageSha256: 'a'.repeat(64) }
const FLAGS = '<!-- publication flags: written by pnpm art:push and pnpm art:status; keep this block --><script src="publication.js"></script><!-- /publication flags -->'

/** An invented universe: two riders' looks, their dialogue portraits, splash scenes for both, and a third rider's own album. */
function universe() {
  const base = temp(), u = join(base, 'sky-city')
  const looks = ['rider-one', 'rider-two'].flatMap((k, i) => ['street', 'pilot'].map((o) => ({ id: `${k}-${o}`, character: i ? 'Rider Two' : 'Rider One', outfit: o, image: `${k}/${o}.png`, prompt: `${k}/prompts/${o}.txt` })))
  put(join(u, 'approved/manifest.json'), { revision: 1, assets: looks })
  put(join(u, 'approved/album.json'), {
    title: 'Sky City Looks', characters: ['Rider One', 'Rider Two'], titles: { pilot: 'Flight suit' },
    header: '<div class="eyebrow">Invented</div><h1>Sky City Album</h1><p>{perCharacter} looks each.</p>',
    footer: '<footer>Invented footer · {total} pictures</footer>',
  })
  put(join(u, 'approved/review.html'), `<html><body>old${FLAGS}</body></html>`)
  const asset = (k, o) => ({ character: k, name: k, outfit: o, base: `bases/${k}-${o}.png`, sourceImage: `../approved/${k}/${o}.png`, position: { x: 4, y: 5 }, width: 40, height: 50, neutralOwnerApproved: true,
    outputs: [{ expression: 'happy', image: `composites/${k}-${o}-happy.png`, mask: `masks/${k}-happy.png`, ownerApproved: true, reviewStatus: 'Approved' }] })
  put(join(u, 'dialogue-portraits/manifest.json'), {
    characterNames: { 'rider-one': 'Rider One' }, outfits: ['street', 'pilot'], expressions: ['neutral', 'happy'],
    assets: [asset('rider-one', 'street'), asset('rider-one', 'pilot')], faces: [{ character: 'rider-one', expression: 'happy', file: 'faces/rider-one-happy.png', prompt: 'prompts/happy.txt', width: 10 }],
  })
  put(join(u, 'dialogue-portraits/album.json'), { page: { title: 'Sky City · Portraits', heading: 'Sky City Album' }, viewer: { intro: '<strong>{states} states</strong> · {outfits} outfits', defaults: { character: 'rider-one', outfit: 'pilot', expression: 'happy', reference: 'street' }, referenceOutfit: 'street', boardDir: 'sheets/' } })
  put(join(u, 'dialogue-portraits/review.html'), `<html><body>old${FLAGS}</body></html>`)
  const scene = (character, id, order) => ({ id, order, character, title: `Scene ${id}`, expressionLabel: 'Happy', image: `images/${id}.png`, prompt: `prompts/${id}.txt`, record: `records/${id}.json`, width: 160, height: 90, sha256: 'a'.repeat(64), approval: APPROVED })
  put(join(u, 'splash-art/manifest.json'), { assets: [scene('Rider One', 'meeting', 1), scene('Rider Two', 'beach', 1)] })
  put(join(u, 'splash-art/album.json'), { intro: 'Invented scenes.', expectedCount: 2, pageTitle: 'Sky City Scenes', heading: 'Sky City · Scenes', backLink: '← Back' })
  // The third rider's own album.
  const v = join(u, 'characters/rider-three/v002')
  put(join(u, 'characters/rider-three/active-study.json'), { activeVersion: 'v002', ownerApproved: true })
  put(join(v, 'manifest.json'), {
    characterNames: { 'rider-three': 'Rider Three' }, outfits: ['street', 'gala'], expressions: ['neutral', 'happy', 'sad'],
    assets: [asset('rider-three', 'street'), asset('rider-three', 'gala')],
    faces: [{ character: 'rider-three', expression: 'happy', file: 'faces/happy.png', mask: 'masks/happy.png', prompt: 'prompts/happy.txt', width: 10 }],
    fullBodyAssets: [{ outfit: 'street', image: 'street.png', prompt: 'street.txt', ownerApproved: true, sourceVersion: 'v001' }, { outfit: 'gala', image: 'gala.png', prompt: 'gala.txt', ownerApproved: true, sourceVersion: 'v002' }],
  })
  put(join(v, 'verification.json'), { states: 6, priorFilesUnchanged: 41 })
  put(join(v, 'album.json'), {
    title: 'Rider Three · album', eyebrow: 'Invented review', heading: 'Rider Three', intro: 'An invented album.', summary: ['{fullBody} outfits', '{verification.states} portraits'],
    links: '<a href="manifest.json">Manifest</a>', outfitsNote: 'Every outfit.', leadOutfit: 'gala', approvedVersions: ['v002'], approvedOutfits: ['gala'],
    defaults: { outfit: 'street', expression: 'neutral', reference: 'neutral', referenceExpression: 'happy' }, referenceOutfit: 'street',
    pairs: [['pair-mood', 'Happy / Sad', 'happy', 'sad']], overviewsIntro: 'Sheets.', overviews: [['wardrobe', 'All outfits']], footer: '<footer>{verification.priorFilesUnchanged} files kept</footer>',
  })
  return { base, u, v }
}

describe('the universe albums', () => {
  it('builds the approved album from its manifest and album.json, with the portraits and the scenes as tabs', async () => {
    const { u } = universe()
    const pages = await renderUniverseAlbums(u)
    expect(pages.map((p) => p.file.slice(u.length + 1).split('\\').join('/'))).toEqual(['approved/review.html', 'dialogue-portraits/review.html', 'splash-art/review.html'])
    const album = pages[0].html
    expect(album).toContain('<title>Sky City Looks</title>')
    expect(album).toContain('<p>2 looks each.</p>')
    expect(album).toContain('<footer>Invented footer · 4 pictures</footer>')
    expect(album).toContain('<strong>Flight suit</strong>')
    expect(album).toContain('Outfits · 4</button><button type="button" id="gallery-dialogue" role="tab" aria-selected="false">Dialogue Portraits · 4</button>')
    expect(album).toContain('Splash Art · 2</button>')
    // Two characters' scenes: a heading for each.
    expect(album).toContain('<h2 id="splash-character-1">Rider One</h2>')
    expect(album).toContain('<h2 id="splash-character-2">Rider Two</h2>')
    // The flag block the publish tool wrote is kept, once.
    expect(album.split(FLAGS).length - 1).toBe(1)
    expect(pages.every((p) => p.changed)).toBe(true)
  })

  it('gives the portraits page its words and keeps its flag block, and the scenes page its own', async () => {
    const { u } = universe()
    const [, portraits, scenes] = await renderUniverseAlbums(u)
    expect(portraits.html).toContain('<title>Sky City · Portraits</title>')
    expect(portraits.html).toContain('<strong>4 states</strong> · 2 outfits')
    expect(portraits.html).toContain("el('dlg-outfit').value='pilot'")
    expect(portraits.html).toContain("a.outfit==='street'")
    expect(portraits.html).toContain("data.prefix+'sheets/'+character")
    expect(portraits.html).toContain('width:(10/40*100)')
    expect(portraits.html.endsWith(`${FLAGS}</body></html>`)).toBe(true)
    expect(scenes.html).toContain('<title>Sky City Scenes</title>')
    expect(scenes.html).toContain('<a href="../approved/review.html#splash">← Back</a><h1>Sky City · Scenes</h1>')
  })

  it('refuses a scene count album.json doesn’t expect', async () => {
    const { u } = universe()
    put(join(u, 'splash-art/album.json'), { expectedCount: 3 })
    await expect(renderUniverseAlbums(u)).rejects.toThrow(/expects 3 scenes/)
  })
})

describe('a character’s own album', () => {
  it('builds her page from her manifest, verification and album.json, her lead outfit first', async () => {
    const { v } = universe()
    const page = await renderCharacterAlbum(v)
    expect(page.html).toContain('<title>Rider Three · album</title>')
    expect(page.html).toContain('<span>2 outfits</span><span>6 portraits</span>')
    expect(page.html.indexOf('id="look-gala"')).toBeLessThan(page.html.indexOf('id="look-street"'))
    expect(page.html).toContain('<strong>Gala</strong><span class="status">Approved by owner</span>')
    expect(page.html).toContain('<strong>Street</strong><span class="status">Accepted unchanged by owner</span>')
    expect(page.html).toContain("for(const [id,left,right] of [['pair-mood','happy','sad']])")
    expect(page.html).toContain("['gala'].includes(asset.outfit)")
    expect(page.html).toContain("el(side+'-image').alt='Rider Three · '")
    expect(page.html).toContain('<footer>41 files kept</footer>')
    expect(page.html).toContain('All three expressions for this outfit')
  })
})

describe('the command', () => {
  it('writes only the pages, and --check then finds them identical', () => {
    const { base, u } = universe()
    const before = readdirSync(join(u, 'approved')).sort()
    const run = (...args) => execFileSync(process.execPath, [join(here, 'build.mjs'), ...args], { env: { ...process.env, UNIVERSES_DIR: base }, encoding: 'utf8' })
    expect(run('sky-city')).toContain('sky-city: 4 pages, 4 rewritten')
    expect(readdirSync(join(u, 'approved')).sort()).toEqual(before)
    expect(run('sky-city', '--check')).not.toContain('differs')
  })
})

describe('the helpers', () => {
  it('fills placeholders, keeps a flag block, and writes lists as the pages do', () => {
    expect(fill('{a} of {b.c}', { a: 1, b: { c: 2 } })).toBe('1 of 2')
    expect(() => fill('{missing}', {})).toThrow(/nothing fills \{missing\}/)
    expect(keepFlags('<html><body>new</body></html>', `<body>old${FLAGS}</body>`)).toBe(`<html><body>new${FLAGS}</body></html>`)
    expect(keepFlags('<body>x</body>', '<body>no block</body>')).toBe('<body>x</body>')
    expect(jsList(['dinner', "it's"])).toBe("['dinner','it\\'s']")
  })

  it('the committed code names no character, universe or source', () => {
    for (const f of readdirSync(here).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs')))
      expect(readFileSync(join(here, f), 'utf8'), f).not.toMatch(/Kitasan|Almond|Satono|Farm Life|Cygames|umamusume/i)
  })
})
