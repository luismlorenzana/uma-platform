// The field's controls (Q4, DN26, SL17), shared by the town and the dungeon: the floating stick on the left half, and the
// keyboard on a desktop (arrows or WASD, Shift to dash, E or Enter to interact, Escape for the menu). Moving by hand
// calls `onManual` (a run's Auto-explore stops).
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { capture } from './controls.js'
import type { StageEngine } from './engine.js'
import { DASH_KEYS, INTERACT_KEYS, isStickSide, keyMove, STICK_RADIUS, stickKnob, stickMove, STILL } from './input.js'
import { toStage, type Point, type StageLayout } from './turn.js'

export function useFieldInput(options: {
  layout: StageLayout
  engine: RefObject<StageEngine | null>
  /** False while a menu, a scene or a fight has the screen. */
  enabled: boolean
  onInteract: () => void
  onEscape: () => void
  onManual?: () => void
}) {
  const { layout, engine, enabled } = options
  const held = useRef(new Set<string>())
  const [stick, setStick] = useState<{ id: number; origin: Point; at: Point } | null>(null)
  const latest = useRef(options)
  latest.current = options

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement | null)?.tagName === 'INPUT') return
      if (ev.code === 'Escape') { latest.current.onEscape(); return }
      if (!latest.current.enabled) return
      held.current.add(ev.code)
      if (DASH_KEYS.includes(ev.code)) engine.current?.setDash(true)
      if (INTERACT_KEYS.includes(ev.code) && !ev.repeat) latest.current.onInteract()
      if (ev.code.startsWith('Arrow') || ev.code === 'Space') ev.preventDefault()
      const move = keyMove(held.current)
      if (move.x || move.y) latest.current.onManual?.()
      engine.current?.setMove(move)
    }
    const up = (ev: KeyboardEvent) => {
      held.current.delete(ev.code)
      if (DASH_KEYS.includes(ev.code)) engine.current?.setDash(false)
      if (latest.current.enabled) engine.current?.setMove(keyMove(held.current))
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [engine])

  // Losing the controls (a menu, a scene, a fight) lets go of the stick and stops her.
  useEffect(() => {
    if (enabled) return
    setStick(null)
    held.current.clear()
    engine.current?.setMove(STILL)
    engine.current?.setDash(false)
  }, [enabled, engine])

  const handlers = {
    onPointerDown: (ev: ReactPointerEvent<HTMLDivElement>) => {
      const p = toStage(layout, ev.clientX, ev.clientY)
      if (!enabled || stick || !isStickSide(p.x, layout.width)) return
      capture(ev.currentTarget, ev.pointerId)
      options.onManual?.()
      setStick({ id: ev.pointerId, origin: p, at: p })
    },
    onPointerMove: (ev: ReactPointerEvent<HTMLDivElement>) => {
      if (!stick || ev.pointerId !== stick.id) return
      const at = toStage(layout, ev.clientX, ev.clientY)
      setStick({ ...stick, at })
      engine.current?.setMove(stickMove(stick.origin, at))
    },
    onPointerUp: (ev: ReactPointerEvent<HTMLDivElement>) => {
      if (!stick || ev.pointerId !== stick.id) return
      setStick(null)
      engine.current?.setMove(held.current.size ? keyMove(held.current) : STILL)
    },
  }
  const stickView = stick && (
    <div aria-hidden className="pointer-events-none absolute">
      <div className="absolute rounded-full border-2 border-white/40 bg-black/20"
        style={{ left: stick.origin.x - STICK_RADIUS, top: stick.origin.y - STICK_RADIUS, width: STICK_RADIUS * 2, height: STICK_RADIUS * 2 }} />
      {(() => { const k = stickKnob(stick.origin, stick.at); return <div className="absolute size-10 rounded-full bg-white/70" style={{ left: k.x - 20, top: k.y - 20 }} /> })()}
    </div>
  )
  return { handlers: { ...handlers, onPointerCancel: handlers.onPointerUp }, stickView }
}
