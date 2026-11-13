// ST4: `@luismlorenzana/uma-stage/formats` stays three-free and DOM-free, so a game's domain (its rules, its API, its tests)
// can check a farm design against the stand-in kit without the stage: every module the entry reaches is read here.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { farmProblems, SAMPLE_FARM, standInFarmAtlas } from './index.js'

const src = resolve(dirname(fileURLToPath(import.meta.url)), '..')
function reach(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen
  seen.add(file)
  const text = readFileSync(file, 'utf8')
  for (const [, spec] of text.matchAll(/(?:import|export)[^'"]*?from\s+'([^']+)'/g)) {
    if (spec!.startsWith('.')) reach(resolve(dirname(file), spec!.replace(/\.js$/, '.ts')), seen)
    else seen.add(`package:${spec}`)
  }
  return seen
}

describe('the formats entry (ST4)', () => {
  it('reaches no three.js, no React and no DOM', () => {
    const files = reach(resolve(src, 'formats/index.ts'))
    expect([...files].filter((f) => f.startsWith('package:'))).toEqual([])
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/\bdocument\.|\bwindow\.|CanvasTexture|requestAnimationFrame/)
  })

  it('checks a farm design against the stand-in kit', () => {
    expect(farmProblems(SAMPLE_FARM, standInFarmAtlas())).toEqual([])
    expect(farmProblems({ ...SAMPLE_FARM, props: [{ name: 'not-a-frame', x: 0, z: 0 }] }, standInFarmAtlas())).toEqual(['no prop frame not-a-frame'])
  })
})
