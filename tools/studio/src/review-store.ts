import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { atomicJson, hash, inside, current, keyFiles, runtimeFiles, readJson, reviewState, type Gate, type NativeAtlas, type Reviews } from '@uma-platform/sprite-pipeline'

export class ReviewConflict extends Error {}
export class ReviewStore {
  private pending: Promise<unknown> = Promise.resolve()
  constructor(private readonly root: string) {}
  async read() {
    const bytes = await readFile(resolve(this.root, 'reviews.json'))
    return { stamp: hash(bytes), reviews: JSON.parse(bytes.toString('utf8')) as Reviews }
  }
  save(input: unknown): Promise<{ stamp: string; reviews: Reviews }> {
    const operation = this.pending.then(() => this.write(input))
    this.pending = operation.catch(() => undefined)
    return operation
  }
  private async write(value: unknown) {
    const input = value as { stamp?: unknown; gate?: unknown; decision?: unknown; note?: unknown; outfits?: unknown }
    if (!input || typeof input.stamp !== 'string' || !['key', 'set'].includes(String(input.gate)) || !['approved', 'changes'].includes(String(input.decision)) || typeof input.note !== 'string' || input.note.length > 10000 || !Array.isArray(input.outfits) || !input.outfits.length || input.outfits.length > 10) throw new Error('Invalid gate decision')
    if (input.decision === 'changes' && !input.note.trim()) throw new Error('Add a note describing the changes')
    const loaded = await this.read()
    if (loaded.stamp !== input.stamp) throw new ReviewConflict('Reviews changed; reload before saving')
    const seen = new Set<number>(), decisions: { id: number; revision: number; gate: Gate }[] = []
    for (const raw of input.outfits) {
      const outfit = raw as { id?: unknown; revision?: unknown }
      if (!Number.isSafeInteger(outfit.id) || Number(outfit.id) <= 0 || !Number.isSafeInteger(outfit.revision) || seen.has(Number(outfit.id))) throw new Error('Invalid or duplicate outfit')
      const id = Number(outfit.id); seen.add(id)
      const dir = await current(this.root, id), a = await readJson<NativeAtlas>(resolve(dir, 'atlas.json'))
      if (a.revision !== outfit.revision) throw new ReviewConflict('Current revision changed; reload before saving')
      if (input.gate === 'set' && input.decision === 'approved') {
        const state = await reviewState(this.root, dir, a)
        if (!state.key.approved) throw new Error('Approve the key before the set')
        let verification: { checks?: Record<string, boolean>; files?: Record<string, string> }
        try { verification = await readJson(resolve(this.root, 'reports', String(id), `r${a.revision}`, 'verification.json')) }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; verification = await readJson(resolve(dir, 'verification.json')) }
        if (!verification.checks || Object.keys(verification.checks).length !== 14 || !Object.values(verification.checks).every(Boolean)) throw new Error('All fourteen checks must pass before approving a set')
        for (const f of runtimeFiles(a)) if (hash(await readFile(await inside(dir, f))) !== verification.files?.[f]) throw new Error('Verification is stale; run sprites:verify again')
      }
      const paths = input.gate === 'key' ? keyFiles(a) : runtimeFiles(a), hashes: Record<string, string> = {}
      for (const file of paths) hashes[file] = hash(await readFile(await inside(dir, file)))
      decisions.push({ id, revision: a.revision, gate: { decision: input.decision as 'approved' | 'changes', at: new Date().toISOString(), note: input.note, hashes } })
    }
    const gateName = input.gate as 'key' | 'set'
    for (const d of decisions) {
      const revisions = loaded.reviews.outfits[String(d.id)] ??= {}
      const gates = revisions[`r${d.revision}`] ??= { key: { decision: null }, set: { decision: null } }
      const prior = gates[gateName]
      gates[gateName] = { ...prior, ...d.gate, history: [...(Array.isArray(prior.history) ? prior.history : []), ... (prior.decision ? [{ decision: prior.decision, at: prior.at, note: prior.note, hashes: prior.hashes }] : [])] }
    }
    await atomicJson(resolve(this.root, 'reviews.json'), loaded.reviews)
    return this.read()
  }
}
