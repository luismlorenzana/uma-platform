import { ENEMY_BUCKETS, ENEMY_TIERS, FRANCHISES, emptyEnemyRankings, enemyAssignment, exportEnemyPlan, moveEnemy, orderedEnemies, parseEnemyCatalog, parseEnemyRankings, type Enemy, type EnemyBucket, type EnemyCatalog, type EnemyImage, type EnemyRanking, type EnemyRankings, type EnemyTier } from './enemy-model.js'

function el<T extends HTMLElement>(id: string): T { const n = document.getElementById(id); if (!n) throw new Error(`Missing ${id}`); return n as T }
const esc = (v: string | number): string => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const franchiseLabel = (v: string): string => FRANCHISES.find(f => f.id === v)?.label ?? v
const sourceLabel = (v: string): string => ({ regular: 'Regular', key: 'Key enemy', subboss: 'Sub-boss', boss: 'Boss' })[v] ?? v
const imageUrl = (path: string): string => '/enemy-assets/' + path
let catalog: EnemyCatalog = { schemaVersion: 1, sourceVersion: '', sources: [], importedAt: '', units: [] }
let state = emptyEnemyRankings(), ready = false, busy = false
let selected: string | null = null, source: EnemyImage = 'art', albumLimit = 36
let undo: { rankings: EnemyRanking[]; id: string | null } | null = null
const search = el<HTMLInputElement>('search'), franchise = el<HTMLSelectElement>('franchise-filter'), bucket = el<HTMLSelectElement>('bucket-filter'), tier = el<HTMLSelectElement>('tier-filter'), original = el<HTMLSelectElement>('source-filter'), study = el<HTMLInputElement>('study-only')
const controls = [search, franchise, bucket, tier, original, study, el<HTMLInputElement>('auto-next')]
const current = (): Enemy | undefined => catalog.units.find(u => u.id === selected)
const assignment = (u: Enemy): EnemyRanking => enemyAssignment(u, state)
function visible(): Enemy[] {
  const term = search.value.trim().toLocaleLowerCase()
  return catalog.units.filter(u => (franchise.value === 'all' || u.franchise === franchise.value) &&
    (bucket.value === 'all' || assignment(u).bucket === bucket.value) && (original.value === 'all' || u.sourceTier === original.value) &&
    (!study.checked || u.studyAvailable) && `${u.name} ${u.id}`.toLocaleLowerCase().includes(term))
}
function reviewQueue(): Enemy[] { return visible().filter(u => tier.value === 'all' || (tier.value === 'unranked' ? !assignment(u).tier : assignment(u).tier === tier.value)) }
function notice(text: string | null): void { el('notice').textContent = text; el('notice').hidden = text === null }
async function api(path: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(path, init), body = await r.json() as unknown
  if (!r.ok) throw new Error(typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : `Request failed (${r.status})`)
  return body
}
function face(u: Enemy): string { return `<span class="fallback">${esc(u.name.charAt(0))}</span>${u.images.face ? `<img src="${esc(imageUrl(u.images.face))}" alt="" loading="lazy">` : ''}` }
function selection(): { u: Enemy; r: EnemyRanking } | null { const u = current(); return u ? { u, r: assignment(u) } : null }
function noteDirty(): boolean { const s = selection(); return !!s && el<HTMLTextAreaElement>('note').value !== s.r.note }
function render(): void {
  const shown = visible(), rows = reviewQueue(), s = selection(), ranked = orderedEnemies(state).length
  el('ranked-count').textContent = String(ranked)
  el('progress-copy').textContent = `${catalog.units.length} enemies · ${catalog.units.length - ranked} still to rank`
  const p = el<HTMLProgressElement>('progress'); p.value = ranked; p.max = catalog.units.length || 1
  el('save-status').textContent = busy ? 'Saving to JSON…' : state.updatedAt ? '✓ Saved to JSON' : 'Ready · saves with your first pick'
  for (const c of controls) c.disabled = busy || !ready
  for (const id of ['import', 'export']) el<HTMLButtonElement>(id).disabled = busy || !ready
  el<HTMLButtonElement>('undo').disabled = busy || !undo
  el<HTMLButtonElement>('unrank').disabled = busy || !s?.r.tier
  for (const id of ['previous', 'next']) el<HTMLButtonElement>(id).disabled = busy || rows.length < 2
  el('queue-position').textContent = s ? `${rows.findIndex(u => u.id === s.u.id) + 1} / ${rows.length}` : `${rows.length} in queue`
  el('bucket-buttons').innerHTML = ENEMY_BUCKETS.map(b => `<button data-bucket="${b.id}" class="bucket-choice ${s?.r.bucket === b.id ? 'chosen' : ''}" aria-pressed="${s?.r.bucket === b.id}" ${busy || !s ? 'disabled' : ''}>${b.label}</button>`).join('')
  el('tier-buttons').innerHTML = ENEMY_TIERS.map((t, i) => `<button data-tier="${t.id}" class="tier-choice tier-${t.id} ${s?.r.tier === t.id ? 'chosen' : ''}" aria-pressed="${s?.r.tier === t.id}" ${busy || !s ? 'disabled' : ''}><span class="tier-badge">${t.id}</span><span class="tier-copy"><strong>${t.label}</strong><span>${t.description}</span></span><kbd>${i + 1}</kbd><span>${s?.r.tier === t.id ? '✓' : '↗'}</span></button>`).join('')
  const note = el<HTMLTextAreaElement>('note'); note.disabled = busy || !s; note.value = s?.r.note ?? ''
  el<HTMLButtonElement>('save-note').disabled = busy || !s
  el('note-status').textContent = ''
  if (s) {
    const { u, r } = s, mode = u.images[source] ? source : u.images.art ? 'art' : 'face', path = u.images[mode]
    el('review-card').innerHTML = `<div class="portrait-stage ${u.franchise}"><div class="portrait-meta"><span>${esc(franchiseLabel(u.franchise))}</span>${u.studyAvailable ? '<span class="study-tag">Study available</span>' : ''}</div>${path ? `<button class="reference-open" aria-label="Enlarge original reference"><img src="${esc(imageUrl(path))}" alt="${esc(u.name)} original ${mode === 'art' ? 'battle portrait' : mode}" fetchpriority="high"></button>` : '<div class="missing-art">Reference artwork unavailable</div>'}<span class="reference-caption">ORIGINAL REFERENCE · ${mode === 'art' ? 'BATTLE PORTRAIT' : mode.toUpperCase()}</span>${r.tier ? `<span class="current-rank tier-${r.tier}">TIER ${r.tier}</span>` : ''}</div><div class="reference-tabs">${(['art', 'splash', 'face'] as const).filter(k => u.images[k]).map(k => `<button data-source="${k}" aria-pressed="${mode === k}" ${mode === k ? 'class="active"' : ''}>${k === 'art' ? 'Portrait' : k === 'splash' ? 'Splash art' : 'Face'}</button>`).join('')}</div><div class="profile-copy"><p class="identity-id">${esc(u.id)}</p><h3>${esc(u.name)}</h3><p class="source-meta">Original game category: <strong>${esc(sourceLabel(u.sourceTier))}</strong><span>Authoring as: <strong>${ENEMY_BUCKETS.find(b => b.id === r.bucket)!.label}</strong></span></p></div>`
  } else {
    el('review-card').innerHTML = `<div class="empty-review"><span aria-hidden="true">✳</span><h3>${!catalog.units.length ? 'Your enemy catalog goes here.' : ranked === catalog.units.length ? 'Your cast is sorted.' : 'Nothing in this queue.'}</h3><p>${!catalog.units.length ? 'Add the private catalog and original release images in content/authoring/enemies, then restart the Studio.' : 'Change the filters to revisit your picks, or export the full authoring plan.'}</p></div>`
  }
  const rankedShown = shown.filter(u => assignment(u).tier)
  el('board-count').textContent = `${rankedShown.length} ranked / ${shown.length} visible`
  const order = new Map(orderedEnemies(state).map((r, i) => [r.enemyId, i + 1]))
  el('board').innerHTML = `<caption class="sr-only">Authoring tiers by enemy role</caption><thead><tr><th scope="col">PRIORITY</th>${ENEMY_BUCKETS.map(b => `<th scope="col"><span>${b.label}</span><small>${b.description}</small></th>`).join('')}</tr></thead><tbody>${ENEMY_TIERS.map(t => `<tr><th scope="row" class="tier-label tier-${t.id}"><strong>${t.id}</strong><span>${t.label}</span><small>${rankedShown.filter(u => assignment(u).tier === t.id).length} enemies</small></th>${ENEMY_BUCKETS.map(b => {
    const members = rankedShown.filter(u => assignment(u).tier === t.id && assignment(u).bucket === b.id).sort((a, z) => (order.get(a.id) ?? 0) - (order.get(z.id) ?? 0))
    return `<td><span class="cell-count">${members.length || '—'}</span><div class="face-grid">${members.map(u => `<button data-enemy="${esc(u.id)}" class="face ${u.id === selected ? 'selected' : ''} ${u.franchise}" aria-label="Review ${esc(u.name)}, ${t.id}, ${b.label}" title="#${order.get(u.id)} · ${esc(u.name)} · ${franchiseLabel(u.franchise)}">${face(u)}<span class="face-order">${order.get(u.id)}</span></button>`).join('')}</div></td>`
  }).join('')}</tr>`).join('')}</tbody>`
  const ids = new Set(shown.map(u => u.id)), byId = new Map(catalog.units.map(u => [u.id, u]))
  const ordered = orderedEnemies(state), list = ordered.filter(r => ids.has(r.enemyId))
  el('order-count').textContent = `${list.length} in view · ${ordered.length} total`
  el('order-list').innerHTML = list.length ? list.map(r => {
    const u = byId.get(r.enemyId)!, peers = ordered.filter(x => x.tier === r.tier), n = peers.findIndex(x => x.enemyId === r.enemyId)
    return `<article class="order-row"><span class="order-number">${order.get(u.id)}</span><button data-enemy="${esc(u.id)}" class="order-face">${face(u)}</button><div class="order-identity"><strong>${esc(u.name)}</strong><span>${franchiseLabel(u.franchise)} · ${esc(u.id)}</span></div><span class="order-tier tier-${r.tier}">${r.tier}</span><span class="order-role">${ENEMY_BUCKETS.find(b => b.id === r.bucket)!.label}</span><div class="order-controls"><button data-move="-1" data-id="${esc(u.id)}" aria-label="Move ${esc(u.name)} earlier in ${r.tier}" ${busy || n === 0 ? 'disabled' : ''}>↑</button><button data-move="1" data-id="${esc(u.id)}" aria-label="Move ${esc(u.name)} later in ${r.tier}" ${busy || n === peers.length - 1 ? 'disabled' : ''}>↓</button></div></article>`
  }).join('') : '<p class="empty-order">Pick a tier above. Your authoring queue will take shape here.</p>'
  renderAlbum(shown)
  document.querySelectorAll<HTMLImageElement>('img').forEach(img => img.addEventListener('error', () => { img.hidden = true; img.parentElement?.classList.add('image-error') }, { once: true }))
}
function renderAlbum(shown: Enemy[]): void {
  el('album-count').textContent = `· ${shown.length} references`
  el('album').innerHTML = shown.slice(0, albumLimit).map(u => `<button data-enemy="${esc(u.id)}" class="album-card ${u.id === selected ? 'selected' : ''}"><span class="album-face">${face(u)}</span><strong>${esc(u.name)}</strong><small>${franchiseLabel(u.franchise)} · ${assignment(u).tier ?? 'Unranked'}</small></button>`).join('')
  el<HTMLButtonElement>('more').hidden = shown.length <= albumLimit
}
async function persist(next: EnemyRankings): Promise<boolean> {
  notice(null); busy = true; render()
  try { state = parseEnemyRankings(await api('/api/enemies/rankings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) })); return true }
  catch (error) { notice(`${error instanceof Error ? error.message : 'Save failed.'} Your last saved plan is unchanged. Reload to fetch the latest board.`); return false }
  finally { busy = false; render() }
}
async function change(row: EnemyRanking): Promise<boolean> {
  const before = { rankings: state.rankings.map(r => ({ ...r })), id: selected }
  const rankings = [...state.rankings], index = rankings.findIndex(r => r.enemyId === row.enemyId)
  if (index < 0) rankings.push(row)
  else if (rankings[index]?.tier !== row.tier && row.tier !== null) { rankings.splice(index, 1); rankings.push(row) }
  else rankings[index] = row
  if (!await persist({ ...state, rankings })) return false
  undo = before; render(); return true
}
async function flushNote(): Promise<boolean> {
  const s = selection(); if (!s || !noteDirty()) return true
  return change({ ...s.r, note: el<HTMLTextAreaElement>('note').value })
}
async function assignTier(value: EnemyTier | null): Promise<void> {
  const s = selection(); if (!s || busy || !ready) return
  const before = reviewQueue(), index = before.findIndex(u => u.id === s.u.id)
  if (!await change({ ...s.r, tier: value, note: el<HTMLTextAreaElement>('note').value })) return
  if (el<HTMLInputElement>('auto-next').checked && value !== null) {
    const after = reviewQueue()
    selected = after.find(u => u.id === before[index + 1]?.id)?.id ?? after[Math.min(index, after.length - 1)]?.id ?? null
    if (selected === s.u.id && after.length > 1) selected = after[(after.findIndex(u => u.id === s.u.id) + 1) % after.length]?.id ?? null
  } else if (!reviewQueue().some(u => u.id === s.u.id)) tier.value = 'all'
  source = 'art'; render()
}
async function browse(direction: -1 | 1): Promise<void> {
  if (busy || !await flushNote()) return
  const rows = reviewQueue(), index = rows.findIndex(u => u.id === selected)
  selected = rows[(index + direction + rows.length) % rows.length]?.id ?? null; source = 'art'; render()
}
async function choose(id: string): Promise<void> {
  if (busy || !await flushNote()) return
  if (!reviewQueue().some(u => u.id === id)) tier.value = 'all'
  selected = id; source = 'art'; render(); el('review-card').scrollIntoView({ behavior: 'smooth', block: 'center' })
}
for (const f of FRANCHISES) franchise.add(new Option(f.label, f.id))
for (const b of ENEMY_BUCKETS) bucket.add(new Option(b.label, b.id))
for (const t of ENEMY_TIERS) tier.add(new Option(`Tier ${t.id}`, t.id))
for (const c of controls.filter(c => c.id !== 'auto-next')) c.addEventListener(c === search ? 'input' : 'change', () => { void (async () => {
  if (busy || !await flushNote()) return
  selected = reviewQueue()[0]?.id ?? null; source = 'art'; albumLimit = 36; render()
})() })
el('tier-buttons').addEventListener('click', event => { const t = (event.target as HTMLElement).closest<HTMLElement>('[data-tier]')?.dataset.tier; const found = ENEMY_TIERS.find(x => x.id === t); if (found) void assignTier(found.id) })
el('bucket-buttons').addEventListener('click', event => { const id = (event.target as HTMLElement).closest<HTMLElement>('[data-bucket]')?.dataset.bucket; const b = ENEMY_BUCKETS.find(x => x.id === id), s = selection(); if (b && s && !busy) void (async () => { if (await change({ ...s.r, bucket: b.id as EnemyBucket, note: el<HTMLTextAreaElement>('note').value })) { if (!visible().some(u => u.id === s.u.id)) bucket.value = 'all'; render() } })() })
el('unrank').addEventListener('click', () => { void assignTier(null) })
el('previous').addEventListener('click', () => { void browse(-1) }); el('next').addEventListener('click', () => { void browse(1) })
el('save-note').addEventListener('click', () => { if (!busy) void flushNote() })
el('note').addEventListener('input', () => { el('note-status').textContent = noteDirty() ? 'Unsaved · also saved when ranking or browsing' : '' })
el('undo').addEventListener('click', () => { void (async () => { if (!undo || busy) return; const previous = undo; if (await persist({ ...state, rankings: previous.rankings })) { undo = null; tier.value = 'all'; bucket.value = 'all'; selected = catalog.units.some(u => u.id === previous.id) ? previous.id : reviewQueue()[0]?.id ?? null; render() } })() })
document.addEventListener('click', event => {
  const target = event.target as HTMLElement, enemy = target.closest<HTMLElement>('[data-enemy]')?.dataset.enemy
  if (enemy) { void choose(enemy); return }
  const move = target.closest<HTMLElement>('[data-move]')
  if (move?.dataset.id && !busy) { void (async () => { if (!await flushNote()) return; const before = { rankings: state.rankings.map(r => ({ ...r })), id: selected }; if (await persist(moveEnemy(state, move.dataset.id!, move.dataset.move === '-1' ? -1 : 1))) { undo = before; render() } })(); return }
  const mode = target.closest<HTMLElement>('[data-source]')?.dataset.source
  if (mode && ['art', 'face', 'splash'].includes(mode)) { void (async () => { if (busy || !await flushNote()) return; source = mode as EnemyImage; render() })(); return }
  if (target.closest('.reference-open')) {
    const u = current(), path = u?.images[source] ?? u?.images.art ?? u?.images.face
    if (u && path) { el('large-reference').innerHTML = `<img src="${esc(imageUrl(path))}" alt="${esc(u.name)} original reference"><p>${esc(u.name)} · ${esc(u.id)}</p>`; el<HTMLDialogElement>('reference-dialog').showModal() }
  }
})
el('close-reference').addEventListener('click', () => el<HTMLDialogElement>('reference-dialog').close())
el('more').addEventListener('click', () => { albumLimit += 60; renderAlbum(visible()) })
el('export').addEventListener('click', () => { void (async () => {
  if (busy || !await flushNote()) return
  const plan = exportEnemyPlan(catalog, state), url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2) + '\n'], { type: 'application/json' })), a = document.createElement('a')
  a.href = url; a.download = 'enemy-authoring-plan.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
})() })
const input = el<HTMLInputElement>('import-file')
el('import').addEventListener('click', () => input.click())
input.addEventListener('change', () => { void (async () => {
  const f = input.files?.[0]; input.value = ''; if (!f || busy) return
  try {
    if (f.size > 1_000_000) throw new Error('Import is too large (1 MB maximum).')
    const imported = parseEnemyRankings(JSON.parse(await f.text()) as unknown)
    const known = new Set(catalog.units.map(u => u.id)); if (imported.rankings.some(r => !known.has(r.enemyId))) throw new Error('The import contains IDs outside this catalog.')
    if (!window.confirm(`Replace this enemy board with ${orderedEnemies(imported).length} imported ranks? The current catalog and artwork stay unchanged. Undo can restore this board.`)) return
    const before = { rankings: state.rankings.map(r => ({ ...r })), id: selected }
    if (await persist({ ...imported, revision: state.revision })) { undo = before; selected = reviewQueue()[0]?.id ?? null; render() }
  } catch (error) { notice(error instanceof Error ? error.message : 'Could not import the plan.') }
})() })
document.addEventListener('keydown', event => {
  if (!ready || busy || el<HTMLDialogElement>('reference-dialog').open || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,button,[contenteditable]'))) return
  const t = ENEMY_TIERS[Number(event.key) - 1]
  if (t) { event.preventDefault(); void assignTier(t.id) }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); void browse(event.key === 'ArrowLeft' ? -1 : 1) }
})
window.addEventListener('beforeunload', event => { if (noteDirty()) event.preventDefault() })
void (async () => {
  try {
    const loaded = await Promise.all([api('/api/enemies/catalog'), api('/api/enemies/rankings')])
    catalog = parseEnemyCatalog(loaded[0]); state = parseEnemyRankings(loaded[1]); ready = true; selected = reviewQueue()[0]?.id ?? null; render()
  } catch (error) { notice(error instanceof Error ? error.message : 'Could not open the enemy board.'); el('save-status').textContent = 'Board unavailable · reload to try again' }
})()
