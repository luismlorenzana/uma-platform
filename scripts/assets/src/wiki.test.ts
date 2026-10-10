import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'
import { chibiName, encodeWikiArt, parseWikiName, selectWikiArt, stageWikiFiles, stagedWikiFiles, standName } from './wiki'

describe('wiki file names', () => {
  it('reads chibis and the four outfit stands', () => {
    expect(parseWikiName('Game_Asset_petit_chr_9068_906810_0010.png')).toEqual({ family: 'chibi', chara: '9068', dress: '906810', pose: 'a' })
    expect(parseWikiName('Game_Asset_petit_chr_9068_906810_0011.png')).toEqual({ family: 'chibi', chara: '9068', dress: '906810', pose: 'b' })
    expect(parseWikiName('Game_Asset_chara_stand_9001_000001.png')).toEqual({ family: 'dress', chara: '9001', look: 'gym' })
    expect(parseWikiName('Game_Asset_chara_stand_9001_000002.png')).toEqual({ family: 'dress', chara: '9001', look: 'summer' })
    expect(parseWikiName('Game_Asset_chara_stand_9001_000005.png')).toEqual({ family: 'dress', chara: '9001', look: 'winter' })
    expect(parseWikiName('Game_Asset_chara_stand_9001_909001.png')).toEqual({ family: 'dress', chara: '9001', look: 'casual' })
  })

  it("ignores lookalikes: an outfit stand, a race dress, someone else's casual, other poses and formats", () => {
    for (const name of [
      'Game_Asset_chara_stand_9001_900101.png',
      'Game_Asset_chara_stand_9001_000103.png',
      'Game_Asset_chara_stand_9001_909002.png',
      'Game_Asset_petit_chr_9001_900101_0012.png',
      'Game_Asset_petit_chr_9001_900101_0010.jpg',
      'petit_chr_9001_900101_0010.png',
    ]) expect(parseWikiName(name)).toBeNull()
  })
})

describe("selecting the roster's art", () => {
  // An invented character whose second outfit uses dress 906810 and whose third uses dress 906802.
  const outfits = [
    { id: 906801, characterId: 9068, costumeId: 906801 },
    { id: 906802, characterId: 9068, costumeId: 906810 },
    { id: 906803, characterId: 9068, costumeId: 906802 },
  ]
  const files = new Set([
    ...['906801', '906810', '906802'].flatMap((dress) => [chibiName('9068', dress, 'a'), chibiName('9068', dress, 'b')]),
    standName('9068', 'gym'), standName('9068', 'winter'), standName('9068', 'casual'),
  ])

  it("matches each outfit's chibi by its dress id, not its outfit id", () => {
    const selection = selectWikiArt(files, outfits)
    expect(selection.chibi.find((pick) => pick.id === '906802-a')!.file).toBe('Game_Asset_petit_chr_9068_906810_0010.png')
    expect(selection.chibi.find((pick) => pick.id === '906803-b')!.file).toBe('Game_Asset_petit_chr_9068_906802_0011.png')
  })

  it('takes one set of stands and one face per character, and reports the gaps', () => {
    const selection = selectWikiArt(files, outfits)
    expect(selection.dress.map((pick) => pick.id)).toEqual(['9068-gym', '9068-winter', '9068-casual'])
    // No summer uniform here, so the face comes from the winter one.
    expect(selection.face).toEqual([{ id: '9068', file: standName('9068', 'winter') }])
    expect(selection.missing).toEqual(['9068-summer'])
  })
})

describe('staging and encoding', () => {
  let dir: string | null = null
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  it('stages only roster files, once', async () => {
    dir = await mkdtemp(join(tmpdir(), 'wiki-'))
    const source = join(dir, 'source')
    const cache = join(dir, 'cache')
    await mkdir(source)
    await writeFile(join(source, standName('9001', 'summer')), 'x')
    await writeFile(join(source, 'notes.txt'), 'x')
    expect(await stageWikiFiles(source, cache)).toEqual({ copied: 1, kept: 0 })
    expect(await stageWikiFiles(source, cache)).toEqual({ copied: 0, kept: 1 })
    expect([...(await stagedWikiFiles(cache))]).toEqual([standName('9001', 'summer')])
  })

  it('cuts a 128 px face from a 512 px stand and keeps its transparency', async () => {
    const stand = await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 0.5 } } }).png().toBuffer()
    const face = await encodeWikiArt('face', '9001', stand)
    expect([face.width, face.height]).toEqual([128, 128])
    expect((await sharp(face.bytes).metadata()).hasAlpha).toBe(true)
    const chibi = await encodeWikiArt('chibi', '900101-a', await sharp({ create: { width: 256, height: 256, channels: 4, background: '#fff' } }).png().toBuffer())
    expect(chibi.width).toBe(256)
  })
})
