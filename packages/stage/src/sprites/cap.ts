// The cap on live sprite sets (uma-platform ST2; uma-farm F57's ask 11, FR13): a set is about 14 MB of GPU memory on
// screen, so at most 8 are live, for the figures in view nearest the camera's centre first. A set already live stays live
// while a figure of it is in view, and the rest wait as standees until one frees up, so nothing flickers. Pure.

/** Live sprite sets at once (FR13: about 112 MB). */
export const LIVE_SETS = 8

/** A figure in view: its id, the sprite set it'd draw with (null: it has none, so it's always a standee), and where. */
export interface SetCandidate { id: string; set: string | null; x: number; z: number }

/** The sets to keep live: those `live` now that a figure in view still shows, then the nearest others, up to `cap`. */
export function liveSets(inView: readonly SetCandidate[], centre: { x: number; z: number }, cap = LIVE_SETS, live: ReadonlySet<string> = new Set()): Set<string> {
  const near = inView.filter((c): c is SetCandidate & { set: string } => c.set !== null)
    .map((c) => ({ ...c, d: Math.hypot(c.x - centre.x, c.z - centre.z) }))
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const out = new Set<string>()
  for (const c of near) if (live.has(c.set) && out.size < cap) out.add(c.set)
  for (const c of near) if (out.size < cap) out.add(c.set)
  return out
}
