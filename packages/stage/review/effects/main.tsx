// ST5's review page (uma-stage 0.5.0): the post layer's bloom and tilt-shift, tunable (uma-cyberpunk's CY7 request, its
// D11). A night scene on the stage's camera: a dark tiled floor 14 deep, neon rings in the request's colours, warm lamps
// and a white light, at depths that show the tilt-shift. Presets: 0.4.0's look (no options, what uma-quest and uma-farm
// draw), uma-cyberpunk's starting values, the tilt-shift off; sliders change it live through `set`. Built into
// docs/stage/previews/effects.html by `pnpm --filter @luismlorenzana/uma-stage review`. No game art: shapes only.
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  CanvasTexture, Color, Mesh, MeshBasicMaterial, MeshLambertMaterial, NearestFilter, OrthographicCamera, PlaneGeometry, AmbientLight,
  DirectionalLight, RingGeometry, Scene, SRGBColorSpace, Vector3, WebGLRenderer, CylinderGeometry,
} from 'three'
import { CAMERA_PITCH, cameraOffset, deviceSize, frustum } from '../../src/stage/camera.js'
import { BLOOM, Effects, TILT_SHIFT, type EffectsSettings } from '../../src/world/effects.js'

/** The request's colours, and the luminance the bloom tests (linear, 0.299 R + 0.587 G + 0.114 B). */
const COLOURS: [string, string][] = [
  ["The squad's cyan ring", '#2ee6ff'], ['Pure cyan', '#00ffff'], ['A warm lamp', '#ffb84d'], ['Magenta', '#ff3dc8'],
  ['The danger overlay', '#e040c8'], ['White', '#ffffff'],
]
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => linear(v / 255))
  return 0.299 * r! + 0.587 * g! + 0.114 * b!
}

const PRESETS: Record<string, EffectsSettings> = {
  "0.4.0's look": { bloom: { ...BLOOM }, tiltShift: { ...TILT_SHIFT } },
  "uma-cyberpunk's start": { bloom: { threshold: 0.45, strength: 0.6, radius: 0.5 }, tiltShift: { strength: 0.8, focus: TILT_SHIFT.focus } },
  'Tilt-shift off': { bloom: { threshold: 0.45, strength: 0.6, radius: 0.5 }, tiltShift: false },
}

function floorTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#1a2033'; g.fillRect(0, 0, 128, 128)
  g.fillStyle = '#232b44'; g.fillRect(4, 4, 120, 120)
  g.fillStyle = '#2f3a5c'; g.fillRect(0, 0, 128, 3); g.fillRect(0, 0, 3, 128)
  const t = new CanvasTexture(c)
  t.magFilter = t.minFilter = NearestFilter
  t.colorSpace = SRGBColorSpace
  return t
}

/** The scene: 10 × 14 tiles, rings and lamps spread front to back. */
function scene(): Scene {
  const s = new Scene()
  s.background = new Color('#0b0f1c')
  s.add(new AmbientLight('#5a6cc8', 0.9))
  const key = new DirectionalLight('#b8c8ff', 0.8)
  key.position.set(-4, 8, 6)
  s.add(key)
  const tex = floorTexture()
  for (let z = 0; z < 14; z++) for (let x = 0; x < 10; x++) {
    const tile = new Mesh(new PlaneGeometry(1, 1), new MeshLambertMaterial({ map: tex }))
    tile.rotation.x = -Math.PI / 2
    tile.position.set(x + 0.5, 0, z + 0.5)
    s.add(tile)
  }
  const ring = (hex: string, x: number, z: number) => {
    const m = new Mesh(new RingGeometry(0.32, 0.44, 40), new MeshBasicMaterial({ color: hex, toneMapped: false }))
    m.rotation.x = -Math.PI / 2
    m.position.set(x, 0.01, z)
    s.add(m)
    const unit = new Mesh(new CylinderGeometry(0.18, 0.22, 0.9, 16), new MeshLambertMaterial({ color: '#8a94b8' }))
    unit.position.set(x, 0.45, z)
    s.add(unit)
  }
  COLOURS.slice(0, 5).forEach(([, hex], i) => { ring(hex, 1.5 + i * 1.75, 2.5); ring(hex, 1.5 + i * 1.75, 7.5); ring(hex, 1.5 + i * 1.75, 12.5) })
  const lamp = (hex: string, x: number, z: number) => {
    const m = new Mesh(new PlaneGeometry(0.35, 0.6), new MeshBasicMaterial({ color: hex, toneMapped: false }))
    m.position.set(x, 1.1, z)
    m.rotation.x = -CAMERA_PITCH
    s.add(m)
  }
  for (const z of [0.6, 5, 10]) { lamp('#ffb84d', 0.6, z); lamp('#ffffff', 9.4, z) }
  return s
}

