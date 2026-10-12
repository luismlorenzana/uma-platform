// H06 part 2: the remaining biome textures and the world ocean. Reuse the Hub's toroidal stamp dealer.
import { ramp, type RGBA } from '../color.ts'
import { groundTile, type GroundStyle, type Stamp } from '../tiles/ground.ts'
import type { Biome, PhaseOneBiome } from './spec.ts'
const css = (c: RGBA): string => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')
function style(id: string, base: string, accent: string, marks: readonly Stamp[], features: readonly [readonly Stamp[], readonly Stamp[]], spacing = 4): GroundStyle {
  const c = ramp(base, { lift: 0.2, drop: 0.16 }), a = ramp(accent, { lift: 0.3, drop: 0.22 })
  return { page: 'world:' + id, base, grain: { light: css(c[4]!), dark: css(c[2]!), rate: 0.18 },
    ink: { d: css(c[1]!), l: css(c[4]!), h: css(c[5]!), a: css(a[3]!), b: css(a[2]!), c: css(a[4]!) },
    marks, features, darts: 52, spacing }
}
type RestBiome = Exclude<Biome, PhaseOneBiome>
export const REST_GROUND: Record<RestBiome | 'ocean', GroundStyle> = {
  swamp: style('swamp', '#6b7340', '#9ca95a',
    [['d.d', '.d.'], ['b', 'a', 'd'], ['.b.', 'bab']],
    [[['a...', '.a..', '..c.']], [['..dd.', '.d..d', 'd...d']]]),
  jungle: style('jungle', '#3b8846', '#81b955',
    [['.l.', 'dld'], ['a.a', '.b.'], ['.d', 'd.']],
    [[['..c..', 'acac.', '..b..']], [['a...', '.a..', '..a.', '...b']]], 3.8),
  desert: style('desert', '#d9b24c', '#f4d37b',
    [['..lll', 'dd...'], ['ll..', '..dd'], ['a']],
    [[['...cc.', '..c...', 'bb....']], [['.lll..', 'l...ll', '...ddd']]], 5),
  canyon: style('canyon', '#b5583a', '#d69160',
    [['ll..', '..dd'], ['a.b.a'], ['d', 'd']],
    [[['llll..', '....dd', 'aaa...']], [['d...', '.dd.', '..d.', '...d']]], 4.8),
  geyser: style('geyser', '#d5b596', '#cf8550',
    [['.lll.', 'l...l'], ['aab'], ['d.l']],
    [[['..cc..', '.c..c.', 'c....c']], [['aaa.', '..ab', '...b']]], 5),
  tundra: style('tundra', '#a9c7d9', '#698b74',
    [['.hhh', 'll..'], ['a.b', '.b.'], ['d']],
    [[['..hhh', '.hlll', 'll...']], [['a..a', '.bab', '..b.']]]),
  peaks: style('peaks', '#6f7a8c', '#c0c8cf',
    [['ld', '.d'], ['c', 'b'], ['.d.', 'd.d']],
    [[['c.b.', '.bd.', '..d.']], [['..hh', '.lld', 'dd..']]]),
  highlands: style('highlands', '#9a86b5', '#d0accd',
    [['.a.', 'blb'], ['l', 'd'], ['.c', 'b.']],
    [[['c.c.c', '.a.a.', '..b..']], [['.l...', 'dl.dl', '..d..']]]),
  sky: style('sky', '#dfd0a0', '#f4ebb9',
    [['a.a', '.d.'], ['.l.', 'dld'], ['c']],
    [[['.hh.', 'hllh', '.ll.']], [['c.c.', '.aa.', '..b.']]]),
  underworld: style('underworld', '#4a3366', '#97bbc1',
    [['d.d', '.d.'], ['b', 'c'], ['l.d']],
    [[['..c.', '.aba', 'b...']], [['d...', '.dd.', '..d.', '...d']]], 5),
  moor: style('moor', '#6d6880', '#a2a4b7',
    [['l.d', '.d.'], ['a..', '.a.'], ['b', 'd']],
    [[['..cc.', '.aa..', 'b....']], [['d.d.', '.dd.', '..d.']]], 4.8),
  crystal: style('crystal', '#304b58', '#59c9d9',
    [['d.d', '.d.'], ['a', 'b'], ['.c.', 'aba']],
    [[['.c..', 'cac.', '.bb.']], [['...c', '..ca', '.ab.', 'b...']]], 4.5),
  ruins: style('ruins', '#a39a86', '#79925b',
    [['dd..', '..dd'], ['l.d'], ['b', 'a']],
    [[['ddd.', '...d', '...d']], [['.c.c', 'abab', '.b..']]], 5),
  rift: style('rift', '#3d3f8f', '#c49ecd',
    [['d.l', '.d.'], ['c'], ['a.b']],
    [[['..c..', '.cac.', '..b..']], [['l...', '.l..', '..d.', '...d']]], 5),
  ocean: style('ocean', '#245676', '#7badc6',
    [['..aa', 'bb..'], ['l'], ['d.d']],
    [[['.cccc.', 'a....a']], [['...aa.', '.aa...', 'bb....']]], 6),
}
export const oceanGround = (variant: number) => groundTile(REST_GROUND.ocean, variant)
