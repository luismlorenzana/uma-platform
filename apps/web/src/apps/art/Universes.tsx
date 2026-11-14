// The universe looks in Character Art (CA4, P162): the owner-approved pictures of an Uma in another world, published by
// `pnpm art:push`. They sit on her own page, beside her full-body render and the rest of her input data, universe by
// universe (the owner: "visible on a per-uma basis, on the same menu that shows the full uma input data"). A look opens
// full size. Each PNG is read through the art pack route, checked against its hash and kept on the device.
// CA5 (P169) adds her dialogue portrait pieces under each universe: her outfits' neutral crops and her expressions' faces,
// shown as they are. The page never composes a state; the games do, from the recipe the API gives them.
import { Button } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useRef, useState } from 'react'
import { lookUrl } from './content'
import type { PortraitPiece, Universe, UniverseLook } from './data'

/** What a card and the viewer need of a picture: its pack path, hash and size, and its words. */
type Shown = Pick<UniverseLook, 'id' | 'character' | 'title' | 'path' | 'bytes' | 'sha256' | 'width' | 'height' | 'approvedOn' | 'publishedAt'>
const words = (id: string) => id.split('-').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ')
/** A portrait piece as a picture to show: "Spring · neutral crop", "Happy · face". */
const shownOf = (piece: PortraitPiece, portraits: { approvedOn: string | null; publishedAt: string | null }): Shown => ({
  id: piece.id, character: piece.character, path: piece.path, bytes: piece.bytes, sha256: piece.sha256, width: piece.width, height: piece.height,
  title: piece.kind === 'crop' ? `${words(piece.outfit ?? piece.id)} · neutral crop` : `${words(piece.expression ?? piece.id)} · face`,
  approvedOn: portraits.approvedOn, publishedAt: portraits.publishedAt,
})
/** A light checkerboard behind a face layer, which is see-through but for its features. */
const CHECKER = { backgroundImage: 'repeating-conic-gradient(#0000 0 25%, #8883 0 50%)', backgroundSize: '12px 12px' }

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—')

/** A look's picture, fetched when it scrolls near the screen (or at once when `eager`). */
function LookImg({ look, alt, className, eager }: { look: Shown; alt: string; className?: string; eager?: boolean }) {
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
function LookViewer({ look, universe, onClose }: { look: Shown; universe: Universe; onClose: () => void }) {
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

function LookCard({ look, onOpen, checker }: { look: Shown; onOpen: () => void; checker?: boolean }) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-lg bg-panel shadow-1" data-look={look.id}>
      <button type="button" onClick={onOpen} aria-label={`Open ${look.character}: ${look.title}`} className="block bg-sunken" style={checker ? CHECKER : undefined}>
        <LookImg look={look} alt={`${look.character}: ${look.title}`} className="w-full" />
      </button>
      <figcaption className="flex flex-col gap-0.5 p-2">
        <span className="text-xs font-semibold leading-tight">{look.title}</span>
        <span className="text-[10px] leading-tight text-ink-soft">{look.width}×{look.height} · published {day(look.publishedAt)}</span>
      </figcaption>
    </figure>
  )
}

/** A set of pictures as cards, and the one that is open. */
function Looks({ looks, universe, columns = 'grid-cols-2 sm:grid-cols-5', checker }: { looks: readonly Shown[]; universe: Universe; columns?: string; checker?: boolean }) {
  const [open, setOpen] = useState<Shown | null>(null)
  return (
    <>
      <div className={`grid gap-2 ${columns}`}>
        {looks.map((look) => <LookCard key={look.id} look={look} checker={checker} onOpen={() => setOpen(look)} />)}
      </div>
      {open && <LookViewer look={open} universe={universe} onClose={() => setOpen(null)} />}
    </>
  )
}

const universeLine = (u: Universe, count: number) =>
  [u.style, `${count} look${count === 1 ? '' : 's'}`, u.revision === null ? null : `revision ${u.revision}`, `published ${day(u.publishedAt)}`].filter(Boolean).join(' · ')

/** Her dialogue portrait pieces in one universe: her outfits' neutral crops, then her faces, as they are. */
function Pieces({ pieces, universe }: { pieces: readonly PortraitPiece[]; universe: Universe }) {
  const portraits = universe.portraits ?? { approvedOn: null, publishedAt: null }
  const crops = pieces.filter((p) => p.kind === 'crop').map((p) => shownOf(p, portraits)), faces = pieces.filter((p) => p.kind === 'face').map((p) => shownOf(p, portraits))
  return (
    <div className="flex flex-col gap-2" data-testid="portrait-pieces">
      <p className="text-xs text-ink-soft">
        <b className="font-semibold text-ink">Dialogue portrait pieces</b> · {crops.length} outfit crop{crops.length === 1 ? '' : 's'} and {faces.length} face{faces.length === 1 ? '' : 's'}; the games compose her {crops.length * (faces.length + 1)} states from them · published {day(portraits.publishedAt)}
      </p>
      {crops.length > 0 && <Looks looks={crops} universe={universe} columns="grid-cols-3 sm:grid-cols-6" />}
      {faces.length > 0 && <Looks looks={faces} universe={universe} columns="grid-cols-4 sm:grid-cols-8" checker />}
    </div>
  )
}

/** An Uma's page: her looks in each universe, her splash art (P175), and her dialogue portrait pieces where a universe has them. */
export function UmaUniverses({ groups }: { groups: readonly { universe: Universe; looks: UniverseLook[]; splash?: UniverseLook[]; pieces?: PortraitPiece[] }[] }) {
  const looks = groups.reduce((n, g) => n + g.looks.length, 0), pieces = groups.reduce((n, g) => n + (g.pieces?.length ?? 0), 0)
  const scenes = groups.reduce((n, g) => n + (g.splash?.length ?? 0), 0)
  return (
    <section className="flex flex-col gap-3" data-testid="uma-universes">
      <h3 className="font-display text-base font-bold">Universes <span className="text-sm font-normal text-ink-soft">{looks} approved look{looks === 1 ? '' : 's'}{scenes ? ` · ${scenes} splash image${scenes === 1 ? '' : 's'}` : ''}{pieces ? ` · ${pieces} portrait pieces` : ''}</span></h3>
      {groups.map(({ universe, looks, splash = [], pieces = [] }) => (
        <div key={universe.id} className="flex flex-col gap-2">
          <p className="text-sm"><b className="font-semibold">{universe.title}</b> <span className="text-xs text-ink-soft">{universeLine(universe, looks.length)}</span></p>
          {looks.length > 0 && <Looks looks={looks} universe={universe} />}
          {splash.length > 0 && (
            <div className="flex flex-col gap-2" data-testid="splash-art">
              <p className="text-xs text-ink-soft"><b className="font-semibold text-ink">Splash art</b> · {splash.length} scene{splash.length === 1 ? '' : 's'}</p>
              <Looks looks={splash} universe={universe} columns="grid-cols-1 sm:grid-cols-3" />
            </div>
          )}
          {pieces.length > 0 && <Pieces pieces={pieces} universe={universe} />}
        </div>
      ))}
    </section>
  )
}
