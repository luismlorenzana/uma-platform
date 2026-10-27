// Original H113 workshops. Published Forge/Workbench/Arcane Armory painters stay untouched.
import type { Sprite } from '../sprite.ts'
import { barrel, chimney, col, crate, crystal, dome, fill, glow, hline, line, M, rect, roofGable, roofSide, vline, wall } from './kit.ts'
import type { Place } from './types.ts'

/** The five trades share a small open shed, not the taller, enclosed making workshops. */
function shed(s: Sprite, awning: string) {
  const wood = col(s, '#93643e'), roof = col(s, '#695249'), cloth = col(s, awning)
  rect(s, wood, 11, 25, 36, 35, 1)
  roofSide(s, roof, 8, 39, 16, 24, { tex: 'shingle', seed: 'h113-shed' })
  // A short striped canvas valance beneath the common pitched shingle roof.
  rect(s, cloth, 8, 25, 39, 27, 3)
  for (let x = 9; x < 39; x += 4) rect(s, cloth, x, 25, x + 1, 27, 4)
  for (const x of [11, 35]) {
    rect(s, wood, x, 28, x + 1, 43, 3)
    vline(s, wood, x, 28, 43, 4)
  }
  // Hanging trade sign; each painter incises its own small pictogram.
  vline(s, wood, 23, 28, 29, 2)
  rect(s, wood, 20, 30, 27, 33, 4)
  hline(s, wood, 20, 27, 33, 2)
  rect(s, wood, 12, 36, 35, 38, 3)
  hline(s, wood, 12, 35, 36, 5)
  for (const x of [14, 32]) rect(s, wood, x, 39, x + 1, 43, 2)
  return wood
}

function ingot(s: Sprite, id: number, x: number, y: number) {
  rect(s, id, x, y, x + 5, y + 2, 3)
  hline(s, id, x + 1, x + 4, y, 5)
  hline(s, id, x, x + 5, y + 2, 2)
}
function anvil(s: Sprite, iron: number, x: number, y: number) {
  hline(s, iron, x, x + 9, y, 5)
  rect(s, iron, x + 1, y + 1, x + 7, y + 2, 3)
  rect(s, iron, x + 4, y + 3, x + 5, y + 5, 2)
  rect(s, iron, x + 2, y + 6, x + 8, y + 6, 4)
}

