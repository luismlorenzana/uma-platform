import { isFree, statusOf, type WorkRequest } from '@luismlorenzana/uma-work'
import { useState, type ReactNode } from 'react'
import { UmaPicker, type UmaPickerProps, type UmaPickerRow } from '../album/UmaPicker.js'
import { FaceTile } from '../album/art.js'
import { workOrder } from '../roster/level.js'
import { Sheet } from '../ui/BottomSheet.js'
import { ChevronRightIcon } from '../ui/icons/index.js'
import { WorkItem } from './art.js'
import { useTap, useWork, TapNoteLine } from './context.js'
import { WORK_PRIMARY_BUTTON } from './controls.js'
import type { JobQuery } from './job-query.js'
import type { SizeRule } from './model.js'
import { SizeChips } from './SizeChips.js'
import { chooseSlot, type JobPreview } from './view.js'
import { durationText } from './words.js'

export interface JobSelection { readonly outfitId: string | null; readonly job: string | null; readonly count: number }
export interface JobSheetProps<T extends UmaPickerRow = UmaPickerRow> {
  /** Null closes the sheet. The game reads its URL with readJobQuery and handles Back in onClose. */
  readonly query: JobQuery | null
  readonly building: string; readonly room?: string; readonly title: string
  readonly rows: readonly T[]
  readonly request: (job: string, count: number) => WorkRequest
  /** The game's authored recipes, gear or gem choices. */
  readonly renderWhat: (selection: JobSelection & { readonly onChange: (job: string) => void }) => ReactNode
  readonly initialJob?: (outfitId: string | null) => string | null
  readonly sizeRule?: SizeRule
  /** Keeps the default Who → What → How many flow, or puts quantity before a long authored recipe picker. */
  readonly sizePlacement?: 'before-what' | 'after-what'
  readonly maxCount?: number
  readonly disabled?: (row: T) => string | null
  readonly picker?: Pick<UmaPickerProps<T>, 'facets' | 'sorts' | 'order' | 'describe' | 'dimmed' | 'renderBadges' | 'renderChips' | 'words'>
  readonly renderPreview?: (preview: JobPreview, selection: JobSelection) => ReactNode
  readonly empty?: ReactNode
  readonly onClose: () => void
  readonly onDone?: () => void
}

export function JobSheet<T extends UmaPickerRow>(props: JobSheetProps<T>) {
  if (props.query === null) return null
  // A different link opens a new selection, while the provider's clock never resets the current choice.
  return <JobSheetBody key={JSON.stringify([props.building, props.room, props.query])} {...props} query={props.query} />
}

