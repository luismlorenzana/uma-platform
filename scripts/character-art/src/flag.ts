// The script a local approved gallery runs to show each look's published flag (CA4, AP79). The galleries are plain pages
// opened from the file system, where a page can't fetch a file, so the record reaches them as a script
// (`publication.js` sets `window.UMA_PUBLICATION`) and this one draws it: a badge beside each look's "Approved", and a line
// under the page's header. It matches a look by its picture's path, changes nothing else on the page, and does nothing
// when the record is missing. Kept as text here because `pnpm art:push` and `pnpm art:status` write it into private
// authoring (`character-universes/publication-flag.js`), which git never sees.
export const FLAG_SCRIPT = `// Written by pnpm art:push and pnpm art:status (uma-platform, scripts/character-art). Don't edit: it is rewritten.
(function () {
  var record = window.UMA_PUBLICATION
  if (!record || !Array.isArray(record.looks)) return
  var WORDS = { published: 'Published', changed: 'Changed since published', unpublished: 'Not published', refused: 'Not published' }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  function day(iso) {
    var d = iso ? new Date(iso) : null
    return d && !isNaN(d.getTime()) ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : ''
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
  var byImage = {}
  record.looks.forEach(function (look) { if (look.image) byImage[look.image] = look })
  var figures = document.querySelectorAll('figure')
  for (var i = 0; i < figures.length; i++) {
    var figure = figures[i], img = figure.querySelector('img[src]')
    if (!img || figure.querySelector('.uma-pub')) continue
    var src = decodeURI(img.getAttribute('src').split('?')[0].split('#')[0]).replace(/^\\.\\//, '')
    var look = byImage[src]
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
  var counts = record.counts || {}, total = record.looks.length, published = counts.published || 0
  var line = document.createElement('p')
  line.className = 'uma-pub-line'
  var text = published === total ? 'All ' + total + ' looks are published to Uma Character Art'
    : published + ' of ' + total + ' looks are published to Uma Character Art'
  if (record.publishedAt) text += ' · ' + day(record.publishedAt)
  var waiting = (counts.unpublished || 0) + (counts.changed || 0)
  if (waiting) text += ' · ' + waiting + ' waiting for a push'
  if (counts.refused) text += ' · ' + counts.refused + ' can’t go out (see publication.json)'
  line.appendChild(document.createTextNode(text + ' · '))
  var link = document.createElement('a')
  link.href = record.site
  link.target = '_blank'
  link.rel = 'noopener'
  link.textContent = 'Open Uma Character Art'
  line.appendChild(link)
  var header = document.querySelector('header')
  if (header) header.appendChild(line)
  else document.body.insertBefore(line, document.body.firstChild)
})()
`
