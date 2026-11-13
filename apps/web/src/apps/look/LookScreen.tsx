// Look's screen (LK1, P161): the look stage full screen, a few controls over it (scene, camera family, tier), a live
// frame rate, and the phone test: High for ten minutes, then Medium and Saver, the screen kept awake, the heat asked at
// the end, the numbers saved to /api/look/runs and shown against the budgets.
import { FrameRecorder, LOOK_SCENES, LookStage, TIERS, type CameraName, type LookSceneId, type TierName } from '@luismlorenzana/uma-stage/look'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { request } from '../../api/client'
import { hostedAssets } from './assets'
import { BUDGET, meets, minutesLabel, SETTLE_SECONDS, testPlan, type TestStep } from './plan'

interface TierResult { tier: TierName; summary: Record<string, number>; seconds: [number, number][]; stats: { calls: number; triangles: number; gpuMB: number; textures: number } }
type Phase = 'loading' | 'ready' | 'testing' | 'heat' | 'sending' | 'done' | 'failed'
const CAMERAS: CameraName[] = ['front', 'tactics', 'high']
const CAMERA_LABEL: Record<CameraName, string> = { front: 'Front', tactics: '3/4', high: 'High' }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const minutesParam = (): number | null => { const m = Number(new URLSearchParams(location.search).get('minutes')); return m > 0 ? m : null }

const pill = 'rounded-full px-3 py-1.5 text-[13px] font-medium backdrop-blur transition-colors'
const on = 'bg-white text-black', off = 'bg-black/55 text-white'

