// A tier board (P113): one page for every board, set up from the board id in the URL.
import {
  BOARDS, STYLES, TIERS, WAYS, bestStyles, boardOf, boardStats, importBoardOf, inCast, leftOut, move, ordered, parseBoard, place, playstyleOf, pools, setMember, setNote, setOut, setTier, setWay, waysOf,
  type Board, type BoardId, type BoardState, type EnemyUnit, type PoolMember, type Pools, type Tier, type UmaCharacter, type Way,
} from './tier-model.js'
import { api, boardTitle, categoryLabel, el, esc, franchiseLabel, nav, roleLabel, wayLabel, type TierData } from './tier-ui.js'

const board: Board = boardOf(location.pathname.split('/')[2] ?? '') ?? BOARDS[0]!
const isUma = board.kind === 'uma'
let data: TierData | null = null
let all: Pools | null = null
let pool: PoolMember[] = []
let members = new Map<string, PoolMember>()
let selected: string | null = decodeURIComponent(location.hash.slice(1)) || null
let outfit: number | null = null
let mode: 'art' | 'splash' | 'face' = 'art'
let busy = false
let showAll = false
const undo: { board: BoardId; state: BoardState; selected: string | null }[] = []
const search = el<HTMLInputElement>('search'), queueFilter = el<HTMLSelectElement>('queue-filter'), facets = el('facets')

const state = (): BoardState => data!.states[board.id]
const umas = (): Map<string, UmaCharacter> => new Map(data!.catalog.umas.map((u) => [u.id, u]))
const enemies = (): Map<string, EnemyUnit> => new Map(data!.catalog.enemies.map((u) => [u.id, u]))
let umaIndex = new Map<string, UmaCharacter>(), enemyIndex = new Map<string, EnemyUnit>()
const nameOf = (id: string): string => umaIndex.get(id)?.name ?? enemyIndex.get(id)?.name ?? id
const entry = (id: string) => state().entries.find((e) => e.id === id)
/** Left out of every board (P121): only an imported boss board lists them, in its own Left out row. */
const isOut = (id: string): boolean => !!board.franchise && leftOut(state()).includes(id) && enemyIndex.has(id)
const tierOf = (id: string): Tier | null => entry(id)?.tier ?? null
/** A character's playstyle, the same on both Uma boards: it lives on the Playable board (P117). */
const styleOf = (id: string): Way | null => { const u = umaIndex.get(id); return u && data ? playstyleOf(u, data.states) : null }

function recompute(): void {
  all = pools(data!.catalog, data!.states)
  pool = all[board.id]
  members = new Map(pool.map((m) => [m.id, m]))
}

// ---- Filters ----

