import { bestStyles, BUCKETS, emptyRankings, parseRankings, STYLES, TIERS, type Catalog, type Ranking, type Rankings, type Tier, type Uma } from './model.js'

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing element ${id}`)
  return node as T
}
const escape = (value: string | number): string => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const search = element<HTMLInputElement>('search')
const bucketFilter = element<HTMLSelectElement>('bucket-filter')
const queueFilter = element<HTMLSelectElement>('queue-filter')
const originals = element<HTMLInputElement>('original-only')
let catalog: Catalog = { release: '', umas: [] }
let state: Rankings = emptyRankings()
let selected: number | null = null
let busy = false
let ready = false
let previousAction: { id: number; row: Ranking | undefined } | null = null

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status})`)
  return result
}
const rankOf = (id: number): Ranking | undefined => state.rankings.find((row) => row.outfitId === id)
const current = (): Uma | undefined => catalog.umas.find((uma) => uma.id === selected)

function visible(): Uma[] {
  const term = search.value.trim().toLocaleLowerCase()
  return catalog.umas.filter((uma) => (!originals.checked || uma.original) &&
    (bucketFilter.value === 'all' || uma.bucket === bucketFilter.value) &&
    `${uma.name} ${uma.title} ${uma.id}`.toLocaleLowerCase().includes(term))
}
function queue(): Uma[] {
  return visible().filter((uma) => {
    const row = rankOf(uma.id)
    return queueFilter.value === 'all' || (queueFilter.value === 'unranked' ? !row : row?.tier === queueFilter.value)
  })
}
function notice(message: string | null): void {
  const box = element('notice')
  box.textContent = message
  box.hidden = message === null
}
function image(uma: Uma, small = false): string {
  const src = small ? uma.face : uma.portrait
  return `<span class="image-fallback">${escape(uma.name.charAt(0))}</span>${src ? `<img src="${escape(src)}" alt="${escape(small ? '' : `${uma.name}, ${uma.title}`)}" ${small ? 'loading="lazy"' : 'fetchpriority="high"'}>` : ''}`
}
function render(): void {
  const rows = queue()
  const shown = visible()
  const uma = current()
  const knownIds = new Set(catalog.umas.map((entry) => entry.id))
  const ranked = state.rankings.filter((row) => knownIds.has(row.outfitId)).length
  const missing = state.rankings.length - ranked
  element('ranked-count').textContent = `${ranked}`
  element('progress-copy').textContent = `of ${catalog.umas.length} outfits · ${catalog.umas.length - ranked} still to sort`
  const progress = element<HTMLProgressElement>('progress')
  progress.value = ranked; progress.max = catalog.umas.length || 1
  const saving = element('save-status')
  saving.textContent = busy ? 'Saving to JSON…' : state.updatedAt ? '✓ Saved to JSON' : 'Ready · saves with your first pick'
  element('queue-position').textContent = uma ? `${Math.max(0, rows.findIndex((row) => row.id === uma.id)) + 1} / ${rows.length}` : `${rows.length} in queue`
  for (const id of ['previous', 'next']) element<HTMLButtonElement>(id).disabled = busy || rows.length < 2
  for (const filter of [search, bucketFilter, queueFilter, originals, element<HTMLInputElement>('auto-next')]) filter.disabled = busy
  element<HTMLButtonElement>('unrank').disabled = busy || !uma || !rankOf(uma.id)
  element<HTMLButtonElement>('undo').disabled = busy || !previousAction
  element<HTMLButtonElement>('import').disabled = busy || !ready
  element<HTMLButtonElement>('export').disabled = busy || !ready
  const currentTier = uma ? rankOf(uma.id)?.tier : undefined
  element('tier-buttons').innerHTML = TIERS.map((tier, index) => `<button class="tier-choice tier-${tier.id} ${currentTier === tier.id ? 'chosen' : ''}" data-tier="${tier.id}" aria-pressed="${currentTier === tier.id}" ${busy || !uma ? 'disabled' : ''}><span class="tier-badge">${tier.id}</span><span class="tier-copy"><strong>${tier.label}</strong><span>${tier.description}</span></span><kbd>${index + 1}</kbd><span class="choice-arrow" aria-hidden="true">${currentTier === tier.id ? '✓' : '↗'}</span></button>`).join('')
  if (uma) {
    const bucket = BUCKETS.find((entry) => entry.id === uma.bucket)!
    const best = bestStyles(uma.strategy)
    element('review-card').innerHTML = `<div class="portrait-stage"><span class="outfit-number">NO. ${uma.id}</span><span class="portrait-flower" aria-hidden="true">✳</span><div class="portrait">${image(uma)}</div><span class="outfit-kind">${uma.original ? 'ORIGINAL OUTFIT' : 'VARIANT OUTFIT'}</span>${currentTier ? `<span class="current-rank tier-${currentTier}">TIER ${currentTier}</span>` : ''}</div><div class="profile-copy"><span class="bucket-tag" title="${escape(bucket.rule)}">${escape(bucket.label)} <span> / ${bucket.calling}</span></span><h3>${escape(uma.name)}</h3><p class="outfit-title">${escape(uma.title)}</p><div class="aptitudes" aria-label="Running style aptitudes">${STYLES.map((style) => `<span class="aptitude ${best.includes(style) ? 'best' : ''}"><span>${style.charAt(0).toUpperCase() + style.slice(1)}</span><strong>${uma.strategy[style]}</strong></span>`).join('')}</div><p class="aptitude-caption">Highlighted grades decide her bucket.</p></div>`
  } else {
    const complete = ranked === catalog.umas.length && catalog.umas.length > 0
    element('review-card').innerHTML = `<div class="empty-review"><span aria-hidden="true">${complete ? '✳' : '○'}</span><h3>${complete ? 'Your cast is sorted.' : 'Nothing in this queue.'}</h3><p>${complete ? 'Revisit a portrait below, or export your authoring plan.' : 'Try another filter, or switch to All outfits to revisit your picks.'}</p></div>`
  }
  const shownIds = new Set(shown.map((entry) => entry.id))
  const count = state.rankings.filter((row) => shownIds.has(row.outfitId)).length
  element('board-count').textContent = `${count} sorted / ${shown.length} visible${missing ? ` · ${missing} unavailable IDs kept in JSON` : ''}`
  element('board').innerHTML = `<caption class="sr-only">Authoring tiers by running-style aptitude bucket</caption><thead><tr><th scope="col" class="tier-heading">AUTHORING TIER</th>${BUCKETS.map((bucket) => {
    const inBucket = shown.filter((entry) => entry.bucket === bucket.id)
    const sorted = inBucket.filter((entry) => rankOf(entry.id)).length
    return `<th scope="col"><span class="column-title">${escape(bucket.label)}</span><span class="column-subtitle">${bucket.calling} <span>${sorted} / ${inBucket.length}</span></span></th>`
  }).join('')}</tr></thead><tbody>${TIERS.map((tier) => {
    const members = shown.filter((entry) => rankOf(entry.id)?.tier === tier.id)
    return `<tr><th scope="row" class="tier-label tier-${tier.id}"><span class="tier-row-top"><strong>${tier.id}</strong><span>${members.length}</span></span><span>${tier.label}</span></th>${BUCKETS.map((bucket) => {
      const entries = members.filter((entry) => entry.bucket === bucket.id)
      return `<td><div class="cell-top"><span>${entries.length ? `${entries.length} ${entries.length === 1 ? 'outfit' : 'outfits'}` : '—'}</span></div><div class="face-grid">${entries.map((entry) => `<button class="face ${selected === entry.id ? 'selected' : ''}" data-uma="${entry.id}" aria-label="Review ${escape(entry.name)}, ${escape(entry.title)}, tier ${tier.id}" title="${escape(entry.name)} · ${escape(entry.title)}">${image(entry, true)}</button>`).join('')}</div></td>`
    }).join('')}</tr>`
  }).join('')}</tbody>`
  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => img.addEventListener('error', () => { img.hidden = true }, { once: true }))
}

