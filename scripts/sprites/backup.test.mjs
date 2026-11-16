// The authoring backup's command (UA6, P96, P165): what it leaves out, on either slash, and how it starts gcloud.
import { expect, it } from 'vitest'
import { backupCommand, DESTINATION, EXCLUDE, LOCAL_ONLY } from './backup.mjs'

const excluded = (path) => new RegExp(`^(?:${EXCLUDE})$`).test(path)

it('leaves out the caches and the folders kept on this machine, on either slash', () => {
  for (const path of [
    'character-universes/brief.md', 'character-universes/cyberpunk/approved/kitasan-black/street.png', 'character-art/high-fantasy/README.md',
    'character-art-trials/2026-11-13-cyberpunk/manifest.json', 'character-universes\\farm-life\\approved\\manifest.json',
    'C:\\Users\\someone\\content\\authoring\\character-art-trials\\x.png', 'tools/node_modules/a.js', 'sprites/.cache/x.webp', 'draw-things/models/m.bin',
    'splash-art/farm-life/kitasan-black/first-meeting/v003-framing/prompt.txt', 'splash-art\\farm-life\\x.png',
  ]) expect(excluded(path), path).toBe(true)
})

it('never sends back a removed franchise’s files (P195)', () => {
  for (const path of [
    'enemies/imports/pgr.json', 'enemies/assets/enemies/pgr-x-face.0a1b2c3d.webp', 'ranker/imports/pgr.json', 'ranker/boards/pgr-bosses.json',
    'ranker\\assets\\enemies\\pgr-x-art.0a1b2c3d.webp', 'tiers/pgr-bosses.json', '/Users/someone/content/authoring/ranker/imports/pgr.json',
  ]) expect(excluded(path), path).toBe(true)
  for (const path of ['ranker/imports/hi3.json', 'ranker/assets/enemies/hi3-x-face.0a1b2c3d.webp', 'sprites/pgr-notes.md', 'enemies/imports/genshin.json']) expect(excluded(path), path).toBe(false)
})

it('keeps everything else, the Studio’s character-art folders included', () => {
  for (const path of [
    'ranker/profiles.json', 'sprites/106801/r3/set.json', 'farm-story/chapter-1.md', 'character-art-studio-batches/a.json',
    'uma-character-universes-notes.md', 'traveler-keys/106801/masters/ready.png', 'draw-things/prompts/a.txt',
  ]) expect(excluded(path), path).toBe(false)
  expect(LOCAL_ONLY).toEqual(['character-universes', 'character-art', 'character-art-trials', 'splash-art'])
})

it('runs gcloud directly elsewhere, and gcloud.cmd through the shell with quoted arguments on Windows', () => {
  const mac = backupCommand('/content/authoring', 'darwin')
  expect(mac).toEqual({ file: 'gcloud', args: ['storage', 'rsync', '/content/authoring', DESTINATION, '--recursive', `--exclude=${EXCLUDE}`], shell: false })
  const win = backupCommand('C:\\content\\authoring', 'win32', ['--dry-run'])
  expect(win.file).toBe('gcloud.cmd')
  expect(win.shell).toBe(true)
  expect(win.args).toEqual(['"storage"', '"rsync"', '"C:\\content\\authoring"', `"${DESTINATION}"`, '"--recursive"', `"--exclude=${EXCLUDE}"`, '"--dry-run"'])
  expect(() => backupCommand('C:\\a"b', 'win32')).toThrow(/quote/)
})
