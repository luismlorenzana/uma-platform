// The album builders (P181) on invented collections: invented riders, words and file names, no pictures. Each page's
// words come from its album.json, a rebuilt page keeps its flag block, and nothing but the pages is written.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { renderCharacterAlbum } from './character-album.mjs'
import { renderEnemyAlbum } from './enemy-album.mjs'
import { castApps, renderCastAlbum } from './cast-album.mjs'
import { fill, jsList, keepFlags } from './lib.mjs'
import { renderUniverseAlbums } from './universe-album.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const folders = []
const temp = () => { const d = mkdtempSync(join(tmpdir(), 'albums-test-')); folders.push(d); return d }
afterEach(() => { for (const d of folders.splice(0)) rmSync(d, { recursive: true, force: true }) })
const put = (file, value) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)) }
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

describe('a looks-only album and the enemy album (P182)', () => {
  it('gives a character with no dialogue portraits a looks-only album, lead outfit first, with no tabs', async () => {
    const v = join(temp(), 'v001')
    put(join(v, 'manifest.json'), { characterNames: { 'rider-four': 'Rider Four' }, outfits: ['street', 'armor'],
      fullBodyAssets: [{ outfit: 'street', image: 'street.png', prompt: 'street.txt', approval: { status: 'approved', by: 'owner' }, sourceVersion: 'v001' }, { outfit: 'armor', title: 'Combat armor', image: 'armor.png', approval: { status: 'approved', by: 'owner' }, sourceVersion: 'v001' }] })
    put(join(v, 'album.json'), { title: 'Rider Four · album', eyebrow: 'Invented', heading: 'Rider Four', intro: 'Two looks.', summary: ['{fullBody} looks'], leadOutfit: 'armor', approvedVersions: ['v001'], footer: '<footer>{fullBody} pictures</footer>' })
    put(join(v, 'review.html'), `<html><body>old${FLAGS}</body></html>`)
    const page = await renderCharacterAlbum(v)
    expect(page.html).toContain('<span>2 looks</span>')
    expect(page.html.indexOf('id="look-armor"')).toBeLessThan(page.html.indexOf('id="look-street"'))
    expect(page.html).toContain('<strong>Combat armor</strong><span class="status">Approved by owner</span>')
    expect(page.html).toContain(' · <a href="street.txt"')
    expect(page.html).not.toContain('id="tab-dialogue"')
    expect(page.html).not.toContain('<script>')
    expect(page.html).toContain('<footer>2 pictures</footer>')
    expect(page.html.split(FLAGS).length - 1).toBe(1)
  })

  it('builds the enemy album faction by faction from the approved records, and keeps its flag block', async () => {
    const { u } = universe()
    const e = join(u, 'enemies/approved')
    const foe = (id, character, faction, look, status = 'approved') => ({ id, character, faction, look, image: `${faction}/${id}.png`, width: 64, height: 96, sha256: 'a'.repeat(64), approval: { status, by: 'owner', date: '2026-01-02', scope: 'uniform' } })
    put(join(e, 'manifest.json'), { assets: [foe('foe-a', 'Foe A', 'north-pact', 'combat-station'), foe('foe-b', 'Foe B', 'south-guild', 'free'), foe('foe-c', 'Foe C', 'north-pact', 'free', 'pending')] })
    put(join(e, 'album.json'), { title: 'Sky City foes', header: '<h1>Foes</h1><p>{total} looks in {factions} factions.</p>', footer: '<footer>{total} approved</footer>', factions: { 'south-guild': 'The South Guild', 'north-pact': 'The North Pact' }, looks: { 'combat-station': 'Combat station' } })
    put(join(e, 'review.html'), `<html><body>old${FLAGS}</body></html>`)
    const page = await renderEnemyAlbum(u)
    expect(page.html).toContain('<title>Sky City foes</title>')
    expect(page.html).toContain('<p>2 looks in 2 factions.</p>')
    // In album.json's order, the unapproved look left out.
    expect(page.html.indexOf('<h2>The South Guild</h2>')).toBeLessThan(page.html.indexOf('<h2>The North Pact</h2>'))
    expect(page.html).not.toContain('Foe C')
    expect(page.html).toContain('<strong>Foe A</strong><span class="badge">Approved</span></div><p class="detail">Combat station<br>Approved 2026-01-02 · uniform</p>')
    expect(page.html).toContain('<p class="detail">Free<br>')
    expect(page.html).toContain('<footer>2 approved</footer>')
    expect(page.html.split(FLAGS).length - 1).toBe(1)
  })

  it('the command builds the enemy album with the rest', () => {
    const { base, u } = universe()
    put(join(u, 'enemies/approved/manifest.json'), { assets: [] })
    put(join(u, 'enemies/approved/album.json'), { title: 'Foes' })
    const out = execFileSync(process.execPath, [join(here, 'build.mjs'), 'sky-city'], { env: { ...process.env, UNIVERSES_DIR: base }, encoding: 'utf8' })
    expect(out).toContain('enemies/approved/review.html')
    expect(readFileSync(join(u, 'enemies/approved/review.html'), 'utf8')).toContain('No enemy look is approved yet.')
  })

  it('builds the casual enemy album from its own collection, apart from the combat looks (P185)', async () => {
    const { base, u } = universe()
    const foe = (id, faction, look) => ({ id, character: `Foe ${id}`, faction, look, image: `${faction}/${id}.png`, width: 64, height: 96, sha256: 'a'.repeat(64), approval: { status: 'approved', by: 'owner', date: '2026-01-03', scope: 'casual' } })
    put(join(u, 'enemies/approved/manifest.json'), { assets: [foe('combat-a', 'north-pact', 'combat-station')] })
    put(join(u, 'enemies/approved/album.json'), { title: 'Foes', factions: { 'north-pact': 'The North Pact' } })
    put(join(u, 'enemies/casual/approved/manifest.json'), { assets: [] })
    put(join(u, 'enemies/casual/approved/album.json'), { title: 'Casual foes', header: '<h1>Casual</h1><p>{looks}</p>', noun: 'casual look', empty: 'No casual look is approved yet.', factions: { 'north-pact': 'The North Pact' }, looks: { casual: 'Casual clothing' } })
    expect((await renderEnemyAlbum(u, 'enemies/casual')).html).toContain('<p>No casual look is approved yet.</p>')
    put(join(u, 'enemies/casual/approved/manifest.json'), { assets: [foe('casual-a', 'north-pact', 'casual')] })
    const page = await renderEnemyAlbum(u, 'enemies/casual')
    expect(page.file).toBe(join(u, 'enemies/casual/approved/review.html'))
    expect(page.html).toContain('<p>1 casual look</p>')
    expect(page.html).toContain('<strong>Foe casual-a</strong><span class="badge">Approved</span></div><p class="detail">Casual clothing<br>')
    expect(page.html).not.toContain('combat-a')
    const out = execFileSync(process.execPath, [join(here, 'build.mjs'), 'sky-city'], { env: { ...process.env, UNIVERSES_DIR: base }, encoding: 'utf8' })
    expect(out).toContain('enemies/approved/review.html')
    expect(out).toContain('enemies/casual/approved/review.html')
    expect(readFileSync(join(u, 'enemies/approved/review.html'), 'utf8')).not.toContain('casual-a')
  })
})

