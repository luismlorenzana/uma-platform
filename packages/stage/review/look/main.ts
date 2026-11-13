// LK1's look slice (P157–P160): the look stage (src/look) with every layer switchable, the town square by day and the
// tavern at night, the camera families and device tiers, the look measures on the live frame against the owner's
// references, and a reference beside it. Local only: `pnpm look:pack`, then `pnpm --filter @luismlorenzana/uma-stage
// look` and http://127.0.0.1:4410 (`?scene=tavern`, `?camera=tactics`, `?tier=medium`, `?sprites=pixel`).
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SpriteSet } from '@luismlorenzana/uma-data'
import { measure, type LookMeasures } from '../../../../scripts/look/src/measure.js'
import { LOOK_SCENES, LookStage, parsePackIndex, RIM, TIERS, type CameraName, type LookAssets, type LookSceneId, type TierName } from '../../src/look/index.js'

declare const __REPO__: string
const fsUrl = (path: string) => '/@fs' + path.split('/').map((s) => encodeURIComponent(s)).join('/')
const privateUrl = (path: string) => fsUrl(`${__REPO__}/${path}`)

const params = new URLSearchParams(location.search)
const canvas = document.getElementById('c') as HTMLCanvasElement
const status = document.getElementById('status')!

/** The private files on this Mac: the pack (`pnpm look:pack`) and the local master data release. */
let fetched = 0
const get = async (path: string) => { const r = await fetch(privateUrl(path)); if (!r.ok) throw new Error(`${path}: ${r.status}`); const b = await r.arrayBuffer(); fetched += b.byteLength; return b }
const json = async (path: string) => JSON.parse(new TextDecoder().decode(await get(path))) as unknown
const assets: LookAssets = {
  index: async () => parsePackIndex(await json('content/authoring/look/pack/index.json')),
  kit: (path) => get(`content/authoring/look/pack/${path}`),
  async sprite(outfitId) {
    const manifest = (await json('content/release/manifest.json')) as { art: string }
    const art = (await json(`content/release/${manifest.art}`)) as { sprites?: Record<string, string> }
    const setPath = art.sprites?.[String(outfitId)]
    if (!setPath) return null
    const set = (await json(`content/release/${setPath}`)) as SpriteSet
    const pages = await Promise.all(set.pages.map(async (p) => {
      const bytes = await get(`content/release/${p.path}`)
      const img = new Image()
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }))
      // The load event, not decode(): a hidden page may defer decode() indefinitely.
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error(`sprite page ${outfitId}`)); img.src = url })
      return img
    }))
    return { set, pages }
  },
  bytes: () => fetched,
}

const stage = new LookStage({ canvas, assets, spritePixels: params.get('sprites') === 'pixel' ? 48 : null })
const controls = new OrbitControls(stage.camera, canvas)
controls.enabled = false
const sceneId: LookSceneId = params.get('scene') === 'tavern' ? 'tavern' : 'square'
const firstCamera = (['front', 'tactics', 'high'] as CameraName[]).find((c) => c === params.get('camera')) ?? 'front'
const firstTier = (Object.keys(TIERS) as TierName[]).find((t) => t === params.get('tier')) ?? 'high'
let dialogue = false

addEventListener('resize', () => stage.resize())
// H hides the panel, to judge the frame alone.
addEventListener('keydown', (e) => { if (e.key === 'h') { const p = document.getElementById('panel')!; p.style.display = p.style.display === 'none' ? '' : 'none' } })

// --- The panel: every layer switchable, so the owner sees what each adds -------------------------------------------
const panel = document.getElementById('panel')!
const apply = () => { stage.apply(); document.getElementById('dialogue')!.style.display = dialogue ? 'block' : 'none' }
function section(title: string): void { const h = document.createElement('h3'); h.textContent = title; panel.append(h) }
function toggle(label: string, get: () => boolean, set: (v: boolean) => void): void {
  const l = document.createElement('label'), i = document.createElement('input')
  i.type = 'checkbox'; i.checked = get(); i.onchange = () => { set(i.checked); apply() }
  l.append(label, i); panel.append(l)
}
function slider(label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void): void {
  const l = document.createElement('label'), i = document.createElement('input'), v = document.createElement('span')
  i.type = 'range'; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(get()); v.textContent = String(get())
  i.oninput = () => { set(Number(i.value)); v.textContent = i.value; apply() }
  l.append(label, v, i); panel.append(l)
}
function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button'); b.textContent = label; b.onclick = onClick; panel.append(b); return b
}
const reload = (key: string, value: string) => { params.set(key, value); location.search = params.toString() }

