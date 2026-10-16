// The tappable, accessible layer over the Phaser map (uma-racer's `hub/PlaceTargets.tsx`, from uma-rpg's D33; P48): one
// link per place, sitting on its building through the scene's own grid math, so the canvas underneath only draws. Each
// covers its building down to the ground line, then its name pill with the counter and its slot pips, and carries the
// Ready badge, a lock when closed, and its VoiceOver line. A plaza is a slot: one figure standing on the road, or a small
// crowd of up to five round it (0.3.0). Links read in map order, row by row, as the eye meets them.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import { LockedIcon } from '../ui/icons/index.js'
import { BUILDING, hubDpr, hubGrid, placeAnchor, TARGET_W, type HubGrid } from './grid.js'
import { Pips, type PipModel } from './Pips.js'
import type { PlaceAt } from './types.js'

export interface TargetModel {
  readonly id: string
  readonly name: string
  readonly at: PlaceAt
  /** Where a tap goes: its side panel, or its page for a direct place. */
  readonly to: string
  readonly state?: unknown
  /** The link's VoiceOver line. */
  readonly label: string
  /** The counter on its name pill; hidden at 0. */
  readonly count?: number | null
  /** The Ready badge's words, such as "3 ready"; none when undefined. */
  readonly ready?: string
  readonly locked?: boolean
  readonly pips?: readonly PipModel[]
  readonly more?: number
}

/** Where a link sits over the map: its top centre on the building's top, or a fraction of the map before it's measured. */
function position(at: PlaceAt, grid: HubGrid | null, lift: number): CSSProperties {
  if (grid === null) return { left: `${at.x * 100}%`, top: `${at.y * 100}%`, transform: `translate(-50%, -${lift}px)` }
  const anchor = placeAnchor(at, grid)
  return { left: anchor.x, top: anchor.y, transform: `translate(-50%, -${lift}px)` }
}

/** The map's size, measured, so the links land on the scene's grid. */
export function useHubGrid(): [RefObject<HTMLDivElement | null>, HubGrid | null] {
  const root = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [root, size !== null && size.w > 0 && size.h > 0 ? hubGrid(size.w, size.h, hubDpr()) : null]
}

function PlaceTarget({ place, grid }: { place: TargetModel; grid: HubGrid | null }) {
  // The tap area covers the building's sprite to its ground line; the name and pips hang below it.
  const tapH = grid === null ? 66 : BUILDING.anchorY * grid.scale
  const tapW = grid === null ? 72 : grid.tile * 3
  const count = place.count ?? 0
  return (
    <Link
      to={place.to}
      state={place.state ?? { back: true }}
      data-place={place.id}
      aria-label={place.label}
      className="group absolute flex flex-col items-center"
      style={{ ...position(place.at, grid, tapH), width: TARGET_W }}
    >
      <span className="relative block rounded-md transition-colors group-active:bg-white/15" style={{ width: tapW, height: tapH }}>
        {place.locked && (
          <span aria-hidden className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-panel/90 text-locked ring-1 ring-hairline-strong">
            <LockedIcon size={16} />
          </span>
        )}
        {place.ready !== undefined && (
          <span aria-hidden data-ready-badge className="font-display absolute -top-1 -right-3 rounded-full bg-success px-1.5 text-[10px] leading-4 font-bold text-ink-on-dark shadow-2">
            {place.ready}
          </span>
        )}
      </span>
      <span aria-hidden className="relative mt-0.5 max-w-full rounded-full border border-hairline bg-panel/95 px-1.5 py-0.5 text-[11px] leading-4 font-semibold text-ink shadow-2">
        <span className={`block truncate ${place.locked ? 'text-ink-faint' : ''}`}>{place.name}</span>
        {count > 0 && (
          <span data-counter={count} className="font-display absolute -top-2 -right-2.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-accent-ink shadow-1">
            {count}
          </span>
        )}
      </span>
      {place.pips !== undefined && place.pips.length > 0 && (
        <span className="mt-0.5 drop-shadow-sm">
          <Pips pips={place.pips} more={place.more} />
        </span>
      )}
    </Link>
  )
}

/** One Uma standing on a plaza: a link or button the game draws, about 44 px. */
export interface PlazaFigure {
  readonly key: string
  readonly node: ReactNode
}

/** Something standing on the map without a building: one `node` lifted `lift` px above its spot, or `figures`. */
export interface Plaza {
  readonly at: PlaceAt
  readonly node?: ReactNode
  readonly lift?: number
  /** A small crowd round the spot, the first in front and the rest in a shallow V behind and beside it (at most 5). */
  readonly figures?: readonly PlazaFigure[]
}

/** The crowd's spots, in tiles from the plaza's ground line: front centre, two behind, two out wide. */
export const CROWD_SPOTS: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: 0, dy: 0 },
  { dx: -1.7, dy: -0.8 },
  { dx: 1.7, dy: -0.8 },
  { dx: -3.2, dy: 0.2 },
  { dx: 3.2, dy: 0.2 },
]
/** How many columns either side of the plaza the crowd needs clear of props. */
export const CROWD_CLEARING = 4

function Crowd({ plaza, grid }: { plaza: Plaza; grid: HubGrid | null }) {
  const tile = grid?.tile ?? 24
  const figures = (plaza.figures ?? []).slice(0, CROWD_SPOTS.length)
  return (
    <div className="absolute size-0" style={position(plaza.at, grid, 0)} data-kit="plaza">
      {figures.map((figure, i) => {
        const spot = CROWD_SPOTS[i]!
        return (
          <div key={figure.key} className="absolute w-max" style={{ left: spot.dx * tile, top: spot.dy * tile, transform: 'translate(-50%, -100%)', zIndex: Math.round(10 + spot.dy * 10) }}>
            {/* Each bobs on its own beat, so the crowd never moves as one. */}
            <div className="kit-bob" style={{ animationDelay: `${-i * 0.53}s` }}>{figure.node}</div>
          </div>
        )
      })}
    </div>
  )
}

/** Map order: top to bottom, then left to right. */
const byMap = (a: { readonly at: PlaceAt }, b: { readonly at: PlaceAt }): number => a.at.y - b.at.y || a.at.x - b.at.x

export function PlaceTargets({ places, plaza }: {
  places: readonly TargetModel[]
  /** Something standing on the map without a building: the featured Uma, or a crowd, on a plaza. */
  plaza?: Plaza
}) {
  const [root, grid] = useHubGrid()
  const items = [
    ...places.map((place) => ({ place, at: place.at })),
    ...(plaza === undefined ? [] : [{ place: null, at: plaza.at }]),
  ].sort(byMap)
  return (
    <div ref={root} className="absolute inset-0" data-kit="place-targets" data-grid={grid === null ? undefined : `${grid.cols}x${grid.rows}`}>
      {items.map((item) => (item.place === null
        ? (plaza!.figures !== undefined
          ? <Crowd key="plaza" plaza={plaza!} grid={grid} />
          : (
            <div key="plaza" className="absolute flex justify-center" style={{ ...position(plaza!.at, grid, plaza!.lift ?? 76), width: TARGET_W }} data-kit="plaza">
              {plaza!.node}
            </div>
          ))
        : <PlaceTarget key={item.place.id} place={item.place} grid={grid} />))}
    </div>
  )
}
