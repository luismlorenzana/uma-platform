// The bottom sheet for pickers, confirmations and global sheets (uma-racer's `ui/BottomSheet`, with uma-rpg's title and
// footer; P48). Dragging starts only from the grab handle, so taps inside are never swallowed. The sheet never grows past
// the screen: its content scrolls under a fixed header whose close button and handle stay in reach. Under reduced motion
// it appears and goes without sliding. `Sheet` renders it through a portal, so one can open over another.
//
// Inside a `KitStage` (0.18.0, KL1) it lives on the stage: `Sheet` portals into the stage's layer, the sheet sizes by the
// stage (`cqh`), and the drag to close follows the thumb through the stage's turn. On a landscape stage it comes in from
// the right edge, the stage's full height, its handle on its left edge. Outside a stage it is exactly as before.
//
// `size="wide"` (0.20.0, uma-farm's F74) lets a content-heavy panel on a landscape stage take up to `min(34rem, 75cqw)`
// instead of `min(26rem, 62cqw)`. A bottom sheet is already the stage's or the screen's full width, so it changes nothing
// there.
import { AnimatePresence, m, useDragControls } from 'motion/react'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { openEscapeLayer } from './escape.js'
import { CloseIcon } from './icons/index.js'
import { useReducedMotionSetting } from './motion.js'
import { toStageDelta, useKitStage, type KitStageValue } from './stage.js'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** The dialog's accessible name; also shown as its heading when `title` isn't given. */
  label?: string
  /** A visible heading in the sheet's header. */
  title?: ReactNode
  /** A bar under the scrolling content: the sheet's main action. */
  footer?: ReactNode
  /** Escape closes the sheet (default true). */
  closeOnEscape?: boolean
  closeLabel?: string
  /** A landscape stage's side sheet: `regular` (the default) is at most `min(26rem, 62cqw)` wide, `wide` `min(34rem, 75cqw)`. */
  size?: SheetSize
}

/** How wide a side sheet on a landscape stage gets (0.20.0). */
export const SHEET_SIZES = ['regular', 'wide'] as const
export type SheetSize = (typeof SHEET_SIZES)[number]

const SIDE_WIDTH: Readonly<Record<SheetSize, string>> = {
  regular: 'fixed inset-y-0 right-0 z-50 flex w-[min(26rem,62cqw)]',
  wide: 'fixed inset-y-0 right-0 z-50 flex w-[min(34rem,75cqw)]',
}

/** How far the finger must pull (px), or how fast (px/s), to close the sheet. */
const CLOSE_PULL = 90
const CLOSE_SPEED = 600
/** The sheet moves this share of the pull past its rest, as Motion's elastic drag did. */
const ELASTIC = 0.6
const SPRING = { type: 'spring', stiffness: 420, damping: 38 } as const

export function BottomSheet(props: BottomSheetProps) {
  const stage = useKitStage()
  return stage ? <StageSheet {...props} stage={stage} /> : <ViewportSheet {...props} />
}

function useEscape(open: boolean, closeOnEscape: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open || !closeOnEscape) return
    // Only the topmost open sheet answers, and it answers before anything under it (a side panel). The listener stays
    // registered while the sheet is open, whatever `onClose`'s identity, so the stack keeps its order.
    const layer = openEscapeLayer()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !layer.isTop()) return
      event.preventDefault()
      closeRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      layer.close()
    }
  }, [open, closeOnEscape])
}

function CloseButton({ onClose, closeLabel }: { onClose: () => void; closeLabel: string }) {
  return (
    <button
      type="button"
      aria-label={closeLabel}
      onClick={onClose}
      className="absolute top-0 right-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft"
    >
      <CloseIcon size={20} />
    </button>
  )
}

