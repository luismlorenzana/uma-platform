// `pnpm art:albums [<universe>…] [--check]` (P181): rebuilds the local album pages of private authoring from their
// manifests and album.json files: each universe's approved album, its dialogue portraits' and splash art's own pages,
// each character's own album (her active version, named by characters/<key>/active-study.json), the enemy album
// (enemies/approved/, P182) and the casual enemy album (enemies/casual/approved/, P185). With --check it
// builds them in memory and says which differ from the files there, writing nothing (exit 1 when any does).
import fs from 'node:fs/promises'
import path from 'node:path'
import { authoring, exists, readJson, writePages } from './lib.mjs'
import { renderUniverseAlbums } from './universe-album.mjs'
import { renderCharacterAlbum } from './character-album.mjs'
import { renderEnemyAlbum } from './enemy-album.mjs'

const args = process.argv.slice(2).filter((a) => a !== '--')
const check = args.includes('--check')
const named = args.filter((a) => !a.startsWith('--'))
const all = (await fs.readdir(authoring, { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory() && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.name)).map((e) => e.name).sort()
const universes = named.length ? named : all
for (const u of universes) if (!all.includes(u)) throw new Error(`No universe "${u}" in ${authoring}. There: ${all.join(', ') || 'none'}.`)

/** Each character's active version with an album.json. */
async function characterAlbums(universeDir) {
  const root = path.join(universeDir, 'characters'), out = []
  for (const e of await fs.readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!e.isDirectory()) continue
    const active = path.join(root, e.name, 'active-study.json')
    if (!(await exists(active))) continue
    const { activeVersion } = await readJson(active)
    const dir = path.join(root, e.name, activeVersion ?? '')
    if (activeVersion && (await exists(path.join(dir, 'album.json')))) out.push(dir)
  }
  return out.sort()
}

let differs = 0
for (const universe of universes) {
  const dir = path.join(authoring, universe)
  const pages = [...await renderUniverseAlbums(dir)]
  for (const version of await characterAlbums(dir)) pages.push(await renderCharacterAlbum(version))
  if (await exists(path.join(dir, 'enemies', 'approved', 'album.json'))) pages.push(await renderEnemyAlbum(dir))
  if (await exists(path.join(dir, 'enemies', 'casual', 'approved', 'album.json'))) pages.push(await renderEnemyAlbum(dir, 'enemies/casual'))
  if (pages.length === 0) { console.log(`${universe}: no album.json, nothing to build`); continue }
  const rel = (f) => path.relative(dir, f).split(path.sep).join('/')
  if (check) {
    for (const p of pages) console.log(`${universe}/${rel(p.file)}: ${p.changed ? 'differs from the file there' : 'identical'}`)
    differs += pages.filter((p) => p.changed).length
  } else {
    const written = await writePages(pages)
    console.log(`${universe}: ${pages.length} page${pages.length === 1 ? '' : 's'}, ${written.length} rewritten${written.length ? `: ${written.map(rel).join(', ')}` : ''}`)
  }
}
if (check && differs) process.exitCode = 1
