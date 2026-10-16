// A Hub page's map (uma-racer's `hub/HubPage.tsx`, from uma-rpg's HubScreen; P48): the pixel map on a lazy Phaser canvas
// and the DOM place links over it. A mostly sideways drag of more than 60 px moves to the next or previous page in the
// bar's order, with the scene's fade; a swipe that starts and ends on a link isn't a tap on it. The game renders its
// floating pill and side panel beside it.
import { useMemo, useRef, type ReactNode } from 'react'
import { HubCanvas } from './HubCanvas.js'
import { PlaceTargets, type TargetModel } from './PlaceTargets.js'
import { neighbourPage, swipeDirection, type Point } from './swipe.js'
import type { MapPlace, PageGround, PlaceAt } from './types.js'

export interface HubMapPlace extends TargetModel {
  /** The building frame the scene draws. */
  readonly frame: string
}

export function HubMap<P extends string>({ label, page, pages, onPage, ground, places, plaza, covered, reducedMotion, canvas, debug, children }: {
  /** The map's accessible name, such as "Wilds map". */
  label: string
  page: P
  /** Every page in the bar's order, for swipes. */
  pages: readonly P[]
  onPage: (page: P) => void
  ground: PageGround
  places: readonly HubMapPlace[]
  plaza?: { readonly at: PlaceAt; readonly node: ReactNode; readonly lift?: number }
  /** A panel or sheet covers the map: the scene pauses and swipes stop. */
  covered: boolean
  reducedMotion: boolean
  canvas?: boolean
  debug?: boolean
  children?: ReactNode
}) {
  const swipeStart = useRef<Point | null>(null)
  const swiped = useRef(false)
  const scenePlaces = useMemo<MapPlace[]>(() => places.map((p) => ({ id: p.id, frame: p.frame, at: p.at })), [places])
  const clearings = useMemo<PlaceAt[]>(() => (plaza === undefined ? [] : [plaza.at]), [plaza])
  return (
    <>
      <main
        aria-label={label}
        className="absolute inset-0 touch-pan-y overflow-hidden select-none"
        data-kit="page"
        data-page={page}
        onPointerDown={(event) => {
          swipeStart.current = { x: event.clientX, y: event.clientY }
          swiped.current = false
        }}
        onPointerUp={(event) => {
          const start = swipeStart.current
          swipeStart.current = null
          if (start === null || covered) return
          const direction = swipeDirection(start, { x: event.clientX, y: event.clientY })
          const next = direction === 0 ? null : neighbourPage(pages, page, direction)
          if (direction !== 0) swiped.current = true
          if (next !== null) onPage(next)
        }}
        onPointerCancel={() => { swipeStart.current = null }}
        onClickCapture={(event) => {
          if (!swiped.current) return
          swiped.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <HubCanvas ground={ground} places={scenePlaces} clearings={clearings} paused={covered} reducedMotion={reducedMotion} canvas={canvas} debug={debug} />
        <PlaceTargets places={places} plaza={plaza} />
      </main>
      {children}
    </>
  )
}