interface Facet { key: string; label: string; options: [string, string][]; test: (m: PoolMember, value: string) => boolean }
function facetList(): Facet[] {
  const list: Facet[] = []
  const present = <T extends string>(values: T[]) => [...new Set(values)]
  if (isUma) {
    list.push({ key: 'way', label: 'Every playstyle', options: WAYS.map((w) => [w.id, `${w.bucket} · ${w.label}`]), test: (m, v) => styleOf(m.id) === v })
    list.push({ key: 'outfits', label: 'Any outfit count', options: [['one', 'One outfit'], ['many', 'Two or more outfits']],
      test: (m, v) => ((umaIndex.get(m.id)?.outfits.length ?? 0) > 1) === (v === 'many') })
  } else {
    const units = pool.map((m) => enemyIndex.get(m.id)).filter((u): u is EnemyUnit => !!u)
    const franchises = present(units.map((u) => u.franchise)), categories = present(units.map((u) => u.category)), roles = present(units.flatMap((u) => (u.before ? [u.before.role] : [])))
    if (franchises.length > 1) list.push({ key: 'franchise', label: 'Every franchise', options: franchises.map((f) => [f, franchiseLabel(f)]), test: (m, v) => enemyIndex.get(m.id)?.franchise === v })
    if (categories.length > 1) list.push({ key: 'category', label: 'Every original category', options: categories.map((c) => [c, `Original: ${categoryLabel(c)}`]), test: (m, v) => enemyIndex.get(m.id)?.category === v })
    if (roles.length > 1) list.push({ key: 'role', label: 'Every old role', options: roles.map((r) => [r, `Old board: ${roleLabel(r)}`]), test: (m, v) => enemyIndex.get(m.id)?.before?.role === v })
  }
  const vias = present(pool.map((m) => m.via ?? 'own'))
  if (vias.length > 1) {
    list.push({ key: 'via', label: 'From anywhere', options: vias.map((v) => [v, v === 'own' ? 'This board’s own' : `Left by ${boardTitle(v as BoardId)}`]), test: (m, v) => (m.via ?? 'own') === v })
  }
  if (board.from.length) {
    list.push({ key: 'above', label: 'Any tier above', options: [['B', 'B above'], ['F', 'F above'], ['none', 'Unranked above']], test: (m, v) => (m.viaTier ?? 'none') === v })
  }
  return list
}
let facetDefs: Facet[] = []
function buildFacets(): void {
  facetDefs = facetList()
  facets.innerHTML = facetDefs.map((f) => `<select id="facet-${f.key}" data-facet="${f.key}" aria-label="${esc(f.label)}"><option value="all">${esc(f.label)}</option>${f.options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>`).join('')
}
function visible(): PoolMember[] {
  const term = search.value.trim().toLocaleLowerCase()
  const active = facetDefs.map((f) => [f, (document.getElementById(`facet-${f.key}`) as HTMLSelectElement | null)?.value ?? 'all'] as const).filter(([, v]) => v !== 'all')
  return pool.filter((m) => matches(m.id, term) && active.every(([f, v]) => f.test(m, v)))
}
/** The search reads the name, the id, an Uma's outfits and an enemy's details (a battlesuit's valkyrie, say). */
function matches(id: string, term: string): boolean {
  return `${nameOf(id)} ${id} ${umaIndex.get(id)?.outfits.map((o) => `${o.title} ${o.id}`).join(' ') ?? ''} ${enemyIndex.get(id)?.details.join(' ') ?? ''}`.toLocaleLowerCase().includes(term)
}
function reviewQueue(): PoolMember[] {
  const q = queueFilter.value
  return visible().filter((m) => q === 'all' || (q === 'unranked' ? !tierOf(m.id) : tierOf(m.id) === q))
}

// ---- Rendering ----

function notice(text: string | null): void { el('notice').textContent = text; el('notice').hidden = text === null }
function face(id: string): string {
  const src = umaIndex.get(id)?.face ?? enemyIndex.get(id)?.images.face
  return `<span class="fallback" aria-hidden="true">${esc(nameOf(id).charAt(0))}</span>${src ? `<img src="${esc(src)}" alt="" loading="lazy" draggable="false">` : ''}`
}
function chip(text: string, cls = ''): string { return `<span class="chip ${cls}">${esc(text)}</span>` }
function viaChip(m: PoolMember | undefined): string {
  return m?.via ? chip(`From ${boardTitle(m.via)} · ${m.viaTier ?? 'unranked'}`, 'chip-via') : ''
}