export const TRIOS: Place[] = [
  {
    id: 'mine-workbench', name: 'Mine Workbench', page: 'wilds', at: { x: .5, y: .1 },
    paint(s) {
      const wood = shed(s, '#73777b'), stone = col(s, '#817f79'), metal = col(s, '#c3c5ba'), fire = col(s, '#f78932')
      wall(s, stone, 3, 10, 30, 42, 'stone', 'trio-smelter')
      const smoke = chimney(s, stone, 4, 14, 31, 4)
      rect(s, stone, 4, 35, 9, 40, 0)
      rect(s, fire, 5, 37, 8, 40, 3)
      hline(s, fire, 5, 8, 40, 5)
      // Crucible, with a bright molten lip, on the front bench.
      rect(s, stone, 15, 32, 19, 35, 2)
      hline(s, fire, 15, 19, 32, 4)
      ingot(s, metal, 29, 33)
      ingot(s, metal, 38, 40)
      ingot(s, metal, 38, 37)
      hline(s, metal, 22, 25, 31, 4)
      hline(s, wood, 21, 26, 34, 2)
      return { smoke }
    },
  },
  {
    id: 'fields-workbench', name: 'Fields Workbench', page: 'wilds', at: { x: .5, y: .3 },
    paint(s) {
      const wood = shed(s, '#62934b'), leaf = col(s, '#70a249'), carrot = col(s, '#e7943b'), iron = col(s, '#9da9a6')
      const fire = col(s, '#ef983e')
      // Eave bunches, board and upright cleaver.
      for (const x of [15, 31]) { vline(s, wood, x, 28, 29, 3); fill(s, M.ellipse(x + .5, 31, 1.6, 2), leaf, 4) }
      hline(s, wood, 22, 29, 35, 5)
      rect(s, iron, 26, 31, 29, 34, 4)
      vline(s, wood, 29, 29, 31, 4)
      line(s, carrot, 22, 31, 25, 32, 4)
      // Two produce baskets outside the shed, with visible leaves and carrot roots.
      for (const x of [3, 39]) {
        rect(s, wood, x, 39, x + 5, 43, 3)
        hline(s, wood, x, x + 5, 39, 5)
      }
      dome(s, M.circle(5.5, 38, 2.6), leaf, { contact: false })
      for (const x of [40, 43]) { line(s, carrot, x, 37, x - 1, 40, 4); s.paint(x, 36, leaf, 5) }
      // Small cooking pot on its fire; smoke is intentionally not an animation anchor.
      line(s, wood, 17, 42, 22, 43, 3)
      rect(s, fire, 18, 40, 21, 41, 4)
      rect(s, iron, 17, 37, 22, 39, 2)
      hline(s, iron, 17, 22, 37, 5)
    },
  },
  {
    id: 'forest-workbench', name: 'Forest Workbench', page: 'wilds', at: { x: .5, y: .5 },
    paint(s) {
      const wood = shed(s, '#c0a16c'), end = col(s, '#dbb37a'), iron = col(s, '#acb8b5')
      // Side sawhorse: split log and a long toothed saw, separate from the bench.
      for (const x of [5, 10]) { line(s, wood, x, 36, x - 2, 43, 3); line(s, wood, x, 36, x + 2, 43, 4) }
      rect(s, wood, 3, 34, 12, 37, 3)
      fill(s, M.ellipse(4, 35.5, 2, 2), end, 4)
      line(s, iron, 7, 32, 14, 39, 4)
      for (let i = 0; i < 4; i++) s.paint(8 + i, 34 + i, iron, 5)
      rect(s, wood, 6, 30, 8, 32, 2)
      // Planks, with lit end grain, and a little sawdust below the horse.
      for (const y of [37, 40, 43]) { rect(s, wood, 37, y - 1, 44, y, 3); hline(s, end, 38, 44, y - 1, 4) }
      hline(s, iron, 22, 26, 31, 4)
      for (const [x, y] of [[5, 44], [8, 43], [11, 44], [14, 42], [9, 41]] as const) s.paint(x, y, end, 4)
      hline(s, end, 18, 29, 35, 4)
    },
  },
  {
    id: 'fishery-workbench', name: 'Fishery Workbench', page: 'wilds', at: { x: .5, y: .7 },
    paint(s) {
      const wood = shed(s, '#528dba'), fish = col(s, '#a7c6ca'), flesh = col(s, '#dd9c81'), net = col(s, '#9b9b79')
      // Fish and knife on the cleaning table; fish-shaped hanging sign.
      fill(s, M.ellipse(23, 34.5, 4, 1.3), fish, 4)
      line(s, fish, 26, 34, 28, 33, 4)
      s.paint(20, 34, fish, 0)
      hline(s, fish, 29, 33, 34, 5)
      vline(s, wood, 33, 32, 34, 3)
      hline(s, fish, 22, 25, 31, 5)
      s.paint(26, 30, fish, 3)
      // Drying rack with three salmon fillets.
      for (const x of [3, 10]) vline(s, wood, x, 28, 43, 3)
      hline(s, wood, 3, 10, 29, 5)
      for (const x of [4, 7, 10]) { vline(s, net, x, 30, 31, 3); vline(s, flesh, x, 32, 36, 4); s.paint(x, 34, flesh, 2) }
      barrel(s, wood, fish, 41, 43, 6, 7)
      hline(s, fish, 39, 42, 37, 5) // Salt lid.
      for (const r of [1.5, 3]) {
        const ring = M.ellipse(24, 42, r + 1, r * .55).subtract(M.ellipse(24, 42, r, r * .55 - .6))
        fill(s, ring, net, 4)
      }
    },
  },
  {
    id: 'den-workbench', name: 'Den Workbench', page: 'wilds', at: { x: .5, y: .9 },
    paint(s) {
      const wood = shed(s, '#9468b1'), stone = col(s, '#969da5'), gem = col(s, '#96d6cc')
      // Upright grindstone on an A frame, with an axle and hand crank.
      for (const x of [5, 10]) { line(s, wood, 7, 35, x, 43, 4) }
      dome(s, M.ellipse(7.5, 34.5, 4, 4.5), stone, { contact: false })
      s.paint(7, 34, wood, 1)
      line(s, wood, 8, 35, 12, 37, 4)
      vline(s, wood, 12, 37, 39, 3)
      crate(s, wood, 38, 43, 7, 6)
      for (const [x, y] of [[39, 37], [42, 38], [43, 35]] as const) fill(s, M.circle(x, y, 1.7), stone, 3)
      for (const x of [16, 29, 33]) {
        crystal(s, gem, x, 35, 3, 3)
        s.paint(x - 1, 33, gem, 5)
      }
      fill(s, M.poly([[22, 31], [24, 30], [26, 31], [24, 32]]), gem, 4)
    },
  },
  {
    id: 'weapon-forge', name: 'Weapon Forge', page: 'wilds', at: { x: .8, y: .1 },
    paint(s) {
      const stone = col(s, '#8b8780'), roof = col(s, '#535e68'), iron = col(s, '#aebbc1'), wood = col(s, '#8a5a36'), fire = col(s, '#f16d2b')
      // High stone smithy and oversized hood; the open rack extends its working footprint.
      wall(s, stone, 4, 35, 20, 43, 'stone', 'weapon-forge')
      roofSide(s, roof, 2, 37, 8, 19, { tex: 'slate', seed: 'weapon-forge' })
      const smoke = chimney(s, stone, 6, 3, 18, 6)
      const mouth = M.rect(9, 31, 23, 41).union(M.ellipse(16.5, 31, 7.5, 6))
      fill(s, mouth, stone, 0)
      glow(s, 16.5, 36, 10, 8, '#fa772a', 50)
      fill(s, M.rect(11, 35, 21, 40), fire, 3)
      for (const x of [12, 16, 19]) vline(s, fire, x, 31 + x % 3, 39, 4)
      hline(s, fire, 11, 21, 40, 5)
      // Sword, axe and lance on a full-height timber rack to the right.
      for (const x of [33, 44]) rect(s, wood, x, 22, x, 43, 3)
      for (const y of [26, 38]) hline(s, wood, 32, 44, y, 4)
      vline(s, iron, 34, 20, 32, 4)
      hline(s, iron, 32, 36, 32, 4)
      vline(s, wood, 34, 33, 36, 4)
      vline(s, wood, 39, 23, 36, 4)
      fill(s, M.poly([[38, 23], [42, 21], [43, 25], [39, 27]]), iron, 4)
      vline(s, wood, 43, 17, 36, 3)
      fill(s, M.poly([[43, 13], [45, 18], [42, 18]]), iron, 5)
      anvil(s, iron, 25, 36)
      return { smoke }
    },
  },
  {
    id: 'tome-forge', name: 'Tome Forge', page: 'wilds', at: { x: .8, y: .3 },
    paint(s) {
      const stone = col(s, '#908ea1'), slate = col(s, '#53637b'), wood = col(s, '#836451'), violet = col(s, '#ad78df'), paper = col(s, '#e4d6ab')
      wall(s, stone, 8, 39, 22, 43, 'stone', 'tome-forge')
      const gable = roofGable(s, slate, 5, 42, 24, 14, 5, { tex: 'slate', wallTop: 24 })
      fill(s, gable, stone, 3)
      const smoke = chimney(s, stone, 33, 6, 19, 5)
      // Violet kiln in the left wing and a lit window over the lectern.
      fill(s, M.rect(10, 33, 20, 41).union(M.ellipse(15.5, 33, 5.5, 4)), stone, 0)
      rect(s, violet, 12, 34, 18, 40, 3)
      glow(s, 15, 36, 7, 6, '#a45df3', 55)
      rect(s, wood, 26, 25, 35, 32, 2)
      rect(s, violet, 27, 26, 34, 30, 1)
      hline(s, wood, 25, 36, 32, 5)
      for (const x of [27, 34]) { rect(s, violet, x, 30, x + 1, 31, 4); s.paint(x, 29, wood, 2) }
      vline(s, wood, 30, 36, 43, 3)
      hline(s, wood, 27, 33, 43, 3)
      fill(s, M.poly([[23, 35], [29, 34], [30, 35], [35, 34], [37, 38], [31, 39], [25, 39]]), paper, 4)
      line(s, wood, 30, 35, 31, 38, 2)
      hline(s, wood, 25, 28, 37, 3)
      hline(s, wood, 32, 35, 37, 3)
      // Floating rune sparks at the gable's flanks, not painted smoke.
      for (const [x, y] of [[4, 19], [42, 30]] as const) {
        line(s, violet, x, y - 2, x + 1, y, 5)
        line(s, violet, x + 1, y, x, y + 2, 4)
      }
      return { smoke }
    },
  },
  {
    id: 'charm-forge', name: 'Charm Forge', page: 'wilds', at: { x: .8, y: .7 },
    paint(s) {
      const brick = col(s, '#b47b5d'), roof = col(s, '#826b59'), gold = col(s, '#e7b959'), iron = col(s, '#9ca8af'), wood = col(s, '#805b3e')
      wall(s, brick, 9, 36, 23, 43, 'brick', 'charm-forge')
      roofSide(s, roof, 6, 39, 14, 22, { tex: 'tile', seed: 'charm-forge' })
      const smoke = chimney(s, brick, 29, 8, 21, 5)
      fill(s, M.rect(12, 34, 23, 41).union(M.ellipse(18, 34, 6, 5)), brick, 0)
      rect(s, gold, 14, 35, 21, 40, 4)
      glow(s, 18, 36, 8, 7, '#ffc85e', 48)
      // Gold pendants hang from a front rail, each with its own outline.
      hline(s, wood, 12, 35, 26, 5)
      for (const x of [15, 24, 33]) vline(s, gold, x, 27, 29, 3)
      fill(s, M.circle(15.5, 31, 2.5).subtract(M.circle(15.5, 31, 1)), gold, 4)
      fill(s, M.poly([[24, 29], [26, 32], [24, 34], [22, 32]]), gold, 4)
      hline(s, gold, 31, 35, 31, 4)
      vline(s, gold, 33, 29, 34, 5)
      anvil(s, iron, 33, 37)
      return { smoke }
    },
  },
]
