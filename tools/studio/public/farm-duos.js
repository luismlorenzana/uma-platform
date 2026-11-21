const api = '/api/farm-duos'
const $ = id => document.getElementById(id)
const editor = $('duo-editor')
const saveButton = $('save-duos')
const errorLine = $('duo-error')
const roster = new Map()
const pairInfo = new Map()
let model
let draft
let selected
let saving = false

function element(tag, text, className) {
  const node = document.createElement(tag)
  if (text) node.textContent = text
  if (className) node.className = className
  return node
}

function button(label, action) {
  const node = element('button', label)
  node.type = 'button'
  node.addEventListener('click', action)
  return node
}

function person(uma, tag = 'div') {
  const node = element(tag, '', 'duo-person')
  const face = uma.face ? element('img', '', 'duo-face') : element('span', uma.name.charAt(0), 'duo-face')
  if (uma.face) {
    face.src = uma.face
    face.loading = 'lazy'
    face.alt = ''
  } else face.setAttribute('aria-hidden', 'true')
  node.append(face, element('strong', uma.name))
  return node
}

function partners(id) {
  return draft.filter(pair => pair.includes(id)).map(pair => pair.find(other => other !== id))
}

function pairKey(a, b) {
  return [a, b].sort().join(':')
}

function info(a, b) {
  return pairInfo.get(pairKey(a, b)) ?? { scenes: [], scripted: false }
}

function matches(uma, query) {
  return uma.name.toLocaleLowerCase().includes(query) || uma.id.includes(query)
}

function dirty() {
  const original = new Set(model.duos.map(([a, b]) => pairKey(a, b)))
  return original.size !== draft.length || draft.some(([a, b]) => !original.has(pairKey(a, b)))
}

function status(message) {
  $('duo-status').textContent = message
}

function showError(message) {
  errorLine.textContent = message
  errorLine.hidden = !message
}

function renderRoster() {
  const query = $('roster-search').value.trim().toLocaleLowerCase()
  const list = $('duo-roster-list')
  const rows = [...roster.values()]
    .filter(uma => matches(uma, query))
    .map(uma => ({ uma, filled: partners(uma.id).length }))
    .sort((a, b) => a.filled - b.filled)
  const items = rows.map(({ uma, filled }) => {
    const node = person(uma, 'button')
    node.type = 'button'
    node.dataset.uma = uma.id
    node.setAttribute('aria-pressed', String(uma.id === selected))
    node.append(element('small', `${filled}/${model.maxPartners}`))
    node.addEventListener('click', () => {
      selected = uma.id
      $('candidate-search').value = ''
      render()
      list.querySelector(`[data-uma="${uma.id}"]`)?.focus({ preventScroll: true })
    })
    return node
  })
  list.replaceChildren(...(items.length ? items : [element('p', 'No matching Umas.', 'duo-note')]))
}

function renderSlots() {
  const current = partners(selected)
  const slots = Array.from({ length: model.maxPartners }, (_, i) => {
    const partner = roster.get(current[i])
    if (!partner) return element('li', 'Open slot', 'duo-slot empty')
    const tile = element('li', '', 'duo-slot')
    tile.append(person(partner))
    if (info(selected, partner.id).scripted) {
      tile.append(element('small', 'Visit script attached', 'duo-note'))
    } else {
      const remove = button('Remove', () => {
        draft = draft.filter(pair => !(pair.includes(selected) && pair.includes(partner.id)))
        render()
      })
      remove.setAttribute('aria-label', `Remove ${partner.name}`)
      tile.append(remove)
    }
    return tile
  })
  $('duo-slots').replaceChildren(...slots)
}

function renderCandidates() {
  const search = $('candidate-search').value.trim().toLocaleLowerCase()
  const current = partners(selected)
  const withScenes = $('duo-with-scenes').checked
  const rows = [...roster.values()]
    .filter(uma => uma.id !== selected && !current.includes(uma.id) && matches(uma, search))
    .map(uma => ({ uma, filled: partners(uma.id).length, ...info(selected, uma.id) }))
    .filter(row => !withScenes || row.scenes.length)
    .sort((a, b) => a.filled - b.filled || b.scenes.length - a.scenes.length || a.uma.name.localeCompare(b.uma.name))
  $('duo-candidates').replaceChildren(...rows.map(({ uma, filled, scenes, scripted }) => {
    const card = element('li', '', 'duo-candidate')
    const line = element('div')
    const add = button('Add duo', () => {
      draft = [...draft, [selected, uma.id]]
      render()
    })
    add.setAttribute('aria-label', `Add ${uma.name}`)
    add.disabled = current.length >= model.maxPartners || filled >= model.maxPartners
    line.append(person(uma), add)
    card.append(line, element('p', `${filled}/${model.maxPartners} partners · ${scenes.length} bond scene${scenes.length === 1 ? '' : 's'}${scripted ? ' · Visit script' : ''}`))
    if (scenes.length) {
      const details = element('details')
      const levels = element('ol')
      for (const scene of scenes) {
        const item = element('li')
        item.append(element('strong', `Bond ${scene.hearts}${scene.place ? ' · ' + scene.place.replaceAll('-', ' ') : ''}`))
        if (scene.opening) item.append(element('p', scene.opening))
        levels.append(item)
      }
      details.append(element('summary', 'Preview bond scenes'), levels)
      card.append(details)
    }
    return card
  }))
  if (!rows.length) {
    $('duo-candidates').append(element('li', withScenes ? 'No matching partners with authored scenes. Clear the filter to see the full cast.' : 'No matching partners.', 'duo-note'))
  }
}

function render() {
  const pending = dirty()
  const scenePairs = Object.keys(model.scenes).length
  $('duo-total').textContent = `${roster.size} Umas · ${draft.length} duo${draft.length === 1 ? '' : 's'} · ${scenePairs} pair${scenePairs === 1 ? '' : 's'} with scenes`
  $('duo-character').replaceChildren(person(roster.get(selected)))
  renderRoster()
  renderSlots()
  renderCandidates()
  saveButton.disabled = saving || !pending
  status(pending ? 'Unsaved choices. Each duo uses one slot for both Umas.' : 'Changes save to the Farm story’s household.json.')
}

async function request(options) {
  const response = await fetch(api, options)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Farm Duos could not load.')
  return data
}

async function load() {
  model = await request()
  for (const uma of model.roster) roster.set(uma.id, uma)
  for (const key of new Set([...Object.keys(model.scenes), ...model.scripted])) {
    pairInfo.set(pairKey(...key.split(':')), { scenes: model.scenes[key] ?? [], scripted: model.scripted.includes(key) })
  }
  draft = model.duos
  selected = model.roster[0].id
  editor.hidden = false
  render()
}

async function save() {
  editor.disabled = saving = true
  saveButton.disabled = true
  showError('')
  status('Saving duo assignments…')
  try {
    const saved = await request({ method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stamp: model.stamp, duos: draft }) })
    model = { ...model, ...saved }
    draft = saved.duos
    status('Saved to household.json.')
  } catch (error) {
    showError(error.message)
    status('Your choices are still in this page.')
  } finally {
    editor.disabled = saving = false
    saveButton.disabled = !dirty()
  }
}

$('roster-search').addEventListener('input', renderRoster)
$('candidate-search').addEventListener('input', renderCandidates)
$('duo-with-scenes').addEventListener('change', renderCandidates)
saveButton.addEventListener('click', save)
window.addEventListener('beforeunload', event => {
  if (model && dirty()) event.preventDefault()
})
void load().catch(error => {
  status('')
  showError(error.message)
})