function umaCard(u: UmaCharacter): string {
  const shown = u.outfits.find((o) => o.id === outfit) ?? u.outfits[0]!
  const ways = [...new Set(u.outfits.map((o) => wayLabel(o.way)))].join(' · '), tier = tierOf(u.id)
  return `<div class="portrait-stage"><div class="portrait-meta"><span>${esc(u.outfits.length)} outfit${u.outfits.length === 1 ? '' : 's'}</span><span>${esc(ways)}</span></div>` +
    `${shown.portrait ? `<button class="reference-open" data-enlarge="${esc(shown.portrait)}" aria-label="Enlarge"><img src="${esc(shown.portrait)}" alt="${esc(`${u.name}, ${shown.title}`)}" fetchpriority="high"></button>` : '<div class="missing-art">No portrait in the release</div>'}` +
    `<span class="reference-caption">${esc(shown.title.toUpperCase())} · NO. ${esc(shown.id)}</span>${tier ? `<span class="current-rank tier-${tier}">TIER ${tier}</span>` : ''}</div>` +
    `<div class="outfit-strip" role="list" aria-label="Outfits">${u.outfits.map((o) => `<button role="listitem" class="outfit ${o.id === shown.id ? 'active' : ''}" data-outfit="${o.id}" aria-pressed="${o.id === shown.id}">` +
      `<span class="outfit-face">${o.face ? `<img src="${esc(o.face)}" alt="" loading="lazy">` : ''}</span><span class="outfit-copy"><strong>${esc(o.title)}</strong><span>${esc(wayLabel(o.way))}${o.original ? ' · original' : ''}</span></span>` +
      `${o.before ? `<span class="before tier-${o.before}" title="Its tier on the old outfit board">${o.before}</span>` : ''}</button>`).join('')}</div>` +
    `<div class="profile-copy">${styleTag(u)}<p class="identity-id">CHARACTER ${esc(u.id)}</p><h3>${esc(u.name)}</h3>${playstyle(u, shown)}<p class="chips">${viaChip(members.get(u.id))}` +
    `${u.outfits.some((o) => o.before) ? chip(`Old outfit board: best ${bestBefore(u)}`) : chip('Not on the old outfit board')}</p></div>`
}
function styleTag(u: UmaCharacter): string {
  const style = WAYS.find((w) => w.id === styleOf(u.id))!
  return `<span class="bucket-tag" title="${esc(style.rule)}">${esc(style.bucket)} <span>/ ${esc(style.label)}</span></span>`
}
/** Her playstyle (the old board's bucket and its calling), the shown outfit's running-style grades, and a pick when her outfits differ. */
function playstyle(u: UmaCharacter, shown: UmaCharacter['outfits'][number]): string {
  const style = WAYS.find((w) => w.id === styleOf(u.id))!, own = WAYS.find((w) => w.id === shown.way)!, best = bestStyles(shown.strategy), ways = waysOf(u)
  const lead = u.outfits.find((o) => o.id === u.lead)
  return `<div class="playstyle">` +
    `<div class="aptitudes" aria-label="Running style aptitudes of ${esc(shown.title)}">${STYLES.map((st) => `<span class="aptitude ${best.includes(st) ? 'best' : ''}"><span>${st.charAt(0).toUpperCase() + st.slice(1)}</span><strong>${esc(shown.strategy[st])}</strong></span>`).join('')}</div>` +
    `<p class="aptitude-caption">${esc(shown.title)}: the highlighted grades make her ${esc(own.bucket)} (${esc(own.label)}).${lead && shown.id !== lead.id ? ` Her playstyle comes from ${esc(lead.title)}, her lead outfit.` : ' Her lead outfit sets her playstyle.'}</p>` +
    (ways.length > 1 ? `<div class="playstyle-pick" role="group" aria-label="Her playstyle"><span>Her outfits span ${ways.length} playstyles:</span>${ways.map((w) => {
      const x = WAYS.find((y) => y.id === w)!
      return `<button data-way="${w}" aria-pressed="${style.id === w}" class="${style.id === w ? 'chosen' : ''}" ${busy ? 'disabled' : ''}>${esc(x.label)}</button>`
    }).join('')}</div>` : '') + `</div>`
}
function bestBefore(u: UmaCharacter): string {
  return TIERS.find((t) => u.outfits.some((o) => o.before === t.id))?.id ?? '—'
}
function enemyCard(u: EnemyUnit): string {
  const kind = u.images[mode] ? mode : u.images.art ? 'art' : u.images.splash ? 'splash' : 'face', src = u.images[kind], tier = tierOf(u.id)
  return `<div class="portrait-stage franchise-${u.franchise}"><div class="portrait-meta"><span>${esc(franchiseLabel(u.franchise))}</span>${u.studyAvailable ? '<span class="study-tag">Study available</span>' : ''}</div>` +
    `${src ? `<button class="reference-open" data-enlarge="${esc(src)}" aria-label="Enlarge"><img src="${esc(src)}" alt="${esc(u.name)}" fetchpriority="high"></button>` : '<div class="missing-art">No reference image</div>'}` +
    `<span class="reference-caption">ORIGINAL REFERENCE · ${kind.toUpperCase()}</span>${tier ? `<span class="current-rank tier-${tier}">TIER ${tier}</span>` : ''}</div>` +
    `<div class="reference-tabs">${(['art', 'splash', 'face'] as const).filter((k) => u.images[k]).map((k) => `<button data-mode="${k}" class="${kind === k ? 'active' : ''}" aria-pressed="${kind === k}">${k === 'art' ? 'Portrait' : k === 'splash' ? 'Splash' : 'Face'}</button>`).join('')}</div>` +
    `<div class="profile-copy"><p class="identity-id">${esc(u.id)}</p><h3>${esc(u.name)}</h3><p class="chips">${isOut(u.id) ? chip('Left out of every board', 'chip-out') : ''}${chip(`Original: ${categoryLabel(u.category)}`)}${u.details.map((d) => chip(d)).join('')}` +
    `${viaChip(members.get(u.id))}${u.before ? chip(`Old board: ${roleLabel(u.before.role)} · ${u.before.tier ?? 'unranked'}`, 'chip-before') : ''}</p></div>`
}
function membership(id: string): string {
  const unit = enemyIndex.get(id), home = unit ? importBoardOf(unit.franchise) : undefined
  if (unit && home) {
    // An imported unit can leave every board from wherever it shows; it comes back from its own board's Left out row.
    if (isOut(id)) return `<div class="membership"><p>Left out of every board. Rank it, drag it to a row, or:</p><button data-out="back" ${busy ? 'disabled' : ''}>Bring it back, unranked</button></div>`
    return `<div class="membership"><p>Not a fit for the roster (a male character from an unfiltered import, say)? It leaves ${esc(home.title)} and every board below.</p><button data-out="leave" ${busy ? 'disabled' : ''}>Leave out of every board</button></div>`
  }
  if (!unit || unit.franchise !== 'azurlane') return ''
  if (board.id === 'azurlane-bosses') return `<div class="membership"><p>On the Azur Lane bosses board.</p><button data-member="out" ${busy ? 'disabled' : ''}>Not a boss: move to Key enemies</button></div>`
  if (board.id === 'key-enemies' && members.get(id)?.via === null) return `<div class="membership"><p>An Azur Lane unit that isn’t on the bosses board.</p><button data-member="in" ${busy ? 'disabled' : ''}>Make it an Azur Lane boss</button></div>`
  return ''
}