describe('compact character portraits', () => {
  it('builds from pieces when state images are absent and preserves publication flags', async () => {
    const { v } = universe(), file = join(v, 'manifest.json'), m = JSON.parse(readFileSync(file, 'utf8'))
    const image = Buffer.from('synthetic source bytes'), hash = (await import('node:crypto')).createHash('sha256').update(image).digest('hex')
    for (const a of m.assets) { put(join(v, a.base), image); a.baseSha256 = hash; a.rgbaSha256 = 'b'.repeat(64); for (const o of a.outputs) { delete o.image; o.rgbaSha256 = 'c'.repeat(64) } }
    for (const f of m.faces) { put(join(v, f.file), image); f.sha256 = hash }
    put(file, m)
    const t = JSON.parse(readFileSync(join(v, 'album.json'), 'utf8')); t.compactPortraits = true; t.portraitSheets = [['review/spring.png', 'Spring expressions']]; put(join(v, 'album.json'), t)
    put(join(v, 'review.html'), `<html><body>old${FLAGS}</body></html>`)
    const page = await renderCharacterAlbum(v)
    const { Script } = await import('node:vm')
    for (const script of page.html.matchAll(/<script>([\s\S]*?)<\/script>/g)) expect(() => new Script(script[1])).not.toThrow()
    expect(page.html).toContain('decodePortraitPNG')
    expect(page.html).toContain(image.toString('base64'))
    expect(page.html).toContain('Spring expressions')
    expect(page.html).not.toContain('portraits-board-link')
    expect(page.html).not.toContain('src=\"undefined\"')
    expect(page.html.split(FLAGS).length - 1).toBe(1)
    put(join(v, m.faces[0].file), 'changed bytes')
    await expect(renderCharacterAlbum(v)).rejects.toThrow(/hash mismatch/)
  })
})

