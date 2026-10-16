// Every place page's header (uma-racer's `ui/PlaceHeader`; P48): Back, the name, and (i) with the place's blurb and its
// own lines, since explanations live behind (i), never in banners. The game decides where Back goes (`useLeave`).
import { useId, useState, type ReactNode } from 'react'
import { ChevronLeftIcon, InfoIcon } from '../ui/icons'

export function PlaceHeader({ title, onBack, about, words, children }: {
  title: ReactNode
  onBack: () => void
  /** The blurb and lines behind (i); no (i) when undefined. */
  about?: ReactNode
  words: { readonly back: string; readonly about: string }
  /** Trailing content: a counter, an action. */
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const aboutId = useId()
  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-panel/95 backdrop-blur" data-kit="place-header">
      <div className="flex min-h-13 items-center gap-1 px-1.5">
        <button type="button" onClick={onBack} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft" aria-label={words.back}>
          <ChevronLeftIcon />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg">{title}</h1>
        {children}
        {about !== undefined && (
          <button
            type="button"
            onClick={() => setOpen((shown) => !shown)}
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${open ? 'text-accent-strong' : 'text-ink-soft'}`}
            aria-label={words.about}
            aria-expanded={open}
            aria-controls={aboutId}
          >
            <InfoIcon variant={open ? 'duotone' : 'line'} />
          </button>
        )}
      </div>
      {about !== undefined && (
        <div id={aboutId} hidden={!open} className="space-y-1 px-4 pb-3 text-[13px] leading-relaxed text-ink-soft">{about}</div>
      )}
    </header>
  )
}
