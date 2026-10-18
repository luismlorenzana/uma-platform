import { useState } from 'react'
import { SPEED_TICKET_MS } from '@luismlorenzana/uma-work'
import { Sheet } from '../ui/BottomSheet.js'
import { useItemList, useTap, useWork, TapNoteLine } from './context.js'
import type { RecallPreview, SpeedUpModel } from './model.js'
import { type WorkCopy } from './words.js'

export const WORK_BUTTON = 'font-display inline-flex min-h-11 items-center justify-center rounded-sm border border-hairline-strong bg-panel px-3 text-[14px] font-semibold disabled:opacity-45'

export function speedUpQuestion(model: SpeedUpModel, copy: WorkCopy): string | null {
  if (model.state === 'buy') return copy(model.finish === 1 && model.wastedMinutes > 0 ? 'buyWasteOne' : model.buy === 1 ? 'buyAskOne' : 'buyAsk', {
    n: model.buy, price: model.offer?.label ?? '', minutes: model.wastedMinutes,
  })
  return model.state === 'waste' ? copy('waste', { minutes: model.wastedMinutes }) : null
}

export function SpeedUpControls({ outfitId }: { outfitId: string }) {
  const { view, actions, copy } = useWork()
  const tap = useTap()
  const [askingFor, setAskingFor] = useState<{ readonly start: number; readonly seconds: readonly number[] | undefined } | null>(null)
  const model = view.speed(outfitId)
  const seconds = view.settled.work[outfitId]?.entries.at(-1)?.seconds
  if (model.state === 'hidden') return null
  const question = speedUpQuestion(model, copy)
  const finish = () => {
    const input = { outfitId, startedAt: model.startedAt }
    const action = model.buy > 0
      ? actions.buyAndFinish === undefined || model.offer === null ? undefined : () => actions.buyAndFinish!({ ...input, tickets: model.buy, quote: model.offer! })
      : actions.finish !== undefined ? () => actions.finish!(input) : actions.speedUp === undefined ? undefined : () => actions.speedUp!({ ...input, tickets: model.finish })
    return tap.run(action, () => setAskingFor(null))
  }
  const disabled = tap.pending || (model.buy > 0 ? model.offer === null || actions.buyAndFinish === undefined || !!model.offer.refusal : actions.finish === undefined && actions.speedUp === undefined)
  return <div data-kit="speed-up" data-state={model.state} className="space-y-2">
    {askingFor?.start === model.startedAt && askingFor?.seconds === seconds && question !== null ? <div className="space-y-2 rounded-sm bg-accent-wash p-2 text-[13px]">
      <p>{question}</p>
      <div className="flex gap-2">
        <button type="button" disabled={disabled} onClick={() => void finish()} className={WORK_BUTTON}>{copy('yes')}</button>
        <button type="button" onClick={() => setAskingFor(null)} className={WORK_BUTTON}>{copy('notNow')}</button>
      </div>
    </div> : <div className="flex flex-wrap gap-2">
      {model.have > 0 && model.remainingMs >= SPEED_TICKET_MS && <button type="button" className={WORK_BUTTON} disabled={tap.pending || actions.speedUp === undefined}
        aria-label={copy('cutLabel')} data-action="cut" onClick={() => void tap.run(() => actions.speedUp!({ outfitId, startedAt: model.startedAt, tickets: 1 }))}>{copy('cut')}</button>}
      <button type="button" className={WORK_BUTTON} disabled={disabled} data-action="finish"
        aria-label={model.buy > 0 && model.offer !== null ? copy('buyFinish', { n: model.buy, price: model.offer.label }) : copy(model.finish === 1 ? 'finishLabelOne' : 'finishLabel', { n: model.finish })}
        onClick={() => question === null ? void finish() : setAskingFor({ start: model.startedAt, seconds })}>
        {model.buy > 0 && model.offer !== null ? copy('buyFinish', { n: model.buy, price: model.offer.label }) : copy('finish', { n: model.finish })}
      </button>
    </div>}
    {model.state === 'short' && <p className="text-[13px] text-ink-soft">{copy('ticketsShort', { n: model.finish })}</p>}
    {model.offer?.refusal && <p className="text-[13px] text-ink-soft">{model.offer.refusal}</p>}
    <TapNoteLine tap={tap} />
  </div>
}

export function recallLines(preview: RecallPreview, copy: WorkCopy, list: (items: RecallPreview['paid']) => string): string[] {
  const paid = [list(preview.paid), preview.unlocks > 0 ? copy(preview.unlocks === 1 ? 'unlockOne' : 'unlocks', { n: preview.unlocks }) : ''].filter(Boolean)
  return [
    ...(paid.length > 0 ? [copy('paid', { items: paid.join(', ') })] : []),
    ...(preview.returned.length > 0 ? [copy(preview.returned.length === 1 && preview.returned[0]!.qty === 1 ? 'returnedOne' : 'returned', { items: list(preview.returned) })] : []),
    ...(preview.lostMinutes > 0 ? [copy(preview.lostMinutes === 1 ? 'lostOne' : 'lost', { n: preview.lostMinutes })] : []),
    ...(preview.droppedQueue > 0 ? [copy(preview.droppedQueue === 1 ? 'droppedOne' : 'dropped', { n: preview.droppedQueue })] : []),
    ...(preview.lostMinutes === 0 && preview.droppedQueue === 0 ? [copy('nothingLost')] : []),
  ]
}
export function RecallPreviewLines({ outfitId }: { outfitId: string }) {
  const { view, copy } = useWork()
  const list = useItemList()
  return <ul data-kit="recall-preview" className="space-y-1 text-[14px]">
    {recallLines(view.recall(outfitId), copy, list).map((line) => <li key={line}>{line}</li>)}
  </ul>
}
export function RecallSheet({ outfitId, open, onClose }: { outfitId: string; open: boolean; onClose: () => void }) {
  const { actions, copy, umaName } = useWork()
  const tap = useTap()
  return <Sheet open={open} onClose={onClose} title={copy('recallTitle', { uma: umaName(outfitId) })} closeLabel={copy('close')}>
    <div data-kit="recall" className="space-y-3">
      {open && <RecallPreviewLines outfitId={outfitId} />}
      <TapNoteLine tap={tap} />
      <div className="flex gap-2">
        <button type="button" className={`${WORK_BUTTON} flex-1 text-danger`} disabled={tap.pending || actions.recall === undefined}
          onClick={() => void tap.run(() => actions.recall!({ outfitId }), onClose)}>{copy('recall')}</button>
        <button type="button" className={`${WORK_BUTTON} flex-1`} onClick={onClose}>{copy('notNow')}</button>
      </div>
    </div>
  </Sheet>
}
