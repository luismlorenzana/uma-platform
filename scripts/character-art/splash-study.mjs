import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareBeach, verifyPreparedBeach } from './beach.mjs'

const repo = fileURLToPath(new URL('../../', import.meta.url))
const packet = join(repo, 'docs/authoring/farm-life-splash-art')
const content = join(repo, 'content')
const studies = join(content, 'authoring/splash-art/farm-life')
const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const digest = /^[a-f0-9]{64}$/
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const json = async file => JSON.parse(await readFile(file, 'utf8'))
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const encode = value => JSON.stringify(value, null, 2) + '\n'
const nonempty = value => typeof value === 'string' && Boolean(value.trim())
const keyOf = name => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const usage = 'Usage: node scripts/character-art/splash-study.mjs init "<Character Name>" | prepare-beach <character-key> <vNNN> | check <character-key> [--approved] | review <character-key>'

// Resolve links as well as the spelling: provenance stays inside private content.
async function contained(parent, child) {
  const base = await realpath(parent), file = await realpath(child)
  const rel = relative(base, file)
  assert(rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep), 'Path leaves ' + base + ': ' + child)
  return file
}

async function init(name, key, standard) {
  const brief = await readFile(join(packet, 'templates/brief.md'), 'utf8')
  const handoff = await readFile(join(packet, 'templates/handoff.md'), 'utf8')
  await mkdir(studies, { recursive: true })
  await contained(repo, studies)
  const dir = join(studies, key)
  await mkdir(dir) // EEXIST is deliberate: never reset an active or legacy study.
  const scenes = standard.scenes.map(scene => ({ ...scene, selected: null }))
  const study = { version: 1, sceneSetVersion: standard.version, character: name, characterKey: key, scenes }
  await Promise.all([
    writeFile(join(dir, 'study.json'), encode(study), { flag: 'wx' }),
    writeFile(join(dir, 'brief.md'), brief.replace('<character>', () => name), { flag: 'wx' }),
    writeFile(join(dir, 'handoff.md'), handoff.replace('<character>', () => name), { flag: 'wx' }),
  ])
  console.log('Initialized ' + dir)
}

async function verifySelection(dir, scene, approvedOnly) {
  const selected = scene.selected
  assert(/^v\d{3,}$/.test(selected?.revision ?? ''), 'Expected a version such as v001')
  assert(digest.test(selected.sha256), 'Missing selected image SHA-256')
  const folder = join(dir, scene.id, selected.revision)
  const file = name => contained(dir, join(folder, name))
  const image = await readFile(await file('image.png'))
  assert(image.length >= 33 && image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
    image.readUInt32BE(8) === 13 && image.toString('ascii', 12, 16) === 'IHDR', 'Expected a PNG with an IHDR')
  const width = image.readUInt32BE(16), height = image.readUInt32BE(20)
  assert(width === selected.width && height === selected.height, 'Dimensions differ from selection')
  assert(width > height && height > 0 && Math.abs(width - height * 16 / 9) < 2, 'Expected near-16:9 landscape (one-pixel rounding is OK)')
  assert.equal(sha(image), selected.sha256, 'Selected PNG hash changed')
  const prompt = await readFile(await file('prompt.txt'), 'utf8')
  assert(nonempty(prompt), 'Exact prompt is empty')
  const record = await json(await file('generation.json'))
  assert(nonempty(record.tool), 'Missing generation tool')
  assert.equal(record.outputSha256, selected.sha256, 'Generation record does not match the selected PNG')
  assert(Array.isArray(record.references) && record.references.length > 0, 'List the references actually used')
  for (const ref of record.references) {
    assert(nonempty(ref.role) && digest.test(ref.sha256), 'Each reference needs a role and SHA-256')
    assert(typeof ref.path === 'string' && ref.path.startsWith('content/') &&
      !/[\\:]/.test(ref.path) && !ref.path.split('/').some(part => !part || part === '.' || part === '..'),
    'Reference paths must be repository-relative under content/')
    const target = await contained(content, resolve(repo, ref.path))
    assert.equal(sha(await readFile(target)), ref.sha256, 'Reference hash changed: ' + ref.path)
  }
  if (scene.id === 'beach') await verifyPreparedBeach({ repo, folder, record, prompt })
  const approval = selected.approval
  if (approval != null || approvedOnly) {
    assert(approval?.status === 'approved' && approval.by === 'owner' && /^\d{4}-\d{2}-\d{2}$/.test(approval.on) &&
      approval.imageSha256 === selected.sha256 && nonempty(approval.basis), 'Missing exact-image owner approval')
  }
  return { ...scene, status: approval ? 'Approved by owner' : 'Candidate', prefix: scene.id + '/' + selected.revision + '/' }
}