function render(): void {
  if (!data) return
  const stats = boardStats(pool, state()), rows = reviewQueue(), shown = visible()
  if (selected && !members.has(selected) && !isOut(selected)) selected = null
  selected ??= rows[0]?.id ?? null
  if (selected !== decodeURIComponent(location.hash.slice(1))) history.replaceState(null, '', selected ? `#${encodeURIComponent(selected)}` : location.pathname)
  el('ranked-count').textContent = String(stats.ranked)
  const out = board.franchise ? leftOut(state()).filter((id) => enemyIndex.has(id)).length : 0
  el('progress-copy').textContent = `of ${stats.pool} · ${stats.cast} in the cast (SS, S, A) · ${stats.unranked} still to rank${out ? ` · ${out} left out` : ''}`
  const p = el<HTMLProgressElement>('progress'); p.value = stats.ranked; p.max = stats.pool || 1
  el('save-status').textContent = busy ? 'Saving…' : state().updatedAt ? `✓ Saved · revision ${state().revision}` : 'Ready'
  const tier = selected ? tierOf(selected) : null
  el('tier-buttons').innerHTML = TIERS.map((t, i) => {
    const leaves = !inCast(t.id) && board.next ? `Leaves this cast → ${boardTitle(board.next)}` : t.description
    return `<button data-tier="${t.id}" class="tier-choice tier-${t.id} ${tier === t.id ? 'chosen' : ''}" aria-pressed="${tier === t.id}" ${busy || !selected ? 'disabled' : ''}><span class="tier-badge">${t.id}</span><span class="tier-copy"><strong>${t.label}</strong><span>${esc(leaves)}</span></span><kbd>${i + 1}</kbd></button>`
  }).join('')
  const position = selected ? rows.findIndex((m) => m.id === selected) : -1
  el('queue-position').textContent = position >= 0 ? `${position + 1} / ${rows.length}` : `${rows.length} in queue`
  for (const id of ['previous', 'next']) el<HTMLButtonElement>(id).disabled = busy || rows.length < 1
  el<HTMLButtonElement>('unrank').disabled = busy || !tier
  el<HTMLButtonElement>('earlier').disabled = busy || !tier
  el<HTMLButtonElement>('later').disabled = busy || !tier
  el<HTMLButtonElement>('undo').disabled = busy || !undo.length
  const note = el<HTMLTextAreaElement>('note')
  if (document.activeElement !== note || !selected) note.value = selected ? entry(selected)?.note ?? '' : ''
  note.disabled = busy || !selected
  el<HTMLButtonElement>('save-note').disabled = busy || !selected
  el('membership').innerHTML = selected ? membership(selected) : ''
  if (selected) {
    const u = umaIndex.get(selected), e = enemyIndex.get(selected)
    el('review-card').innerHTML = u ? umaCard(u) : e ? enemyCard(e) : ''
  } else {
    el('review-card').innerHTML = `<div class="empty-review"><span aria-hidden="true">✳</span><h3>${!pool.length ? emptyTitle() : stats.unranked === 0 ? 'Every one is ranked.' : 'Nothing in this queue.'}</h3><p>${!pool.length ? emptyCopy() : 'Try another filter, or pick a portrait in the tier list.'}</p></div>`
  }
  renderTierList(shown)
}
function emptyTitle(): string { return board.franchise && !leftOut(state()).length ? 'Nothing imported yet.' : 'This board is empty.' }
function emptyCopy(): string {
  if (board.franchise) return leftOut(state()).length ? 'Every unit is left out; bring one back from the Left out row.' : `Run the local import (pnpm tiers:import ${board.franchise}), then restart the Studio.`
  return board.from.length ? `It fills with what ${board.from.map((b) => boardTitle(b)).join(', ')} leave in B, F or unranked.` : 'Its catalog is missing.'
}
function tile(id: string): string {
  const u = umaIndex.get(id), e = enemyIndex.get(id), tier = tierOf(id)
  const count = u ? `<span class="outfit-count" aria-label="${u.outfits.length} outfits">${u.outfits.length}</span>` : ''
  return `<button class="tile ${id === selected ? 'selected' : ''} ${e ? `franchise-${e.franchise}` : ''}" draggable="${busy ? 'false' : 'true'}" data-select="${esc(id)}" data-id="${esc(id)}" title="${esc(`${nameOf(id)}${tier ? ` · ${tier}` : ''}`)}" aria-label="${esc(nameOf(id))}">${face(id)}${count}</button>`
}
/** The old outfit board's grid, per character: tiers down, the five playstyles across (P117). */
function renderPlaystyleGrid(shown: PoolMember[], list: ReturnType<typeof ordered>, unranked: PoolMember[]): string {
  const ids = new Set(shown.map((m) => m.id)), byStyle = new Map(shown.map((m) => [m.id, styleOf(m.id)]))
  const head = `<thead><tr><th scope="col" class="corner">TIER</th>${WAYS.map((w) => {
    const inWay = shown.filter((m) => byStyle.get(m.id) === w.id), cast = inWay.filter((m) => inCast(tierOf(m.id))).length, ranked = inWay.filter((m) => tierOf(m.id)).length
    return `<th scope="col" title="${esc(w.rule)}"><span class="column-title">${esc(w.bucket)}</span><span class="column-subtitle">${esc(w.label)} <span>${cast} cast · ${ranked}/${inWay.length}</span></span></th>`
  }).join('')}</tr></thead>`
  const row = (tier: Tier | null, label: string, members: string[]) => {
    const cells = WAYS.map((w) => {
      const here = members.filter((id) => byStyle.get(id) === w.id)
      return `<td data-row="${tier ?? 'none'}" data-way="${w.id}"><span class="cell-count">${here.length || '—'}</span><div class="cell-tiles">${here.map((id) => tile(id)).join('')}</div></td>`
    }).join('')
    return `<tr class="${tier ? `tier-${tier} ${inCast(tier) ? 'cast' : 'leaves'}` : 'unranked'}"><th scope="row" class="grid-tier" data-row="${tier ?? 'none'}"><span class="tier-badge">${tier ?? '—'}</span><span class="row-copy"><strong>${esc(label)}</strong><span>${members.length}</span></span></th>${cells}</tr>`
  }
  const body = TIERS.map((t) => row(t.id, t.label, list.filter((e) => e.tier === t.id && ids.has(e.id)).map((e) => e.id))).join('') + row(null, 'Unranked', unranked.map((m) => m.id))
  return `<div class="grid-scroll"><table class="playstyle-grid"><caption class="sr-only">${esc(board.title)} by tier and playstyle</caption>${head}<tbody>${body}</tbody></table></div>`
}
function renderTierList(shown: PoolMember[]): void {
  const ids = new Set(shown.map((m) => m.id)), poolIds = new Set(pool.map((m) => m.id))
  const list = ordered(state(), poolIds), unranked = shown.filter((m) => !tierOf(m.id))
  el('board-count').textContent = shown.length === pool.length ? `${pool.length} on this board` : `${shown.length} of ${pool.length} shown`
  el('bulk').innerHTML = unranked.length && shown.length < pool.length
    ? `Rank the ${unranked.length} unranked shown as ${(['B', 'F'] as const).map((t) => `<button class="bulk-rank" data-bulk="${t}" ${busy ? 'disabled' : ''}>${t}</button>`).join('')}` : ''
  if (isUma) { el('tierlist').innerHTML = renderPlaystyleGrid(shown, list, unranked); return }
  const rows = TIERS.map((t) => {
    const inTier = list.filter((e) => e.tier === t.id && ids.has(e.id))
    return `<div class="tier-row tier-${t.id} ${inCast(t.id) ? 'cast' : 'leaves'}" data-row="${t.id}"><div class="row-head"><span class="tier-badge">${t.id}</span><span class="row-copy"><strong>${t.label}</strong><span>${inTier.length}</span></span></div><div class="row-tiles">${inTier.map((e) => tile(e.id)).join('') || '<span class="row-empty">Drop here</span>'}</div></div>`
  })
  const limit = showAll ? unranked.length : 80
  rows.push(`<div class="tier-row unranked" data-row="none"><div class="row-head"><span class="tier-badge">—</span><span class="row-copy"><strong>Unranked</strong><span>${unranked.length}</span></span></div><div class="row-tiles">${unranked.slice(0, limit).map((m) => tile(m.id)).join('') || '<span class="row-empty">None</span>'}${unranked.length > limit ? `<button class="more" data-more>Show all ${unranked.length}</button>` : ''}</div></div>`)
  if (board.franchise) {
    // Left out of every board (P121): drop a portrait here to leave it out, drag one to a tier to bring it back.
    const term = search.value.trim().toLocaleLowerCase(), out = leftOut(state()).filter((id) => enemyIndex.has(id) && matches(id, term))
    rows.push(`<div class="tier-row left-out" data-row="out"><div class="row-head"><span class="tier-badge">✕</span><span class="row-copy"><strong>Left out</strong><span>${out.length} · on no board</span></span></div><div class="row-tiles">${out.map((id) => tile(id)).join('') || '<span class="row-empty">Drop here to leave out</span>'}</div></div>`)
  }
  el('tierlist').innerHTML = rows.join('')
}