function buildPanel(): void {
  const { pixel, look, life, renderer } = stage
  section('Scene')
  for (const [id, title] of Object.entries(LOOK_SCENES)) button(title, () => reload('scene', id))
  section('Device tier')
  for (const name of Object.keys(TIERS) as TierName[]) button(TIERS[name].label, () => reload('tier', name))
  section('Camera family')
  for (const name of ['front', 'tactics', 'high'] as CameraName[]) button(stage.current?.cameras[name].label ?? name, () => { controls.enabled = false; stage.useCamera(name); apply() })
  section('Pixel scale')
  toggle('Kit textures on the pixel grid', () => pixel.on, (v) => { pixel.on = v })
  slider('Texels per texture', 16, 128, 8, () => pixel.texels, (v) => { pixel.texels = v })
  slider('Colour steps', 6, 64, 1, () => pixel.levels, (v) => { pixel.levels = v })
  toggle('Kit normal maps', () => pixel.normals, (v) => { pixel.normals = v })
  button(params.get('sprites') === 'pixel' ? 'Sprites: pixel pass (switch to ours)' : 'Sprites: ours (switch to pixel pass)', () => reload('sprites', params.get('sprites') === 'pixel' ? 'smooth' : 'pixel'))
  section('Light')
  toggle('Key shadows', () => life.shadows, (v) => { life.shadows = v })
  toggle('Ambient occlusion', () => look.ao, (v) => { look.ao = v })
  slider('Key strength', 0.2, 6, 0.1, () => stage.key.intensity, (v) => { stage.key.intensity = v })
  slider('Sky light', 0.1, 3, 0.05, () => stage.hemi.intensity, (v) => { stage.hemi.intensity = v })
  slider('Exposure', 0.5, 1.8, 0.05, () => renderer.toneMappingExposure, (v) => { renderer.toneMappingExposure = v })
  slider('Character rim', 0, 2, 0.05, () => RIM.strength.value, (v) => { RIM.strength.value = v })
  section('Focus')
  toggle('Depth of field', () => look.dof, (v) => { look.dof = v })
  slider('Focus distance', 10, 90, 0.5, () => look.focus, (v) => { look.focus = v })
  slider('Aperture (×10000)', 0, 60, 1, () => look.aperture * 10000, (v) => { look.aperture = v / 10000 })
  slider('Max blur (×1000)', 0, 30, 1, () => look.maxblur * 1000, (v) => { look.maxblur = v / 1000 })
  section('Grade')
  toggle('Bloom', () => look.bloom, (v) => { look.bloom = v })
  slider('Bloom threshold', 0, 1.5, 0.01, () => look.bloomThreshold, (v) => { look.bloomThreshold = v })
  slider('Bloom strength', 0, 2, 0.05, () => look.bloomStrength, (v) => { look.bloomStrength = v })
  toggle('Grade and vignette', () => look.grade, (v) => { look.grade = v })
  slider('Vignette', 0, 1, 0.01, () => look.vignette, (v) => { look.vignette = v })
  slider('Saturation', 0.5, 1.6, 0.01, () => look.saturation, (v) => { look.saturation = v })
  slider('Contrast', 0.7, 1.5, 0.01, () => look.contrast, (v) => { look.contrast = v })
  slider('Warm light, cool shadow', 0, 1.5, 0.05, () => look.split, (v) => { look.split = v })
  slider('Chromatic aberration (×1000)', 0, 20, 1, () => look.aberration * 1000, (v) => { look.aberration = v / 1000 })
  section('Life and camera')
  toggle('Haze', () => life.fog, (v) => { life.fog = v })
  toggle('Petals or dust', () => life.petals, (v) => { life.petals = v })
  toggle('Embers', () => life.embers, (v) => { life.embers = v })
  toggle('Light shafts', () => life.shafts, (v) => { life.shafts = v })
  toggle('Camera sway', () => life.sway, (v) => { life.sway = v })
  toggle('Dialogue box', () => dialogue, (v) => { dialogue = v })
  slider('Render scale', 0.5, 2, 0.05, () => life.renderScale, (v) => { life.renderScale = v })
  slider('Camera height (°)', 15, 70, 1, () => stage.view.elevation, (v) => { stage.view.elevation = v; stage.placeCamera() })
  slider('Camera distance', 12, 90, 1, () => stage.view.distance, (v) => { stage.view.distance = v; stage.placeCamera() })
  button('Free orbit', () => { controls.enabled = !controls.enabled; stage.presetCamera = !controls.enabled; controls.target.copy(stage.target) })
}

