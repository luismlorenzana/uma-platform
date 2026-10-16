import { Sprite } from '../sprite.ts'
import { speedTicket } from '../ticket.ts'

/** Ungraded utility art, outside the RPG's material families and their grade metadata. */
export function speedTicketItem(): Uint8Array {
  const sprite = new Sprite(32, 32)
  sprite.shadow = { cx: 16, cy: 28, rx: 9.5, ry: 2.2, alpha: 80 }
  speedTicket(sprite)
  return sprite.render()
}
