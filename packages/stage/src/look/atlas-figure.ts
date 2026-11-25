import { CircleGeometry, DataTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshDepthMaterial,
  MeshStandardMaterial, NearestFilter, PlaneGeometry, RGBADepthPacking, RGBAFormat, SRGBColorSpace, Texture } from 'three'

export interface AtlasFigureSize { width: number; height: number }
export interface AtlasFigurePoint { x: number; y: number }
type PageImage = HTMLCanvasElement | HTMLImageElement

const pages = new WeakMap<PageImage, { texture: Texture; leases: number }>()
const ALPHA = .42
const SHADOW_EDGE = 24
const shadows = new Uint8Array(SHADOW_EDGE * SHADOW_EDGE * 4)
for (let i = 0; i < SHADOW_EDGE * SHADOW_EDGE; i++) {
  const x = (i % SHADOW_EDGE + .5) / SHADOW_EDGE * 2 - 1
  const y = (Math.floor(i / SHADOW_EDGE) + .5) / SHADOW_EDGE * 2 - 1
  shadows[i * 4 + 3] = Math.round(255 * Math.max(0, 1 - Math.hypot(x,y)) ** 2)
}

let ground: { map: DataTexture; users: number } | undefined

export function atlasFigure(image: PageImage, cell: AtlasFigureSize, page: AtlasFigureSize, foot: AtlasFigurePoint, height: number) {
  if (![cell.width, cell.height, page.width, page.height, height].every(n => Number.isFinite(n) && n > 0)
    || foot.x < 0 || foot.x > cell.width || foot.y < 0 || foot.y > cell.height) throw new RangeError('Invalid atlas figure geometry')
  let held = pages.get(image)
  if (!held) {
    const texture = new Texture(image)
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = texture.magFilter = NearestFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true
    held = { texture, leases: 0 }
    pages.set(image, held)
  }
  const lease = held
  lease.leases++
  if (!ground) {
    const map = new DataTexture(shadows, SHADOW_EDGE, SHADOW_EDGE, RGBAFormat)
    map.needsUpdate = true
    ground = { map, users: 0 }
  }
  const contact = ground
  contact.users++
  const anchor = new Group()
  const width = height * cell.width / cell.height
  const plane = new PlaneGeometry(width, height)
  plane.translate(width * (.5 - foot.x / cell.width), height * (foot.y / cell.height - .5), 0)
  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: lease.texture, alphaTest: ALPHA, side: DoubleSide })
  depth.allowOverride = false
  const actor = new Mesh(plane, new MeshStandardMaterial({ map: lease.texture, alphaTest: ALPHA, roughness: 1,
    side: DoubleSide, color: '#fff6ed', emissive: '#232335', emissiveIntensity: .48 }))
  actor.customDepthMaterial = depth
  actor.userData['lookAlphaDepth'] = true
  actor.castShadow = true
  anchor.add(actor)
  const shadowPlane = new CircleGeometry(width * .48, 22)
  shadowPlane.rotateX(-Math.PI / 2)
  shadowPlane.scale(1, 1, .62)
  const shadow = new Mesh(shadowPlane, new MeshBasicMaterial({
    map: contact.map, transparent: true, opacity: .63, depthWrite: false, toneMapped: false,
  }))
  shadow.position.y = .008
  anchor.add(shadow)
  const uv = plane.attributes.uv!
  const local = Array.from(uv.array)
  let removed = false
  return {
    sprite: anchor,
    actor,
    frame(frame: AtlasFigurePoint) {
      for (let i = 0; i < uv.count; i++) {
        const u = (frame.x + local[i * 2]! * cell.width) / page.width
        const v = 1 - (frame.y + (1 - local[i * 2 + 1]!) * cell.height) / page.height
        uv.setXY(i, u, v)
      }
      uv.needsUpdate = true
    },
    dispose() {
      if (removed) return
      removed = true
      anchor.removeFromParent()
      plane.dispose()
      actor.material.dispose()
      depth.dispose()
      shadowPlane.dispose()
      shadow.material.dispose()
      if (--lease.leases === 0) { lease.texture.dispose(); pages.delete(image) }
      if (--contact.users === 0) { contact.map.dispose(); ground = undefined }
    },
  }
}
