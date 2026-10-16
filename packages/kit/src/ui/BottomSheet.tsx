// The bottom sheet for pickers, confirmations and global sheets (uma-racer's `ui/BottomSheet`, with uma-rpg's title and
// footer; P48). Dragging starts only from the grab handle, so taps inside are never swallowed. The sheet never grows past
// the screen: its content scrolls under a fixed header whose close button and handle stay in reach. Under reduced motion
// it appears and goes without sliding. `Sheet` renders it through a portal, so one can open over another.
import { AnimatePresence, m, useDragControls } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'
import { useReducedMotionSetting } from './motion'

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
}

export function BottomSheet({ open, onClose, children, label, title, footer, closeOnEscape = true, closeLabel = 'Close' }: BottomSheetProps) {
  const dragControls = useDragControls()
  const reducedMotion = useReducedMotionSetting()

  useEffect(() => {
    if (!open || !closeOnEscape) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // The sheet answers Escape before anything under it (a side panel).
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, closeOnEscape, onClose])

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
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose()
            }}
          >
            <div className="relative shrink-0">
              <div className="flex h-8 cursor-grab touch-none items-center justify-center" onPointerDown={(event) => dragControls.start(event)} aria-hidden>
                <div className="h-1.5 w-12 rounded-full bg-ink/20" />
              </div>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={onClose}
                className="absolute top-0 right-1 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft"
              >
                <CloseIcon size={20} />
              </button>
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

/** The bottom sheet through a portal, so a sheet can open from inside another one. */
export function Sheet(props: BottomSheetProps) {
  if (typeof document === 'undefined') return null
  return createPortal(<BottomSheet {...props} />, document.body)
}