async function check(dir, key, standard, { partial, approvedOnly }) {
  const study = await json(await contained(dir, join(dir, 'study.json')))
  assert(study.version === 1 && study.characterKey === key && keyOf(study.character) === key &&
    study.sceneSetVersion === standard.version, 'Study identity or scene-set version does not match')
  assert.deepEqual(study.scenes.map(s => s.id), standard.scenes.map(s => s.id), 'Scene slots must match the standard order')
  const results = [], errors = []
  for (const scene of study.scenes) {
    try {
      assert(nonempty(scene.title) && kebab.test(scene.moment) && kebab.test(scene.outfit) && kebab.test(scene.expression), 'Missing title, moment, outfit or expression')
      if (partial && scene.selected === null) results.push({ ...scene, status: 'Not selected' })
      else results.push(await verifySelection(dir, scene, approvedOnly))
    } catch (error) { errors.push(scene.id + ': ' + error.message) }
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return { character: study.character, results }
}

function render({ character, results }) {
  const cards = results.map(s => '<article><h2>' + escape(s.title) + '</h2><p>' +
    escape(s.status + ' · ' + s.outfit + ' · ' + s.expression) + '</p>' + (s.prefix ?
    '<a href="' + s.prefix + 'image.png"><img loading="lazy" alt="' + escape(s.title) + '" src="' + s.prefix +
    'image.png" width="' + s.selected.width + '" height="' + s.selected.height + '"></a><p><a href="' + s.prefix +
    'prompt.txt">Exact prompt</a> · <a href="' + s.prefix + 'generation.json">Generation record</a></p>' : '') + '</article>')
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escape(character) + ' — Splash art review</title><style>body{margin:2rem auto;padding:0 1rem;max-width:76rem;' +
    'font:1rem system-ui;background:#f5f0e7;color:#38332d}main{display:grid;gap:1rem;grid-template-columns:repeat(2,minmax(0,1fr))}' +
    'article{padding:1rem;background:#fffaf3;border:1px solid #ded5c6;border-radius:.75rem}h2{font-size:1.1rem}img{width:100%;height:auto}' +
    'a{color:#765241}@media(max-width:760px){main{grid-template-columns:1fr}}</style><h1>' + escape(character) +
    ' — Splash art review</h1><main>' + cards.join('\n') + '</main></html>\n'
}

async function main(args) {
  if (!args.length || args[0] === '--help') { console.log(usage); return }
  const [command, value = '', flag, ...rest] = args
  const isInit = command === 'init', isReview = command === 'review', isBeach = command === 'prepare-beach'
  if ((!isInit && !isReview && !isBeach && command !== 'check') || rest.length ||
      (isBeach ? !/^v\d{3,}$/.test(flag ?? '') : (flag && (command !== 'check' || flag !== '--approved')))) throw new Error(usage)
  const key = isInit ? keyOf(value) : value
  assert(kebab.test(key) && key.length <= 60, 'Expected a lowercase character key (or a name for init)')
  const standard = await json(join(packet, 'scene-set.json'))
  try {
    if (isInit) return await init(value.trim(), key, standard)
    if (isBeach) { console.log(encode(await prepareBeach({ repo, key, revision: flag }))); return }
    const dir = await contained(studies, join(studies, key))
    await contained(repo, dir)
    const data = await check(dir, key, standard, { partial: isReview, approvedOnly: flag === '--approved' })
    if (isReview) {
      // A normal rebuild may overwrite the derived review; never follow a link to a different file.
      const review = join(dir, 'review.html')
      try { assert((await lstat(review)).isFile(), 'Review path must be an ordinary file') }
      catch (error) { if (error.code !== 'ENOENT') throw error }
      await writeFile(review, render(data))
      console.log('Wrote ' + review)
    } else {
      const approved = data.results.filter(s => s.status === 'Approved by owner').length
      console.log('Verified ' + data.results.length + ' selected scenes for ' + data.character + ' (' + approved + ' owner approved).')
    }
  } catch (error) {
    if (isInit && error.code === 'EEXIST') throw new Error('Study folder already exists; resume it without reinitializing: ' + join(studies, key))
    throw error
  }
}

main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1 })
