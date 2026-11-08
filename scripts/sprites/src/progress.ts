import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { atomicJson, current, hash, inside, maybeJson, readJson } from './io.js'
import { queue, nextBatch, scope, stage, type Ranking, type QueueOverride } from './queue.js'
import { reviewState } from './reviews.js'
import { runtimeFiles, type NativeAtlas } from './types.js'

export async function buildProgress(content: string, persist = true) {
  const root = resolve(content, 'authoring/sprites'), roster = await readJson<{ revision: number; rankings: Ranking[] }>(resolve(content, 'authoring/uma-art-roster.json'))
  const override = await maybeJson<QueueOverride>(resolve(root, 'queue.json'), { schemaVersion: 1, traveler: [], townsfolk: [] })
  const published = await maybeJson<Record<string, { revision: number; version: string }>>(resolve(root, 'published.json'), {})
  const entries: (Ranking & { profile: string; phase: string; fullyAuthored: boolean; fullTravelerProfileComplete: boolean;
    battleSetComplete: boolean; battleOwnerReviewed: boolean; ownerReviewed: boolean; revision: number | null; artRevision: string | null;
    frames: number; expressions: number; actions: number; key: string | null; keyGate: string | null; setGate: string | null;
    note: string; verification: string | null; changed: boolean; published: string | null })[] = []
  for (const profile of ['traveler', 'townsfolk'] as const) for (const r of queue(roster.rankings, profile, override[profile])) {
    const row = { ...r, profile, phase: 'Queued', fullyAuthored: false, fullTravelerProfileComplete: false, battleSetComplete: false,
      battleOwnerReviewed: false, ownerReviewed: false, revision: null as number | null, artRevision: null as string | null,
      frames: 0, expressions: 0, actions: 0, key: null as string | null, keyGate: null as string | null, setGate: null as string | null,
      note: 'Waiting for authoring', verification: null as string | null, changed: false, published: null as string | null }
    try {
      const dir = await current(root, r.outfitId), a = await readJson<NativeAtlas>(resolve(dir, 'atlas.json')), state = await reviewState(root, dir, a)
      const reportPath = resolve(root, 'reports', String(a.id), `r${a.revision}`, 'verification.json')
      const v = await maybeJson<{ checks?: Record<string, boolean>; files?: Record<string, string> }>(reportPath,
        await maybeJson(resolve(dir, 'verification.json'), {}))
      const frames = Object.values(a.actions).reduce((n, aa) => n + aa.frames.length, 0), faces = Object.keys(a.faces).length
      const drawn = frames === (profile === 'traveler' ? 118 : 45) && faces === (profile === 'traveler' ? 7 : 2)
      let verified = drawn && !!v.checks && Object.keys(v.checks).length === 14 && Object.values(v.checks).every(Boolean)
      if (verified) for (const file of runtimeFiles(a)) if (!v.files?.[file] || hash(await readFile(await inside(dir, file))) !== v.files[file]) { verified = false; break }
      const changed = state.key.changed || state.set.changed, pub = published[String(a.id)]
      Object.assign(row, { phase: stage({ started: true, key: state.key.approved, drawn, verified, approved: state.set.approved, changed,
        published: pub?.revision === a.revision && state.set.approved }), fullyAuthored: verified,
        fullTravelerProfileComplete: profile === 'traveler' && verified, battleSetComplete: profile === 'traveler' && drawn,
        battleOwnerReviewed: state.set.approved || !!state.gates?.set.preservedBattle, ownerReviewed: state.set.approved,
        revision: a.revision, artRevision: `r${a.revision}`, frames, expressions: faces, actions: Object.keys(a.actions).length,
        key: `authoring/sprites/${a.id}/r${a.revision}/${a.approvedKey}`, keyGate: state.gates?.key.decision ?? null,
        setGate: state.gates?.set.decision ?? null, changed, published: pub?.revision === a.revision ? pub.version : null,
        note: changed ? 'Files changed since approval; review again.' : state.set.approved ? 'Full profile approved against file hashes.' : verified ? 'Verified; set review pending.' : 'Authoring in progress.',
        verification: `authoring/sprites/${a.id}/r${a.revision}/verification.json` })
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    entries.push(row)
  }
  const complete = new Set(entries.filter(e => e.fullyAuthored).map(e => e.outfitId))
  const totals = Object.fromEntries((['traveler', 'townsfolk'] as const).map(profile => [profile, {
    total: scope(roster.rankings, profile).length, verified: entries.filter(e => e.profile === profile && e.fullyAuthored).length,
    approved: entries.filter(e => e.profile === profile && e.ownerReviewed).length,
    nextBatch: nextBatch(queue(roster.rankings, profile, override[profile]), profile, complete, entries.filter(e => e.profile === 'townsfolk' && e.fullyAuthored).length >= 3).map(r => r.outfitId),
  }]))
  const progress = { schemaVersion: 2, updatedAt: new Date().toISOString(), rosterRevision: roster.revision, coverage: 'traveler',
    completionDefinition: 'Each profile has its own complete frame/patch catalog and all 14 checks. Approvals are verified against current file hashes.', totals, entries }
  if (persist) {
    await atomicJson(resolve(root, 'progress.json'), progress)
    await atomicJson(resolve(content, 'authoring/uma-sprite-progress.json'), progress)
  }
  return progress
}
