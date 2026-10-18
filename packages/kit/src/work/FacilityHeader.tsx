import { useState, type ReactNode } from 'react'
import { Sheet } from '../ui/BottomSheet.js'
import { LevelUpIcon, StopwatchIcon, ViewGridIcon } from '../ui/icons/index.js'
import { WorkItem } from './art.js'
import { useTap, useWork, TapNoteLine } from './context.js'
import { WORK_BUTTON } from './controls.js'

export function PlaceStats({ level, used, slots, speed }: { level: number; used: number; slots: number; speed: number }) {
  const { copy } = useWork()
  const chip = 'inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-sunken px-2 text-[13px] font-semibold tabular-nums'
  return <div data-kit="place-stats" className="flex min-w-0 flex-wrap items-center gap-1.5">
    <span className="sr-only">{copy('stats', { level, used, slots, speed })}</span>
    <span aria-hidden className={chip}>{copy('level', { level })}</span>
    <span aria-hidden className={chip}><ViewGridIcon size={16} />{used}/{slots}</span>
    {speed > 1 && <span aria-hidden className={chip}><StopwatchIcon size={16} />×{speed}</span>}
  </div>
}

export function UpgradeButton({ building }: { building: string }) {
  const { view, copy, actions, placeName, itemName, refusal, money } = useWork()
  const [open, setOpen] = useState(false)
  const tap = useTap()
  const next = view.upgrade(building)
  if (next === null || actions.upgrade === undefined) return null
  const title = copy('upgrade', { level: next.to })
  return <>
    <button type="button" data-action="upgrade" onClick={() => setOpen(true)} aria-label={title}
      className={`${WORK_BUTTON} shrink-0 gap-1 rounded-full px-2.5 text-[13px]`}><LevelUpIcon size={16} />{money(next.money)}</button>
    <Sheet open={open} onClose={() => setOpen(false)} title={title} closeLabel={copy('close')}>
      <div data-kit="upgrade" className="space-y-3">
        <p className="text-[14px] font-semibold">{[next.slots > next.slotsNow ? copy('upgradeSlots', { n: next.slots }) : null, next.speed > next.speedNow ? copy('upgradeSpeed', { speed: next.speed }) : null].filter(Boolean).join(' · ')}</p>
        <ul className="flex flex-wrap gap-2 text-[13px]">
          {next.money > 0 && <li className={`flex min-h-9 items-center gap-1 rounded-sm bg-sunken px-2 ${next.haveMoney < next.money ? 'text-danger' : ''}`}>{money(next.haveMoney)} / {money(next.money)}</li>}
          {next.items.map((item) => <li key={item.item} aria-label={copy('upgradeItem', { item: itemName(item.item), have: item.have, need: item.need })}
            className={`flex min-h-9 items-center gap-1 rounded-sm bg-sunken px-2 ${item.have < item.need ? 'text-danger' : ''}`}><WorkItem id={item.item} size={24} />{item.have}/{item.need}</li>)}
        </ul>
        <p className="text-[13px]">{next.refusal === null ? copy('upgradeAsk', { place: placeName(building), level: next.to }) : refusal(next.refusal)}</p>
        <TapNoteLine tap={tap} />
        <div className="flex gap-2">
          <button type="button" disabled={tap.pending || next.refusal !== null} className={`${WORK_BUTTON} flex-1`} onClick={() => void tap.run(() => actions.upgrade!({ building }), () => setOpen(false))}>{copy('yes')}</button>
          <button type="button" className={`${WORK_BUTTON} flex-1`} onClick={() => setOpen(false)}>{copy('notNow')}</button>
        </div>
      </div>
    </Sheet>
  </>
}

export function FacilityHeader({ building, children, className = '' }: { building: string; children?: ReactNode; className?: string }) {
  const { view } = useWork()
  return <div data-kit="facility-header" className={`flex min-h-13 items-center justify-between gap-2 border-b border-hairline py-1 ${className}`}>
    <PlaceStats {...view.facility(building)} />
    <UpgradeButton building={building} />{children}
  </div>
}
