// The universe looks in Character Art (CA4, P162): the owner-approved pictures of an Uma in another world, published by
// `pnpm art:push`. They sit on her own page, beside her full-body render and the rest of her input data, universe by
// universe (the owner: "visible on a per-uma basis, on the same menu that shows the full uma input data"). A look opens
// full size. Each PNG is read through the art pack route, checked against its hash and kept on the device.
import { Button } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useRef, useState } from 'react'
import { lookUrl } from './content'
import type { Universe, UniverseLook } from './data'

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—')

/** A look's picture, fetched when it scrolls near the screen (or at once when `eager`). */
function LookImg({ look, alt, className, eager }: { look: UniverseLook; alt: string; className?: string; eager?: boolean }) {
  const [src, setSrc] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let live = true
    const start = () => { lookUrl(look).then((u) => { if (live) setSrc(u) }, () => undefined) }
    const el = ref.current
    if (eager || !el || typeof IntersectionObserver === 'undefined') { start(); return () => { live = false } }
    const io = new IntersectionObserver((seen) => { if (seen.some((s) => s.isIntersecting)) { io.disconnect(); start() } }, { rootMargin: '400px' })
    io.observe(el)
    return () => { live = false; io.disconnect() }
  }, [look, eager])
  return (
    <div ref={ref} className={className} style={eager ? undefined : { aspectRatio: `${look.width} / ${look.height}` }}>
      {src && <img src={src} alt={alt} className={eager ? 'max-h-full max-w-full object-contain' : 'size-full object-contain'} />}
    </div>
  )
}

/** One look, full size, over the page. */
function LookViewer({ look, universe, onClose }: { look: UniverseLook; universe: Universe; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-page pb-safe" role="dialog" aria-label={`${look.character}: ${look.title}`} data-testid="look-viewer">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
        <Button variant="secondary" size="sm" onClick={onClose}>Back</Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold leading-tight">{look.character} · {look.title}</h2>
          <p className="truncate text-xs text-ink-soft">{universe.title}{universe.style ? ` · ${universe.style}` : ''} · {look.width}×{look.height} · approved {day(look.approvedOn)} · published {day(look.publishedAt)}</p>
        </div>
      </header>
      <LookImg look={look} eager alt={`${look.character}: ${look.title}, ${universe.title}`} className="flex min-h-0 flex-1 items-center justify-center p-4" />
    </div>
  )
}

function LookCard({ look, onOpen }: { look: UniverseLook; onOpen: () => void }) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-lg bg-panel shadow-1" data-look={look.id}>
      <button type="button" onClick={onOpen} aria-label={`Open ${look.character}: ${look.title}`} className="block bg-sunken">
        <LookImg look={look} alt={`${look.character}: ${look.title}`} className="w-full" />
      </button>
      <figcaption className="flex flex-col gap-0.5 p-2">
        <span className="text-xs font-semibold leading-tight">{look.title}</span>
        <span className="text-[10px] leading-tight text-ink-soft">{look.width}×{look.height} · published {day(look.publishedAt)}</span>
      </figcaption>
    </figure>
  )
}

/** A set of looks as cards, and the one that is open. */
function Looks({ looks, universe }: { looks: readonly UniverseLook[]; universe: Universe }) {
  const [open, setOpen] = useState<UniverseLook | null>(null)
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {looks.map((look) => <LookCard key={look.id} look={look} onOpen={() => setOpen(look)} />)}
      </div>
      {open && <LookViewer look={open} universe={universe} onClose={() => setOpen(null)} />}
    </>
  )
}

const universeLine = (u: Universe, count: number) =>
  [u.style, `${count} look${count === 1 ? '' : 's'}`, u.revision === null ? null : `revision ${u.revision}`, `published ${day(u.publishedAt)}`].filter(Boolean).join(' · ')

/** An Uma's page: her looks in each universe. */
export function UmaUniverses({ groups }: { groups: readonly { universe: Universe; looks: UniverseLook[] }[] }) {
  return (
    <section className="flex flex-col gap-3" data-testid="uma-universes">
      <h3 className="font-display text-base font-bold">Universes <span className="text-sm font-normal text-ink-soft">{groups.reduce((n, g) => n + g.looks.length, 0)} approved looks</span></h3>
      {groups.map(({ universe, looks }) => (
        <div key={universe.id} className="flex flex-col gap-2">
          <p className="text-sm"><b className="font-semibold">{universe.title}</b> <span className="text-xs text-ink-soft">{universeLine(universe, looks.length)}</span></p>
          <Looks looks={looks} universe={universe} />
        </div>
      ))}
    </section>
  )
}
