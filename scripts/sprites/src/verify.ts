import { readFile } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import { readJson, hash, inside, atomicJson } from './io.js'
import { decode, parseConfig, repeatRevision } from './export.js'
import { runChecks } from './checks.js'
import { priorApproval, reviewState } from './reviews.js'
import { runtimeFiles, type NativeAtlas, type Pixels } from './types.js'

export async function configFor(root: string, dir: string): Promise<string> {
  const a = await readJson<NativeAtlas>(resolve(dir, 'atlas.json'))
  const external = resolve(root, 'export-configs', String(a.id), `r${a.revision}.json`)
  try { await readFile(external); return external } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  return resolve(dir, 'config.json')
}
export async function verifyRevision(root: string, dir: string, configPath?: string) {
  const a = await readJson<NativeAtlas>(resolve(dir, 'atlas.json')), path = configPath ?? await configFor(root, dir)
  const c = parseConfig(await readJson<unknown>(path)), pixels: Record<string, Pixels> = {}, hashes: Record<string, string> = {}
  const state = await reviewState(root, dir, a), prior = await priorApproval(root, dir, a, state.reviews)
  for (const file of [...runtimeFiles(a), 'identity.md']) {
    try {
      const path = await inside(dir, file); hashes[file] = hash(await readFile(path))
      if (file.endsWith('.png')) pixels[file] = await decode(path)
    } catch (error) { if (file !== 'identity.md') throw error }
  }
  const repeat = await repeatRevision(dir, path)
  const result = runChecks({ atlas: a, pixels, hashes, keyPins: state.gates?.key.decision === 'approved' ? state.gates.key.hashes ?? {} : {},
    priorPins: prior.pins, priorActions: prior.actions, config: c, coverage: Object.keys(a.actions).length === 14 ? 'battle' : a.profile, repeat: repeat.byteIdentical })
  const report = { schemaVersion: 2, outfitId: a.id, revision: a.revision, profile: a.profile, ...result,
    files: hashes, frames: Object.values(a.actions).reduce((n, v) => n + v.frames.length, 0),
    facePatches: Object.keys(a.faces).length, repeatExport: repeat, passed: result.failures.length === 0,
    check13Scope: 'First standing contact matches its facing still within 4px; all poses retain one cycle scale. Left standing uses the key/idle.' }
  // The approved revision is sealed, including its original config and verification receipt.
  const sealed = state.gates?.set.decision === 'approved' || state.gates?.key.decision === 'approved'
  const output = sealed ? resolve(root, 'reports', String(a.id), basename(dir), 'verification.json') : resolve(dir, 'verification.json')
  await atomicJson(output, report)
  return { ...report, output }
}
