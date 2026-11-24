// Character Art: published universe pictures and master-data references in the Ranker’s order.
// Private images load at runtime through the authenticated content clients.
import './art.css'
import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Button } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { CONTENT } from '../../content/client'
import { loadAlbum, loadUniverses, looksOf, picturesOf, renderOf, sections, tileOf, umaCount, type AlbumData, type AlbumEntry, type Universe } from './data'
import { imageCountsOf, type WorldImageCount } from './imageCounts'
import { UmaUniverses } from './Universes'

function Tier({ tier }: { tier: AlbumEntry['tier'] }) {
  return <span className={`art-tier tier-${tier ?? 'none'} inline-flex min-w-9 items-center justify-center rounded-xs px-1.5 py-0.5 font-display text-[12px] font-bold text-ink`}>{tier ?? '—'}</span>
}

/** A master data picture, fetched when it scrolls near the screen and held while shown. */
function ArtImg({ path, alt, className, box }: { path: string; alt: string; className?: string; box?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let live = true
    const release = CONTENT.hold(path)
    const start = () => { CONTENT.artUrl(path).then((u) => { if (live) setSrc(u) }, () => undefined) }
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') start()
    else {
      const io = new IntersectionObserver((seen) => { if (seen.some((s) => s.isIntersecting)) { io.disconnect(); start() } }, { rootMargin: '400px' })
      io.observe(el)
      return () => { live = false; io.disconnect(); release() }
    }
    return () => { live = false; release() }
  }, [path])
  return <div ref={ref} className={box}>{src && <img src={src} alt={alt} className={className} />}</div>
}

function ImageCounts({ counts }: { counts: readonly WorldImageCount[] }) {
  return (
    <span role="list" aria-label="Published images by game-world" className="flex w-full flex-col gap-1">
      {counts.map(({ world, count }) => (
        <span role="listitem" key={world} data-world={world} aria-label={`${world}: ${count} images`} title={`${count} published image${count === 1 ? '' : 's'} · ${world}`}
          className="flex items-center justify-between gap-1 rounded-full bg-sunken px-1.5 text-[10px] leading-4 text-ink">
          <span>{world}</span><span className="font-bold tabular-nums">{count}</span>
        </span>
      ))}
    </span>
  )
}

export function UmaTile({ entry, path, counts, onOpen }: { entry: AlbumEntry; path: string | null; counts: readonly WorldImageCount[]; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} title={`${entry.name} · ${entry.title}`} className="relative flex flex-col items-center gap-1 rounded-lg bg-panel p-1.5 text-center">
      {path ? <ArtImg path={path} alt={entry.name} box="size-16" className="size-16 rounded-md object-cover" /> : <div className="size-16 rounded-md bg-sunken" />}
      {entry.sister && <span aria-label="Sister" className="absolute left-1 top-1 size-2.5 rounded-full bg-accent ring-1 ring-panel" />}
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{entry.name}</span>
      <ImageCounts counts={counts} />
    </button>
  )
}

