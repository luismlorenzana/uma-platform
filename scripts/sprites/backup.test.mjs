// The authoring backup's command (UA6, P96, P165): what it leaves out, on either slash, and how it starts gcloud.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { backupCommand, DESTINATION, EXCLUDE, LOCAL_ONLY } from './backup.mjs'

const excluded = (path) => new RegExp(`^(?:${EXCLUDE})$`).test(path)

test('leaves out the caches and the folders kept on this machine, on either slash', () => {
  for (const path of [
    'character-universes/brief.md', 'character-universes/cyberpunk/approved/kitasan-black/street.png', 'character-art/high-fantasy/README.md',
    'character-art-trials/2026-11-13-cyberpunk/manifest.json', 'character-universes\\farm-life\\approved\\manifest.json',
    'C:\\Users\\someone\\content\\authoring\\character-art-trials\\x.png', 'tools/node_modules/a.js', 'sprites/.cache/x.webp', 'draw-things/models/m.bin',
  ]) assert.equal(excluded(path), true, path)
})

test('keeps everything else, the Studio’s character-art folders included', () => {
  for (const path of [
    'ranker/profiles.json', 'sprites/106801/r3/set.json', 'farm-story/chapter-1.md', 'character-art-studio-batches/a.json',
    'uma-character-universes-notes.md', 'traveler-keys/106801/masters/ready.png', 'draw-things/prompts/a.txt',
  ]) assert.equal(excluded(path), false, path)
  assert.deepEqual(LOCAL_ONLY, ['character-universes', 'character-art', 'character-art-trials'])
})

test('runs gcloud directly elsewhere, and gcloud.cmd through the shell with quoted arguments on Windows', () => {
  const mac = backupCommand('/content/authoring', 'darwin')
  assert.deepEqual(mac, { file: 'gcloud', args: ['storage', 'rsync', '/content/authoring', DESTINATION, '--recursive', `--exclude=${EXCLUDE}`], shell: false })
  const win = backupCommand('C:\\content\\authoring', 'win32', ['--dry-run'])
  assert.equal(win.file, 'gcloud.cmd')
  assert.equal(win.shell, true)
  assert.deepEqual(win.args, ['"storage"', '"rsync"', '"C:\\content\\authoring"', `"${DESTINATION}"`, '"--recursive"', `"--exclude=${EXCLUDE}"`, '"--dry-run"'])
  assert.throws(() => backupCommand('C:\\a"b', 'win32'), /quote/)
})
