// ST2's review page (uma-stage 0.2.0): a portrait stand-in farm band on the band stage, built from the stand-in `farm`
// kit, as uma-farm's F57 asks to see it: a building from sets, a mounted piece, a two-column door, a tap that picks a slot,
// a standee walking a path, and a second season's grade. Built into docs/stage/previews/farm-band.html by
// `pnpm --filter @luismlorenzana/uma-stage review`. No Uma art: the sprites are the stand-ins, the faces plain drawings.
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { StageGrade } from '../../src/stage/grade.js'
import { BandStage } from '../../src/stage/bandStage.js'
import type { PickHit } from '../../src/stage/pick.js'
import { toStage, type StageLayout } from '../../src/stage/turn.js'
import { TurnedStage } from '../../src/stage/TurnedStage.js'
import { standInSet } from '../../src/sprites/standInSet.js'
import { SAMPLE_FARM } from '../../src/world/farmSample.js'
import { standInFarmKit } from '../../src/world/standInFarm.js'

/** The seasons as light (KF10): the farm's own values are uma-farm's; these only show the stage taking them. */
const GRADES: Record<string, StageGrade> = {
  Spring: { sky: '#e8f4ff', ground: '#4a5a30', skyLight: 1.5, sun: '#fff6e0', sunLight: 1.35, tint: '#ffffff', background: '#9fd3ee', lamps: 0 },
  Autumn: { sky: '#ffe0b4', ground: '#5a3a20', skyLight: 1.25, sun: '#ffac62', sunLight: 1.6, tint: '#ffe2c2', background: '#e2a46e', lamps: 0.25 },
  Night: { sky: '#5f6fb0', ground: '#181a2a', skyLight: 0.55, sun: '#8a9ad4', sunLight: 0.3, tint: '#9fadd8', background: '#121830', lamps: 1 },
}

/** A plain stand-in face for a standee: no art, just a round face on a colour. */
function plainFace(hair: string, coat: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = coat; g.fillRect(0, 0, 128, 128)
  g.fillStyle = hair; g.beginPath(); g.arc(64, 62, 44, Math.PI, 0); g.fill(); g.fillRect(20, 60, 14, 40); g.fillRect(94, 60, 14, 40)
  g.fillStyle = '#f6dcc4'; g.beginPath(); g.ellipse(64, 72, 34, 38, 0, 0, Math.PI * 2); g.fill()
  g.fillStyle = hair; g.beginPath(); g.arc(64, 50, 36, Math.PI, 0); g.fill()
  g.fillStyle = '#2a2030'; g.fillRect(48, 72, 8, 10); g.fillRect(72, 72, 8, 10)
  g.strokeStyle = '#a0505a'; g.lineWidth = 3; g.beginPath(); g.arc(64, 88, 9, 0.2, Math.PI - 0.2); g.stroke()
  return c
}

const describe = (hit: PickHit | undefined): string => {
  if (!hit) return 'nothing'
  const r = hit.ref
  if (r.kind === 'marker') return `${r.marker.kind} ${r.marker.id}`
  if (r.kind === 'prop') return `prop ${r.name} (${r.tile.x}, ${r.tile.z})`
  return `${r.kind} ${r.id}`
}

function FarmBand({ layout }: { layout: StageLayout }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<BandStage | null>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [tapped, setTapped] = useState('Tap a slot: the standee walks there.')
  const [season, setSeason] = useState('Spring')
  const [done, setDone] = useState({ tap: false, walk: false, grade: false })

  useEffect(() => {
    const s = new BandStage(canvas.current!, { saver: false })
    stage.current = s
    s.setGrade(GRADES.Spring!)
    s.setWorld(SAMPLE_FARM, standInFarmKit())
    // The walker: a standee (no set), and two stand-in sprite sets at work under the cap.
    s.addFigure({ id: 'walker', tile: { x: 4, z: 24 }, set: null, face: plainFace('#6a4ad0', '#ffd27a'), facing: 'back' })
    s.addFigure({ id: 'worker-1', tile: { x: 1, z: 22 }, set: 'stand-in-0', loadSet: async () => standInSet(0), face: null })
    s.addFigure({ id: 'worker-2', tile: { x: 4, z: 18 }, set: 'stand-in-1', loadSet: async () => standInSet(1), face: null })
    s.addFigure({ id: 'helper', tile: { x: 7, z: 18 }, set: null, face: plainFace('#c0503a', '#9fd8b0') })
    s.scrollTo(SAMPLE_FARM.cells.length, true)
    s.start()
    let raf = 0
    const follow = () => {
      raf = requestAnimationFrame(follow)
      const head = s.headOf('walker'), el = bubble.current
      if (head && el) el.style.transform = `translate(${head.x}px, ${head.y}px) translate(-50%, -100%)`
    }
    follow()
    ;(window as unknown as { __band: BandStage }).__band = s
    return () => { cancelAnimationFrame(raf); s.dispose(); stage.current = null }
  }, [])

  useEffect(() => { stage.current?.resize(layout.width, layout.height, window.devicePixelRatio) }, [layout.width, layout.height])

  const point = (e: React.PointerEvent) => toStage(layout, e.clientX, e.clientY)
  const onUp = (e: React.PointerEvent) => {
    const s = stage.current, p = point(e)
    const hits = s?.pointerUp(p.x, p.y)
    if (!s || !hits) return
    const slot = hits.find((h) => h.ref.kind === 'marker' && h.ref.marker.kind === 'slot')
    setTapped(`Tapped: ${describe(hits[0])}${slot && slot !== hits[0] ? `, under it ${describe(slot)}` : ''}`)
    if (slot && slot.ref.kind === 'marker') {
      const to = slot.ref.marker
      setDone((d) => ({ ...d, tap: true }))
      void s.walkTo('walker', { x: to.x, z: to.z }).then((arrived) => { if (arrived) setDone((d) => ({ ...d, walk: true })) })
    }
  }
  const pick = (name: string) => {
    setSeason(name)
    stage.current?.setGrade(GRADES[name]!, 900)
    if (name !== 'Spring') setDone((d) => ({ ...d, grade: true }))
  }
  const checks: [string, boolean][] = [
    ['A building from sets', true], ['A mounted piece (sails, chimneys, boxes)', true], ['A two-column door (Barn, Warehouse)', true],
    ['A tap that picks a slot', done.tap], ['A standee walking a path', done.walk], ["A second season's grade", done.grade],
  ]
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvas} onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); const p = point(e); stage.current?.pointerDown(p.x, p.y) }}
        onPointerMove={(e) => { const p = point(e); stage.current?.pointerMove(p.x, p.y) }} onPointerUp={onUp} onPointerCancel={() => stage.current?.pointerCancel()} />
      <div ref={bubble} className="bubble" style={{ left: 0, top: 0 }}>Walker</div>
      <div className="bar" style={{ top: 'calc(var(--inset-top) + 8px)' }}>
        <div className="chip" style={{ width: '100%' }}>{tapped}</div>
        <ul className="chip checks">{checks.map(([label, ok]) => <li key={label} className={ok ? 'done' : ''}>{label}</li>)}</ul>
      </div>
      <div className="bar" style={{ bottom: 'calc(var(--inset-bottom) + 10px)' }}>
        {Object.keys(GRADES).map((name) => <button key={name} aria-pressed={season === name} onClick={() => pick(name)}>{name}</button>)}
        <button onClick={() => void stage.current?.walkTo('walker', { x: 4, z: 24 }, { run: true })}>Run to the gate</button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TurnedStage layout="portrait">{(layout) => <FarmBand layout={layout} />}</TurnedStage>
  </StrictMode>,
)
