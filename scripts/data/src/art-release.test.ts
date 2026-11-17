import { describe, expect, it } from 'vitest'
import { artRelease, type ArtReleaseStep, type ChannelState } from './art-release'

/** A bucket's channels and the steps' effects on them, as fakes: publish moves candidate, promote moves latest. */
function fake(options: { newArt?: boolean; failAt?: string; latestMovesTo?: string } = {}) {
  const channels: Record<string, ChannelState> = { latest: { version: 'aaaa', art: 'art/index.1.json' }, candidate: { version: 'aaaa', art: 'art/index.1.json' } }
  const ran: string[] = []
  const run = async (step: ArtReleaseStep): Promise<string> => {
    const line = [step.script, ...step.args].join(' ')
    ran.push(line)
    if (options.failAt && line.startsWith(options.failAt)) throw new Error(`${step.label} failed`)
    if (step.script === 'publish-cli.ts' && step.args.includes('--dry-run')) return 'Version: bbbb\n'
    if (step.script === 'publish-cli.ts' && step.args[0] === '--promote') { channels.latest = { ...channels.candidate! }; return '' }
    if (step.script === 'publish-cli.ts') { channels.candidate = { version: 'bbbb', art: options.newArt === false ? channels.latest!.art : 'art/index.2.json' }; return 'Release published\nVersion: bbbb\nChannel candidate: aaaa → bbbb\n' }
    if (step.script === 'check-cli.ts' && options.latestMovesTo) channels.latest = { version: options.latestMovesTo, art: 'art/index.3.json' }
    return ''
  }
  return { ran, run, channels, channel: async (name: string) => channels[name] ?? null }
}

describe('art:release, a universe’s character art to master data latest (P203)', () => {
  it('packs both families, publishes the candidate, checks it against latest, promotes it, then pushes the profile pictures', async () => {
    const f = fake()
    const r = await artRelease('farm-life', f)
    expect(f.ran).toEqual([
      'portraits-cli.ts farm-life',
      'illustrations-cli.ts farm-life',
      'publish-cli.ts --portraits-only --illustrations-only --channel candidate',
      'check-cli.ts --channel candidate --against latest',
      'publish-cli.ts --promote bbbb',
      'profiles-push-cli.ts farm-life',
    ])
    expect(r).toEqual({ latest: 'bbbb', candidate: 'bbbb', promoted: true })
    expect(f.channels.latest!.version).toBe('bbbb')
  })
  it('stops at a failing check and promotes nothing', async () => {
    const f = fake({ failAt: 'check-cli.ts' })
    await expect(artRelease('farm-life', f)).rejects.toThrow(/failed/)
    expect(f.ran.at(-1)).toMatch(/^check-cli\.ts/)
    expect(f.channels.latest!.version).toBe('aaaa')
  })
  it('promotes nothing when the candidate’s art index is latest’s', async () => {
    const f = fake({ newArt: false })
    const r = await artRelease('farm-life', f)
    expect(r).toMatchObject({ latest: 'aaaa', promoted: false, reason: 'latest already holds this art' })
    expect(f.ran.some((l) => l.startsWith('check-cli.ts') || l.includes('--promote'))).toBe(false)
  })
  it('never promotes over a latest that moved while it ran', async () => {
    const f = fake({ latestMovesTo: 'cccc' })
    await expect(artRelease('farm-life', f)).rejects.toThrow(/latest moved from aaaa to cccc/)
    expect(f.ran.some((l) => l.includes('--promote'))).toBe(false)
    expect(f.channels.latest!.version).toBe('cccc')
  })
  it('only plans the candidate on a dry run, and does nothing for a universe master data doesn’t ship', async () => {
    const f = fake()
    expect(await artRelease('farm-life', { ...f, dryRun: true })).toMatchObject({ promoted: false, reason: 'dry run' })
    expect(f.ran.at(-1)).toBe('publish-cli.ts --portraits-only --illustrations-only --channel candidate --dry-run')
    const g = fake()
    expect(await artRelease('cyberpunk', g)).toMatchObject({ promoted: false, reason: expect.stringMatching(/ships no character art from cyberpunk/) })
    expect(g.ran).toEqual([])
  })
})
