import { useEffect, useId } from 'react'
import { CheckIcon, MoonIcon } from '../ui/icons/index.js'
import { useWork } from './context.js'
import { sizeChipsView, type SizeRule } from './model.js'
import { durationText } from './words.js'

export interface SizeChipsProps {
  readonly start: number; readonly itemSeconds: readonly number[]; readonly max: number
  readonly value: number | null; readonly onChange: (size: number) => void
  readonly rule?: SizeRule; readonly heading?: boolean
}
export function SizeChips({ start, itemSeconds, max, value, onChange, rule, heading = true }: SizeChipsProps) {
  const { copy } = useWork()
  const id = useId()
  const view = sizeChipsView(start, itemSeconds, max, rule)
  const chosen = view.chips.some((chip) => chip.size === value) ? value : view.marked
  useEffect(() => { if (chosen !== null && chosen !== value) onChange(chosen) }, [chosen, value, onChange])
  if (view.chips.length === 0) return null
  const Mark = view.overnight ? MoonIcon : CheckIcon
  return <div data-kit="size-chips">
    <h3 id={id} className={heading ? 'text-micro mb-2' : 'sr-only'}>{copy('howMany')}</h3>
    <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-5 gap-1.5">
      {view.chips.map((chip, index) => {
        const marked = chip.size === view.marked && view.fit !== null
        const time = chip.idleMs > 0 ? copy('idle', { time: chip.duration, idle: durationText(chip.idleMs) }) : chip.duration
        return <button key={chip.size} type="button" role="radio" aria-checked={chosen === chip.size}
          tabIndex={chosen === chip.size ? 0 : -1} aria-label={`${copy('sizeLabel', { n: chip.size, time })}${marked ? `, ${view.fit}` : ''}`}
          data-size={chip.size} data-marked={marked || undefined} onClick={() => onChange(chip.size)}
          onKeyDown={(event) => {
            const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index + 1) % view.chips.length
              : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + view.chips.length - 1) % view.chips.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? view.chips.length - 1 : null
            if (next === null) return
            event.preventDefault()
            onChange(view.chips[next]!.size)
            const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
            buttons?.[next]?.focus()
          }}
          className={`relative flex min-h-11 flex-col items-center justify-center rounded-sm border px-0.5 ${chosen === chip.size ? 'border-accent bg-accent-wash text-ink' : 'border-hairline-strong bg-panel text-ink-soft'}`}>
          <span className="text-[14px] font-bold">{copy('size', { n: chip.size })}</span>
          {rule?.mode === 'duration' && <span className="text-[11px] tabular-nums">{chip.duration}</span>}
          {marked && <span aria-hidden className="absolute -top-1.5 -right-1.5 rounded-full bg-accent p-0.5 text-accent-ink"><Mark size={16} /></span>}
        </button>
      })}
    </div>
  </div>
}
