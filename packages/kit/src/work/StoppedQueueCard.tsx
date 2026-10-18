import type { ReactNode } from 'react'
import { FaceTile } from '../album/art.js'
import { useItemList, useTap, useWork, TapNoteLine } from './context.js'
import { WORK_BUTTON } from './controls.js'
import { durationText } from './words.js'

export function StoppedQueueCard({ outfitId, children, onDone }: { outfitId: string; children?: ReactNode; onDone?: () => void }) {
  const { view, copy, actions, umaName, placeName, requestLabel, refusal } = useWork()
  const list = useItemList()
  const tap = useTap()
  const dropped = view.settled.work[outfitId]?.dropped
  if (dropped == null) return null
  const why = dropped.refused !== null ? refusal(dropped.refused) : copy('short', { items: list(dropped.short) })
  const blocked = view.restart(outfitId)
  return <article data-kit="stopped-queue" data-outfit={outfitId} aria-label={copy('stopped', { uma: umaName(outfitId) })} className="space-y-2 rounded-md border border-warning/40 bg-panel p-3 shadow-1">
    <div className="flex items-center gap-3"><span className="w-10 shrink-0"><FaceTile outfitId={outfitId} size={40} round label="" /></span>
      <span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{umaName(outfitId)}</span><span className="block text-[13px] text-ink-soft">{copy('stoppedLine', { place: placeName(dropped.slot.building), time: durationText(Math.max(0, view.now - dropped.at)) })}</span></span>
    </div>
    <p className="text-[13px]">{dropped.requests.map((request) => { const label = requestLabel(request); return `${label.name}${label.count === undefined ? '' : ` ×${label.count}`}` }).join(' · ')}</p>
    <p className="text-[13px] text-warning">{why}</p>
    <div className="flex flex-wrap gap-2">
      {actions.restart && <button type="button" className={WORK_BUTTON} disabled={tap.pending || blocked !== null} data-action="restart" onClick={() => void tap.run(() => actions.restart!({ outfitId }), onDone)}>{copy('restart')}</button>}
      {actions.dismiss && <button type="button" className={WORK_BUTTON} disabled={tap.pending} data-action="dismiss" onClick={() => void tap.run(() => actions.dismiss!({ outfitId }), onDone)}>{copy('dismiss')}</button>}
      {children}
    </div>
    {blocked && <p className="text-[12px] text-ink-soft">{refusal(blocked)}</p>}
    <TapNoteLine tap={tap} />
  </article>
}