function JobSheetBody<T extends UmaPickerRow>({ query, building, room, title, rows, request, renderWhat, initialJob, sizeRule, sizePlacement = 'after-what', maxCount, disabled, picker, renderPreview, empty, onClose, onDone }: JobSheetProps<T> & { query: JobQuery }) {
  const { view, copy, actions, umaName, itemName, refusal } = useWork()
  const tap = useTap()
  const [pickerOpen, setPickerOpen] = useState(false)
  const ranked = rows.map((row) => ({ ...row, free: isFree(view.settled, row.id) })).sort(picker?.order ?? workOrder)
  const reason = (row: T): string | null => disabled?.(row) ?? (row.level === null ? copy('locked') : statusOf(view.settled.work[row.id], view.now) === 'working' ? copy('busy') : null)
  const first = ranked.find((row) => row.id === query.uma && (query.queue || reason(row) === null)) ?? ranked.find((row) => reason(row) === null)
  const [uma, setUma] = useState<string | null>(query.queue ? query.uma : first?.id ?? null)
  const [job, setJob] = useState<string | null>(() => query.job ?? initialJob?.(first?.id ?? null) ?? null)
  const [count, setCount] = useState<number | null>(query.count)
  const selected = rows.find((row) => row.id === uma)
  const eligible = selected !== undefined && (query.queue || reason(selected) === null)
  const mode: 'queue' | 'start' = query.queue ? 'queue' : 'start'
  const slot = query.queue && uma !== null ? view.settled.work[uma]?.slot ?? null : chooseSlot(view, building, uma, query.slot, room)
  const samePlace = slot !== null && slot.building === building && slot.room === room
  const one = job === null ? null : request(job, 1)
  const most = one === null ? 1 : Math.min(view.maxItems(one.kind), maxCount ?? view.maxItems(one.kind))
  const many = !eligible || !samePlace || uma === null || job === null || slot === null ? null : view.plan({ outfitId: uma, slot, request: request(job, most), mode })
  const chosenCount = Math.max(1, Math.min(count ?? 1, most, many?.max ?? most))
  const selection = { outfitId: uma, job, count: chosenCount }
  const input = !eligible || !samePlace || uma === null || job === null || slot === null ? null : { outfitId: uma, slot, request: request(job, chosenCount), mode }
  const preview = input === null ? null : view.plan(input)
  const blocked = !eligible ? copy('noUma') : !samePlace ? copy('noSlot') : job === null ? copy('chooseJob') : input === null ? copy('chooseJob') : (() => { const why = view.check(input); return why === null ? null : refusal(why) })()
  const operation = mode === 'queue' ? actions.queue : actions.start
  const done = onDone ?? onClose
  const sizes = many !== null && many.seconds.length > 0
    ? <SizeChips start={many.start} itemSeconds={many.seconds} max={many.max} value={count} onChange={setCount} rule={sizeRule} />
    : null
  const submit = () => input === null ? undefined : tap.run(() => mode === 'queue'
    ? actions.queue!({ outfitId: input.outfitId, add: { request: input.request, building, ...(room === undefined ? {} : { room }) } })
    : actions.start!({ outfitId: input.outfitId, slot: input.slot, request: input.request }), done)
  return <>
    <Sheet open onClose={onClose} title={title} closeLabel={copy('close')} footer={<div className="space-y-1">
      <button type="button" data-action="job-submit" className={`${WORK_PRIMARY_BUTTON} w-full`} disabled={tap.pending || blocked !== null || operation === undefined}
        onClick={() => void submit()}>{preview === null ? copy(mode === 'queue' ? 'queueNext' : 'start') : copy('submit', { action: copy(mode === 'queue' ? 'queueNext' : 'start'), n: chosenCount, time: durationText(preview.ms) })}</button>
      {blocked !== null && <p data-kit="job-why" className="text-[13px] text-ink-soft">{blocked}</p>}<TapNoteLine tap={tap} />
    </div>}>
      <div data-kit="job-sheet" data-building={building} className="space-y-3" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
        <section className="space-y-2" aria-label={copy('who')}>
          <h3 className="text-micro">{query.queue ? copy('queueFor', { uma: uma === null ? '' : umaName(uma) }) : copy('who')}</h3>
          {query.queue ? <p className="text-[14px] font-semibold">{uma === null ? copy('noUma') : umaName(uma)}</p> : <button type="button" onClick={() => setPickerOpen(true)} className="flex min-h-13 w-full items-center gap-3 rounded-sm border border-hairline px-2 py-1.5 text-left" aria-label={copy('chooseUma')}>
            {uma !== null && <span className="w-11 shrink-0"><FaceTile outfitId={uma} size={44} round label="" /></span>}
            <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{selected?.name ?? copy('chooseUma')}</span>
              {selected?.workLevel != null && <span className="text-[12px] text-ink-soft">{copy('workLevelLabel', { level: selected.workLevel })}</span>}</span><ChevronRightIcon size={20} />
          </button>}
          {!eligible && empty}
        </section>
        {eligible && <>
          {sizePlacement === 'before-what' && sizes}
          <section aria-label={copy('what')} className="space-y-2"><h3 className="text-micro">{copy('what')}</h3>{renderWhat({ ...selection, onChange: (next) => { setJob(next); setCount(null); tap.clear() } })}</section>
          {sizePlacement === 'after-what' && sizes}
          {preview !== null && preview.refusal === null && <section className="flex flex-wrap gap-2 text-[13px]">
            {preview.inputs.map((item) => <span key={item.item} aria-label={copy('input', { item: itemName(item.item), have: item.have, need: item.need })} className={`flex items-center gap-1 rounded-full bg-sunken px-2 py-1 ${item.have < item.need ? 'text-danger' : ''}`}><WorkItem id={item.item} size={20} />{item.have}/{item.need}</span>)}
            {renderPreview ? renderPreview(preview, selection) : <span className="ml-auto text-ink-soft">{copy('exp', { n: preview.exp })}</span>}
          </section>}
        </>}
      </div>
    </Sheet>
    <UmaPicker {...picker} open={pickerOpen && !query.queue} onClose={() => setPickerOpen(false)} title={copy('chooseUma')} rows={ranked}
      order={picker?.order ?? workOrder} disabled={reason} selectedIds={uma === null ? [] : [uma]} words={{ level: copy('workLevel'), ...picker?.words }}
      onPick={(ids) => { setUma(ids[0] ?? null); setCount(null); tap.clear() }} />
  </>
}
