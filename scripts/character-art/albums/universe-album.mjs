// A universe's albums (P181, from ChatGPT's approved/build-review.mjs and dialogue-portraits/build-review.mjs): the
// approved album (outfits by character, with the dialogue portraits and the splash art as tabs), and the dialogue
// portraits' and splash art's own pages. The pictures and their manifests are the universe's; every word that varies is
// in the album.json beside each page. A page is only built when its album.json exists, and a rebuilt page keeps the flag
// block pnpm art:push wrote.
import path from 'node:path'
import { escape, exists, fill, keepFlags, pageResult, readJson, readText } from './lib.mjs'
import { renderDialogueViewer } from './dialogue-viewer.mjs'
import { installSplashSection, standalonePage } from './splash.mjs'
import { ALBUM_CSS, ALBUM_TABS_CSS, ALBUM_TWO_TABS, DIALOGUE_PAGE_CSS } from './styles.mjs'

/**
 * The approved album, approved/review.html. Its album.json: title, header (HTML before the tabs, with {total} and
 * {perCharacter}), footer (HTML, the same placeholders), characters (their order), titles (an outfit's caption when its
 * manifest entry has none). With dialogue portraits beside it, they are the second tab; with splash art, the third.
 */
export async function renderApprovedAlbum(universeDir) {
  const dir = path.join(universeDir, 'approved'), file = path.join(dir, 'review.html')
  const text = await readJson(path.join(dir, 'album.json'))
  const manifest = await readJson(path.join(dir, 'manifest.json'))
  const portraitsDir = path.join(universeDir, 'dialogue-portraits'), splashDir = path.join(universeDir, 'splash-art')
  const portraitsText = (await exists(path.join(portraitsDir, 'album.json'))) ? await readJson(path.join(portraitsDir, 'album.json')) : {}
  const dialogue = (await exists(path.join(portraitsDir, 'manifest.json'))) ? await renderDialogueViewer({ dir: portraitsDir, prefix: '../dialogue-portraits/', text: portraitsText.viewer }) : null
  const previous = await readText(file)
  const publicationBlock = previous?.match(/<!-- publication flags:[\s\S]*?<!-- \/publication flags -->/)?.[0] ?? ''
  const titles = text.titles ?? {}
  const characters = text.characters ?? [...new Set(manifest.assets.map((a) => a.character))]
  const total = manifest.assets.length, perCharacter = total / characters.length
  const values = { total, perCharacter }
  const sections = characters.map((character) => `<section aria-label="${escape(character)} approved looks"><h2>${escape(character)}</h2><div class="grid">${manifest.assets.filter((a) => a.character === character).map((a) => `<figure data-asset-id="${escape(a.id)}"><a href="${escape(a.image)}" target="_blank" rel="noopener"><img src="${escape(a.image)}" alt="${escape(character)}, approved ${escape(a.title || titles[a.outfit] || a.outfit)}" loading="lazy"></a><figcaption><div class="caption"><strong>${escape(a.title || titles[a.outfit] || a.outfit)}</strong><span class="badge">Approved</span></div><a href="${escape(a.prompt)}" target="_blank" rel="noopener">Exact prompt</a></figcaption></figure>`).join('')}</div></section>`).join('\n')
  const head = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(text.title)}</title>`
  let html
  if (dialogue) {
    html = `${head}<style>${ALBUM_CSS}${dialogue.css}${ALBUM_TABS_CSS}</style></head><body><header>${fill(text.header, values)}<nav class="gallery-tabs" role="tablist" aria-label="Art section"><button type="button" id="gallery-outfits" role="tab" aria-selected="true">Outfits · ${total}</button><button type="button" id="gallery-dialogue" role="tab" aria-selected="false">Dialogue Portraits · ${dialogue.states}</button></nav></header><div id="outfit-panel">${sections}</div><div id="dialogue-panel" hidden>${dialogue.markup}</div>${fill(text.footer, values)}<script>${dialogue.script}</script><script>${ALBUM_TWO_TABS}</script>${publicationBlock}</body></html>\n`
    if (await exists(path.join(splashDir, 'manifest.json'))) {
      const splashText = (await exists(path.join(splashDir, 'album.json'))) ? await readJson(path.join(splashDir, 'album.json')) : {}
      html = await installSplashSection(html, { dir: splashDir, text: splashText })
    }
  } else {
    // Outfits only: no tabs to switch, and the splash art keeps to its own page.
    html = `${head}<style>${ALBUM_CSS}</style></head><body><header>${fill(text.header, values)}</header><div id="outfit-panel">${sections}</div>${fill(text.footer, values)}${publicationBlock}</body></html>\n`
  }
  return pageResult(file, html)
}

/** The dialogue portraits' own page, dialogue-portraits/review.html. Its album.json: page.title, page.heading, viewer. */
export async function renderPortraitsPage(universeDir) {
  const dir = path.join(universeDir, 'dialogue-portraits'), file = path.join(dir, 'review.html')
  const text = await readJson(path.join(dir, 'album.json'))
  const viewer = await renderDialogueViewer({ dir, prefix: '', text: text.viewer })
  const page = text.page ?? {}
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(page.title ?? 'Dialogue Portraits')}</title><style>${DIALOGUE_PAGE_CSS}${viewer.css}</style></head><body><header><h1>${escape(page.heading ?? 'Dialogue Portraits')}</h1><nav><a href="../approved/review.html">Outfits</a> · <strong>Dialogue Portraits</strong></nav></header>${viewer.markup}<script>${viewer.script}</script></body></html>`
  return pageResult(file, keepFlags(html, await readText(file)))
}

/** The splash art's own page, splash-art/review.html. Its album.json: intro, expectedCount, pageTitle, heading, backLink. */
export async function renderSplashPage(universeDir) {
  const dir = path.join(universeDir, 'splash-art'), file = path.join(dir, 'review.html')
  const text = await readJson(path.join(dir, 'album.json'))
  const previous = await readText(file)
  let html = await standalonePage({ dir, text })
  const block = previous?.match(/<!-- publication flags:[\s\S]*?<!-- \/publication flags -->/)?.[0]
  if (block) html = html.replace('</body>', block + '</body>')
  return pageResult(file, html)
}

/** Every page of a universe whose album.json exists. */
export async function renderUniverseAlbums(universeDir) {
  const pages = []
  if (await exists(path.join(universeDir, 'approved', 'album.json'))) pages.push(await renderApprovedAlbum(universeDir))
  if (await exists(path.join(universeDir, 'dialogue-portraits', 'album.json'))) pages.push(await renderPortraitsPage(universeDir))
  if (await exists(path.join(universeDir, 'splash-art', 'album.json'))) pages.push(await renderSplashPage(universeDir))
  return pages
}
