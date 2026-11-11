// Uma Character Art (CA1, P135), moved from uma-quest's Album (its AlbumScreen.tsx at 6c572e6) and laid out by the Ranker.
// Two tabs: every Uma, in the Ranker's tiers (T1 to T10, then the unranked, then F, collapsed), each outfit as the Uma
// she is (a sister by her own name); and the adult travelers, with all twelve battle keys put together as the fight
// draws them and her ten expressions. Everything is read at run time from the private releases, hash-checked and kept on
// the device; nothing of it is in git.
import './art.css'
import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Button } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { CONTENT } from '../../content/client'
import { KEY_SETS, KEYS } from './content'
import { byPlace, loadAlbum, picturesOf, sections, tileOf, umaCount, type AlbumData, type AlbumEntry } from './data'
import { drawKeyFace, drawKeyPose } from './keyCanvas'
import { KEY_POSES, type KeyPage, type LoadedKeys } from './keys'
import { SpritePlayer } from './SpritePlayer'
import { request } from '../../api/client'

type Keys = LoadedKeys<HTMLImageElement>
const RARITY = { 1: 'R', 2: 'SR', 3: 'SSR' } as const

/** An adult set's source-art record (CA2): its batch's release and her own entry in it. */
interface SourceOutfit { revision: string | null; personality: string | null; ownerWord: string | null; recordedAt: string | null; files: number; bytes: number }
interface SourceRelease {
  batch: string; version: string; publishedAt: string | null; approvedAt: string | null; ownerWord: string | null
  archive: { bytes: number; sha256: string }; files: number; bytes: number; shared: { files: number; bytes: number }; outfits: Record<string, SourceOutfit>
}
let sourcesLoading: Promise<SourceRelease[]> | null = null
const loadSources = (): Promise<SourceRelease[]> => {
  sourcesLoading ??= request<SourceRelease[]>('/api/art/sources')
  sourcesLoading.catch(() => { sourcesLoading = null })
  return sourcesLoading
}
const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—')

function SourceRecord({ outfitId }: { outfitId: number }) {
  const [releases, setReleases] = useState<SourceRelease[] | null>(null)
  useEffect(() => { let live = true; loadSources().then((r) => { if (live) setReleases(r) }, () => { if (live) setReleases([]) }); return () => { live = false } }, [])
  if (!releases) return <p className="text-sm text-ink-soft">Loading</p>
  const release = releases.find((r) => r.outfits[String(outfitId)])
  const own = release?.outfits[String(outfitId)]
  if (!release || !own) return <p className="text-sm text-ink-soft">Not in a source-art release yet.</p>
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-panel p-3 text-sm">
      <dt className="text-ink-soft">Release</dt><dd><code className="text-xs">{release.version}</code> · {release.batch}</dd>
      <dt className="text-ink-soft">Approved</dt><dd>“{own.ownerWord ?? release.ownerWord ?? '—'}” · {day(own.recordedAt ?? release.approvedAt)}</dd>
      <dt className="text-ink-soft">Set</dt><dd>{own.revision ?? '—'} · {own.personality ?? '—'}</dd>
      <dt className="text-ink-soft">Her files</dt><dd>{own.files} · {mb(own.bytes)}</dd>
      <dt className="text-ink-soft">Shared</dt><dd>{release.shared.files} files (references, body standard) · {mb(release.shared.bytes)}</dd>
      <dt className="text-ink-soft">Archive</dt><dd>{release.files} files · {mb(release.archive.bytes)} · published {day(release.publishedAt)}</dd>
    </dl>
  )
}
const EXPRESSIONS = ['default', 'blink-half', 'blink-closed', 'focus', 'shout', 'hurt', 'weary', 'smile', 'surprise', 'worried'] as const
const POSE_LABEL: Record<string, string> = { 'cast-charge': 'cast · charge', 'cast-release': 'cast · release' }

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

const stillUrls = new Map<string, Promise<string>>()
/** A baseline still from the key pack, hash-checked, as an object URL kept for the visit. */
function stillUrl(still: KeyPage): Promise<string> {
  let url = stillUrls.get(still.path)
  if (!url) {
    url = KEYS.pack(still.path, still).then((b) => URL.createObjectURL(new Blob([b as BlobPart], { type: 'image/webp' })))
    url.catch(() => stillUrls.delete(still.path))
    stillUrls.set(still.path, url)
  }
  return url
}

