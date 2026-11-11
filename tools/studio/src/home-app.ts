// The Studio's home (P113): a tile for every tier board and sprite tool, then the numbers across them.
import { BOARDS, BOSS_BOARDS, FRANCHISES, MIN_CAREER_BOSSES, TIERS, boardStats, careerMath, importBoardOf, inCast, leftOut, parseBoard, pools, type BoardId, type BoardStats } from './tier-model.js'
import { api, el, esc, nav, type TierData } from './tier-ui.js'

const SPRITE_TOOLS = [
  { href: '/queue', title: 'Sprite queue', blurb: 'Travelers and townsfolk in batch order; drag to reorder.' },
  { href: '/sprites/', title: 'Animation desk', blurb: 'Step frames, faces, held layers and formations.' },
  { href: '/field/', title: 'Field and scene', blurb: 'Walks in four facings, emotes and the direction check.' },
  { href: '/gates', title: 'Gates', blurb: 'Key and set approvals, bound to file hashes.' },
  { href: '/props', title: 'Weapons and bubbles', blurb: 'uma-art’s held textures and emote bubbles.' },
]
const GROUPS = [
  { id: 'umas', title: 'Umas', blurb: 'One rank a character, for all her outfits.' },
  { id: 'bosses', title: 'Bosses', blurb: 'What every career fights its way through.' },
  { id: 'enemies', title: 'Enemies', blurb: 'The escorts, the leaders and the crowd.' },
] as const

