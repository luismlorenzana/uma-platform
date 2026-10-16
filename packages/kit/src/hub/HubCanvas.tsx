// Hosts the lazy Phaser Hub map (uma-racer's `hub/HubCanvas.tsx`, from uma-rpg's; P48): created on mount, destroyed on
// unmount, paused while an overlay or sheet covers it or the page is hidden. The canvas only draws; every tap goes to the
// DOM above it. Without a ResizeObserver (jsdom) no engine starts and the map stays its background colour.
import { useEffect, useRef } from 'react'
import { useKitArt } from '../ui/art'
import type { HubGame } from './scene/createHubGame'
import type { MapPlace, PageGround, PlaceAt } from './types'

export interface HubCanvasProps {
  readonly ground: PageGround
  readonly places: readonly MapPlace[]
  readonly clearings?: readonly PlaceAt[]
  readonly paused: boolean
  readonly reducedMotion: boolean
  /** Force the Canvas renderer (dev previews can't capture WebGL). */
  readonly canvas?: boolean
  /** Expose `window.__hub`. */
  readonly debug?: boolean
}

const NONE: readonly PlaceAt[] = []

export function HubCanvas({ ground, places, clearings = NONE, paused, reducedMotion, canvas = false, debug = false }: HubCanvasProps) {
  const art = useKitArt()
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<HubGame | null>(null)
  const latest = useRef({ ground, places, clearings, reducedMotion })
  latest.current = { ground, places, clearings, reducedMotion }
  const pausedNow = useRef(paused)
  pausedNow.current = paused
  const options = useRef({ art: { tiles: art.tiles, buildings: art.buildings }, canvas, debug })

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    let cancelled = false
    void import('./scene/createHubGame').then(async ({ createHubGame }) => {
      if (cancelled || !host.current) return
      const created = await createHubGame(host.current, latest.current, options.current)
      if (cancelled) {
        created.destroy()
        return
      }
      game.current = created
      created.setPaused(pausedNow.current || document.hidden)
    })
    return () => {
      cancelled = true
      game.current?.destroy()
      game.current = null
    }
  }, [])

  useEffect(() => {
    game.current?.update({ ground, places, clearings, reducedMotion })
  }, [ground, places, clearings, reducedMotion])

  useEffect(() => {
    const apply = () => game.current?.setPaused(paused || document.hidden)
    apply()
    document.addEventListener('visibilitychange', apply)
    return () => document.removeEventListener('visibilitychange', apply)
  }, [paused])

  return (
    <div
      ref={host}
      data-kit="hub-canvas"
      data-paused={paused || undefined}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ backgroundColor: ground.palette.background }}
    />
  )
}
