// An outfit's chibi sprite set (CA2, P136; master data's `outfit-sprites`, the format in docs/sprites/format.md): every
// action played on a canvas at its own frame timings, looping where the action loops, with play, pause and frame steps.
// Pixel art, so drawn without smoothing; the pages come through master data's client, hash-checked and kept on the device.
import type { SpriteSet } from '@luismlorenzana/uma-data'
import { Button } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useRef, useState } from 'react'
import { CONTENT } from '../../content/client'
import { decodeImage } from './content'

interface Loaded { set: SpriteSet; pages: HTMLImageElement[] }
const sets = new Map<number, Promise<Loaded | null>>()

/** Her set and decoded pages, once a visit. */
function loadSprite(outfitId: number): Promise<Loaded | null> {
  let loading = sets.get(outfitId)
  if (!loading) {
    loading = (async () => {
      const client = await CONTENT.release(), manifest = await CONTENT.manifest(), art = await client.art(manifest)
      const set = art ? await client.spriteSet(manifest, art, outfitId) : null
      if (!set) return null
      return { set, pages: await Promise.all(set.pages.map(async (p) => decodeImage(await client.file(manifest, p.path), 'image/webp'))) }
    })()
    loading.catch(() => sets.delete(outfitId))
    sets.set(outfitId, loading)
  }
  return loading
}

/** The frame's time on screen: its own `ms`, else 120 ms. */
export const frameMs = (ms: number | null | undefined): number => (ms && ms > 0 ? ms : 120)

/** The next frame: the next one, back to the first when the action loops, else held on the last. */
export const nextFrame = (at: number, count: number, loop: boolean): number => (at + 1 < count ? at + 1 : loop ? 0 : at)

export function SpritePlayer({ outfitId, name }: { outfitId: number; name: string }) {
  const [loaded, setLoaded] = useState<Loaded | null | 'missing'>(null)
  const [action, setAction] = useState('idle')
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(true)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => { let live = true; loadSprite(outfitId).then((l) => { if (live) setLoaded(l ?? 'missing') }, () => { if (live) setLoaded('missing') }); return () => { live = false } }, [outfitId])

  const set = loaded && loaded !== 'missing' ? loaded.set : null
  const current = set?.actions[action] ?? (set ? Object.values(set.actions)[0] : undefined)
  const frames = current?.frames ?? []
  const shown = frames[Math.min(frame, Math.max(0, frames.length - 1))]

  useEffect(() => { setFrame(0) }, [action])
  useEffect(() => {
    if (!playing || !current || frames.length < 2) return
    const t = setTimeout(() => setFrame((f) => nextFrame(f, frames.length, current.loop)), frameMs(shown?.ms))
    return () => clearTimeout(t)
  }, [playing, current, frames.length, frame, shown])
  useEffect(() => {
    const c = canvas.current
    if (!c || !set || !shown || loaded === 'missing' || !loaded) return
    c.width = set.cell
    c.height = set.cell
    const g = c.getContext('2d')
    if (!g) return
    g.imageSmoothingEnabled = false
    g.clearRect(0, 0, c.width, c.height)
    const page = loaded.pages[shown.page]
    if (page) g.drawImage(page, shown.x, shown.y, shown.w, shown.h, shown.dx, shown.dy, shown.w, shown.h)
  }, [set, shown, loaded])

  if (loaded === null) return <p className="text-sm text-ink-soft">Loading her sprites</p>
  if (loaded === 'missing' || !set) return <p className="text-sm text-ink-soft">No sprite set in this release.</p>
  const actions = Object.keys(set.actions)
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex shrink-0 flex-col items-center gap-2 rounded-lg bg-panel p-2">
        <canvas ref={canvas} aria-label={`${name}: ${action}, frame ${frame + 1} of ${frames.length}`} className="size-64 [image-rendering:pixelated]" />
        <div className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Button size="sm" variant="secondary" onClick={() => { setPlaying(false); setFrame((f) => (f - 1 + frames.length) % frames.length) }} aria-label="Previous frame">◀</Button>
          <Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</Button>
          <Button size="sm" variant="secondary" onClick={() => { setPlaying(false); setFrame((f) => (f + 1) % frames.length) }} aria-label="Next frame">▶</Button>
          <span className="tabular-nums">{frame + 1}/{frames.length}</span>
        </div>
        <span className="text-[11px] text-ink-faint">{set.revision} · {set.profile} · {actions.length} actions</span>
      </div>
      <div className="flex flex-wrap content-start gap-1" role="group" aria-label="Action">
        {actions.map((a) => (
          <button key={a} type="button" onClick={() => { setAction(a); setPlaying(true) }} aria-pressed={a === action}
            className={`min-h-8 rounded-full px-2.5 text-xs font-semibold ${a === action ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink'}`}>{a}</button>
        ))}
      </div>
    </div>
  )
}
