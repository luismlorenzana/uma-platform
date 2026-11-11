// The Ranker's pictures: Uma art from the master data release (through /api/master), enemy art from the Ranker's own
// private pack (/api/ranker/content), each fetched with the owner's token and kept on the device (hash-named files).
import { idToken } from '@luismlorenzana/uma-kit/auth'
import { createContentClient, useArtUrl, type ArtSource } from '@luismlorenzana/uma-kit/content'
import { FIREBASE } from '../../app/firebase-config'
import { CONTENT } from '../../content/client'

const PACK = createContentClient({ base: '/api/ranker', token: () => idToken(FIREBASE), cacheName: 'platform-ranker' })
const packSource: ArtSource = { artUrl: (p) => PACK.packUrl(p), hold: (p) => PACK.hold(`pack:${p}`) }
const releaseSource: ArtSource = { artUrl: (p) => CONTENT.artUrl(p), hold: (p) => CONTENT.hold(p) }

export function Art({ path, kind, alt, className = '' }: { path: string | null; kind: 'release' | 'pack'; alt: string; className?: string }) {
  const url = useArtUrl(path, kind === 'pack' ? packSource : releaseSource)
  return url
    ? <img src={url} alt={alt} draggable={false} className={`object-contain ${className}`} />
    : <span role="img" aria-label={alt} className={`flex items-center justify-center bg-sunken text-[11px] font-semibold text-ink-faint ${className}`}>{alt.slice(0, 2)}</span>
}
