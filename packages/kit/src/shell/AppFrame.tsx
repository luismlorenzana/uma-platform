// The app's frame (sibling plan Phase 0 and A2; P48): the top bar, the page between, the bottom bar in the thumb zone.
// A fixed full-screen box, not `h-dvh`: in a Home Screen app with a translucent status bar, iOS can report the dynamic
// viewport a status bar short, which left an empty band under the bottom bar on an iPhone 15. A full-screen flow (a
// fight, a race, a ceremony) passes `fullScreen` and the bars go.
//
// A `tint` (0.12.0, uma-rpg's tiers) shifts the accent and washes the Hub map: theme.css reads it from `<html data-tint>`,
// not from the frame, because sheets portal to `document.body` and must tint too. `day`, the default, sets nothing.
//
// On a landscape `KitStage` (0.18.0, KL1) the frame is a row: `top` becomes the left rail and `bottom` the right rail, so a
// game passes the same bars and they draw themselves as rails (the account and the menu on the left, the actions on the
// right, where the thumbs are). Outside a stage it is exactly as before.
//
// `landscape="rail-and-bar"` (0.20.0, uma-farm's F74) arranges a landscape stage the other way: `bottom` (the pages,
// `BottomBar side="left"`) is a full-height rail down the left edge, and `top` (`AccountBar landscape="bar"`) a thin bar
// across the top of the page column, over the page. The rail clears the stage's left inset, so the column sets
// `--inset-left` to 0 and a `pl-safe` inside it (the bar's) adds nothing. The page keeps clear of the right and bottom
// insets itself, as a page between rails does of the bottom one. The default, `rails`, is the arrangement above.
import { useLayoutEffect, type CSSProperties, type ReactNode } from 'react'
import { useKitStage } from '../ui/stage.js'

/** A look over the theme: `day` is the theme as it is, `dusk` an amber accent, `night` a violet one. */
export const TINTS = ['day', 'dusk', 'night'] as const
export type Tint = (typeof TINTS)[number]

/** How a landscape stage arranges the bars: `rails` (left and right) or `rail-and-bar` (a left rail and a top bar). */
export const LANDSCAPE_ARRANGEMENTS = ['rails', 'rail-and-bar'] as const
export type LandscapeArrangement = (typeof LANDSCAPE_ARRANGEMENTS)[number]

/** The rail clears the stage's left inset, so nothing in the column beside it clears it again. */
const BESIDE_RAIL = { '--inset-left': '0px' } as CSSProperties

export function AppFrame({ top, bottom, children, overlays, fullScreen = false, tint = 'day', landscape = 'rails' }: {
  /** The top bar; on a landscape stage, the left rail (`rails`) or the bar over the page (`rail-and-bar`). */
  top?: ReactNode
  /** The bottom bar; on a landscape stage, the right rail (`rails`) or the left rail (`rail-and-bar`). */
  bottom?: ReactNode
  children: ReactNode
  /** Sheets and panels that sit over everything. */
  overlays?: ReactNode
  fullScreen?: boolean
  /** Applied as `<html data-tint>` while the frame is mounted; `day` removes it. */
  tint?: Tint
  /** On a landscape stage only: `rails` (the default) or `rail-and-bar` (0.20.0). Ignored anywhere else. */
  landscape?: LandscapeArrangement
}) {
  useLayoutEffect(() => {
    if (tint === 'day') return
    const root = document.documentElement
    root.setAttribute('data-tint', tint)
    return () => root.removeAttribute('data-tint')
  }, [tint])
  const stage = useKitStage()

  if (stage?.layout === 'landscape' && landscape === 'rail-and-bar') {
    const rail = !fullScreen && bottom
    return (
      <div className="fixed inset-0 flex flex-row overflow-hidden" data-kit="frame" data-layout="landscape" data-arrangement="rail-and-bar" data-full-screen={fullScreen || undefined}>
        {rail}
        <div className="flex min-w-0 flex-1 flex-col" data-kit="frame-column" style={rail ? BESIDE_RAIL : undefined}>
          {!fullScreen && top}
          <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
        {overlays}
      </div>
    )
  }
  if (stage?.layout === 'landscape') {
    return (
      <div className="fixed inset-0 flex flex-row overflow-hidden" data-kit="frame" data-layout="landscape" data-full-screen={fullScreen || undefined}>
        {!fullScreen && top}
        <div className="relative min-w-0 flex-1 overflow-hidden">{children}</div>
        {!fullScreen && bottom}
        {overlays}
      </div>
    )
  }
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" data-kit="frame" data-full-screen={fullScreen || undefined}>
      {!fullScreen && top}
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      {!fullScreen && bottom}
      {overlays}
    </div>
  )
}
