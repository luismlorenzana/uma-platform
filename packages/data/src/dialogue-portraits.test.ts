import { describe, expect, it } from 'vitest'
import { artPaths } from './art.js'
import { createReleaseClient } from './client.js'
import { DIALOGUE_PORTRAIT_EXPRESSIONS, dialoguePortraitChoices, dialoguePortraitFor, dialoguePortraitPaths, parseDialoguePortraits } from './dialogue-portraits.js'
import { buildMemoryRelease, createMemorySource, syntheticDialoguePortraits } from './testing.js'

const portraits = () => {
  const p = syntheticDialoguePortraits(1068, ['spring', 'kimono'], ['happy', 'sad'])
  for (const i of [...Object.values(p.bases), ...Object.values(p.faces)]) i.sha256 = 'a'.repeat(64)
  return p
}

describe('the dialogue-portraits format', () => {
  it('reads her bases by outfit, each with its face position, and her faces by expression', () => {
    const p = parseDialoguePortraits(portraits(), 'p')
    expect(Object.keys(p.bases)).toEqual(['spring', 'kimono'])
    expect(p.bases.kimono!.face).toEqual({ left: 150, top: 140 })
    expect(dialoguePortraitPaths(p)).toHaveLength(4)
  })
  it('holds every base to one size and every face to the face size', () => {
    const wide = portraits(); wide.bases.kimono!.width = 600
    expect(() => parseDialoguePortraits(wide, 'p')).toThrow(/525 × 700/)
    const odd = portraits(); odd.faces.sad!.height = 200
    expect(() => parseDialoguePortraits(odd, 'p')).toThrow(/224 × 224/)
  })
  it('keeps each face square on its base, a base at least, and no neutral face picture', () => {
    const off = portraits(); off.bases.spring!.face = { left: 400, top: 0 }
    expect(() => parseDialoguePortraits(off, 'p')).toThrow(/inside the base/)
    expect(() => parseDialoguePortraits({ ...portraits(), bases: {} }, 'p')).toThrow(/at least one base/)
    const neutral = portraits(); neutral.faces.neutral = { ...neutral.faces.happy! }
    expect(() => parseDialoguePortraits(neutral, 'p')).toThrow(/neutral/)
  })
  it('accepts names it may not know yet, but only well formed', () => {
    const p = portraits(); p.bases['beach-day'] = { ...p.bases.spring! }
    expect(parseDialoguePortraits(p, 'p').bases['beach-day']).toBeDefined()
    const bad = portraits(); bad.faces['Big Smile'] = { ...bad.faces.happy! }
    expect(() => parseDialoguePortraits(bad, 'p')).toThrow(/lowercase/)
  })
})

describe('choosing what to draw', () => {
  it('draws the base and the face over it at that base’s position', () => {
    const r = dialoguePortraitFor(parseDialoguePortraits(portraits(), 'p'), 'kimono', 'happy')
    expect([r.outfit, r.expression, r.face?.path.includes('face-happy'), r.at]).toEqual(['kimono', 'happy', true, { left: 150, top: 140 }])
  })
  it('falls back per picture: a missing outfit is her first in Farm Life’s order, a missing face is neutral', () => {
    const r = dialoguePortraitFor(parseDialoguePortraits(portraits(), 'p'), 'wedding', 'loving')
    expect([r.outfit, r.expression, r.face]).toEqual(['spring', 'neutral', null])
  })
  it('lists her choices in Farm Life’s order, neutral first', () => {
    expect(dialoguePortraitChoices(parseDialoguePortraits(portraits(), 'p'))).toEqual({ outfits: ['spring', 'kimono'], expressions: ['neutral', 'happy', 'sad'] })
    expect(DIALOGUE_PORTRAIT_EXPRESSIONS).toHaveLength(16)
  })
})

describe('reading a character’s portraits through a release', () => {
  it('finds her by character id, checks every picture against the manifest, and is null for one without', async () => {
    const release = await buildMemoryRelease(undefined, { dialoguePortraits: [syntheticDialoguePortraits(1068), syntheticDialoguePortraits(1129, ['spring'], [])] })
    const client = createReleaseClient({ source: createMemorySource(release.objects) })
    const manifest = await client.manifest()
    const art = (await client.art(manifest))!
    expect(Object.keys(art.dialoguePortraits ?? {}).sort()).toEqual(['1068', '1129'])
    expect(artPaths(art)).toEqual(expect.arrayContaining(Object.values(art.dialoguePortraits!)))
    const p = (await client.dialoguePortraits(manifest, art, 1068))!
    const listed = new Map(manifest.files.map((f) => [f.path, f]))
    for (const i of Object.values(p.bases)) expect(listed.get(i.path)?.sha256).toBe(i.sha256)
    expect((await client.dialoguePortraits(manifest, art, 1129))!.faces).toEqual({})
    expect(await client.dialoguePortraits(manifest, art, 1002)).toBeNull()
  })
})
