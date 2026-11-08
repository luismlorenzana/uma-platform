import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { content, repo } from './io.js'

const files = () => execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: repo, encoding: 'utf8' }).split('\n').filter(f => /^(scripts\/sprites|tools\/studio|docs\/sprites)\//.test(f) && existsSync(resolve(repo, f)))
it('never tracks raster art in the sprite tools or private content directories', () => {
  expect(files().filter(f => /^scripts\/sprites\//.test(f) && /\.(png|webp)$/i.test(f))).toEqual([])
  const tracked = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' }).split('\n')
  expect(tracked.filter(f => /^content\//.test(f) || /\/\.cache\//.test(f))).toEqual([])
})
it.skipIf(!existsSync(resolve(content, 'release/manifest.json')))('keeps local master character names out of generic tools and sprite docs', () => {
  const manifest = JSON.parse(readFileSync(resolve(content, 'release/manifest.json'), 'utf8')) as { sets: { characters: string } }
  const pack = JSON.parse(readFileSync(resolve(content, 'release', manifest.sets.characters), 'utf8')) as { items: { name: Record<string, string | null> }[] }
  const names = [...new Set(pack.items.flatMap(r => Object.values(r.name)).filter((v): v is string => !!v && v.length > 2))]
  const failures: string[] = []
  for (const file of files()) {
    if (/\.(png|webp)$/i.test(file)) continue
    const text = readFileSync(resolve(repo, file), 'utf8').toLowerCase()
    for (const name of names) {
      const lower = name.toLowerCase()
      let index = text.indexOf(lower)
      while (index >= 0) {
        if (!/[a-z0-9]/u.test(text[index - 1] ?? ' ') && !/[a-z0-9]/u.test(text[index + lower.length] ?? ' ')) { failures.push(`${file}: private name`); break }
        index = text.indexOf(lower, index + 1)
      }
    }
  }
  expect(failures).toEqual([])
})
