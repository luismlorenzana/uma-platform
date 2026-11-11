// Keep original-game content out of Git, including forced additions (copied from uma-quest at 47ca16d, which copied
// uma-rpg's guard; AP6). Master data, art, boards and authoring live in the ignored content/ folder locally and in
// private buckets. The Uma Platform app's code (apps/, packages/tiers, infra/) carries no pictures but its own icons.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const git = (cwd, args, options = {}) => execFileSync('git', args, { cwd, encoding: 'utf8', ...options })
const privateContentIsUntracked = cwd => assert.equal(git(cwd, ['ls-files', '-z', '--', 'content']), '',
  'Original content must never be tracked. Remove content/ from the index; preserve the local files.')

test('no private content is tracked in the repository index', () => privateContentIsUntracked(root))

test('master data, art, boards and authoring all remain ignored', () => {
  const paths = [
    'content/release/art/outfit-portraits/100101.0a1b2c3d.webp',
    'content/release/manifest.json',
    'content/authoring/tiers/umas.json',
    'content/authoring/enemies/assets/unit-face.0a1b2c3d.webp',
    'content/authoring/traveler-keys/100101/masters/ready.png',
    'content/review/sample/key.png',
  ]
  const ignored = git(root, ['check-ignore', '--no-index', '--stdin'], { input: paths.join('\n') + '\n' }).trimEnd().split('\n')
  assert.deepEqual(ignored, paths, 'Private content must stay under the ignored content/ folder')
})

test('the app carries no pictures but its own generated icons', () => {
  const pictures = git(root, ['ls-files', '--', 'apps', 'packages/tiers', 'infra']).split('\n')
    .filter((path) => /\.(png|webp|jpe?g|gif|avif|bmp)$/i.test(path))
  const icons = /^apps\/web\/public\/icons\/(icon-(64|192|512)|apple-touch-icon)\.png$/
  assert.deepEqual(pictures.filter((path) => !icons.test(path)), [], 'Art is read from the buckets at run time, never committed under apps/')
})

test('the guard detects even a forced private-image addition', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'private-content-guard-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  git(folder, ['init', '-q'])
  await writeFile(join(folder, '.gitignore'), '/content/\n')
  await mkdir(join(folder, 'content'))
  await writeFile(join(folder, 'content/synthetic.png'), 'Synthetic fixture, not actual art')
  privateContentIsUntracked(folder)
  git(folder, ['add', '-f', '--', 'content/synthetic.png'])
  assert.throws(() => privateContentIsUntracked(folder), /Original content must never be tracked/)
})
