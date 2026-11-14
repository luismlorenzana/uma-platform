// A Hub page's map (uma-racer's `hub/HubPage.tsx`, from uma-rpg's HubScreen; P48): the pixel map on a lazy Phaser canvas
// and the DOM place links over it. A mostly sideways drag of more than 60 px moves to the next or previous page in the
// bar's order, with the scene's fade; a swipe that starts and ends on a link isn't a tap on it. The game renders its
// floating pill and side panel beside it.
//
// With `flow="across"` (0.20.0, uma-farm's F74, a landscape stage) the map runs sideways: the trunk road across the middle
// row, the browser panning it left and right (`touch-pan-x`) inside the game's sideways-scrolling box, and a page swipe a
// mostly vertical drag on the stage (up for the next page), read through the stage's turn. The default, `down`, is the
// map as before.
import { useMemo, useRef, type ReactNode } from 'react'
import { toStageDelta, useKitStage } from '../ui/stage.js'
import type { HubFlow } from './grid.js'
import { HubCanvas } from './HubCanvas.js'
import { CROWD_CLEARING, PlaceTargets, type Plaza, type TargetModel } from './PlaceTargets.js'
import { neighbourPage, swipeDirection, swipeDirectionAcross, type Point } from './swipe.js'
import type { Clearing, MapPlace, PageGround } from './types.js'

export interface HubMapPlace extends TargetModel {
  /** The building frame the scene draws. */
  readonly frame: string
}

/** What the Hub scene draws of the places, as one string: ids, frames and spots, nothing that ticks. */
export const sceneKey = (places: readonly MapPlace[]): string => places.map((p) => `${p.id}:${p.frame}:${p.at.x},${p.at.y}`).join('|')

export function HubMap<P extends string>({ label, page, pages, onPage, ground, places, plaza, covered, reducedMotion, canvas, debug, children, flow = 'down' }: {
  /** The map's accessible name, such as "Wilds map". */
  label: string
  page: P
  /** Every page in the bar's order, for swipes. */
  pages: readonly P[]
  onPage: (page: P) => void
  ground: PageGround
  places: readonly HubMapPlace[]
  plaza?: Plaza
  /** A panel or sheet covers the map: the scene pauses and swipes stop. */
  covered: boolean
  reducedMotion: boolean
  canvas?: boolean
  debug?: boolean
  children?: ReactNode
  /** `down` (the default): the road down the middle, the map scrolling up and down. `across` (0.20.0): sideways. */
  flow?: HubFlow
}) {
  const stage = useKitStage()
  const swipeStart = useRef<Point | null>(null)
  const swiped = useRef(false)
  const across = flow === 'across'
  /** Which page a drag asks for: sideways on a map that runs down; up or down the stage on one that runs across. */
  const swipe = (start: Point, end: Point): -1 | 0 | 1 => {
    if (!across) return swipeDirection(start, end)
    const moved = toStageDelta(stage?.turn ?? 0, end.x - start.x, end.y - start.y)
    return swipeDirectionAcross({ x: 0, y: 0 }, moved)
  }
  // The scene re-lays its terrain only when what it draws changes: places' ids, frames and spots, the plaza's spot and
  // the ground. Counts, pips and labels change on every tick and only touch the DOM buttons (0.1.2).
  const placesKey = sceneKey(places)
  const scenePlaces = useMemo<MapPlace[]>(() => places.map((p) => ({ id: p.id, frame: p.frame, at: p.at })), [placesKey])
  // A crowd needs wider clear ground than one figure.
  const crowd = plaza?.figures !== undefined
  const plazaKey = plaza === undefined ? '' : `${plaza.at.x},${plaza.at.y},${crowd}`
  const clearings = useMemo<Clearing[]>(() => (plaza === undefined ? [] : [crowd ? { ...plaza.at, r: CROWD_CLEARING } : plaza.at]), [plazaKey])
  const groundKey = JSON.stringify(ground)
  const sceneGround = useMemo(() => ground, [groundKey])
  return (
    <>
      <main
        aria-label={label}
        className={across ? 'absolute inset-0 touch-pan-x overflow-hidden select-none' : 'absolute inset-0 touch-pan-y overflow-hidden select-none'}
        data-kit="page"
        data-page={page}
        data-flow={across ? 'across' : undefined}
        onPointerDown={(event) => {
          swipeStart.current = { x: event.clientX, y: event.clientY }
          swiped.current = false
        }}
        onPointerUp={(event) => {
          const start = swipeStart.current
          swipeStart.current = null
          if (start === null || covered) return
          const direction = swipe(start, { x: event.clientX, y: event.clientY })
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
        <HubCanvas ground={sceneGround} places={scenePlaces} clearings={clearings} paused={covered} reducedMotion={reducedMotion} canvas={canvas} debug={debug} flow={flow} />
        <PlaceTargets places={places} plaza={plaza} flow={flow} />
      </main>
      {children}
    </>
  )
}