function StillImg({ still, alt, className }: { still: KeyPage; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => { let live = true; stillUrl(still).then((u) => { if (live) setSrc(u) }, () => undefined); return () => { live = false } }, [still])
  return src ? <img src={src} alt={alt} className={className} /> : <div className={className} />
}

/** A traveler's adult keys while she's on screen. */
function useKeys(outfitId: number | null): Keys | null {
  const [keys, setKeys] = useState<Keys | null>(null)
  useEffect(() => {
    if (!outfitId) return
    let live = true
    void KEY_SETS.hold(outfitId).then((k) => { if (live) setKeys(k) }, () => undefined)
    return () => { live = false; setKeys(null); KEY_SETS.release(outfitId, performance.now()) }
  }, [outfitId])
  return keys
}

function PoseCanvas({ keys, pose, expression, className }: { keys: Keys; pose: string; expression?: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => { if (ref.current) drawKeyPose(ref.current, keys, pose, expression ?? null) }, [keys, pose, expression])
  return <canvas ref={ref} className={className} aria-label={pose} />
}

function FaceCanvas({ keys, expression }: { keys: Keys; expression: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => { if (ref.current) drawKeyFace(ref.current, keys, expression) }, [keys, expression])
  return <canvas ref={ref} className="h-20 w-auto" aria-label={expression} />
}

function AdultTile({ entry, onOpen }: { entry: AlbumEntry; onOpen: () => void }) {
  const keys = useKeys(entry.outfitId)
  return (
    <button type="button" onClick={onOpen} className="relative flex flex-col items-center gap-1 rounded-lg bg-panel p-2 text-center shadow-1">
      <span className="absolute left-1.5 top-1.5"><Tier tier={entry.tier} /></span>
      <div className="flex h-44 items-end justify-center">
        {keys?.set.stills ? <StillImg still={keys.set.stills.stand} alt={entry.name} className="max-h-44 w-auto" />
          : keys ? <PoseCanvas keys={keys} pose="ready" className="max-h-44 w-auto" /> : <span className="text-sm text-ink-soft">Loading</span>}
      </div>
      <span className="text-sm font-semibold leading-tight">{entry.name}</span>
      <span className="text-[11px] leading-tight text-ink-soft">{entry.title}</span>
    </button>
  )
}

function UmaTile({ entry, path, onOpen }: { entry: AlbumEntry; path: string | null; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} title={`${entry.name} · ${entry.title}`} className="relative flex flex-col items-center gap-1 rounded-lg bg-panel p-1.5 text-center">
      {path ? <ArtImg path={path} alt={entry.name} box="size-16" className="size-16 rounded-md object-cover" /> : <div className="size-16 rounded-md bg-sunken" />}
      {entry.adult && <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-ink">Adult</span>}
      {entry.sister && <span aria-label="Sister" className="absolute left-1 top-1 size-2.5 rounded-full bg-accent ring-1 ring-panel" />}
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{entry.name}</span>
    </button>
  )
}

