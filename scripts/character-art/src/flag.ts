// The script a local gallery runs to show what is published (CA4, AP79; CA5's portraits, AP89). The galleries are plain pages
// opened from the file system, where a page can't fetch a file, so the record reaches them as a script
// (each `publication.js` adds its record and its own address to `window.UMA_PUBLICATIONS`, the portraits' sets
// `window.UMA_PORTRAIT_PUBLICATION`; P175) and this one draws
// it: a badge beside each look's "Approved", a line under the page's header, and a line for the dialogue portraits. It matches a look by its picture's path, changes nothing else on the page, and does nothing
// when the record is missing. Kept as text here because `pnpm art:push` and `pnpm art:status` write it into private
// authoring (`character-universes/publication-flag.js`), which git never sees.
export const FLAG_SCRIPT = `// Written by pnpm art:push and pnpm art:status (uma-platform, scripts/character-art). Don't edit: it is rewritten.
(function () {
  // Every record the page loaded: each publication.js adds { base, record } to UMA_PUBLICATIONS, base being its own URL,
  // so a picture is matched by where it really is. An older page's single UMA_PUBLICATION still works, by its path text.
  var list = []
  if (Array.isArray(window.UMA_PUBLICATIONS)) list = window.UMA_PUBLICATIONS.filter(function (e) { return e && e.record && Array.isArray(e.record.looks) })
  else if (window.UMA_PUBLICATION && Array.isArray(window.UMA_PUBLICATION.looks)) list = [{ base: null, record: window.UMA_PUBLICATION }]
  var portraits = window.UMA_PORTRAIT_PUBLICATION
  var hasPortraits = !!(portraits && portraits.kind === 'universe-portraits-publication')
  if (!list.length && !hasPortraits) return
  var WORDS = { published: 'Published', changed: 'Changed since published', unpublished: 'Not published', refused: 'Not published' }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  function day(iso) {
    var d = iso ? new Date(iso) : null
    return d && !isNaN(d.getTime()) ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : ''
  }
  function bare(path) { return String(path).split('?')[0].split('#')[0] }
  /** A picture's key: its full address when the record knows where it is, else its path as written. */
  function keyOf(path, base) {
    if (base) { try { return bare(new URL(path, base).href) } catch (e) { /* fall through */ } }
    return decodeURI(bare(path)).replace(/^\\.\\//, '')
  }
  var style = document.createElement('style')
  style.textContent = [
    '.uma-pub{display:inline-block;border-radius:4px;font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.07em;padding:4px 6px;border:1px solid;margin-left:6px}',
    '.uma-pub-published{color:#1d4f91;background:#e1ecfb;border-color:#bcd3f2}',
    '.uma-pub-changed{color:#8a5300;background:#fdf0d5;border-color:#f0d9a4}',
    '.uma-pub-unpublished,.uma-pub-refused{color:#5b6578;background:#eef0f4;border-color:#d5dae3}',
    '.uma-pub-line{margin:10px 0 0;padding:10px 12px;border:1px solid #bcd3f2;border-radius:8px;background:#f1f6fd;color:#27405f;font-size:13px;line-height:1.5;max-width:none}',
    '.uma-pub-line a{font-weight:650}'
  ].join('')
  document.head.appendChild(style)
  /** A line under the page's header, or at the top of the page. */
  function addLine(text, site) {
    var line = document.createElement('p')
    line.className = 'uma-pub-line'
    line.appendChild(document.createTextNode(text + (site ? ' · ' : '')))
    if (site) {
      var link = document.createElement('a')
      link.href = site
      link.target = '_blank'
      link.rel = 'noopener'
      link.textContent = 'Open Uma Character Art'
      line.appendChild(link)
    }
    var header = document.querySelector('header')
    if (header) header.appendChild(line)
    else document.body.insertBefore(line, document.body.firstChild)
  }
  var figures = document.querySelectorAll('figure')
  list.forEach(function (entry, n) {
    var record = entry.record, base = entry.base || null, byImage = {}
    record.looks.forEach(function (look) { if (look.image) byImage[keyOf(look.image, base)] = look })
    for (var i = 0; i < figures.length; i++) {
      var figure = figures[i], img = figure.querySelector('img[src]')
      if (!img || figure.querySelector('.uma-pub')) continue
      var look = byImage[base ? bare(img.src) : keyOf(img.getAttribute('src'), null)]
      if (!look) continue
      var badge = document.createElement('span')
      badge.className = 'uma-pub uma-pub-' + look.state
      badge.textContent = WORDS[look.state] || look.state
      badge.title = look.state === 'published' ? 'Published to Uma Character Art on ' + day(look.publishedAt) : (look.note || 'Approved, not in Uma Character Art yet')
      figure.setAttribute('data-publication', look.state)
      var approved = figure.querySelector('.badge')
      if (approved && approved.parentNode) approved.parentNode.insertBefore(badge, approved.nextSibling)
      else (figure.querySelector('figcaption') || figure).appendChild(badge)
    }
    var noun = record.noun || 'looks', counts = record.counts || {}, total = record.looks.length, published = counts.published || 0
    if (!total) return
    var text = published === total ? 'All ' + total + ' ' + noun + ' are published to Uma Character Art'
      : published + ' of ' + total + ' ' + noun + ' are published to Uma Character Art'
    if (record.publishedAt) text += ' · ' + day(record.publishedAt)
    var waiting = (counts.unpublished || 0) + (counts.changed || 0)
    if (waiting) text += ' · ' + waiting + ' waiting for a push'
    if (counts.refused) text += ' · ' + counts.refused + ' can’t go out (see publication.json)'
    addLine(text, n === 0 ? record.site : null)
  })
  if (hasPortraits) {
    var p = portraits, pieces = p.bases + ' outfit crops and ' + p.faces + ' faces'
    var words = p.state === 'published' ? 'Dialogue portraits: all ' + p.states + ' states are published as ' + pieces + (p.publishedAt ? ' · ' + day(p.publishedAt) : '')
      : p.state === 'changed' ? 'Dialogue portraits: changed since they were published' + (p.publishedAt ? ' on ' + day(p.publishedAt) : '') + ' · waiting for a push'
      : p.state === 'refused' ? 'Dialogue portraits: can’t be published (see dialogue-portraits/publication.json)'
      : 'Dialogue portraits: ' + p.states + ' states (' + pieces + '), not published yet'
    addLine(words + ' · the pieces show on each Uma’s page, and the states are composed by the games', list.length ? null : 'https://uma-platform.web.app/art')
  }
})()
`
