import { ArrowUpIcon, CloseIcon, WarningIcon } from '../ui/icons/index.js'
import { useItemList, useTap, useWork, TapNoteLine } from './context.js'
import { WorkItem } from './art.js'
import { durationText } from './words.js'

export function QueueCount({ n }: { n: number }) {
  const { copy } = useWork()
  return n <= 0 ? null : <span aria-label={copy('queued', { n })} className="rounded-full bg-scrim px-1.5 text-[11px] leading-5 font-bold text-ink-on-dark">+{n}</span>
}
export function QueueChips({ outfitId, compact = false }: { outfitId: string; compact?: boolean }) {
  const { view, actions, requestLabel, copy, refusal } = useWork()
  const list = useItemList()
  const tap = useTap()
  const chips = view.queues(outfitId)
  if (chips.length === 0) return null
  return <div data-kit={compact ? 'queue-line' : 'queue-chips'}>
    <ol aria-label={copy('queueTitle')} className={compact ? 'flex flex-wrap gap-1' : 'space-y-1'}>
      {chips.map((chip) => {
        const what = requestLabel(chip.request)
        const name = `${what.name}${what.count === undefined ? '' : ` ×${what.count}`}`
        const label = chip.ms === null ? copy('queueUnknown', { what: name }) : copy('queueLine', { what: name, time: durationText(chip.ms) })
        const warning = chip.refusal !== null ? refusal(chip.refusal) : chip.short.length > 0 ? copy('short', { items: list(chip.short) }) : null
        return <li key={chip.index} data-queued={chip.index} aria-label={[label, warning].filter(Boolean).join('. ')}
          className={`flex items-center gap-1 rounded-sm bg-sunken px-1.5 ${compact ? 'min-h-6 max-w-full text-[11px]' : 'min-h-11 text-[13px]'} ${warning === null ? 'text-ink-soft' : 'text-warning'}`}>
          {what.item !== undefined && <WorkItem id={what.item} size={compact ? 16 : 24} />}
          <span className="min-w-0 flex-1">
            <span className="block truncate">{label}</span>
            {!compact && warning && <span className="block text-[12px]">{warning}</span>}
          </span>
          {warning && <WarningIcon size={16} />}
          {!compact && <>
            {chip.index > 0 && actions.queue && <button type="button" disabled={tap.pending} aria-label={copy('queueUp', { what: name })} className="flex size-11 shrink-0 items-center justify-center"
              onClick={() => void tap.run(() => actions.queue!({ outfitId, move: { from: chip.index, to: chip.index - 1 } }))}><ArrowUpIcon size={20} /></button>}
            {(actions.unqueue || actions.queue) && <button type="button" disabled={tap.pending} aria-label={copy('queueRemove', { what: name })} className="flex size-11 shrink-0 items-center justify-center"
              onClick={() => void tap.run(() => actions.unqueue ? actions.unqueue({ outfitId, index: chip.index }) : actions.queue!({ outfitId, remove: chip.index }))}><CloseIcon size={20} /></button>}
          </>}
        </li>
      })}
    </ol>
    <TapNoteLine tap={tap} />
  </div>
}
export const QueueLine = ({ outfitId }: { outfitId: string }) => <QueueChips outfitId={outfitId} compact />
