// The quick look as a side panel (uma-rpg's OverlayHost as uma-racer refined it; P48): it slides in from the right over
// 88% of the screen with the Hub dimmed behind, shows the place's quick look and **Enter {place}**, which replaces the
// panel with the place's page so Back returns to the map. A swipe right, a tap on the dimmed Hub, Escape, the close
// button or Back closes it; focus stays inside and goes back where it was. Content that opens its own sheet inside the
// panel (uma-racer's Farm job sheet) keeps working: an Escape another handler already took (`defaultPrevented`) is left
// alone, and a pointer gesture the content stops never reaches the swipe.
import { m } from 'motion/react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CloseIcon, InfoIcon } from '../ui/icons/index.js'
import { swipeDirection, type Point } from '../hub/swipe.js'

const EASE = [0.2, 0, 0, 1] as const
const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function PeekPanel({ title, count, about, onClose, enter, words, children, focusKey }: {
  title: string
  /** A badge beside the title; hidden at 0. */
  count?: number | null
  /** The place's blurb, shown behind (i). */
  about?: ReactNode
  onClose: () => void
  /** The Enter button: the place's page, replacing the panel. */
  enter?: { readonly to: string; readonly label: string; readonly state?: unknown }
  words: { readonly close: string; readonly about: string; readonly backTo: string }
  children: ReactNode
  /** Where focus returns if what opened the panel is gone, such as `[data-place="mine"]`. */
  focusKey?: string
}) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const start = useRef<Point | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    heading.current?.focus()
    setShowAbout(false)
    return () => {
      const target = previous?.isConnected ? previous : focusKey ? document.querySelector<HTMLElement>(focusKey) : null
      target?.focus()
    }
  }, [title, focusKey])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key === 'Escape') {
        close.current()
        return
      }
      if (event.key !== 'Tab' || panel.current === null) return
      const focusable = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const i = focusable.indexOf(document.activeElement as HTMLElement)
      if (event.shiftKey ? i <= 0 : i === -1 || i === focusable.length - 1) {
        event.preventDefault()
        ;(event.shiftKey ? last : first)?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const shown = count !== null && count !== undefined && count > 0 ? count : null
  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-labelledby={titleId} data-kit="peek">
      <m.button
        type="button"
        tabIndex={-1}
        aria-label={words.backTo}
        onClick={() => close.current()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="absolute inset-0 bg-scrim/45"
      />
      <m.div
        ref={panel}
        initial={{ x: 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: EASE }}
        onPointerDown={(event) => { start.current = { x: event.clientX, y: event.clientY } }}
        onPointerUp={(event) => {
          if (start.current !== null && swipeDirection(start.current, { x: event.clientX, y: event.clientY }) === -1) close.current()
          start.current = null
        }}
        onPointerCancel={() => { start.current = null }}
        className="pt-safe pb-safe absolute inset-y-0 right-0 flex w-[88%] max-w-md touch-pan-y flex-col border-l border-hairline-strong bg-panel text-ink shadow-3"
        data-kit="side-panel"
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-hairline py-1 pr-1 pl-4">
          <h2 ref={heading} id={titleId} tabIndex={-1} className="min-w-0 flex-1 truncate text-lg outline-none">{title}</h2>
          {shown !== null && <span className="font-display min-w-5 rounded-full bg-accent px-1.5 text-center text-[12px] leading-5 text-accent-ink">{shown}</span>}
          {about !== undefined && (
            <button
              type="button"
              onClick={() => setShowAbout((open) => !open)}
              aria-label={words.about}
              aria-expanded={showAbout}
              className={`flex size-11 items-center justify-center rounded-full ${showAbout ? 'text-accent-strong' : 'text-ink-soft'}`}
            >
              <InfoIcon variant={showAbout ? 'duotone' : 'line'} />
            </button>
          )}
          <button type="button" onClick={() => close.current()} aria-label={words.close} className="flex size-11 items-center justify-center rounded-full text-ink-soft">
            <CloseIcon size={20} />
          </button>
        </div>
        {showAbout && <div className="shrink-0 px-4 pt-2 text-[13px] leading-relaxed text-ink-soft">{about}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">{children}</div>
        {enter !== undefined && (
          <div className="shrink-0 border-t border-hairline bg-panel/95 p-3">
            <Link
              to={enter.to}
              replace
              state={enter.state}
              className="font-display flex min-h-12 w-full items-center justify-center rounded-sm bg-accent text-base font-bold text-accent-ink shadow-1"
            >
              {enter.label}
            </Link>
          </div>
        )}
      </m.div>
    </div>
  )
}
