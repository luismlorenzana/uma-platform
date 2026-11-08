import { propArt } from './prop-art.js'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { current, readJson, reviewState, queue, nextBatch, maybeJson, profileTotals, type NativeAtlas, type Ranking, type QueueOverride } from '@uma-platform/sprite-pipeline'
import type { Catalog } from './model.js'

export async function spriteReview(content: string, catalog: Catalog, search = new URLSearchParams()) {
  const root = resolve(content, 'authoring/sprites'), roster = await readJson<{ rankings: Ranking[] }>(resolve(content, 'authoring/uma-art-roster.json'))
  const override = await maybeJson<QueueOverride>(resolve(root, 'queue.json'), { schemaVersion: 1, traveler: [], townsfolk: [] })
  const profile = search.get('profile') === 'townsfolk' ? 'townsfolk' : 'traveler', rows = queue(roster.rankings, profile, override[profile], override.townsfolkOutfits)
  const batchNumber = Number(search.get('batch') ?? 1)
  if (!Number.isSafeInteger(batchNumber) || batchNumber < 1 || batchNumber > 100) throw new Error('Invalid batch')
  const history = await maybeJson<{ traveler: { batch: number; outfits: number[] }[]; townsfolk: { batch: number; outfits: number[] }[] }>(resolve(root, 'batches.json'), { traveler: [], townsfolk: [] })
  let batch: Ranking[] = [], seen = new Set<number>()
  for (let n = 1; n <= batchNumber; n++) { const assigned = history[profile].find(b => b.batch === n); batch = assigned ? assigned.outfits.map(id => rows.find(r => r.outfitId === id)).filter((r): r is Ranking => !!r) : nextBatch(rows, profile, seen, n > 1); for (const row of batch) seen.add(row.outfitId) }
  const ids = search.has('ids') ? search.get('ids')!.split(',').map(Number) : batch.map(r => r.outfitId)
  if (ids.length > 10 || new Set(ids).size !== ids.length || ids.some(id => !rows.some(r => r.outfitId === id))) throw new Error('Invalid review selection')
  const characters = [], missing: number[] = []
  for (const id of ids) {
    let dir: string
    try { dir = await current(root, id) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') { missing.push(id); continue } throw error }
    const a = await readJson<NativeAtlas>(resolve(dir, 'atlas.json')), state = await reviewState(root, dir, a)
    const prefix = `/sprite-assets/${id}/r${a.revision}/`, url = (f: string) => prefix + f
    if (a.id !== id || a.profile !== profile) throw new Error('Current atlas mismatch')
    a.approvedKey = url(a.approvedKey)
    for (const aa of Object.values(a.actions)) { for (const f of aa.frames) f.file = url(f.file); aa.times ??= aa.frames.map(f => f.ms ?? null) }
    for (const f of Object.values(a.faces)) f.file = url(f.file)
    const uma = catalog.umas.find(u => u.id === id)
    characters.push({ ...a, name: uma?.name ?? String(id), references: uma?.references ?? [],
      atlasFile: prefix + 'atlas.json', identityFile: prefix + 'identity.md', keyApproved: state.key.approved, setApproved: state.set.approved,
      changed: state.key.changed || state.set.changed, missingHashes: [...state.key.missing, ...state.set.missing],
      keyGate: state.gates?.key, setGate: state.gates?.set, fullProfile: Object.values(a.actions).reduce((n, v) => n + v.frames.length, 0) === profileTotals(profile).frames })
  }
  const props = await propArt()
  return { characters, ...props, missing, batch: batchNumber, profile, coverage: profile, pendingOwnerReview: missing.length > 0 || characters.some(c => !c.keyApproved || !c.setApproved) }
}
