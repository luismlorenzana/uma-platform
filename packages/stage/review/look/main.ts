// LK1's look slice (P157–P159): the town square by day, rendered with the look path's layers, each switchable, the look
// measures on the live frame against the owner's references, and a reference beside it. Local only: `pnpm --filter
// @luismlorenzana/uma-stage look`, then http://127.0.0.1:4410 (add `?sprites=smooth` for our sets as they are).
import {
  ACESFilmicToneMapping, CanvasTexture, Color, DirectionalLight, FogExp2, HemisphereLight, PCFShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, Timer, Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { measure, type LookMeasures } from '../../../../scripts/look/src/measure.js'
import { applyPixels, PIXEL_DEFAULTS, privateUrl, type PixelSettings } from './kit.js'
import { Post, POST_DEFAULTS, type PostSettings } from './post.js'
import { animate, buildTown, type Town } from './scene.js'

const params = new URLSearchParams(location.search)
const canvas = document.getElementById('c') as HTMLCanvasElement
const status = document.getElementById('status')!
const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFShadowMap

const scene = new Scene()
// A sky that fades from a deep blue at the top to a pale haze at the horizon, as the references' day scenes.
const sky = document.createElement('canvas')
sky.width = 2; sky.height = 256
const sg = sky.getContext('2d')!, grad = sg.createLinearGradient(0, 0, 0, 256)
grad.addColorStop(0, '#5f88c4'); grad.addColorStop(0.55, '#a9c4e0'); grad.addColorStop(1, '#dfe6da')
sg.fillStyle = grad; sg.fillRect(0, 0, 2, 256)
const skyTex = new CanvasTexture(sky)
skyTex.colorSpace = SRGBColorSpace
scene.background = skyTex
scene.fog = new FogExp2(new Color('#b8c8d0'), 0.0045)

const camera = new PerspectiveCamera(22, 1, 1, 400)
// Framed as ref-01: the hall's gable in the middle, the tree line and a strip of sky above, the square below.
const target = new Vector3(0, 2.4, -5.5)
const view = { elevation: 36, azimuth: 0, distance: 49 }
const placeCamera = () => {
  const e = (view.elevation * Math.PI) / 180, a = (view.azimuth * Math.PI) / 180
  camera.position.set(target.x + view.distance * Math.cos(e) * Math.sin(a), target.y + view.distance * Math.sin(e), target.z + view.distance * Math.cos(e) * Math.cos(a))
  camera.lookAt(target)
}
placeCamera()
const controls = new OrbitControls(camera, canvas)
controls.target.copy(target)
controls.enabled = false

// The sun from the upper left, as ref-01: shadows fall to the right.
const sun = new DirectionalLight('#ffe6c4', 4.6)
sun.position.set(-26, 30, -4)
sun.target.position.set(0, 0, -2)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 100 })
sun.shadow.bias = -0.0004
sun.shadow.normalBias = 0.03
// A cool sky light, so shadows go cool under the warm sun (the look bible's rule 4).
const hemi = new HemisphereLight('#9fb8f0', '#34403a', 1.05)
scene.add(sun, sun.target, hemi)

const post = new Post(renderer, scene, camera)
const pixel: PixelSettings = { ...PIXEL_DEFAULTS }
const look: PostSettings = { ...POST_DEFAULTS }
const life = { fog: true, petals: true, shadows: true, renderScale: Math.min(1.5, devicePixelRatio) }
let town: Town | null = null

function resize(): void {
  const w = canvas.clientWidth, h = canvas.clientHeight, r = Math.min(devicePixelRatio, life.renderScale)
  renderer.setPixelRatio(r)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  post.setSize(w, h, r)
}
addEventListener('resize', resize)
// H hides the panel, to judge the frame alone.
addEventListener('keydown', (e) => { if (e.key === 'h') { const p = document.getElementById('panel')!; p.style.display = p.style.display === 'none' ? '' : 'none' } })

// --- The panel: every layer switchable, so the owner sees what each adds -------------------------------------------
const panel = document.getElementById('panel')!
let row = (_: string) => {}
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
function apply(): void {
  applyPixels(pixel)
  post.set(look)
  scene.fog = life.fog ? new FogExp2(new Color('#b8c8d0'), 0.0045) : null
  renderer.shadowMap.enabled = life.shadows
  sun.castShadow = life.shadows
  if (town) town.drift.visible = life.petals
  resize()
}