/** The sheet as it always was: from the viewport's bottom edge, dragged by Motion. */
function ViewportSheet({ open, onClose, children, label, title, footer, closeOnEscape = true, closeLabel = 'Close' }: BottomSheetProps) {
  const dragControls = useDragControls()
  const reducedMotion = useReducedMotionSetting()
  useEscape(open, closeOnEscape, onClose)

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            className="fixed inset-0 z-40 bg-scrim/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-label={label ?? (typeof title === 'string' ? title : undefined)}
            aria-modal="true"
            data-kit="sheet"
            className="pb-safe fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-lg border-t border-hairline bg-panel text-ink shadow-3"
            initial={reducedMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : SPRING}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: ELASTIC }}
            onDragEnd={(_, info) => {
              if (info.offset.y > CLOSE_PULL || info.velocity.y > CLOSE_SPEED) onClose()
            }}
          >
            <div className="relative shrink-0">
              <div className="flex h-8 cursor-grab touch-none items-center justify-center" onPointerDown={(event) => dragControls.start(event)} aria-hidden>
                <div className="h-1.5 w-12 rounded-full bg-ink/20" />
              </div>
              <CloseButton onClose={onClose} closeLabel={closeLabel} />
              {title !== undefined && <h2 className="truncate px-4 pr-14 pb-2 text-lg">{title}</h2>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
            {footer !== undefined && <div className="shrink-0 border-t border-hairline bg-panel px-4 py-3">{footer}</div>}
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * The pull of a drag on the stage, along the direction that closes the sheet: pointer movement mapped through the turn,
 * so a downward (or, on a landscape stage, rightward) swipe on the stage moves the sheet however the stage is turned.
 * The pull moves `panel` by its inline transform, with a CSS transition back to rest, so a portrait game's bundle gains
 * nothing from Motion for it (uma-rpg's size budget, KL1).
 */
function useStageDrag(stage: KitStageValue, axis: 'x' | 'y', onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; along: number; at: number; speed: number } | null>(null)
  const along = (event: ReactPointerEvent) => {
    const start = drag.current!
    const delta = toStageDelta(stage.turn, event.clientX - start.x, event.clientY - start.y)
    return axis === 'x' ? delta.x : delta.y
  }
  const pullTo = (px: number, settle: boolean) => {
    const element = panel.current
    if (!element) return
    element.style.transition = settle ? 'transform 220ms cubic-bezier(0.2, 0, 0, 1)' : ''
    element.style.transform = px === 0 ? '' : `translate${axis.toUpperCase()}(${px}px)`
  }
  return {
    panel,
    handle: {
      onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        event.currentTarget.setPointerCapture?.(event.pointerId)
        drag.current = { x: event.clientX, y: event.clientY, along: 0, at: event.timeStamp, speed: 0 }
      },
      onPointerMove(event: ReactPointerEvent<HTMLElement>) {
        const state = drag.current
        if (!state) return
        const now = along(event)
        const elapsed = event.timeStamp - state.at
        if (elapsed > 0) state.speed = ((now - state.along) / elapsed) * 1000
        state.along = now
        state.at = event.timeStamp
        pullTo(Math.max(0, now) * ELASTIC, false)
      },
      onPointerUp(event: ReactPointerEvent<HTMLElement>) {
        const state = drag.current
        if (!state) return
        const now = along(event)
        drag.current = null
        if (now > CLOSE_PULL || state.speed > CLOSE_SPEED) onClose()
        else pullTo(0, true)
      },
      onPointerCancel() {
        drag.current = null
        pullTo(0, true)
      },
    },
  }
}

/** The sheet on a `KitStage`: portalled into its layer, sized by it, dragged through its turn. */
function StageSheet({ stage, open, onClose, children, label, title, footer, closeOnEscape = true, closeLabel = 'Close', size = 'regular' }: BottomSheetProps & { stage: KitStageValue }) {
  const reducedMotion = useReducedMotionSetting()
  const side = stage.layout === 'landscape'
  const { panel, handle } = useStageDrag(stage, side ? 'x' : 'y', onClose)
  useEscape(open, closeOnEscape, onClose)

  const away = side ? { x: '100%' } : { y: '100%' }
  // On the side the close button and the title share one 44 pt row; at the bottom, the handle sits above them as before.
  const header = side ? (
    <div className="relative flex min-h-11 shrink-0 items-center pr-12">
      {title !== undefined && <h2 className="truncate pl-4 text-lg">{title}</h2>}
      <CloseButton onClose={onClose} closeLabel={closeLabel} />
    </div>
  ) : (
    <div className="relative shrink-0">
      <div className="flex h-8 cursor-grab touch-none items-center justify-center" {...handle} aria-hidden>
        <div className="h-1.5 w-12 rounded-full bg-ink/20" />
      </div>
      <CloseButton onClose={onClose} closeLabel={closeLabel} />
      {title !== undefined && <h2 className="truncate px-4 pr-14 pb-2 text-lg">{title}</h2>}
    </div>
  )
  const column = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
      {footer !== undefined && <div className="shrink-0 border-t border-hairline bg-panel px-4 py-3">{footer}</div>}
    </div>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            className="fixed inset-0 z-40 bg-scrim/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-label={label ?? (typeof title === 'string' ? title : undefined)}
            aria-modal="true"
            data-kit="sheet"
            data-placement={side ? 'side' : 'bottom'}
            data-size={side && size === 'wide' ? 'wide' : undefined}
            className={side ? SIDE_WIDTH[size] : 'fixed inset-x-0 bottom-0 z-50 flex max-h-[92cqh]'}
            initial={reducedMotion ? false : away}
            animate={side ? { x: 0 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : away}
            transition={reducedMotion ? { duration: 0 } : SPRING}
          >
            <div
              ref={panel}
              className={side
                ? 'pt-safe pb-safe pr-safe flex min-w-0 flex-1 flex-row rounded-l-lg border-l border-hairline bg-panel text-ink shadow-3'
                : 'pb-safe flex min-h-0 flex-1 flex-col rounded-t-lg border-t border-hairline bg-panel text-ink shadow-3'}
            >
              {side ? (
                <>
                  <div className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center" {...handle} aria-hidden data-kit="sheet-handle">
                    <div className="h-12 w-1.5 rounded-full bg-ink/20" />
                  </div>
                  {column}
                </>
              ) : column}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

/** The bottom sheet through a portal, so a sheet can open from inside another one; on a stage, into its layer. */
export function Sheet(props: BottomSheetProps) {
  const stage = useKitStage()
  if (typeof document === 'undefined') return null
  if (stage) return stage.layer ? createPortal(<BottomSheet {...props} />, stage.layer) : null
  return createPortal(<BottomSheet {...props} />, document.body)
}