function Detail({ entry, data, onClose }: { entry: AlbumEntry; data: AlbumData; onClose: () => void }) {
  const keys = useKeys(entry.adult ? entry.outfitId : null)
  const pictures = useMemo(() => picturesOf(data.art, entry), [data.art, entry])
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
        {entry.adult && (
          <section className="flex flex-col gap-3">
            {keys && <p className="text-xs text-ink-soft">Adult set {keys.set.revision} · {keys.set.archetype} · {keys.set.weapon}</p>}
            {!keys && <p className="text-sm text-ink-soft">Loading her keys</p>}
            {keys?.set.stills && (
              <>
                <h3 className="font-display text-base font-bold">Baseline</h3>
                <div className="grid grid-cols-3 gap-2">
                  {([['stand', 'Standing'], ['head', 'Head'], ['face', 'Face']] as const).map(([k, label]) => {
                    const st = keys.set.stills![k]
                    return (
                      <figure key={k} className="flex flex-col items-center justify-end gap-1 rounded-lg bg-panel p-2">
                        <StillImg still={st} alt={`${entry.name}: ${label}`} className={k === 'stand' ? 'max-h-72 w-auto' : 'w-full max-w-40'} />
                        <figcaption className="text-xs font-semibold">{label} <span className="font-normal text-ink-soft">{st.width}×{st.height}</span></figcaption>
                      </figure>
                    )
                  })}
                </div>
              </>
            )}
            {keys && (
              <>
                <h3 className="font-display text-base font-bold">Battle keys</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {KEY_POSES.map((p) => (
                    <figure key={p} className="flex flex-col items-center gap-1 rounded-lg bg-panel p-2">
                      <div className="flex h-56 items-end"><PoseCanvas keys={keys} pose={p} className="max-h-56 max-w-full" /></div>
                      <figcaption className="text-xs font-semibold">{POSE_LABEL[p] ?? p}</figcaption>
                    </figure>
                  ))}
                </div>
                <h3 className="font-display text-base font-bold">Faces</h3>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {EXPRESSIONS.map((e) => (
                    <figure key={e} className="flex flex-col items-center gap-1 rounded-lg bg-panel p-1">
                      <FaceCanvas keys={keys} expression={e} />
                      <figcaption className="text-[10px]">{e}</figcaption>
                    </figure>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
        {entry.sprite && (
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-base font-bold">Chibi sprites</h3>
            <SpritePlayer outfitId={entry.outfitId} name={entry.name} />
          </section>
        )}
        {entry.adult && (
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-base font-bold">Source art</h3>
            <SourceRecord outfitId={entry.outfitId} />
          </section>
        )}
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
        {(data.cards.get(entry.characterId)?.length ?? 0) > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-base font-bold">{entry.sisterOf ? `${entry.sisterOf}’s support cards` : 'Support cards'} <span className="text-sm font-normal text-ink-soft">{data.cards.get(entry.characterId)!.length}</span></h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.cards.get(entry.characterId)!.map((c) => (
                <figure key={c.id} className="flex flex-col items-center gap-1 rounded-lg bg-panel p-2">
                  {c.art ? <ArtImg path={c.art} alt={c.title} box="flex min-h-24 items-center" className="max-h-56 max-w-full rounded-md object-contain" /> : <div className="h-24 w-full rounded-md bg-sunken" />}
                  <figcaption className="text-center text-xs"><b>{RARITY[c.rarity]}</b> <span className="text-ink-soft">{c.type}</span><br />{c.title}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default function ArtScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AlbumData | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [showF, setShowF] = useState(false)
  useEffect(() => { loadAlbum(true).then(setData, () => setFailed(true)) }, [])
  const tab = params.get('tab') === 'adult' ? 'adult' : 'all'
  const openId = Number(params.get('o')) || null
  const adults = useMemo(() => (data?.entries.filter((e) => e.adult) ?? []).sort(byPlace), [data])
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
          <div className="flex gap-2" role="tablist">
            {(['all', 'adult'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => go({ tab: t === 'adult' ? 'adult' : null })}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold ${tab === t ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink'}`}>
                {t === 'adult' ? `Adult travelers${data ? ` · ${adults.length}` : ''}` : `Every Uma${data ? ` · ${data.entries.length}` : ''}`}
              </button>
            ))}
          </div>
          {tab === 'all' && (
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, outfit or id" aria-label="Search"
              className="min-h-10 rounded-sm bg-sunken px-3 text-sm text-ink outline-none ring-accent focus:ring-2" />
          )}
        </div>
        <div className="mx-auto max-w-5xl px-4 py-4">
          {!data && !failed && <p className="text-center text-ink-soft">Loading</p>}
          {failed && <p className="text-center text-ink-soft">The art didn’t load. Check you’re signed in and online.</p>}
          {data && tab === 'adult' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {adults.map((e) => <AdultTile key={e.outfitId} entry={e} onOpen={() => go({ o: String(e.outfitId) })} />)}
              {adults.length === 0 && <p className="col-span-full text-center text-ink-soft">No adult keys reached this device.</p>}
            </div>
          )}
          {data && tab === 'all' && (
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
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                        {s.entries.map((e) => <UmaTile key={e.outfitId} entry={e} path={tileOf(data.art, e.outfitId)} onOpen={() => go({ o: String(e.outfitId) })} />)}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
        {open && data && <Detail entry={open} data={data} onClose={() => go({ o: null })} />}
      </main>
    </AppFrame>
  )
}
