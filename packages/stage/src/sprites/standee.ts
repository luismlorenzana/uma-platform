// A standee (uma-platform ST2; uma-farm F57's ask 10, FR12): an Uma whose outfit has no sprite set yet, as her face on an
// upright card on a small base, lit and shadowed like a sprite. She glides with a small bob and no walk cycle. It answers
// the same calls as a `SpriteActor` (`stand`, `update`, `dispose`), so a stage moves either the same way. The face is the
// game's (master data's `outfit-faces`); with none, a plain stand-in.
import { BufferGeometry, CanvasTexture, CircleGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, NearestFilter, SRGBColorSpace } from 'three'
import { spriteStretch, TEXELS_PER_UNIT } from '../stage/camera.js'
import { softShadow } from './actor.js'
import type { Facing } from './facing.js'

/** The card, in texels: a 96 × 112 face card on a 112 × 24 base, its foot at the base's bottom middle. */
export const STANDEE = { w: 112, h: 144, card: { x: 8, y: 0, w: 96, h: 112 }, base: { y: 112, h: 32 } } as const
/** The bob's height (tiles) and beats a second while she glides. */
const BOB = { height: 0.06, rate: 2.4 }

/** Draws a standee's card: a white-edged card with the face cover-fitted, on a wooden base. */
export function drawStandee(face: CanvasImageSource | null, canvas: HTMLCanvasElement = document.createElement('canvas')): HTMLCanvasElement {
  canvas.width = STANDEE.w
  canvas.height = STANDEE.h
  const g = canvas.getContext('2d')!
  const { card, base } = STANDEE
  g.clearRect(0, 0, STANDEE.w, STANDEE.h)
  // The base: a low wooden plinth.
  g.fillStyle = '#5a3d24'
  g.beginPath(); g.ellipse(STANDEE.w / 2, base.y + 18, 52, 12, 0, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#7a5434'
  g.beginPath(); g.ellipse(STANDEE.w / 2, base.y + 12, 50, 10, 0, 0, Math.PI * 2); g.fill()
  // The card, with a stand behind it into the base.
  g.fillStyle = '#3a2a1a'
  g.fillRect(STANDEE.w / 2 - 4, card.h - 8, 8, 20)
  g.fillStyle = '#fbf6ec'
  g.beginPath(); g.roundRect(card.x, card.y, card.w, card.h, 10); g.fill()
  const inner = { x: card.x + 6, y: card.y + 6, w: card.w - 12, h: card.h - 12 }
  g.save()
  g.beginPath(); g.roundRect(inner.x, inner.y, inner.w, inner.h, 6); g.clip()
  if (face && 'width' in face && Number(face.width) > 0) {
    const fw = Number(face.width), fh = Number((face as { height: number }).height)
    const k = Math.max(inner.w / fw, inner.h / fh), w = fw * k, h = fh * k
    g.imageSmoothingQuality = 'high'
    g.drawImage(face, inner.x + (inner.w - w) / 2, inner.y + (inner.h - h) / 2, w, h)
  } else {
    // No face: a plain silhouette, no art.
    g.fillStyle = '#c9d6e8'; g.fillRect(inner.x, inner.y, inner.w, inner.h)
    g.fillStyle = '#8fa3bf'
    g.beginPath(); g.arc(inner.x + inner.w / 2, inner.y + 38, 22, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.ellipse(inner.x + inner.w / 2, inner.y + inner.h + 6, 36, 34, 0, Math.PI, 0); g.fill()
  }
  g.restore()
  g.strokeStyle = 'rgba(58,42,26,0.55)'; g.lineWidth = 2
  g.beginPath(); g.roundRect(card.x + 1, card.y + 1, card.w - 2, card.h - 2, 10); g.stroke()
  return canvas
}

export class Standee {
  readonly group = new Group()
  private readonly card: Mesh<BufferGeometry, MeshBasicMaterial>
  private readonly shadow: Mesh
  private readonly texture: CanvasTexture
  private clock = 0
  private bob = 0

  constructor(face: CanvasImageSource | null) {
    this.texture = new CanvasTexture(drawStandee(face))
    this.texture.magFilter = NearestFilter
    this.texture.minFilter = NearestFilter
    this.texture.generateMipmaps = false
    this.texture.colorSpace = SRGBColorSpace
    const g = new BufferGeometry(), k = 1 / TEXELS_PER_UNIT, s = spriteStretch()
    const x0 = (-STANDEE.w / 2) * k, x1 = (STANDEE.w / 2) * k, y1 = STANDEE.h * k * s
    g.setAttribute('position', new Float32BufferAttribute([x0, 0, 0, x1, 0, 0, x1, y1, 0, x0, y1, 0], 3))
    g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
    g.setIndex([0, 1, 2, 0, 2, 3])
    this.card = new Mesh(g, new MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false }))
    this.shadow = new Mesh(new CircleGeometry(0.5, 20), new MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }))
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.renderOrder = -1
    this.group.add(this.card)
  }

  get shadowMesh(): Mesh { return this.shadow }

  /** Her foot in the world (on the pixel grid), her draw order and her tint; the bob lifts the card, not the shadow. */
  stand(x: number, y: number, z: number, order: number, tint: [number, number, number]): void {
    this.group.position.set(x, y + this.bob, z)
    this.card.renderOrder = order
    this.card.material.color.setRGB(tint[0], tint[1], tint[2])
    this.shadow.position.set(x, y + 0.01, z)
    this.shadow.scale.set(0.85, 0.4, 1)
  }

  /** Advances the bob: a small hop while she glides, none standing; a standee has no facing. */
  update(ms: number, _facing: Facing, moving: boolean, running: boolean): void {
    this.clock += ms / 1000
    const rate = BOB.rate * (running ? 1.6 : 1)
    // Whole device pixels, so the card never shimmers.
    this.bob = moving ? Math.round(Math.abs(Math.sin(this.clock * Math.PI * rate)) * BOB.height * TEXELS_PER_UNIT) / TEXELS_PER_UNIT : 0
  }

  dispose(): void {
    this.texture.dispose()
    this.card.geometry.dispose()
    this.card.material.dispose()
    this.shadow.geometry.dispose()
    ;(this.shadow.material as MeshBasicMaterial).dispose()
  }
}
