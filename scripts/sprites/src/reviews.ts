import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { hash, inside, readJson, maybeJson } from './io.js'
import { keyFiles, runtimeFiles, type Gate, type NativeAtlas, type Reviews } from './types.js'

export async function gateStatus(dir: string, gate: Gate | undefined, expected: string[]) {
  if (!gate || gate.decision !== 'approved') return { approved: false, changed: false, missing: [] as string[] }
  const missing: string[] = []
  for (const file of expected) {
    try { if (hash(await readFile(await inside(dir, file))) !== gate.hashes?.[file]) missing.push(file) }
    catch { missing.push(file) }
  }
  return { approved: missing.length === 0, changed: missing.length !== 0, missing }
}
export async function reviewState(root: string, dir: string, a: NativeAtlas) {
  const reviews = await maybeJson<Reviews>(resolve(root, 'reviews.json'), { schemaVersion: 1, outfits: {} })
  const gates = reviews.outfits[String(a.id)]?.[`r${a.revision}`]
  // Historical key approvals covered five stills; new Studio decisions also bind identity.md.
  const keyExpected = keyFiles(a).filter(f => f !== 'identity.md' || gates?.key.hashes?.[f])
  return { reviews, gates, key: await gateStatus(dir, gates?.key, keyExpected), set: await gateStatus(dir, gates?.set, runtimeFiles(a)) }
}
export async function priorApproval(root: string, dir: string, a: NativeAtlas, reviews: Reviews) {
  const candidates = Object.entries(reviews.outfits[String(a.id)] ?? {}).filter(([r, g]) => Number(r.slice(1)) < a.revision && g.set.decision === 'approved')
    .sort(([a], [b]) => Number(b.slice(1)) - Number(a.slice(1)))
  for (const [revision, gates] of candidates) {
    const previous = resolve(dir, '..', revision), atlas = await readJson<NativeAtlas>(resolve(previous, 'atlas.json'))
    if (hash(await readFile(resolve(previous, atlas.approvedKey))) !== hash(await readFile(resolve(dir, a.approvedKey)))) continue
    const pins = Object.fromEntries(Object.entries(gates.set.hashes ?? {}).filter(([f]) => f.endsWith('.png')))
    return { pins, actions: atlas.actions }
  }
  return { pins: {} as Record<string, string> }
}