/** A stacked bar, SSS to unranked; widths go through the CSSOM, which the page's CSP allows. */
function bar(s: BoardStats): string {
  return `<span class="stack" aria-hidden="true">${TIERS.map((t) => `<span class="seg tier-${t.id}" data-grow="${s.tiers[t.id]}"></span>`).join('')}<span class="seg unranked" data-grow="${s.unranked}"></span></span>`
}
function render(data: TierData): void {
  const all = pools(data.catalog, data.states)
  const stats = Object.fromEntries(BOARDS.map((b) => [b.id, boardStats(all[b.id], data.states[b.id])])) as Record<BoardId, BoardStats>
  el('groups').innerHTML = GROUPS.map((g) => `<div class="tile-group"><div class="group-head"><h3>${esc(g.title)}</h3><p>${esc(g.blurb)}</p></div><div class="tiles">${BOARDS.filter((b) => b.group === g.id).map((b) => {
    const s = stats[b.id]
    return `<a class="app-tile group-${b.group}" href="/tiers/${b.id}"><span class="tile-kicker">${esc(b.short)}</span><strong>${esc(b.title)}</strong><span class="tile-blurb">${esc(b.blurb)}</span>` +
      `<span class="tile-numbers"><span class="big">${s.cast}</span><span>in the cast<br>of ${s.pool}${s.unranked ? ` · ${s.unranked} to rank` : ''}</span></span>${bar(s)}<span class="tile-go" aria-hidden="true">↗</span></a>`
  }).join('')}</div></div>`).join('') +
    `<div class="tile-group"><div class="group-head"><h3>Sprite production</h3><p>The Uma sprite pipeline’s tools, unchanged.</p></div><div class="tiles">${SPRITE_TOOLS.map((t) => `<a class="app-tile tool" href="${t.href}"><span class="tile-kicker">Sprites</span><strong>${esc(t.title)}</strong><span class="tile-blurb">${esc(t.blurb)}</span><span class="tile-go" aria-hidden="true">↗</span></a>`).join('')}</div></div>`

  const outfits = new Map(data.catalog.umas.map((u) => [u.id, u.outfits.length]))
  const castOutfits = data.states.umas.entries.filter((e) => inCast(e.tier) && all.umas.some((m) => m.id === e.id)).reduce((n, e) => n + (outfits.get(e.id) ?? 0), 0)
  const bosses = BOSS_BOARDS.reduce((n, b) => n + stats[b].cast, 0)
  el('kpis').innerHTML = [
    ['Playable Umas', stats.umas.cast, `${castOutfits} outfits between them`],
    ['Uma NPCs ranked', stats.npcs.ranked, `of ${stats.npcs.pool} outside the cast`],
    ['Bosses in the cast', bosses, BOSS_BOARDS.map((b) => `${BOARDS.find((x) => x.id === b)!.short} ${stats[b].cast}`).join(' · ')],
    ['Key enemies', stats['key-enemies'].cast, `of ${stats['key-enemies'].pool}`],
    ['Regular enemies', stats['regular-enemies'].cast, `of ${stats['regular-enemies'].pool}`],
  ].map(([label, value, sub]) => `<div class="kpi"><span class="kpi-label">${esc(label!)}</span><strong>${esc(value!)}</strong><span class="kpi-sub">${esc(sub!)}</span></div>`).join('')

  el('table').innerHTML = `<caption class="sr-only">Every board by tier</caption><thead><tr><th scope="col">Board</th>${TIERS.map((t) => `<th scope="col" class="num tier-${t.id}"><span class="tier-badge small">${t.id}</span></th>`).join('')}<th scope="col" class="num">Unranked</th><th scope="col" class="num">On the board</th><th scope="col">Leftovers go to</th></tr></thead><tbody>${BOARDS.map((b) => {
    const s = stats[b.id]
    return `<tr><th scope="row"><a href="/tiers/${b.id}">${esc(b.title)}</a></th>${TIERS.map((t) => `<td class="num ${inCast(t.id) ? 'cast' : ''}">${s.tiers[t.id] || '<span class="zero">·</span>'}</td>`).join('')}<td class="num">${s.unranked || '<span class="zero">·</span>'}</td><td class="num total">${s.pool}</td><td class="muted">${b.next ? esc(BOARDS.find((x) => x.id === b.next)!.title) : '—'}</td></tr>`
  }).join('')}</tbody>`

  const careers = careerMath(stats)
  el('careers').innerHTML = `<p class="career-lead">Every playable Uma’s career fights at least <strong>${MIN_CAREER_BOSSES} bosses</strong>, drawn from her own tier’s bosses first. A tier with more bosses than that lengthens its careers; one with fewer shares its bosses between careers.</p>` +
    `<table class="career-table"><thead><tr><th scope="col">Tier</th><th scope="col" class="num">Playable Umas</th><th scope="col" class="num">Bosses</th><th scope="col" class="num">Bosses a career</th><th scope="col" class="num">Careers a boss</th></tr></thead><tbody>${careers.tiers.map((t) => `<tr><th scope="row"><span class="tier-badge small tier-${t.tier}">${t.tier}</span></th><td class="num">${t.umas}</td><td class="num">${t.bosses}</td><td class="num strong">${t.umas ? t.bossesPerCareer : '—'}</td><td class="num">${t.careersPerBoss ?? '—'}</td></tr>`).join('')}</tbody>` +
    `<tfoot><tr><th scope="row">All</th><td class="num">${careers.umas}</td><td class="num">${careers.bosses}</td><td class="num" colspan="2">${careers.fights} boss fights in all</td></tr></tfoot></table>`

  el('imports').innerHTML = BOARDS.flatMap((b) => (b.franchise ? [b.franchise] : [])).map((f) => {
    const i = data.imports.find((x) => x.franchise === f), title = FRANCHISES.find((x) => x.id === f)?.label ?? f
    const out = leftOut(data.states[importBoardOf(f)!.id]).length
    return i ? `<li><strong>${title}</strong>: ${i.units} (${esc(i.filter)})${out ? `, ${out} left out` : ''}, from ${esc(i.source)}, ${esc(i.importedAt.slice(0, 10))}</li>` : `<li><strong>${title}</strong>: not imported yet. Run <code>pnpm tiers:import ${f}</code>, then restart the Studio.</li>`
  }).join('')

  el('release').textContent = data.catalog.release
  for (const seg of document.querySelectorAll<HTMLElement>('.seg')) seg.style.flexGrow = seg.dataset.grow ?? '0'
}

el('nav').innerHTML = nav('/')
api<TierData>('/api/tiers').then((data) => {
  for (const b of BOARDS) data.states[b.id] = parseBoard(data.states[b.id], b.id)
  render(data)
}).catch((error: unknown) => { el('notice').textContent = error instanceof Error ? error.message : 'Could not load the boards'; el('notice').hidden = false })