function setBusy(value: boolean): void { busy = value; render() }
async function persist(next: Rankings): Promise<boolean> {
  notice(null)
  setBusy(true)
  try {
    state = parseRankings(await api('/api/rankings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) }))
    return true
  } catch (error) {
    notice(`${error instanceof Error ? error.message : 'Save failed.'} Your last saved board is unchanged. Export it before reloading if needed.`)
    return false
  } finally { setBusy(false) }
}
async function assign(tier: Tier | null): Promise<void> {
  const uma = current()
  if (!uma || busy || !ready) return
  const old = rankOf(uma.id)
  const before = queue()
  const index = before.findIndex((entry) => entry.id === uma.id)
  const rankings = state.rankings.filter((entry) => entry.outfitId !== uma.id)
  if (tier) rankings.push({ outfitId: uma.id, characterId: uma.characterId, tier, bucket: uma.bucket })
  if (!await persist({ ...state, rankings })) return
  previousAction = { id: uma.id, row: old }
  if (element<HTMLInputElement>('auto-next').checked) {
    const after = queue()
    selected = after.find((entry) => entry.id === before[index + 1]?.id)?.id ?? after[Math.min(Math.max(0, index), after.length - 1)]?.id ?? null
    // In a queue that still contains this Uma, move forward instead of displaying her twice.
    if (selected === uma.id && after.length > 1) selected = after[(after.findIndex((entry) => entry.id === uma.id) + 1) % after.length]?.id ?? null
  } else if (!queue().some((entry) => entry.id === uma.id)) {
    queueFilter.value = 'all'
  }
  render()
}
function move(direction: number): void {
  if (busy) return
  const rows = queue()
  const index = rows.findIndex((entry) => entry.id === selected)
  selected = rows[(index + direction + rows.length) % rows.length]?.id ?? null
  render()
}
function filterChanged(): void {
  selected = queue()[0]?.id ?? null
  render()
}

for (const bucket of BUCKETS) bucketFilter.add(new Option(bucket.label, bucket.id))
for (const tier of TIERS) queueFilter.add(new Option(`Tier ${tier.id}`, tier.id))
for (const filter of [search, bucketFilter, queueFilter, originals]) filter.addEventListener(filter === search ? 'input' : 'change', filterChanged)
element('previous').addEventListener('click', () => move(-1))
element('next').addEventListener('click', () => move(1))
element('tier-buttons').addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tier]')
  const tier = TIERS.find((entry) => entry.id === target?.dataset.tier)
  if (tier) void assign(tier.id)
})
element('unrank').addEventListener('click', () => { void assign(null) })
element('undo').addEventListener('click', () => {
  void (async () => {
    if (!previousAction || busy) return
    const action = previousAction
    const rankings = state.rankings.filter((row) => row.outfitId !== action.id)
    if (action.row) rankings.push(action.row)
    if (await persist({ ...state, rankings })) {
      previousAction = null
      queueFilter.value = 'all'
      selected = queue().find((entry) => entry.id === action.id)?.id ?? queue()[0]?.id ?? null
      render()
    }
  })()
})
element('board').addEventListener('click', (event) => {
  if (busy) return
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-uma]')
  if (!target) return
  selected = Number(target.dataset.uma)
  queueFilter.value = 'all'
  render()
  element('review-card').scrollIntoView({ behavior: 'smooth', block: 'center' })
})
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest('input,select,textarea,button,[contenteditable]'))) return
  const tier = TIERS[Number(event.key) - 1]
  if (tier) { event.preventDefault(); void assign(tier.id) }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1) }
})
element('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(state, null, 2)}\n`], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url; link.download = `uma-sprite-rankings-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
const fileInput = element<HTMLInputElement>('import-file')
element('import').addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  void (async () => {
    const file = fileInput.files?.[0]
    fileInput.value = ''
    if (!file || busy) return
    try {
      if (file.size > 1_000_000) throw new Error('JSON file is too large (limit 1 MB).')
      const imported = parseRankings(JSON.parse(await file.text()) as unknown)
      if (!window.confirm(`Replace this board with ${imported.rankings.length} imported rankings? Export your current board first if you need a backup.`)) return
      if (await persist({ ...imported, revision: state.revision })) {
        previousAction = null
        selected = queue()[0]?.id ?? null
        render()
      }
    } catch (error) { notice(error instanceof Error ? error.message : 'Could not import the JSON file.') }
  })()
})

async function start(): Promise<void> {
  try {
    const loaded = await Promise.all([api<Catalog>('/api/catalog'), api<Rankings>('/api/rankings')])
    catalog = loaded[0]; state = parseRankings(loaded[1]); ready = true
    selected = queue()[0]?.id ?? null
    render()
  } catch (error) {
    notice(error instanceof Error ? error.message : 'Could not open the board.')
    element('save-status').textContent = 'Board unavailable · reload to try again'
  }
}
void start()