function EffectsPage() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const fx = useRef<Effects | null>(null)
  const [now, setNow] = useState<EffectsSettings>(PRESETS["0.4.0's look"]!)
  const [preset, setPreset] = useState("0.4.0's look")
  const [seen, setSeen] = useState({ cyber: false, off: false, live: false })

  useEffect(() => {
    const el = canvas.current!
    const renderer = new WebGLRenderer({ canvas: el, antialias: false })
    renderer.outputColorSpace = SRGBColorSpace
    const s = scene(), camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
    // 0.4.0's look is Effects with no options, exactly what uma-quest and uma-farm construct.
    const effects = new Effects(renderer, s, camera)
    fx.current = effects
    const size = () => {
      const w = el.clientWidth, h = el.clientHeight, d = deviceSize(w, h, window.devicePixelRatio)
      renderer.setPixelRatio(d.ratio)
      renderer.setSize(w, h, false)
      Object.assign(camera, frustum(d.width, d.height))
      camera.updateProjectionMatrix()
      const o = cameraOffset(), look = new Vector3(5, 0, 7.5)
      camera.position.set(look.x, look.y + o.y, look.z + o.z)
      camera.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -CAMERA_PITCH)
      effects.setSize(w, h, d.ratio)
    }
    size()
    window.addEventListener('resize', size)
    let raf = 0
    const tick = () => { raf = requestAnimationFrame(tick); effects.render() }
    tick()
    ;(window as unknown as { __fx: Effects }).__fx = effects
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); effects.dispose(); renderer.dispose() }
  }, [])

  const choose = (name: string) => {
    const p = PRESETS[name]!
    setPreset(name)
    fx.current?.set({ bloom: p.bloom, tiltShift: p.tiltShift === false ? false : p.tiltShift })
    setNow(fx.current!.settings)
    setSeen((v) => ({ ...v, cyber: v.cyber || name === "uma-cyberpunk's start", off: v.off || p.tiltShift === false }))
  }
  const slide = (change: Parameters<Effects['set']>[0]) => {
    fx.current?.set(change)
    setNow(fx.current!.settings)
    setPreset('')
    setSeen((v) => ({ ...v, live: true }))
  }
  const t = now.tiltShift
  const checks: [string, boolean][] = [
    ["0.4.0's look: no options, the neon doesn't bloom", true], ["uma-cyberpunk's start: cyan and the warm lamps bloom (magenta needs 0.39 or less)", seen.cyber],
    ['Tilt-shift off: its two passes skipped', seen.off], ['Changed live with set()', seen.live],
  ]
  const row = (label: string, value: number, min: number, max: number, step: number, apply: (v: number) => void, off = false) => (
    <label style={{ opacity: off ? 0.4 : 1 }}>{label}<input type="range" min={min} max={max} step={step} value={value} disabled={off}
      onChange={(e) => apply(Number(e.target.value))} /><span>{value.toFixed(2)}</span></label>
  )
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <canvas ref={canvas} />
      <div className="bar" style={{ top: 8 }}>
        {Object.keys(PRESETS).map((name) => <button key={name} aria-pressed={preset === name} onClick={() => choose(name)}>{name}</button>)}
        <ul className="chip checks" style={{ width: '100%', maxWidth: 420 }}>{checks.map(([l, ok]) => <li key={l} className={ok ? 'done' : ''}>{l}</li>)}</ul>
      </div>
      <div className="panel">
        <b>Bloom</b>
        {row('threshold', now.bloom.threshold, 0, 1, 0.01, (v) => slide({ bloom: { threshold: v } }))}
        {row('strength', now.bloom.strength, 0, 2, 0.05, (v) => slide({ bloom: { strength: v } }))}
        {row('radius', now.bloom.radius, 0, 1, 0.05, (v) => slide({ bloom: { radius: v } }))}
        <b>Tilt-shift <button style={{ marginLeft: 6, padding: '2px 8px' }} onClick={() => slide({ tiltShift: t ? false : {} })}>{t ? 'Turn off' : 'Turn on'}</button></b>
        {row('strength', t ? t.strength : 0, 0, 3, 0.05, (v) => slide({ tiltShift: { strength: v } }), !t)}
        {row('focus', t ? t.focus : 0, 0, 1, 0.01, (v) => slide({ tiltShift: { focus: v } }), !t)}
        <table>
          <thead><tr><th>Colour</th><th>Luminance</th><th>Blooms at {now.bloom.threshold.toFixed(2)}?</th></tr></thead>
          <tbody>{COLOURS.map(([name, hex]) => { const l = luminance(hex); return (
            <tr key={hex}><td><span className="sw" style={{ background: hex }} />{name}</td><td>{l.toFixed(3)}</td><td>{l > now.bloom.threshold ? 'Yes' : 'No'}</td></tr>) })}</tbody>
        </table>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><EffectsPage /></StrictMode>)
