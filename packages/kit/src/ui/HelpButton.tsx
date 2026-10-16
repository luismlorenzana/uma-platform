// The (i) button (uma-rpg's `ui/HelpButton`; P48): explanations live behind (i), never in banners. A 44 pt target that
// opens its text in a bottom sheet.
import { useState, type ReactNode } from 'react'
import { Sheet } from './BottomSheet'
import { InfoIcon } from './icons'

export function HelpButton({ title, children, className = '', label }: { title: string; children: ReactNode; className?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // Help inside a tappable card opens only the help.
          event.stopPropagation()
          setOpen(true)
        }}
        aria-label={label ?? `About ${title}`}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${open ? 'text-accent-strong' : 'text-ink-soft'} ${className}`}
      >
        <InfoIcon size={20} variant={open ? 'duotone' : 'line'} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-2 text-[14px] leading-relaxed text-ink-soft">{children}</div>
      </Sheet>
    </>
  )
}