export default function LookScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<LookStage | null>(null)
  const recorderRef = useRef<FrameRecorder | null>(null)
  const frameTimes = useRef<number[]>([])
  const loadRef = useRef<{ ms: number; bytes: number | null }>({ ms: 0, bytes: null })
  const pending = useRef<{ tiers: TierResult[]; startedAt: string } | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')
  const [scene, setScene] = useState<LookSceneId>('square')
  const [camera, setCamera] = useState<CameraName>('front')
  const [tier, setTier] = useState<TierName>('high')
  const [fps, setFps] = useState(0)
  const [progress, setProgress] = useState<{ step: number; of: number; tier: TierName; left: number } | null>(null)
  const [results, setResults] = useState<TierResult[]>([])
  const [controls, setControls] = useState(true)
  const plan = useRef<TestStep[]>(testPlan(minutesParam())).current

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const started = performance.now()
    const assets = hostedAssets()
    const stage = new LookStage({ canvas, assets })
    stageRef.current = stage
    stage.onFrame = (ms) => {
      recorderRef.current?.push(ms)
      const t = frameTimes.current
      t.push(ms)
      if (t.length > 90) t.shift()
    }
    const resize = () => stage.resize()
    addEventListener('resize', resize)
    const meter = setInterval(() => { const t = frameTimes.current; if (t.length) setFps(Math.round(1000 / (t.reduce((a, b) => a + b, 0) / t.length))) }, 500)
    let live = true
    stage.load('square').then(() => {
      if (!live) return
      stage.start()
      loadRef.current = { ms: Math.round(performance.now() - started), bytes: assets.bytes?.() ?? null }
      setPhase('ready')
    }, (e: unknown) => { if (live) { setError(e instanceof Error ? e.message : String(e)); setPhase('failed') } })
    return () => { live = false; clearInterval(meter); removeEventListener('resize', resize); stage.dispose(); stageRef.current = null }
  }, [])

  const switchScene = async (id: LookSceneId) => {
    const stage = stageRef.current
    if (!stage || id === scene) return
    setPhase('loading')
    await stage.load(id)
    setScene(id)
    setPhase('ready')
  }
  const switchCamera = (name: CameraName) => { const s = stageRef.current; if (!s) return; s.useCamera(name); s.apply(); setCamera(name) }
  const switchTier = (name: TierName) => { const s = stageRef.current; if (!s) return; s.useTier(name); s.apply(); setTier(name) }

  async function runTest() {
    const stage = stageRef.current
    if (!stage) return
    setPhase('testing')
    setResults([])
    const startedAt = new Date().toISOString()
    const lock = await (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen').catch(() => null)
    const tiers: TierResult[] = []
    for (const [i, step] of plan.entries()) {
      switchTier(step.tier)
      setProgress({ step: i + 1, of: plan.length, tier: step.tier, left: step.seconds + SETTLE_SECONDS })
      await wait(SETTLE_SECONDS * 1000)
      const rec = new FrameRecorder()
      recorderRef.current = rec
      while (rec.elapsed < step.seconds) {
        await wait(1000)
        setProgress({ step: i + 1, of: plan.length, tier: step.tier, left: Math.max(0, Math.ceil(step.seconds - rec.elapsed)) })
      }
      recorderRef.current = null
      const s = stage.stats()
      tiers.push({ tier: step.tier, summary: { ...rec.summary() }, seconds: rec.seconds().map((x) => [x.frames, x.worstMs]), stats: { calls: s.calls, triangles: s.triangles, gpuMB: s.gpu.totalMB, textures: s.gpu.textures } })
      setResults([...tiers])
    }
    await lock?.release().catch(() => undefined)
    setProgress(null)
    switchTier('high')
    pending.current = { tiers, startedAt }
    setPhase('heat')
  }

  async function send(heat: 'cool' | 'warm' | 'hot') {
    const run = pending.current
    if (!run) return
    setPhase('sending')
    try {
      await request('/api/look/runs', { method: 'POST', body: JSON.stringify({
        version: 1, startedAt: run.startedAt, scene, camera,
        device: { userAgent: navigator.userAgent, width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
        load: loadRef.current, tiers: run.tiers, heat, note: plan[0]!.seconds === 600 ? '' : `short test: High ${plan[0]!.seconds} s`,
      }) })
      setPhase('done')
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setPhase('failed') }
  }

  const portrait = typeof innerHeight === 'number' && innerHeight > innerWidth
  return (
    <div className="fixed inset-0 z-50 bg-black text-white" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" onClick={() => phase === 'ready' && setControls((c) => !c)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingLeft: 'max(12px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))' }}>
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Link to="/" className={`${pill} ${off}`}>‹ Home</Link>
          <span className={`${pill} ${off} tabular-nums`}>{fps} fps · {TIERS[tier].label}</span>
          {phase === 'loading' && <span className={`${pill} ${off}`}>Loading…</span>}
          {progress && <span className={`${pill} bg-amber-300 text-black tabular-nums`}>Test {progress.step}/{progress.of}: {TIERS[progress.tier].label}, {Math.floor(progress.left / 60)}:{String(progress.left % 60).padStart(2, '0')} left</span>}
        </div>
        {phase === 'ready' && controls && (
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {(Object.keys(LOOK_SCENES) as LookSceneId[]).map((id) => <button key={id} className={`${pill} ${scene === id ? on : off}`} onClick={() => void switchScene(id)}>{LOOK_SCENES[id]}</button>)}
            <span className="w-2" />
            {CAMERAS.map((c) => <button key={c} className={`${pill} ${camera === c ? on : off}`} onClick={() => switchCamera(c)}>{CAMERA_LABEL[c]}</button>)}
            <span className="w-2" />
            {(Object.keys(TIERS) as TierName[]).map((t) => <button key={t} className={`${pill} ${tier === t ? on : off}`} onClick={() => switchTier(t)}>{TIERS[t].label}</button>)}
            <span className="w-2" />
            <button className={`${pill} bg-amber-300 text-black`} onClick={() => void runTest()}>Run the phone test ({minutesLabel(plan)})</button>
          </div>
        )}
        {phase === 'ready' && portrait && <p className={`${pill} ${off} self-start`}>Turn the phone sideways for the full frame.</p>}
      </div>
      {(phase === 'heat' || phase === 'sending' || phase === 'done' || phase === 'failed' || (phase === 'testing' && results.length > 0)) && (
        <div className="absolute inset-x-0 bottom-0 max-h-[70%] overflow-auto bg-black/80 p-4 text-[13px] backdrop-blur" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {phase === 'heat' && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-semibold">Done. How warm is the phone?</span>
              {(['cool', 'warm', 'hot'] as const).map((h) => <button key={h} className={`${pill} ${on}`} onClick={() => void send(h)}>{h[0]!.toUpperCase() + h.slice(1)}</button>)}
            </div>
          )}
          {phase === 'sending' && <p className="mb-3">Saving the run…</p>}
          {phase === 'done' && <p className="mb-3 font-semibold">Saved. Thank you: Claude reads it from here.</p>}
          {phase === 'failed' && <p className="mb-3 text-red-300">{error}</p>}
          {results.length > 0 && <Results results={results} load={loadRef.current} />}
          {(phase === 'done' || phase === 'failed') && <button className={`${pill} ${on} mt-3`} onClick={() => setPhase('ready')}>Back to the scene</button>}
        </div>
      )}
    </div>
  )
}

function Results({ results, load }: { results: TierResult[]; load: { ms: number; bytes: number | null } }) {
  const mb = load.bytes === null ? null : load.bytes / 2 ** 20
  return (
    <div>
      <p className="mb-2 text-white/80">First load: {(load.ms / 1000).toFixed(1)} s{mb === null ? '' : `, ${mb.toFixed(1)} MB`} {mb !== null && (mb <= BUDGET.firstLoadMB ? '✓' : `(budget ${BUDGET.firstLoadMB} MB)`)}</p>
      <table className="w-full tabular-nums">
        <thead><tr className="text-left text-white/60"><th>Tier</th><th>fps</th><th>Low</th><th>1st min</th><th>Last min</th><th>p95 ms</th><th>30 fps held</th><th>GPU MB</th><th>Draws</th><th /></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.tier}>
              <td>{TIERS[r.tier].label}</td><td>{r.summary.fps}</td><td>{r.summary.fpsLow}</td><td>{r.summary.firstMinuteFps}</td><td>{r.summary.lastMinuteFps}</td><td>{r.summary.msP95}</td>
              <td>{Math.round((r.summary.sustained30 ?? 0) * 100)}%</td><td>{r.stats.gpuMB}</td><td>{r.stats.calls}</td>
              <td>{meets({ sustained30: r.summary.sustained30 ?? 0, gpuMB: r.stats.gpuMB }) ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
