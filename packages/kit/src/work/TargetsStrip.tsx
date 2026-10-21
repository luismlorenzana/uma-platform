import { useId } from 'react'
import { Link } from 'react-router'
import { CheckIcon, LockedIcon, TargetIcon } from '../ui/icons/index.js'
import { WorkItem } from './art.js'
import { useWork } from './context.js'

export interface WorkTarget {
  readonly id: string; readonly item: string; readonly short: number; readonly label: string
  /** Drawn as a chip in the tile's bottom-right corner, under the shortfall ("G3"), so one family's grades tell apart; `label` still reads it. */
  readonly grade?: number | string | null
  readonly locked?: string | null; readonly to?: string; readonly onPick?: () => void
}
export function TargetsStrip({ targets, className = '' }: { targets: readonly WorkTarget[]; className?: string }) {
  const { copy } = useWork()
  const title = useId()
  if (targets.length === 0) return null
  return <section data-kit="targets-strip" aria-labelledby={title} className={`flex min-w-0 items-center gap-1.5 ${className}`}>
    <h2 id={title} className="sr-only">{copy('targets')}</h2><TargetIcon size={20} className="shrink-0 text-accent-strong" />
    <ul className="flex min-w-0 gap-1.5 overflow-x-auto py-2 pr-2">
      {targets.map((target) => {
        const body = <><WorkItem id={target.item} /><span aria-hidden className="absolute -top-1 -right-1 rounded-full bg-accent px-1 text-[11px] text-accent-ink">{target.short > 0 ? copy('targetShort', { n: target.short }) : <CheckIcon size={16} />}</span>{target.grade != null && <span aria-hidden data-grade={target.grade} className="absolute -right-1 -bottom-1 rounded-full border border-hairline-strong bg-panel px-1 text-[11px] leading-4 font-bold text-ink">{copy('targetGrade', { grade: target.grade })}</span>}{target.locked && <LockedIcon size={16} className="absolute bottom-0 left-0" />}</>
        const label = [target.label, target.locked].filter(Boolean).join('. ')
        const style = 'relative flex size-12 shrink-0 items-center justify-center rounded-sm border border-hairline bg-sunken'
        return <li key={target.id}>{target.to ? <Link className={style} to={target.to} state={{ back: true }} aria-label={label}>{body}</Link>
          : <button type="button" className={style} onClick={target.onPick} disabled={target.onPick === undefined} aria-label={label}>{body}</button>}</li>
      })}
    </ul>
  </section>
}
