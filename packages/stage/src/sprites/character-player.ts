import { CHARACTER_FACINGS, type CharacterFacing, type CharacterSpriteCell, type CharacterSpriteVariant } from '@luismlorenzana/uma-data'
import { AtlasPlayer, type AtlasAction } from './player.js'
import { fieldPose } from './facing.js'

type CellFrame = CharacterSpriteCell & { ms?: number; view?: CharacterFacing }

/** Four authored walks and four authored stills. Geometry stays in native atlas pixels. */
export class CharacterSpritePlayer {
  private readonly set: { actions: Record<string, AtlasAction<CellFrame>> }
  private readonly player: AtlasPlayer<CellFrame>
  private pose = ''

  constructor(variant: CharacterSpriteVariant) {
    const actions: Record<string, AtlasAction<CellFrame>> = {
      turnaround: { frames: CHARACTER_FACINGS.map(view => ({ ...variant.standing[view], view })), loop: false, events: {} },
    }
    for (const view of CHARACTER_FACINGS) {
      actions[`walk-${view}`] = {
        frames: variant.walking[view].map(({ x, y, durationMs }) => ({ x, y, ms: durationMs })),
        loop: true, events: {},
      }
    }
    this.set = { actions }
    this.player = new AtlasPlayer(this.set)
  }

  update(ms: number, facing: CharacterFacing, moving: boolean): CharacterSpriteCell {
    const pose = fieldPose(this.set, facing, moving, false)
    const key = pose.kind === 'still' ? `${pose.action}:${pose.frame}` : pose.action
    if (key !== this.pose) {
      this.pose = key
      if (pose.kind === 'still') this.player.show(pose.action, pose.frame)
      else this.player.play(pose.action)
    }
    this.player.tick(ms)
    return this.player.frame!
  }
}
