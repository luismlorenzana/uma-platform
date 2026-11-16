// A universe's enemy album (P182): the enemy looks the owner approved, faction by faction, built from
// <universe>/<collection>/approved/manifest.json (its assets: id, character, faction, look, image, width, height, sha256,
// approval). The collection is `enemies`, the combat looks, or `enemies/casual`, the casual-clothing looks (P185), each
// with its own approvals and album. Enemy and faction names stay local: they are in the manifest and in the album.json
// beside the page, never in this code. Its album.json: title, header and footer (HTML, with {total}, {factions}, {looks}
// and {factionCount}), factions ({key: name}, their order), looks ({key: caption}), noun (what {looks} counts, "enemy look"
// by default), and empty (the line shown before the first approval). Published looks are badged by the flag script, from the record `pnpm art:push` writes beside it (P183).
import path from 'node:path'
import { escape, fill, keepFlags, pageResult, readJson, readText, title } from './lib.mjs'
import { ALBUM_CSS } from './styles.mjs'

/** The enemy cards' few extra rules, on the album's own styling. */
const ENEMY_CSS = '.detail{font-size:12px;color:#6b6256;line-height:1.5;margin:8px 0 0}.faction-count{font-size:13px;color:#6b6256;margin:-10px 0 14px}'

export async function renderEnemyAlbum(universeDir, collection = 'enemies') {
  const dir = path.join(universeDir, ...collection.split('/'), 'approved'), file = path.join(dir, 'review.html')
  const text = await readJson(path.join(dir, 'album.json'))
  const manifest = await readJson(path.join(dir, 'manifest.json'))
  const assets = (manifest.assets ?? []).filter((a) => a.approval?.status === 'approved' && a.approval?.by === 'owner')
  const names = text.factions ?? {}, looks = text.looks ?? {}
  const order = [...Object.keys(names), ...assets.map((a) => a.faction).filter((f) => !(f in names))].filter((f, i, all) => all.indexOf(f) === i)
  const groups = order.map((faction) => ({ faction, items: assets.filter((a) => a.faction === faction) })).filter((g) => g.items.length)
  const caption = (a) => looks[a.look] ?? title(a.look ?? 'look')
  const card = (a) => `<figure data-asset-id="${escape(a.id)}"><a href="${escape(a.image)}" target="_blank" rel="noopener"><img src="${escape(a.image)}" alt="${escape(a.character)}, approved ${escape(caption(a))}" loading="lazy"></a><figcaption><div class="caption"><strong>${escape(a.character)}</strong><span class="badge">Approved</span></div><p class="detail">${escape(caption(a))}<br>Approved ${escape(a.approval.date ?? a.approval.on ?? '')}${a.approval.scope ? ` · ${escape(a.approval.scope)}` : ''}</p></figcaption></figure>`
  const sections = groups.map((g) => `<section aria-label="${escape(names[g.faction] ?? title(g.faction))} approved looks"><h2>${escape(names[g.faction] ?? title(g.faction))}</h2><p class="faction-count">${g.items.length} approved look${g.items.length === 1 ? '' : 's'}</p><div class="grid">${g.items.map(card).join('')}</div></section>`).join('\n')
  const n = assets.length, f = groups.length
  // {looks} and {factionCount} are the counts with their nouns, singular or plural.
  const noun = text.noun ?? 'enemy look'
  const values = { total: n, factions: f, looks: `${n} ${noun}${n === 1 ? '' : 's'}`, factionCount: `${f} faction${f === 1 ? '' : 's'}` }
  const body = sections || `<p>${escape(text.empty ?? 'No enemy look is approved yet.')}</p>`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(text.title ?? 'Approved enemy looks')}</title><style>${ALBUM_CSS}${ENEMY_CSS}</style></head><body><header>${fill(text.header ?? '<h1>Approved enemy looks</h1>', values)}</header>${body}${fill(text.footer ?? '', values)}</body></html>\n`
  return pageResult(file, keepFlags(html, await readText(file)))
}