export function Detail({ entry, data, universes, onClose }: { entry: AlbumEntry; data: AlbumData; universes: readonly Universe[]; onClose: () => void }) {
  const worlds = useMemo(() => looksOf(universes, entry.characterId, entry.sister ? entry.outfitId : undefined), [universes, entry])
  const pictures = useMemo(() => picturesOf(data.art, entry), [data.art, entry])
  const render = renderOf(data.art, entry.outfitId)
  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-page pb-safe" role="dialog" aria-label={entry.name}>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-hairline bg-page/95 px-4 py-3 backdrop-blur">
        <Button variant="secondary" size="sm" onClick={onClose}>Back</Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold leading-tight">{entry.name}</h2>
          <p className="truncate text-xs text-ink-soft">{entry.title} · {entry.outfitId}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-ink-soft"><Tier tier={entry.tier} />{entry.order ? `#${entry.order}` : ''}</span>
      </header>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-4">
        {entry.sister && (
          <section className="rounded-lg bg-panel p-3 text-sm">
            <p className="text-ink-soft">{entry.sisterOf}’s {entry.sister.relation} · {entry.sister.age}</p>
            <p className="mt-1">{entry.sister.profile}</p>
          </section>
        )}
        {render && (
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-base font-bold">Full body <span className="text-sm font-normal text-ink-soft">Master data · 3D render · {render.width}×{render.height} · lossless</span></h3>
            <figure className="flex justify-center rounded-lg bg-panel p-3">
              <ArtImg path={render.path} alt={`${entry.name}: full body`} box="flex min-h-96 items-end justify-center" className="max-h-[36rem] w-auto object-contain" />
            </figure>
          </section>
        )}
        {worlds.length > 0 && <UmaUniverses groups={worlds} />}
        <section className="flex flex-col gap-3">
          <h3 className="font-display text-base font-bold">Master data</h3>
          {pictures.length === 0 && <p className="text-sm text-ink-soft">No pictures in this release.</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pictures.map((p) => (
              <figure key={p.path} className="flex flex-col items-center gap-1 rounded-lg bg-panel p-2">
                <ArtImg path={p.path} alt={`${entry.name}: ${p.label}`} box="flex min-h-24 items-center" className="max-h-64 max-w-full object-contain" />
                <figcaption className="text-xs font-semibold">{p.label} <span className="font-normal text-ink-soft">{p.width}×{p.height}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default function ArtScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AlbumData | null>(null)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [showF, setShowF] = useState(false)
  // The universe looks load beside the album: without them every page still shows the rest.
  const [universes, setUniverses] = useState<Universe[]>([])
  useEffect(() => { loadAlbum(true).then(setData, () => setFailed(true)) }, [])
  useEffect(() => { loadUniverses(true).then(setUniverses, () => undefined) }, [])
  const refresh = async () => {
    setRefreshing(true)
    try {
      const [album, worlds] = await Promise.all([loadAlbum(true), loadUniverses(true, { refresh: true })])
      setData(album); setUniverses(worlds); setFailed(false)
    } catch { setFailed(true) } finally { setRefreshing(false) }
  }
  const counts = useMemo(() => {
    if (!data) return new Map<number, WorldImageCount[]>()
    return new Map(data.entries.map(entry => [entry.outfitId, imageCountsOf(data, universes, entry)]))
  }, [data, universes])
  const openId = Number(params.get('o')) || null
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.entries ?? []).filter((e) => !q || e.name.toLowerCase().includes(q) || e.title.toLowerCase().includes(q) || String(e.outfitId).includes(q))
  }, [data, query])
  const layout = useMemo(() => sections(shown), [shown])
  const open = openId ? data?.entries.find((e) => e.outfitId === openId) ?? null : null
  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) { if (v === null) p.delete(k); else p.set(k, v) }
    setParams(p)
  }
  return (
    <AppFrame top={<PlaceHeader title="Uma Character Art" onBack={() => void navigate('/')} words={{ back: 'Uma Platform', about: 'About' }}
      about={<p>In the Ranker’s order: each outfit sits in her tier on Playable Umas; a sister is listed by her own name. Release {data?.release ?? '…'}.</p>} />}>
      <main className="pb-safe h-full overflow-y-auto bg-page" data-testid="art">
        <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-hairline bg-page/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Every Uma{data ? ` · ${data.entries.length}` : ''}</p>
            <Button variant="secondary" size="sm" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? 'Refreshing…' : 'Refresh'}</Button>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, outfit or id" aria-label="Search"
            className="min-h-10 rounded-sm bg-sunken px-3 text-sm text-ink outline-none ring-accent focus:ring-2" />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-4">
          {!data && !failed && <p className="text-center text-ink-soft">Loading</p>}
          {failed && <p className="text-center text-ink-soft">The art didn’t load. Check you’re signed in and online.</p>}
          {data && (
            <div className="flex flex-col gap-4">
              {layout.map((s) => {
                if (s.entries.length === 0 && s.id !== 'F') return null
                const folded = s.id === 'F' && !showF
                return (
                  <section key={s.id} className={`art-section tier-${s.id}`}>
                    <header className="mb-2 flex items-center gap-2">
                      {s.id === 'F'
                        ? <button type="button" onClick={() => setShowF((v) => !v)} aria-expanded={!folded} className="flex items-center gap-2"><Tier tier="F" /><span className="text-sm text-ink-soft">Not used</span><span aria-hidden className="text-ink-faint">{folded ? '▸' : '▾'}</span></button>
                        : s.id === 'unranked' ? <span className="font-display font-bold">Unranked</span> : <Tier tier={s.id} />}
                      <span className="ml-auto text-xs text-ink-soft">{umaCount(s.entries)} Umas · {s.entries.length} outfits</span>
                    </header>
                    {!folded && (
                      <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-8">
                        {s.entries.map((e) => <UmaTile key={e.outfitId} entry={e} path={tileOf(data.art, e.outfitId)} counts={counts.get(e.outfitId) ?? []} onOpen={() => go({ o: String(e.outfitId) })} />)}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
        {open && data && <Detail entry={open} data={data} universes={universes} onClose={() => go({ o: null })} />}
      </main>
    </AppFrame>
  )
}
