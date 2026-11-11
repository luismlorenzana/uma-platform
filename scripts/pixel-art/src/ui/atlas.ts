import { Sprite } from '../sprite.ts'
import { laurelMark } from '../laurel.ts'
import { Img } from '../tiles/image.ts'
import { classEmblem } from './classes.ts'
import { statusBadge } from './statuses.ts'
import { currencyMark, tierCrest } from './racer.ts'
import { achievementBadge, frontCrest } from './rift.ts'
import { starCrest, statMark } from './stars.ts'
import { cardTicket, yardMark } from './yard.ts'
import { farmMark, goldCoin, seasonMark } from './farm.ts'
import { heartsMark, homesteadSmall, playIcon, ringBench } from './romance.ts'
import { ACHIEVEMENTS, CLASSES, CURRENCIES, FARM_MARKS, FRAME_SPECS, FRONTS, HEARTS_MARKS, HOMESTEAD_MARKS, HYBRIDS, PLAY_MARKS, SEASONS, STAR_BODIES, STAT_MARKS, STATUSES, TIER0, TIERS, type FrameSpec } from './spec.ts'

export type UiFrame = FrameSpec & { img: Img }
export interface FrameIndex { x: number; y: number; w: number; h: number; group: FrameSpec['group']; key: string }

export function drawUi(spec: FrameSpec): Img {
  const s = new Sprite(spec.w, spec.h)
  let cutout: ReturnType<typeof currencyMark>
  if (spec.group === 'class') classEmblem(s, spec.key)
  else if (spec.group === 'status') statusBadge(s, spec.key)
  else if (spec.group === 'currency') {
    if (spec.key === 'laurel') laurelMark(s)
    else if (spec.key === 'card-ticket') cardTicket(s)
    else if (spec.key === 'gold') goldCoin(s)
    else cutout = currencyMark(s, spec.key)
  }
  else if (spec.group === 'tier') tierCrest(s, spec.key)
  else if (spec.group === 'front') frontCrest(s, spec.key)
  else if (spec.group === 'achievement') achievementBadge(s, spec.key)
  else if (spec.group === 'star') starCrest(s, spec.key)
  else if (spec.group === 'yard') yardMark(s, spec.key)
  else if (spec.group === 'farm') { if (spec.key === 'ring-bench') ringBench(s); else farmMark(s, spec.key) }
  else if (spec.group === 'homestead') homesteadSmall(s, spec.key)
  else if (spec.group === 'hearts') heartsMark(s, spec.key)
  else if (spec.group === 'play') playIcon(s, spec.key)
  else if (spec.group === 'season') seasonMark(s, spec.key)
  else statMark(s, spec.key)
  const img = new Img(spec.w, spec.h, s.render())
  cutout?.each((x, y) => img.set(x, y, [0, 0, 0, 0]))
  return img
}
export const uiFrames = (): UiFrame[] => FRAME_SPECS.map((spec) => ({ ...spec, img: drawUi(spec) }))

export function checkUi(frames: readonly UiFrame[]): string[] {
  const expected = new Map(FRAME_SPECS.map((s) => [s.id, s])), seen = new Set<string>(), bad: string[] = []
  for (const frame of frames) {
    const spec = expected.get(frame.id)
    if (!spec) bad.push(`Unexpected ui frame ${frame.id}`)
    if (seen.has(frame.id)) bad.push(`Duplicate ui frame ${frame.id}`)
    seen.add(frame.id)
    if (frame.w !== spec?.w || frame.h !== spec.h || frame.img.w !== frame.w || frame.img.h !== frame.h) bad.push(`${frame.id}: wrong native size`)
    if (frame.group !== spec?.group || frame.key !== spec.key) bad.push(`${frame.id}: wrong group/key`)
    if (!frame.img.px.some((v, i) => i % 4 === 3 && v === 255)) bad.push(`${frame.id}: empty icon`)
  }
  for (const id of expected.keys()) if (!seen.has(id)) bad.push(`Missing ui frame ${id}`)
  return bad
}