section('Pixel scale')
toggle('Kit textures on the pixel grid', () => pixel.on, (v) => { pixel.on = v })
slider('Texels per texture', 32, 512, 16, () => pixel.texels, (v) => { pixel.texels = v })
slider('Colour steps', 6, 64, 1, () => pixel.levels, (v) => { pixel.levels = v })
toggle('Kit normal maps', () => pixel.normals, (v) => { pixel.normals = v })
const spriteMode = params.get('sprites') === 'smooth' ? 'smooth' : 'pixel'
button(spriteMode === 'pixel' ? 'Sprites: pixel pass (switch to ours)' : 'Sprites: ours (switch to pixel pass)', () => {
  params.set('sprites', spriteMode === 'pixel' ? 'smooth' : 'pixel'); location.search = params.toString()
})
section('Light')
toggle('Sun shadows', () => life.shadows, (v) => { life.shadows = v })
toggle('Ambient occlusion', () => look.ao, (v) => { look.ao = v })
slider('Sun strength', 0.5, 6, 0.1, () => sun.intensity, (v) => { sun.intensity = v })
slider('Sky light', 0.2, 3, 0.05, () => hemi.intensity, (v) => { hemi.intensity = v })
slider('Exposure', 0.5, 1.8, 0.05, () => renderer.toneMappingExposure, (v) => { renderer.toneMappingExposure = v })
section('Focus')
toggle('Depth of field', () => look.dof, (v) => { look.dof = v })
slider('Focus distance', 20, 90, 0.5, () => look.focus, (v) => { look.focus = v })
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
section('Life and camera')
toggle('Haze', () => life.fog, (v) => { life.fog = v })
toggle('Petals', () => life.petals, (v) => { life.petals = v })
slider('Render scale', 0.5, 2, 0.05, () => life.renderScale, (v) => { life.renderScale = v })
slider('Camera height (°)', 25, 70, 1, () => view.elevation, (v) => { view.elevation = v; placeCamera() })
slider('Camera distance', 30, 90, 1, () => view.distance, (v) => { view.distance = v; placeCamera() })
button('Free orbit', () => { controls.enabled = !controls.enabled })

section('Against the references')
const refs: { id: string; file: string; scene: string; light: string }[] = []
let refRanges: Record<string, number[]> = {}
const refImg = document.getElementById('ref') as HTMLImageElement
let refAt = -1
button('Show a reference', () => {
  const day = refs.filter((r) => r.light === 'day')
  if (!day.length) return
  refAt = (refAt + 1) % (day.length + 1)
  refImg.style.display = refAt === day.length ? 'none' : 'block'
  if (refAt < day.length) refImg.src = privateUrl(`content/authoring/look/${day[refAt]!.file}`)
})
const table = document.createElement('table'); table.id = 'measures'
button('Measure this frame', () => {
  post.render()
  const c = document.createElement('canvas'), w = 640, h = Math.round((canvas.height / canvas.width) * 640)
  c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(canvas, 0, 0, w, h)
  const d = g.getImageData(0, 0, w, h)
  const m = measure({ data: new Uint8Array(d.data.buffer), width: w, height: h })
  showMeasures(m)
})
panel.append(table)
row = (html: string) => { table.insertAdjacentHTML('beforeend', html) }
const ROWS: [string, (m: LookMeasures) => number, string][] = [
  ['Contrast', (m) => m.lightness.range, 'Lightness range (p5–p95)'], ['Palette', (m) => m.palette, 'Palette (90%)'], ['Warm/cool', (m) => m.warmCool, 'Warm light, cool shadow'],
  ['Lightness', (m) => m.lightness.mean, 'Lightness, mean'], ['Chroma', (m) => m.chroma.mean, 'Chroma, mean'], ['Blurred', (m) => m.blurShare, 'Blurred share'],
  ['Focus band', (m) => m.focusBand, 'Focus band'], ['Vignette', (m) => m.vignette, 'Vignette'], ['Shadow', (m) => m.shadowShare, 'Deep shadow share'],
]
function showMeasures(m: LookMeasures): void {
  table.innerHTML = '<tr><td>Measure</td><td>Frame</td><td>Refs</td></tr>'
  for (const [name, get, key] of ROWS) {
    const v = get(m), r = refRanges[key] ?? [], lo = Math.min(...r), hi = Math.max(...r)
    const verdict = !r.length ? '' : v < lo ? 'below' : v > hi ? 'above' : 'within'
    row(`<tr><td>${name}</td><td class="${verdict}">${v}</td><td>${r.length ? `${lo}–${hi}` : '—'}</td></tr>`)
  }
}

async function main(): Promise<void> {
  resize()
  try {
    const manifest = await fetch(privateUrl('content/authoring/look/references.json')).then((r) => r.json())
    refs.push(...manifest.refs)
    const measures = await fetch(privateUrl('content/authoring/look/measures.json')).then((r) => r.json())
    refRanges = Object.fromEntries((measures.table as { name: string }[]).map((t) => [t.name, (measures.refs as { measures: LookMeasures }[]).map((r) => ROWS.find((x) => x[2] === t.name)?.[1](r.measures) ?? NaN).filter((v) => !Number.isNaN(v))]))
  } catch { /* the references are optional: the slice still renders */ }
  town = await buildTown(scene, { spritePixels: spriteMode === 'pixel' ? 56 : null })
  apply()
  status.textContent = `Town square, ${spriteMode === 'pixel' ? 'sprites in the pixel pass' : 'our sprites as they are'}`
  ;(window as unknown as { __look: unknown }).__look = { renderer, scene, camera, post, town, pixel, look, life, view, placeCamera, apply, measure: () => { post.render() } }
  const timer = new Timer()
  const frame = (now: number) => {
    requestAnimationFrame(frame)
    timer.update(now)
    const dt = Math.min(0.05, timer.getDelta())
    if (controls.enabled) controls.update()
    if (town) animate(town, camera, timer.getElapsed(), dt)
    post.render()
  }
  requestAnimationFrame(frame)
}
void main().catch((e: unknown) => { status.textContent = `Failed: ${e instanceof Error ? e.message : String(e)}`; console.error(e) })
