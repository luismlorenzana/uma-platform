// Uma Enemy Art (EA1, P183): the enemy looks the owner approved, in a section of their own, apart from Character Art
// (the owner: "approved enemy looks should go into a completely new section"). A tab for each game with enemies, Uma
// Cyberpunk first and Uma Quest next; in each, the factions in their published order, and in a faction each boss under
// her own name (P186) with her looks: her base first, the pilot suit both enemy albums hold (P191), then her casual ones
// (EA3), then her armour looks; then the faction's lieutenants, each under her own name (EA4, P201). A look opens full size. Each PNG
// is read through this sub-app's pack route, checked against its hash and kept on the device.
import { AppFrame, PlaceHeader } from '@luismlorenzana/uma-kit/shell'
import { Button } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { lookUrl } from './content'
import { bossCount, bossesOf, chosenTab, day, gameTabs, lieutenantCount, loadGames, lookCount, plural, type EnemyFaction, type EnemyGame, type EnemyLook } from './data'

const bosses = (n: number) => `${n} boss${n === 1 ? '' : 'es'}`

/** A look's picture, fetched when it scrolls near the screen (or at once when `eager`). */
function LookImg({ look, alt, className, eager }: { look: EnemyLook; alt: string; className?: string; eager?: boolean }) {
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
function Viewer({ look, game, faction, onClose }: { look: EnemyLook; game: EnemyGame; faction: EnemyFaction; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-page pb-safe" role="dialog" aria-label={`${look.character}: ${look.title}`} data-testid="enemy-viewer">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
        <Button variant="secondary" size="sm" onClick={onClose}>Back</Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold leading-tight">{look.character} · {look.title}</h2>
          <p className="truncate text-xs text-ink-soft">{game.title} · {faction.title} · {look.width}×{look.height} · approved {day(look.approvedOn)} · published {day(look.publishedAt)}</p>
        </div>
      </header>
      <LookImg look={look} eager alt={`${look.character}: ${look.title}, ${faction.title}`} className="flex min-h-0 flex-1 items-center justify-center p-4" />
    </div>
  )
}

/** One look of a boss: her name is the group's title, so the card names the look. */
function LookCard({ look, onOpen }: { look: EnemyLook; onOpen: () => void }) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-lg bg-panel shadow-1" data-look={look.id} data-kind={look.kind}>
      <button type="button" onClick={onOpen} aria-label={`Open ${look.character}: ${look.title}`} className="block bg-sunken">
        <LookImg look={look} alt={`${look.character}: ${look.title}`} className="w-full" />
      </button>
      <figcaption className="flex flex-col gap-0.5 p-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
          {look.title}
          {(look.kind === 'base' || look.kind === 'casual') && <span className="rounded-full bg-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{look.kind === 'base' ? 'Base' : 'Casual'}</span>}
        </span>
        <span className="text-[10px] leading-tight text-ink-faint">approved {day(look.approvedOn)} · published {day(look.publishedAt)}</span>
      </figcaption>
    </figure>
  )
}

/** A game's enemies: its factions in their published order, and in each faction every boss under her own name. */
function Game({ game, onOpen }: { game: EnemyGame; onOpen: (look: EnemyLook, faction: EnemyFaction) => void }) {
  const looks = lookCount(game)
  return (
    <div className="flex flex-col gap-6" data-testid="enemy-game" data-game={game.id}>
      <p className="text-sm text-ink-soft">{plural(looks, 'approved enemy look')} of {bosses(bossCount(game))}{lieutenantCount(game) ? ` and ${plural(lieutenantCount(game), 'lieutenant')}` : ''} in {plural(game.factions.length, 'faction')} · published {day(game.publishedAt)}</p>
      {game.factions.map((faction) => {
        const group = bossesOf(faction)
        return (
          <section key={faction.id} className="flex flex-col gap-3" data-faction={faction.id}>
            <header className="flex items-baseline gap-2 border-b border-hairline pb-1">
              <h2 className="font-display text-lg font-bold">{faction.title}</h2>
              <span className="ml-auto text-xs text-ink-soft">{[group.some((b) => b.role === 'boss') ? bosses(group.filter((b) => b.role === 'boss').length) : null, group.some((b) => b.role === 'lieutenant') ? plural(group.filter((b) => b.role === 'lieutenant').length, 'lieutenant') : null, plural(faction.looks.length, 'look')].filter(Boolean).join(' · ')}</span>
            </header>
            {group.map((boss) => (
              <div key={boss.name} className="flex flex-col gap-2" data-boss={boss.name} data-role={boss.role}>
                <h3 className="flex items-baseline gap-2 font-display text-base font-bold">
                  {boss.name}
                  {boss.role === 'lieutenant' && <span className="rounded-full bg-sunken px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Lieutenant</span>}
                  <span className="text-xs font-normal text-ink-soft">{plural(boss.looks.length, 'look')}</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {boss.looks.map((look) => <LookCard key={look.id} look={look} onOpen={() => onOpen(look, faction)} />)}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

export default function EnemyArtScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [games, setGames] = useState<EnemyGame[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<{ look: EnemyLook; faction: EnemyFaction } | null>(null)
  useEffect(() => {
    let live = true
    loadGames().then((g) => { if (live) setGames(g) }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [])
  const tabs = useMemo(() => gameTabs(games ?? []), [games])
  const tab = chosenTab(tabs, params.get('game'))
  const choose = (id: string) => { const p = new URLSearchParams(params); p.set('game', id); setParams(p); setOpen(null) }
  return (
    <AppFrame top={<PlaceHeader title="Uma Enemy Art" onBack={() => void navigate('/')} words={{ back: 'Uma Platform', about: 'About' }}
      about={<p>The approved Uma Cyberpunk enemy looks, grouped by faction, boss and lieutenant.</p>} />}>
      <main className="pb-safe h-full overflow-y-auto bg-page" data-testid="enemy-art">
        <div className="sticky top-0 z-10 flex gap-2 border-b border-hairline bg-page/95 px-4 py-3 backdrop-blur" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab?.id === t.id} onClick={() => choose(t.id)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ${tab?.id === t.id ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink'}`}>
              {t.title}{games ? ` · ${t.looks}` : ''}
            </button>
          ))}
        </div>
        <div className="mx-auto max-w-5xl px-4 py-4">
          {!games && !failed && <p className="text-center text-ink-soft">Loading</p>}
          {failed && <p className="text-center text-ink-soft">The enemy looks didn’t load. Check you’re signed in and online.</p>}
          {games && tab && (tab.game
            ? <Game game={tab.game} onOpen={(look, faction) => setOpen({ look, faction })} />
            : <p className="text-center text-ink-soft" data-testid="enemy-none">No enemy look of {tab.title} is published yet.</p>)}
        </div>
        {open && tab?.game && <Viewer look={open.look} faction={open.faction} game={tab.game} onClose={() => setOpen(null)} />}
      </main>
    </AppFrame>
  )
}