// ---- Saving ----

async function save(next: BoardState, opts: { record?: boolean } = {}): Promise<void> {
  if (!data || next === data.states[next.board]) return
  if (opts.record !== false) { undo.push({ board: next.board, state: data.states[next.board], selected }); if (undo.length > 50) undo.shift() }
  data.states[next.board] = next
  recompute(); busy = true; render()
  try {
    data.states[next.board] = parseBoard(await api(`/api/tiers/${next.board}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) }), next.board)
    notice(null)
  } catch (error) {
    notice(error instanceof Error ? error.message : 'Save failed')
    await load(false)
  } finally { busy = false; recompute(); render() }
}
function rank(tier: Tier | null): void {
  if (!selected || busy) return
  const rows = reviewQueue(), index = rows.findIndex((m) => m.id === selected), id = selected
  const advance = el<HTMLInputElement>('auto-next').checked && tier !== null && !tierOf(id)
  const after = advance ? rows.slice(index + 1).find((m) => !tierOf(m.id)) ?? rows.find((m) => m.id !== id && !tierOf(m.id)) : undefined
  if (after) { selected = after.id; outfit = null }
  // Ranking a left-out unit brings it back first (P121).
  void save(setTier(isOut(id) ? setOut(state(), id, false) : state(), id, tier))
}
function step(direction: 1 | -1): void {
  const rows = reviewQueue()
  if (!rows.length) return
  const index = rows.findIndex((m) => m.id === selected)
  selected = rows[(index + direction + rows.length) % rows.length]!.id
  outfit = null
  render()
}

async function load(first = true): Promise<void> {
  data = await api<TierData>('/api/tiers')
  for (const b of BOARDS) data.states[b.id] = parseBoard(data.states[b.id], b.id)
  umaIndex = umas(); enemyIndex = enemies()
  recompute()
  if (first) {
    buildFacets()
    // A board with nothing left to rank opens on everyone, to re-rank.
    if (pool.length && pool.every((m) => tierOf(m.id))) queueFilter.value = 'all'
  }
}

// ---- Events ----

document.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('button, [data-select]')
  if (!target || !data) return
  if (target.dataset.tier) rank(target.dataset.tier as Tier)
  else if (target.dataset.select) { selected = target.dataset.select; outfit = null; render(); el('review-card').scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
  else if (target.dataset.outfit) { outfit = Number(target.dataset.outfit); render() }
  else if (target.dataset.mode) { mode = target.dataset.mode as typeof mode; render() }
  else if (target.dataset.enlarge) { el('large-reference').innerHTML = `<img src="${esc(target.dataset.enlarge)}" alt="">`; el<HTMLDialogElement>('reference-dialog').showModal() }
  else if (target.hasAttribute('data-more')) { showAll = true; render() }
  else if (target.dataset.bulk) {
    // Only with a filter on, so a whole board is never ranked by accident; one undo restores it.
    const tier = target.dataset.bulk as Tier, ids = visible().filter((m) => !tierOf(m.id)).map((m) => m.id)
    if (ids.length && confirm(`Rank ${ids.length} unranked portraits as ${tier} on ${board.title}? One undo restores them.`)) void save(ids.reduce((s, id) => setTier(s, id, tier), state()))
  }
  else if (target.dataset.way && selected) {
    const u = umaIndex.get(selected)
    if (u) void save(setWay(data.states.umas, u, target.dataset.way as Way))
  }
  else if (target.dataset.out && selected) {
    const id = selected, home = importBoardOf(enemyIndex.get(id)?.franchise ?? '')
    if (!home) return
    if (target.dataset.out === 'leave') step(1)
    void save(setOut(data.states[home.id], id, target.dataset.out === 'leave'))
  }
  else if (target.dataset.member && selected) {
    const id = selected, alState = data.states['azurlane-bosses']
    if (target.dataset.member === 'out') step(1)
    void save(setMember(alState, id, target.dataset.member === 'in'))
  }
})
el('unrank').addEventListener('click', () => rank(null))
el('previous').addEventListener('click', () => step(-1))
el('next').addEventListener('click', () => step(1))
el('earlier').addEventListener('click', () => { if (selected) void save(move(state(), selected, -1, new Set(pool.map((m) => m.id)))) })
el('later').addEventListener('click', () => { if (selected) void save(move(state(), selected, 1, new Set(pool.map((m) => m.id)))) })
el('undo').addEventListener('click', () => {
  const last = undo.pop()
  if (!last || !data) return
  selected = last.selected
  void save({ ...last.state, revision: data.states[last.board].revision }, { record: false })
})
el('save-note').addEventListener('click', () => { if (selected) void save(setNote(state(), selected, el<HTMLTextAreaElement>('note').value)) })
el('close-reference').addEventListener('click', () => el<HTMLDialogElement>('reference-dialog').close())
for (const control of [search, queueFilter]) control.addEventListener('input', () => { selected = null; showAll = false; render() })
facets.addEventListener('change', () => { selected = null; showAll = false; render() })
document.addEventListener('keydown', (event) => {
  const t = event.target as HTMLElement
  if (t.closest('input, textarea, select') || event.altKey || event.ctrlKey || (event.metaKey && event.key !== 'z')) {
    if (t.id === 'note' && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) el('save-note').click()
    return
  }
  const tier = TIERS[Number(event.key) - 1]
  if (tier) rank(tier.id)
  else if (event.key === '0') rank(null)
  else if (event.key === 'ArrowLeft') step(-1)
  else if (event.key === 'ArrowRight') step(1)
  else if (event.key === '[') el('earlier').click()
  else if (event.key === ']') el('later').click()
  else if (event.key === 'z' && event.metaKey) el('undo').click()
  else return
  event.preventDefault()
})

// Drag a portrait onto a row to rank it, or onto another portrait to go just before it.
let dragged: string | null = null
const list = el('tierlist')
list.addEventListener('dragstart', (event) => {
  const tileNode = (event.target as HTMLElement).closest<HTMLElement>('[data-id]')
  if (!tileNode || busy) return
  dragged = tileNode.dataset.id ?? null
  event.dataTransfer?.setData('text/plain', dragged ?? '')
  tileNode.classList.add('dragging')
})
list.addEventListener('dragend', () => { dragged = null; for (const n of list.querySelectorAll('.drop-target, .dragging')) n.classList.remove('drop-target', 'dragging') })
list.addEventListener('dragover', (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-row]')
  if (!row || !dragged) return
  event.preventDefault()
  for (const n of list.querySelectorAll('.drop-target')) n.classList.remove('drop-target')
  ;((event.target as HTMLElement).closest<HTMLElement>('[data-id]') ?? row).classList.add('drop-target')
})
list.addEventListener('drop', (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-row]')
  if (!row || !dragged || !data) return
  event.preventDefault()
  const id = dragged, before = (event.target as HTMLElement).closest<HTMLElement>('[data-id]')?.dataset.id ?? null
  dragged = null
  selected = id
  // The Left out row leaves a unit out of every board; any other row brings a left-out unit back first (P121).
  const from = isOut(id) && row.dataset.row !== 'out' ? setOut(state(), id, false) : state()
  let next = row.dataset.row === 'out' ? setOut(state(), id, true) : row.dataset.row === 'none' ? setTier(from, id, null) : place(from, id, row.dataset.row as Tier, before)
  // On the Playable grid, dropping into another playstyle she has an outfit in picks that playstyle too.
  const u = umaIndex.get(id), way = row.dataset.way as Way | undefined
  if (board.id === 'umas' && u && way && way !== styleOf(id) && u.outfits.some((o) => o.way === way)) next = setWay(next, u, way)
  void save(next)
})

// ---- Start ----

document.title = `${board.title} · Uma Studio`
el('nav').innerHTML = nav(`/tiers/${board.id}`)
el('eyebrow').textContent = `TIER AUTHORING / ${board.group.toUpperCase()}`
el('title').innerHTML = `${esc(board.title)}<span>.</span>`
el('lead').textContent = board.blurb
el('pool-rule').textContent = board.pool
el('footer-file').textContent = `content/authoring/tiers/${board.id}.json`
el('queue-filter').innerHTML = `<option value="unranked">Still to rank</option><option value="all">Everyone</option>${TIERS.map((t) => `<option value="${t.id}">Tier ${t.id}</option>`).join('')}`
el('export').addEventListener('click', () => {
  if (!data) return
  const blob = new Blob([JSON.stringify(state(), null, 2) + '\n'], { type: 'application/json' }), a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = `${board.id}.json`; a.click(); URL.revokeObjectURL(a.href)
})
el('import').addEventListener('click', () => el<HTMLInputElement>('import-file').click())
el<HTMLInputElement>('import-file').addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !data) return
  try {
    const parsed = parseBoard(JSON.parse(await file.text()) as unknown, board.id)
    if (confirm(`Replace ${board.title} with ${file.name}? You can undo it.`)) await save({ ...parsed, revision: state().revision })
  } catch (error) { notice(error instanceof Error ? error.message : 'Import failed') }
  ;(event.target as HTMLInputElement).value = ''
})
load().then(() => render()).catch((error: unknown) => notice(error instanceof Error ? error.message : 'Could not open the board'))