describe('a cast album (P200)', () => {
  /** An invented app with two Umas' cast: her record, her reference, and what the author added. */
  function castApp() {
    const { base, u } = universe()
    const app = join(u, 'enemies', 'lieutenants')
    const record = (id, name, uma, order, tier = 'T1') => ({ schemaVersion: 1, kind: 'enemy-cast-character', id, name, franchise: 'invented', rankerTier: 'S', uma: { id: uma, name: `Rider ${uma}`, tier, order }, faction: { id: 'f1', title: 'Faction 1', color: '#123456' }, references: [{ kind: 'art', file: 'references/art.webp' }], castRevision: 9 })
    const add = (rel, rec) => { put(join(app, 'cast', rel, 'character.json'), rec); put(join(app, 'cast', rel, 'references', 'art.webp'), `ref ${rec.id}`) }
    add('tier-2/01-rider-3/foe-z', record('foe-z', 'Foe Z', '3', 1, 'T2'))
    add('tier-1/02-rider-2/foe-b', record('foe-b', 'Foe B', '2', 2))
    add('tier-1/01-rider-1/foe-a', record('foe-a', 'Foe A', '1', 1))
    put(join(app, 'cast', 'album.json'), { kind: 'cast-album', title: 'Cast', noun: 'lieutenant', plural: 'lieutenants', header: '<h1>Cast</h1><p>{characters} against {umas}: {withWork} with pictures, {approved} approved, {published} published</p>', footer: '<footer>revision {revision}</footer>' })
    return { base, u, app }
  }

  it('shows every cast character in tier and board order, her reference, and nothing else until pictures are added', async () => {
    const { app } = castApp()
    const page = await renderCastAlbum(app)
    expect(page.file).toBe(join(app, 'cast', 'review.html'))
    expect(page.html).toContain('<p>3 lieutenants against 3 Umas: 0 with pictures, 0 approved, 0 published</p>')
    expect(page.html.indexOf('Foe A')).toBeLessThan(page.html.indexOf('Foe B'))
    expect(page.html.indexOf('Foe B')).toBeLessThan(page.html.indexOf('Foe Z'))
    expect(page.html).toContain('<h2>Tier 1</h2>')
    expect(page.html).toContain('<b>01 · Rider 1</b><span class="chip">Faction 1</span>')
    expect(page.html).toContain('<img src="tier-1/01-rider-1/foe-a/references/art.webp" alt="Foe A, her Ranker reference" loading="lazy">')
    expect(page.html).toContain('data-id="foe-a" data-state="empty"')
    expect(page.html).toContain('<footer>revision 9</footer>')
  })

  it('shows each picture added to her folder, newest first, and her approved looks, a work copy of one shown once', async () => {
    const { app } = castApp()
    const folder = join(app, 'cast', 'tier-1', '01-rider-1', 'foe-a')
    put(join(folder, 'v001', 'images', 'first try.png'), 'a study')
    put(join(folder, 'v002', 'images', 'kept.png'), 'the approved picture')
    const kept = createHash('sha256').update('the approved picture').digest('hex')
    put(join(app, 'approved', 'manifest.json'), { assets: [{ id: 'foe-a-look', unitId: 'foe-a', look: 'station', image: 'f/foe-a/look.png', sha256: kept, approval: { status: 'approved', by: 'owner' } }] })
    put(join(app, 'approved', 'publication.json'), { looks: [{ id: 'foe-a-look', state: 'published' }] })
    const page = await renderCastAlbum(app)
    expect(page.html).toContain('data-id="foe-a" data-state="published"')
    expect(page.html).toContain('1 new picture · 1 approved · 1 published')
    expect(page.html).toContain('<a href="../approved/f/foe-a/look.png"')
    expect(page.html).toContain('<span class="tag pub">Published</span>')
    expect(page.html).toContain('href="tier-1/01-rider-1/foe-a/v001/images/first%20try.png"')
    expect(page.html).not.toContain('v002/images/kept.png')
    expect(page.html).toContain('<p>3 lieutenants against 3 Umas: 1 with pictures, 1 approved, 1 published</p>')
    // With a leadLook, her approved look of that key is her card's picture, not among the thumbnails (P201).
    const words = JSON.parse(readFileSync(join(app, 'cast', 'album.json'), 'utf8')); words.leadLook = 'station'; put(join(app, 'cast', 'album.json'), words)
    const led = await renderCastAlbum(app)
    expect(led.html).toContain('data-id="foe-a" data-state="published" data-lead="look"><a class="ref" href="../approved/f/foe-a/look.png" target="_blank" rel="noopener"><img src="../approved/f/foe-a/look.png" alt="Foe A: station" loading="lazy"><span class="tag pub">Published</span></a>')
    expect(led.html.split('../approved/f/foe-a/look.png').length - 1).toBe(2)
    expect(led.html).toContain('data-id="foe-b" data-state="empty"><a class="ref" href="tier-1/02-rider-2/foe-b/references/art.webp"')
  })

  it('is found in its app folder, and the command builds it with the rest', async () => {
    const { base, u, app } = castApp()
    expect(await castApps(u)).toEqual([app])
    const out = execFileSync(process.execPath, [join(here, 'build.mjs'), 'sky-city'], { env: { ...process.env, UNIVERSES_DIR: base }, encoding: 'utf8' })
    expect(out).toContain('enemies/lieutenants/cast/review.html')
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
