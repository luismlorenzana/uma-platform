// `pnpm art:release [universe]` (P203): a universe's published character art → master data `latest`, in one step. It runs
// the steps README.md's "Dialogue portraits and illustrations" lists, in order: pack the portraits and the illustrations
// from the app's bucket, publish latest plus both families to `candidate`, read the candidate back like a game against
// latest, promote it, then push the profile pictures to Character Art. `pnpm art:push` runs it after publishing a universe
// master data ships (MASTER_DATA_UNIVERSES), so publishing her art ends with the games able to read it.
// It stops at the first step that fails, promotes nothing when the candidate holds no new art, never promotes over a
// latest that moved while it ran (that release would be lost), and does nothing for a universe master data doesn't ship.

import { parseReleaseManifest, releasePaths } from '@luismlorenzana/uma-data'
import { parseRemoteChannel, type ReleaseStorageClient } from './publish'

/** The universes whose character art master data ships (uma-farm F75, F84). */
export const MASTER_DATA_UNIVERSES: readonly string[] = ['farm-life']

/** A step's CLI under `src/`, its arguments, and what to call it. */
export interface ArtReleaseStep { label: string; script: string; args: string[] }
/** Runs a step and gives its standard output; throws when it fails. */
export type StepRunner = (step: ArtReleaseStep) => Promise<string>
/** A channel's version and its art index path, or null when it doesn't exist. */
export interface ChannelState { version: string; art: string | null }

export interface ArtReleaseResult {
  /** The version latest points at when it ends. */
  latest: string | null
  /** The candidate published, if any. */
  candidate: string | null
  promoted: boolean
  /** Why nothing was promoted, when nothing was. */
  reason?: string
}

/** A channel as the bucket has it: its pointer's version and the manifest's art index. */
export async function readChannel(storage: Pick<ReleaseStorageClient, 'read'>, channel: string): Promise<ChannelState | null> {
  const path = releasePaths.channel(channel)
  const pointer = parseRemoteChannel(await storage.read(path), path)
  if (!pointer) return null
  const raw = await storage.read(pointer.manifest)
  if (!raw) throw new Error(`${pointer.manifest} is missing from the bucket`)
  const manifest = parseReleaseManifest(JSON.parse(raw.toString('utf8')) as unknown, pointer.manifest)
  return { version: pointer.version, art: manifest.art ?? null }
}

export async function artRelease(universe: string, options: { run: StepRunner; channel: (name: string) => Promise<ChannelState | null>; dryRun?: boolean; log?: (line: string) => void }): Promise<ArtReleaseResult> {
  const { run, channel } = options, log = options.log ?? (() => undefined)
  if (!MASTER_DATA_UNIVERSES.includes(universe)) {
    const reason = `master data ships no character art from ${universe} (only ${MASTER_DATA_UNIVERSES.join(', ')})`
    log(`Nothing to do: ${reason}.`)
    return { latest: null, candidate: null, promoted: false, reason }
  }
  await run({ label: 'pack the dialogue portraits', script: 'portraits-cli.ts', args: [universe] })
  await run({ label: 'pack the illustrations', script: 'illustrations-cli.ts', args: [universe] })
  const before = await channel('latest')
  if (!before) throw new Error('No latest channel to build on')
  const publish = ['--portraits-only', '--illustrations-only', '--channel', 'candidate']
  if (options.dryRun) {
    await run({ label: 'plan the candidate (dry run)', script: 'publish-cli.ts', args: [...publish, '--dry-run'] })
    return { latest: before.version, candidate: null, promoted: false, reason: 'dry run' }
  }
  const out = await run({ label: 'publish the candidate', script: 'publish-cli.ts', args: publish })
  const candidate = /^Version: ([0-9a-f]+)$/m.exec(out)?.[1]
  if (!candidate) throw new Error('The candidate publish printed no version')
  const published = await channel('candidate')
  if (published?.version !== candidate) throw new Error(`candidate points at ${published?.version ?? 'nothing'}, not ${candidate}`)
  if (published.art === before.art) {
    log(`Nothing new for master data: the candidate's art index is latest's (${before.version}).`)
    return { latest: before.version, candidate, promoted: false, reason: 'latest already holds this art' }
  }
  await run({ label: 'read the candidate back against latest', script: 'check-cli.ts', args: ['--channel', 'candidate', '--against', 'latest'] })
  const now = await channel('latest')
  if (now?.version !== before.version) throw new Error(`latest moved from ${before.version} to ${now?.version ?? 'nothing'} while this ran; ${candidate} is built on the old one, so it isn't promoted. Run it again.`)
  await run({ label: 'promote the candidate to latest', script: 'publish-cli.ts', args: ['--promote', candidate] })
  await run({ label: 'push the profile pictures to Character Art', script: 'profiles-push-cli.ts', args: [universe] })
  return { latest: candidate, candidate, promoted: true }
}