export function packUi(frames: readonly UiFrame[]): { atlas: Img; index: Record<string, FrameIndex> } {
  // Append below H11's 120×36 cutout and A02's row. Never repack a published row; the width stays 120 (H31's guard).
  // H38 adds the front crests at y=52 and the achievements five across from y=68. H54's Paladin takes the free cell
  // beside achievement/crossover at (24, 116): the class row is full at 120, and published frames never move.
  // H127 fills two more cells beside the Paladin; the five beginners append in tree order on a new row at y=140.
  // H141 appends the five 24px crests at y=164, then seven 16px marks at y=188 and the eighth at y=204.
  // A05 appends one 16px currency and two 24px Yard pieces on a new row at y=220.
  // F25 part A appends the farm's gold and five farm marks on a new row at y=244, and the four seasons at y=260.
  // F55 appends the romance core's: the two small houses and the ring bench (24px) at y=276, the seven Hearts marks at
  // y=300, the five plays at y=316, and the 48px Memory frame at y=332.
  const atlas = new Img(120, 380), index: Record<string, FrameIndex> = {}
  const farmCell = (group: string, key: string) => group === 'currency' && key === 'gold' ? [0, 244]
    : group === 'farm' && key === 'ring-bench' ? [48, 276]
    : group === 'farm' ? [16 + FARM_MARKS.indexOf(key as typeof FARM_MARKS[number]) * 16, 244]
    : group === 'season' ? [SEASONS.indexOf(key as typeof SEASONS[number]) * 16, 260]
    : group === 'homestead' ? [HOMESTEAD_MARKS.indexOf(key as typeof HOMESTEAD_MARKS[number]) * 24, 276]
    : group === 'hearts' && key === 'memory-frame' ? [0, 332]
    : group === 'hearts' ? [HEARTS_MARKS.indexOf(key as typeof HEARTS_MARKS[number]) * 16, 300]
    : group === 'play' ? [PLAY_MARKS.indexOf(key as typeof PLAY_MARKS[number]) * 16, 316] : null
  for (const { id, group, key, w, h, img } of frames) {
    const n = ACHIEVEMENTS.indexOf(key as typeof ACHIEVEMENTS[number])
    const paladin = group === 'class' && key === 'paladin'
    const hybrid = HYBRIDS.indexOf(key as typeof HYBRIDS[number]), beginner = TIER0.indexOf(key as typeof TIER0[number])
    const star = group === 'star' ? STAR_BODIES.indexOf(key) : -1, stat = group === 'stat' ? STAT_MARKS.indexOf(key) : -1
    const card = group === 'currency' && key === 'card-ticket', yard = group === 'yard'
    const x = card ? 0 : yard ? key === 'fatigue' ? 16 : 40 : star >= 0 ? star * 24 : stat >= 0 ? (stat % 7) * 16 : paladin ? 24 : hybrid >= 0 ? 48 + hybrid * 24 : beginner >= 0 ? beginner * 24 : group === 'class' ? CLASSES.indexOf(key as typeof CLASSES[number]) * 24
      : group === 'status' ? STATUSES.indexOf(key as typeof STATUSES[number]) * 12
      : group === 'currency' ? key === 'laurel' ? 84 : CURRENCIES.indexOf(key as typeof CURRENCIES[number]) * 16
      : group === 'tier' ? 48 + TIERS.indexOf(key as typeof TIERS[number]) * 12
      : group === 'front' ? FRONTS.indexOf(key as typeof FRONTS[number]) * 16
      : (n % 5) * 24
    const y = card || yard ? 220 : star >= 0 ? 164 : stat >= 0 ? 188 + Math.floor(stat / 7) * 16 : beginner >= 0 ? 140 : paladin || hybrid >= 0 ? 116 : group === 'class' ? 0 : group === 'status' ? 24 : group === 'front' ? 52 : group === 'achievement' ? 68 + Math.floor(n / 5) * 24 : 36
    const [fx, fy] = farmCell(group, key) ?? [x, y]
    atlas.copy(img, fx!, fy!); index[id] = { x: fx!, y: fy!, w, h, group, key }
  }
  return { atlas, index }
}
