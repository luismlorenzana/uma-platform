// The splash art section (P181, from ChatGPT's splash-art/viewer.mjs): the scenes as cards, in the album as a third tab
// and on a page of their own. The scenes come from the collection's `manifest.json`; the words that vary come from its
// `album.json` (`intro`, `expectedCount`, and the standalone page's `pageTitle`, `heading` and `backLink`).
import assert from 'node:assert/strict'
import path from 'node:path'
import { escape, readJson } from './lib.mjs'
import { SPLASH_CSS, SPLASH_PAGE_CSS, SPLASH_TABS } from './styles.mjs'

/** The scenes' cards for the collection in `dir`, their images seen through `prefix`. */
export async function renderSplashContent({ dir, prefix = '', text = {} }) {
  const manifest = await readJson(path.join(dir, 'manifest.json'))
  if (text.expectedCount !== undefined) assert.equal(manifest.assets.length, text.expectedCount, `album.json expects ${text.expectedCount} scenes`)
  assert(manifest.assets.every((a) => a.approval.status === 'approved' && a.approval.imageSha256 === a.sha256), 'Every scene carries the owner’s approval of its exact image')
  const groups = Map.groupBy(manifest.assets, (scene) => scene.character ?? manifest.character)
  const cards = (scenes, character) => scenes.map((a) => [
    '<figure class="splash-card" data-splash-id="' + escape(a.id) + '" data-splash-order="' + a.order + '">',
    '<a class="splash-image" href="' + escape(prefix + a.image) + '" target="_blank" rel="noopener" aria-label="Open ' + escape(a.title) + '">',
    '<img src="' + escape(prefix + a.image) + '" width="' + a.width + '" height="' + a.height + '" alt="' + escape(character + ' · ' + a.title + ' · ' + a.expressionLabel) + '" loading="lazy"></a>',
    '<figcaption class="splash-caption"><div class="splash-title"><strong>' + a.order + '. ' + escape(a.title) + '</strong><span class="badge">Approved</span></div>',
    '<p class="splash-expression">' + escape(a.expressionLabel) + '</p><div class="splash-links">',
    '<a href="' + escape(prefix + a.image) + '" target="_blank" rel="noopener">Full image</a>',
    '<a href="' + escape(prefix + a.prompt) + '" target="_blank" rel="noopener">Exact prompt</a>',
    '<a href="' + escape(prefix + a.record) + '" target="_blank" rel="noopener">Art record</a>',
    '</div></figcaption></figure>',
  ].join('')).join('\n')
  const intro = text.intro ? '<p class="splash-intro">' + text.intro + '</p>' : ''
  const grid = (scenes, character) => '<div class="splash-grid">' + cards(scenes, character) + '</div>'
  let markup
  if (groups.size > 1) {
    const sections = [...groups].map(([character, scenes], i) => {
      const heading = 'splash-character-' + (i + 1)
      return '<section aria-labelledby="' + heading + '"><h2 id="' + heading + '">' + escape(character) + '</h2>'
        + grid(scenes, character) + '</section>'
    }).join('\n')
    markup = '<section class="splash-library" aria-label="Splash Art">' + intro + sections + '</section>'
  } else {
    const character = groups.keys().next().value ?? manifest.character
    markup = '<section class="splash-library" aria-labelledby="splash-heading"><h2 id="splash-heading">'
      + escape(character) + ' · Splash Art</h2>' + intro + grid(manifest.assets, character) + '</section>'
  }
  return { css: SPLASH_CSS, markup, count: manifest.assets.length }
}

const clean = (html) => {
  for (const key of ['styles', 'panel', 'tabs', 'button']) html = html.replace(new RegExp('<!-- splash ' + key + ' -->[\\s\\S]*?<!-- /splash ' + key + ' -->', 'g'), '')
  return html
}
const legacy = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].filter((m) => m[1].includes("function activate(view){const portraits=view==='dialogue'"))

/**
 * Puts the splash section into an album page that has the two-tab layout (Outfits, Dialogue Portraits): a third tab, its
 * panel before the footer, its styles, and the three-tab switch in place of the two-tab one. Running it again replaces the
 * section it added. The page's flag block is kept as it is.
 */
export async function installSplashSection(previous, { dir, prefix = '../splash-art/', text = {} }) {
  const content = await renderSplashContent({ dir, prefix, text })
  const wasInstalled = previous.includes('<!-- splash tabs -->')
  let html = clean(previous)
  const oldTabs = legacy(html)
  assert(oldTabs.length === 1 || (wasInstalled && oldTabs.length === 0), 'Find the existing album tabs before adding Splash Art')
  const legacyScript = oldTabs[0]?.[0] || ''
  const baseline = html.replace(legacyScript, '')
  if (legacyScript) html = html.replace(legacyScript, '')
  assert(html.includes('<nav class="gallery-tabs"'), 'Existing art navigation is required')
  html = html.replace(/(<nav class="gallery-tabs"[\s\S]*?)(<\/nav>)/, (_m, start, end) => start
    + '<!-- splash button --><button type="button" id="gallery-splash" role="tab" aria-selected="false" aria-controls="splash-panel">Splash Art · ' + content.count + '</button><!-- /splash button -->' + end)
  const footer = html.indexOf('<footer')
  assert(footer !== -1, 'The album needs its footer')
  html = html.slice(0, footer) + '<!-- splash panel --><div id="splash-panel" role="tabpanel" aria-labelledby="gallery-splash" hidden>' + content.markup + '</div><!-- /splash panel -->' + html.slice(footer)
  html = html.replace('</head>', '<!-- splash styles --><style>' + content.css + '</style><!-- /splash styles --></head>')
  // The switch goes before the flag block when the page has one, else before </body>.
  const marker = html.includes('<!-- publication flags:') ? '<!-- publication flags:' : '</body>'
  html = html.replace(marker, '<!-- splash tabs --><script>' + SPLASH_TABS + '</script><!-- /splash tabs -->' + marker)
  assert.equal(clean(html), baseline, 'Only add the managed section and replace the old two-tab controller')
  const publication = previous.match(/<!-- publication flags:[\s\S]*?<!-- \/publication flags -->/)?.[0]
  if (publication) assert(html.includes(publication), 'Publication markup must remain byte-identical')
  assert.equal((html.match(/data-splash-id=/g) || []).length, content.count)
  return html
}

/** The splash art's own page (`splash-art/review.html`), without its flag block. */
export async function standalonePage({ dir, text = {} }) {
  const content = await renderSplashContent({ dir, prefix: '', text })
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escape(text.pageTitle ?? 'Splash Art') + '</title><style>'
    + SPLASH_PAGE_CSS
    + content.css + '</style></head><body><header><a href="../approved/review.html#splash">' + escape(text.backLink ?? '← Album') + '</a><h1>' + escape(text.heading ?? 'Splash Art') + '</h1></header>'
    + content.markup + '</body></html>\n'
}