// --- Against the references -------------------------------------------------------------------------------------------
const refs: { id: string; file: string; scene: string; light: string }[] = []
let refRanges: Record<string, number[]> = {}
const refImg = document.getElementById('ref') as HTMLImageElement
let refAt = -1
const table = document.createElement('table')
table.id = 'measures'
const ROWS: [string, (m: LookMeasures) => number, string][] = [
  ['Contrast', (m) => m.lightness.range, 'Lightness range (p5–p95)'], ['Palette', (m) => m.palette, 'Palette (90%)'], ['Warm/cool', (m) => m.warmCool, 'Warm light, cool shadow'],
  ['Lightness', (m) => m.lightness.mean, 'Lightness, mean'], ['Chroma', (m) => m.chroma.mean, 'Chroma, mean'], ['Blurred', (m) => m.blurShare, 'Blurred share'],
  ['Focus band', (m) => m.focusBand, 'Focus band'], ['Vignette', (m) => m.vignette, 'Vignette'], ['Shadow', (m) => m.shadowShare, 'Deep shadow share'],
]
/** The look measures on the frame as shown (640 px wide), as `pnpm look:measure` reads a capture. */
function measureFrame(): LookMeasures {
  stage.render()
  const c = document.createElement('canvas'), w = 640, h = Math.round((canvas.height / canvas.width) * 640)
  c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(canvas, 0, 0, w, h)
  const d = g.getImageData(0, 0, w, h)
  return measure({ data: new Uint8Array(d.data.buffer), width: w, height: h })
}
function showMeasures(m: LookMeasures): void {
  table.innerHTML = '<tr><td>Measure</td><td>Frame</td><td>Refs</td></tr>'
  for (const [name, get, key] of ROWS) {
    const v = get(m), r = refRanges[key] ?? [], lo = Math.min(...r), hi = Math.max(...r)
    const verdict = !r.length ? '' : v < lo ? 'below' : v > hi ? 'above' : 'within'
    table.insertAdjacentHTML('beforeend', `<tr><td>${name}</td><td class="${verdict}">${v}</td><td>${r.length ? `${lo}–${hi}` : '—'}</td></tr>`)
  }
}
function referencePanel(): void {
  section('Against the references')
  button('Show a reference', () => {
    const light = sceneId === 'tavern' ? 'night' : 'day'
    const pool = refs.filter((r) => r.light.startsWith(light))
    if (!pool.length) return
    refAt = (refAt + 1) % (pool.length + 1)
    refImg.style.display = refAt === pool.length ? 'none' : 'block'
    if (refAt < pool.length) refImg.src = privateUrl(`content/authoring/look/${pool[refAt]!.file}`)
  })
  button('Measure this frame', () => showMeasures(measureFrame()))
  const stats = document.createElement('pre')
  stats.id = 'stats'
  button('Stage numbers', () => { const s = stage.stats(); stats.textContent = `calls ${s.calls}, triangles ${s.triangles}\nGPU about ${s.gpu.totalMB} MB (${s.gpu.textures} textures)\nkit ${(s.kitBytes / 2 ** 20).toFixed(1)} MB, loaded ${((s.loadedBytes ?? 0) / 2 ** 20).toFixed(1)} MB` })
  panel.append(table, stats)
}

async function main(): Promise<void> {
  try {
    const manifest = (await json('content/authoring/look/references.json')) as { refs: typeof refs }
    refs.push(...manifest.refs)
    const measures = (await json('content/authoring/look/measures.json')) as { table: { name: string }[]; refs: { measures: LookMeasures }[] }
    refRanges = Object.fromEntries(measures.table.map((t) => [t.name, measures.refs.map((r) => ROWS.find((x) => x[2] === t.name)?.[1](r.measures) ?? NaN).filter((v) => !Number.isNaN(v))]))
  } catch { /* the references are optional: the slice still renders */ }
  stage.useTier(firstTier)
  stage.cameraName = firstCamera
  await stage.load(sceneId)
  buildPanel()
  referencePanel()
  apply()
  status.textContent = `${LOOK_SCENES[sceneId]}, ${TIERS[stage.tier].label}, ${params.get('sprites') === 'pixel' ? 'sprites in the pixel pass' : 'our sprites as they are'}`
  stage.onFrame = () => { if (controls.enabled) controls.update() }
  stage.start()
  // For captures and the look measures from the browser pane: the stage, one frame's update, and a private save.
  const capture = async (name: string) => {
    stage.frame(); stage.render()
    const url = canvas.toDataURL('image/jpeg', 0.9)
    return fetch(`/__capture?name=${name}`, { method: 'POST', body: url }).then((r) => r.text())
  }
  ;(window as unknown as { __look: unknown }).__look = { stage, capture, measure: measureFrame, controls }
}
void main().catch((e: unknown) => { status.textContent = `Failed: ${e instanceof Error ? e.message : String(e)}`; console.error(e) })
