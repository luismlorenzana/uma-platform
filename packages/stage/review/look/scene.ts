// The hero scene (LK1, P158): a town square by day, laid out from the look bible: a hall at the back, houses around a
// paved square, a market stall, bunting, braziers, trees and flower beds at the edges, a foreground roof to blur in front,
// petals in the air, and our Uma sprites standing in it, lit and casting their silhouettes. Built from the CC0 modules
// (P159) on a 2 m grid, with the pieces they lack made here.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshDepthMaterial,
  MeshStandardMaterial, NearestFilter, PlaneGeometry, PointLight, Points, PointsMaterial, RGBADepthPacking, RepeatWrapping, SRGBColorSpace, Vector3,
  BoxGeometry, type Camera, type Object3D, type Scene,
} from 'three'
import { piece, privateUrl } from './kit.js'
import { pixelSprite, silhouetteNormals } from './pixel.js'

const STOREY = 3.12
type Side = 'front' | 'back' | 'left' | 'right'

/** A pixel-art ground from a palette: clustered noise and blade marks, `n` texels square, tiled. */
function pixelGround(palette: string[], n = 64, seed = 7, blades = true): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')!
  let s = seed
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
  // Value noise at two scales, tileable, mapped to the palette's steps.
  const grid = (k: number) => Array.from({ length: k * k }, rnd)
  const g1 = grid(8), g2 = grid(16)
  const sample = (gr: number[], k: number, x: number, y: number) => {
    const fx = (x / n) * k, fy = (y / n) * k, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0
    const at = (i: number, j: number) => gr[((j % k) + k) % k * k + ((i % k) + k) % k]!
    const sm = (t: number) => t * t * (3 - 2 * t)
    return (at(x0, y0) * (1 - sm(tx)) + at(x0 + 1, y0) * sm(tx)) * (1 - sm(ty)) + (at(x0, y0 + 1) * (1 - sm(tx)) + at(x0 + 1, y0 + 1) * sm(tx)) * sm(ty)
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = 0.65 * sample(g1, 8, x, y) + 0.35 * sample(g2, 16, x, y) + (rnd() - 0.5) * 0.18
    g.fillStyle = palette[Math.max(0, Math.min(palette.length - 1, Math.floor(v * palette.length)))]!
    g.fillRect(x, y, 1, 1)
  }
  if (blades) for (let i = 0; i < n * 2; i++) {
    const x = Math.floor(rnd() * n), y = Math.floor(rnd() * n), light = rnd() > 0.5
    g.fillStyle = light ? palette.at(-1)! : palette[0]!
    g.fillRect(x, y, 1, 1)
    g.fillStyle = light ? palette.at(-2)! : palette[1]!
    g.fillRect(x, (y + 1) % n, 1, 1)
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.magFilter = t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.colorSpace = SRGBColorSpace
  return t
}

/** A house on the kit's 2 m grid, its front facing +z before `turn`: walls per storey, corners, a tiled roof and its gables. */
async function house(o: { x: number; z: number; w: number; d: number; storeys: number; ground: 'UnevenBrick' | 'Plaster'; upper: 'Plaster' | 'UnevenBrick'; turn?: number; door?: number; chimney?: boolean }): Promise<Group> {
  const g = new Group()
  const wall = (s: number, side: Side, i: number, count: number) => {
    const kind = s === 0 ? o.ground : o.upper
    const front = side === 'front'
    const isDoor = s === 0 && front && i === (o.door ?? Math.floor(count / 2))
    const window = (i + s) % 2 === 0
    if (isDoor) return `Wall_${kind}_Door_Round`
    if (kind === 'Plaster' && !window && s > 0) return 'Wall_Plaster_WoodGrid'
    return window || front ? `Wall_${kind}_Window_Wide_Flat` : `Wall_${kind}_Straight`
  }
  const sides: [Side, number, number, number, number][] = [
    // side, along-x?, count, fixed coordinate, turn
    ['front', 1, o.w / 2, o.d / 2, 0], ['back', 1, o.w / 2, -o.d / 2, Math.PI], ['left', 0, o.d / 2, -o.w / 2, -Math.PI / 2], ['right', 0, o.d / 2, o.w / 2, Math.PI / 2],
  ]
  const jobs: Promise<Object3D>[] = []
  for (let s = 0; s < o.storeys; s++) {
    const y = s * STOREY
    for (const [side, alongX, count, fixed, turn] of sides) {
      for (let i = 0; i < count; i++) {
        const along = -count + 1 + 2 * i
        const [px, pz] = alongX ? [side === 'back' ? -along : along, fixed] : [fixed, side === 'left' ? along : -along]
        const name = wall(s, side, i, count)
        jobs.push(piece('village', name, px, y, pz, turn))
        // The kit's walls are frames: the window and the door are pieces of their own, set into them.
        if (name.includes('Window_Wide_Flat')) {
          jobs.push(piece('village', 'Window_Wide_Flat1', px, y, pz, turn))
          if ((i + s + (side === 'front' ? 0 : 1)) % 3 === 0) jobs.push(piece('village', 'WindowShutters_Wide_Flat_Open', px, y, pz, turn))
        }
        if (name.includes('Door_Round')) jobs.push(piece('village', 'Door_1_Round', px - 0.53 * Math.cos(turn), y, pz + 0.53 * Math.sin(turn), turn))
      }
    }
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      jobs.push(piece('village', s === 0 && o.ground === 'UnevenBrick' ? 'Corner_Exterior_Brick' : 'Corner_Exterior_Wood', (cx * o.w) / 2, y, (cz * o.d) / 2, 0))
    }
  }
  // Floors between storeys and under the roof, so no window shows sky through the house.
  for (let s = 1; s <= o.storeys; s++) for (let fx = -o.w / 2 + 1; fx < o.w / 2; fx += 2) for (let fz = -o.d / 2 + 1; fz < o.d / 2; fz += 2) jobs.push(piece('village', 'Floor_WoodDark', fx, s * STOREY - 0.02, fz))
  const top = o.storeys * STOREY
  jobs.push(piece('village', `Roof_RoundTiles_${o.w}x${o.d}`, 0, top, 0, 0))
  jobs.push(piece('village', `Roof_Front_Brick${o.w}`, 0, top, o.d / 2, 0))
  jobs.push(piece('village', `Roof_Front_Brick${o.w}`, 0, top, -o.d / 2, Math.PI))
  if (o.chimney) jobs.push(piece('village', 'Prop_Chimney', o.w / 4, top + 0.8, -o.d / 4, 0))
  g.add(...(await Promise.all(jobs)))
  g.position.set(o.x, 0, o.z)
  g.rotation.y = o.turn ?? 0
  return g
}

/** Bunting between two points: a sagging line of pennants in the references' colours. */
function bunting(a: Vector3, b: Vector3, colours = ['#c8323a', '#e8b52c', '#3a5cc8', '#3a9a4c', '#8a3ab8']): Group {
  const g = new Group()
  const n = Math.round(a.distanceTo(b) / 0.7)
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, p = a.clone().lerp(b, t)
    p.y -= Math.sin(Math.PI * t) * 1.1
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array([-0.26, 0, 0, 0.26, 0, 0, 0, -0.55, 0]), 3))
    geo.computeVertexNormals()
    const m = new Mesh(geo, new MeshStandardMaterial({ color: colours[i % colours.length], side: DoubleSide, roughness: 0.8 }))
    m.position.copy(p)
    m.lookAt(p.clone().add(new Vector3(0, 0, 1)))
    m.castShadow = true
    m.userData.flutter = i
    g.add(m)
  }
  return g
}

/** A brazier: an iron tripod, a bowl and a flame with its light (the references' torches). */
function brazier(x: number, z: number, lights: PointLight[]): Group {
  const g = new Group()
  const iron = new MeshStandardMaterial({ color: '#2a2622', roughness: 0.6, metalness: 0.4 })
  for (let i = 0; i < 3; i++) {
    const leg = new Mesh(new CylinderGeometry(0.035, 0.035, 1.2, 6), iron)
    const a = (i / 3) * Math.PI * 2
    leg.position.set(Math.cos(a) * 0.18, 0.58, Math.sin(a) * 0.18)
    leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25)
    leg.castShadow = true
    g.add(leg)
  }
  const bowl = new Mesh(new CylinderGeometry(0.32, 0.18, 0.22, 10), iron)
  bowl.position.y = 1.22
  bowl.castShadow = true
  const flame = new Mesh(new ConeGeometry(0.22, 0.6, 8), new MeshStandardMaterial({ color: '#ff9a30', emissive: '#ff8a20', emissiveIntensity: 3.5 }))
  flame.position.y = 1.6
  flame.userData.flame = true
  const light = new PointLight('#ffa64a', 18, 9, 2)
  light.position.y = 1.8
  lights.push(light)
  g.add(bowl, flame, light)
  g.position.set(x, 0, z)
  return g
}

/** A market stall: posts, a counter, a striped awning and crates of produce. */
async function stall(x: number, z: number): Promise<Group> {
  const g = new Group()
  const wood = new MeshStandardMaterial({ color: '#7a5232', roughness: 0.9 })
  for (const [px, pz] of [[-1.3, -0.7], [1.3, -0.7], [-1.3, 0.7], [1.3, 0.7]] as const) {
    const post = new Mesh(new BoxGeometry(0.14, 2.3, 0.14), wood)
    post.position.set(px, 1.15, pz)
    post.castShadow = true
    g.add(post)
  }
  const counter = new Mesh(new BoxGeometry(2.8, 0.9, 1.2), wood)
  counter.position.y = 0.45
  counter.castShadow = counter.receiveShadow = true
  const c = document.createElement('canvas')
  c.width = 16; c.height = 4
  const cx = c.getContext('2d')!
  for (let i = 0; i < 16; i++) { cx.fillStyle = i % 4 < 2 ? '#b8282e' : '#efe2c8'; cx.fillRect(i, 0, 1, 4) }
  const cloth = new CanvasTexture(c)
  cloth.magFilter = NearestFilter; cloth.colorSpace = SRGBColorSpace
  const awning = new Mesh(new PlaneGeometry(3.2, 1.9), new MeshStandardMaterial({ map: cloth, side: DoubleSide, roughness: 0.95 }))
  awning.position.set(0, 2.35, 0)
  awning.rotation.x = -Math.PI / 2 + 0.28
  awning.castShadow = true
  g.add(counter, awning)
  const fruit = ['#c8322a', '#e8a22a', '#7ab83a', '#d84a6a']
  for (let i = 0; i < 3; i++) {
    const crate = await piece('village', 'Prop_Crate', -0.85 + i * 0.85, 0.9, 0, 0, 0.38)
    g.add(crate)
    for (let k = 0; k < 7; k++) {
      const f = new Mesh(new BoxGeometry(0.12, 0.12, 0.12), new MeshStandardMaterial({ color: fruit[(i + k) % fruit.length], roughness: 0.6 }))
      f.position.set(-0.85 + i * 0.85 + ((k % 3) - 1) * 0.12, 1.32 + Math.floor(k / 3) * 0.06, ((k % 2) - 0.5) * 0.14)
      g.add(f)
    }
  }
  g.position.set(x, 0, z)
  return g
}

/** A pixel stave texture for barrels and a sack texture, tiny and stepped. */
function pixelTex(draw: (g: CanvasRenderingContext2D) => void, w: number, h: number): CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new CanvasTexture(c); t.magFilter = t.minFilter = NearestFilter; t.generateMipmaps = false; t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping
  return t
}
const STAVES = () => pixelTex((g) => {
  for (let x = 0; x < 16; x++) { g.fillStyle = ['#6a4426', '#7c5130', '#8a5c36', '#5e3b20'][x % 4]!; g.fillRect(x, 0, 1, 16) }
  g.fillStyle = '#3a3a40'; g.fillRect(0, 3, 16, 1); g.fillRect(0, 12, 16, 1); g.fillStyle = '#6a6a72'; g.fillRect(0, 2, 16, 1); g.fillRect(0, 11, 16, 1)
}, 16, 16)
const SACK = () => pixelTex((g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 3 ? '#c9b48a' : '#b39c72'; g.fillRect(x, y, 1, 1) } }, 8, 8)

function dressing(): Mesh[] {
  const out: Mesh[] = []
  const add = (m: Mesh, x: number, y: number, z: number, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; out.push(m); return m }
  const staves = new MeshStandardMaterial({ map: STAVES(), roughness: 0.85 }), sack = new MeshStandardMaterial({ map: SACK(), roughness: 1 })
  const wood = new MeshStandardMaterial({ color: '#6e4a2c', roughness: 0.9 }), stone = new MeshStandardMaterial({ color: '#8d8a82', roughness: 0.95 }), iron = new MeshStandardMaterial({ color: '#25231f', roughness: 0.5, metalness: 0.5 })
  for (const [x, z] of [[-6.6, -2.4], [-7.2, -1.7], [6.6, -5.3], [7.1, -4.6], [-1.6, -6.7]] as const) add(new Mesh(new CylinderGeometry(0.32, 0.27, 0.8, 10), staves), x, 0.4, z)
  for (const [x, z] of [[-3.3, -3.7], [-3.0, -4.1], [4.6, 0.4]] as const) add(new Mesh(new CylinderGeometry(0.22, 0.28, 0.5, 7), sack), x, 0.25, z)
  // A well at the square's middle-left, stone ring and a little roof on posts.
  add(new Mesh(new CylinderGeometry(0.8, 0.85, 0.75, 14, 1, true), stone), -1.8, 0.37, -1.6).material = stone
  add(new Mesh(new CylinderGeometry(0.62, 0.62, 0.05, 14), new MeshStandardMaterial({ color: '#2a4a5a', roughness: 0.2, metalness: 0.1 })), -1.8, 0.55, -1.6)
  for (const dx of [-0.7, 0.7]) add(new Mesh(new BoxGeometry(0.1, 1.9, 0.1), wood), -1.8 + dx, 0.95, -1.6)
  add(new Mesh(new ConeGeometry(1.05, 0.6, 4), new MeshStandardMaterial({ color: '#9a4a2a', roughness: 0.9 })), -1.8, 2.15, -1.6, Math.PI / 4)
  // Benches along the square's edges.
  for (const [x, z, r] of [[-5.6, 4.6, 0], [5.4, -6.2, 0], [7.4, 0.4, Math.PI / 2]] as const) {
    add(new Mesh(new BoxGeometry(1.8, 0.1, 0.5), wood), x, 0.48, z, r)
    for (const dx of [-0.75, 0.75]) add(new Mesh(new BoxGeometry(0.1, 0.48, 0.45), wood), x + Math.cos(r) * dx, 0.24, z - Math.sin(r) * dx, r)
  }
  // Lamp posts at the square's corners: iron, a lantern that glows.
  for (const [x, z] of [[-7.4, -5.6], [7.4, -5.6], [-7.4, 5.4], [7.4, 5.4]] as const) {
    add(new Mesh(new CylinderGeometry(0.06, 0.08, 3.2, 6), iron), x, 1.6, z)
    // By day the lanterns are unlit glass; a night grade raises them.
    const lantern = add(new Mesh(new BoxGeometry(0.32, 0.42, 0.32), new MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb84a', emissiveIntensity: 0.25 })), x, 3.25, z)
    lantern.castShadow = false
  }
  return out
}

/** One of our Uma sprite sets, from the private local release, as a lit, shadow-casting standee facing the camera. */
export interface Figure { mesh: Mesh; source: HTMLCanvasElement }
async function figure(outfitId: number, x: number, z: number, pixelTexels: number | null): Promise<Mesh | null> {
  const json = (path: string) => fetch(privateUrl(`content/release/${path}`)).then((r) => r.json())
  const manifest = await json('manifest.json')
  const art = await json(manifest.art)
  const setPath = art.sprites?.[String(outfitId)]
  if (!setPath) return null
  const set = await json(setPath)
  const img = new Image()
  img.src = privateUrl(`content/release/${set.pages[0].path}`)
  await img.decode()
  const turn = set.actions.turnaround?.frames.find((f: { view?: string }) => f.view === 'front') ?? set.actions.idle.frames[0]
  const cell = document.createElement('canvas')
  cell.width = cell.height = set.cell
  cell.getContext('2d')!.drawImage(img, turn.x, turn.y, turn.w, turn.h, turn.dx, turn.dy, turn.w, turn.h)
  const art2 = pixelTexels ? pixelSprite(cell, Math.round(set.cell * (pixelTexels / 210)), 20) : cell
  const tex = new CanvasTexture(art2)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = NearestFilter
  tex.minFilter = NearestFilter
  tex.generateMipmaps = false
  const normals = new CanvasTexture(silhouetteNormals(art2, pixelTexels ? 2 : 6))
  normals.magFilter = normals.minFilter = NearestFilter
  const size = set.cell * (1.7 / 210)
  const mat = new MeshStandardMaterial({ map: tex, normalMap: normals, alphaTest: 0.5, roughness: 0.9, side: DoubleSide,
    // A staged key on the characters (Octopath's spotlight): their own colour lifts them off the ground.
    emissive: new Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.22 })
  const mesh = new Mesh(new PlaneGeometry(size, size), mat)
  mesh.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: tex, alphaTest: 0.5 })
  mesh.castShadow = true
  mesh.position.set(x, size / 2 - size * ((set.cell - set.foot.y) / set.cell), z)
  mesh.userData.billboard = true
  return mesh
}

/** Petals and dust drifting through the square. */
function drift(count = 220): Points {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - 0.5) * 34; pos[i * 3 + 1] = Math.random() * 9; pos[i * 3 + 2] = (Math.random() - 0.5) * 26 }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  const c = document.createElement('canvas')
  c.width = c.height = 8
  const g = c.getContext('2d')!
  g.fillStyle = '#ffe6f0'; g.fillRect(2, 2, 4, 4); g.fillStyle = '#ffffff'; g.fillRect(3, 3, 2, 2)
  const t = new CanvasTexture(c); t.magFilter = NearestFilter
  return new Points(geo, new PointsMaterial({ size: 0.16, map: t, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }))
}

export interface Town { root: Group; flames: Object3D[]; lights: PointLight[]; bunting: Group[]; drift: Points; figures: Mesh[]; ground: Mesh }

export async function buildTown(scene: Scene, opts: { spritePixels: number | null }): Promise<Town> {
  const root = new Group()
  scene.add(root)
  const lights: PointLight[] = []
  // The ground: grass, then the paved square on the 2 m grid.
  const grassTex = pixelGround(['#2f4a1c', '#3d5c22', '#4e7228', '#628a30', '#7aa23c', '#93b84c'])
  grassTex.repeat.set(36, 36)
  const ground = new Mesh(new PlaneGeometry(72, 72), new MeshStandardMaterial({ map: grassTex, roughness: 1 }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  root.add(ground)
  const paving: Promise<Object3D>[] = []
  for (let x = -7; x <= 7; x += 2) for (let z = -5; z <= 5; z += 2) paving.push(piece('village', 'Floor_UnevenBrick', x, 0.02, z))
  for (let z = 7; z <= 19; z += 2) for (const x of [-1, 1]) paving.push(piece('village', 'Floor_UnevenBrick', x, 0.02, z))
  for (let x = -5; x <= 5; x += 2) paving.push(piece('village', 'Floor_UnevenBrick', x, 0.02, -7))
  root.add(...(await Promise.all(paving)))
  // The buildings: a hall at the back, houses either side, and one in front to blur.
  root.add(await house({ x: 0, z: -12.5, w: 8, d: 8, storeys: 2, ground: 'UnevenBrick', upper: 'UnevenBrick', chimney: true }))
  root.add(await house({ x: -11.5, z: -8, w: 6, d: 6, storeys: 2, ground: 'UnevenBrick', upper: 'Plaster', chimney: true }))
  root.add(await house({ x: 11.5, z: -6, w: 6, d: 8, storeys: 2, ground: 'Plaster', upper: 'Plaster' }))
  root.add(await house({ x: -12, z: 4, w: 4, d: 6, storeys: 1, ground: 'Plaster', upper: 'Plaster', turn: Math.PI / 2 }))
  root.add(await house({ x: 12.5, z: 6, w: 4, d: 4, storeys: 1, ground: 'UnevenBrick', upper: 'Plaster', turn: -Math.PI / 2 }))
  // In front of the camera: its roof crosses the bottom of the frame, blurred (the references' foreground occluder).
  root.add(await house({ x: -6, z: 14.5, w: 6, d: 4, storeys: 1, ground: 'Plaster', upper: 'Plaster', turn: Math.PI }))
  root.add(await house({ x: 7, z: 15, w: 4, d: 4, storeys: 1, ground: 'UnevenBrick', upper: 'Plaster', turn: Math.PI }))
  // Nature at the edges.
  const nature: [string, number, number, number, number][] = [
    ['CommonTree_1', -23, -16, 0.4, 1], ['Pine_1', 21, -17, 1.2, 1.1], ['Pine_2', 26, -10, 0.2, 1], ['CommonTree_3', 22, 6, 2.1, 0.9], ['CommonTree_2', -24, 0, 1.0, 1],
    ['Pine_3', -8, -24, 0.5, 1.2], ['Pine_1', 8, -25, 2.2, 1.15], ['CommonTree_4', -20, 14, 0.9, 0.9],
    ['Bush_Common_Flowers', -8.3, 6.6, 0, 0.7], ['Bush_Common_Flowers', 8.4, 6.4, 1.4, 0.7], ['Bush_Common_Flowers', -8.6, -1.5, 2, 0.65], ['Bush_Common_Flowers', 8.7, 1.5, 0.6, 0.65],
    ['Flower_3_Group', -2.6, 6.6, 0, 0.55], ['Flower_4_Group', 2.8, 6.6, 0, 0.55], ['Flower_3_Group', -5.4, -8.6, 0, 0.6], ['Flower_4_Group', 5.2, -8.6, 0, 0.6],
    ['Flower_4_Group', -8.4, 3, 1, 0.55], ['Flower_3_Group', 8.5, -3.4, 2, 0.55], ['Grass_Common_Tall', -9.5, 8.5, 0, 0.7], ['Grass_Common_Tall', 9.6, 9.5, 0, 0.7],
    ['Rock_Medium_1', 16, 11, 0.6, 0.45], ['Bush_Common_Flowers', 9.5, -10.5, 0.3, 0.7], ['Bush_Common_Flowers', -6.2, -10.4, 0.3, 0.6],
  ]
  root.add(...(await Promise.all(nature.map(([n, x, z, t, s]) => piece('nature', n, x, 0, z, t, s)))))
  // The far tree line behind the square: blurred by depth, it fills the frame's top as in ref-01 and ref-04.
  const far: Promise<Object3D>[] = []
  for (let i = 0; i < 26; i++) {
    const x = -34 + i * 2.7 + Math.sin(i * 7.1) * 1.2, z = -22 - (i % 3) * 3.5 - Math.abs(Math.sin(i * 3.3)) * 3
    far.push(piece('nature', i % 4 === 0 ? 'CommonTree_2' : `Pine_${(i % 5) + 1}`, x, 0, z, i * 0.7, 1.15 + (i % 3) * 0.12))
  }
  root.add(...(await Promise.all(far)))
  // The square's life: a stall, a wagon, crates, bunting, braziers at the hall.
  root.add(await stall(-4.6, -2.2))
  root.add(await piece('village', 'Prop_Wagon', 5.6, 0, 1.4, -0.5, 0.8))
  for (const [x, z, s] of [[-6.9, -3.4, 0.5], [-6.3, -4, 0.38], [6.8, -4.2, 0.45], [-2.4, -3.6, 0.32]] as const) root.add(await piece('village', 'Prop_Crate', x, 0, z, 0.3, s))
  root.add(...dressing())
  const lines = [bunting(new Vector3(-7, 5.4, -7.6), new Vector3(7, 5.4, -7.6)), bunting(new Vector3(-7, 4.4, 5.6), new Vector3(7, 4.4, 5.6))]
  root.add(...lines)
  const braziers = [brazier(-2.6, -7.6, lights), brazier(2.6, -7.6, lights)]
  root.add(...braziers)
  const flames: Object3D[] = []
  for (const b of braziers) b.traverse((o) => { if (o.userData.flame) flames.push(o) })
  // Our Umas in the square (private sets, local only).
  const cast: [number, number, number][] = [[106701, 0, 1.2], [101401, -4.2, 0.2], [109701, 3.6, -2.6], [100103, -6.2, -1.2], [106801, 1.4, 3.4], [111501, -1.6, -5.2],
    [112901, 5.4, 3.8], [113401, -3.2, 3.6]]
  const figures = (await Promise.all(cast.map(([id, x, z]) => figure(id, x, z, opts.spritePixels)))).filter((m): m is Mesh => !!m)
  root.add(...figures)
  const dust = drift()
  root.add(dust)
  return { root, flames, lights, bunting: lines, drift: dust, figures, ground }
}

/** Per frame: figures face the camera, flames flicker, bunting flutters, petals drift. */
export function animate(town: Town, camera: Camera, t: number, dt: number): void {
  for (const f of town.figures) f.rotation.y = Math.atan2(camera.position.x - f.position.x, camera.position.z - f.position.z)
  town.lights.forEach((l, i) => { l.intensity = 18 * (0.85 + 0.15 * Math.sin(t * 13 + i * 5) * Math.sin(t * 7.3 + i)) })
  for (const f of town.flames) f.scale.y = 1 + 0.12 * Math.sin(t * 17 + f.id)
  for (const line of town.bunting) for (const m of line.children) m.rotation.x = 0.25 * Math.sin(t * 2.2 + (m.userData.flutter as number) * 0.9)
  const p = town.drift.geometry.getAttribute('position') as BufferAttribute
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) + dt * (0.6 + 0.3 * Math.sin(i)), y = p.getY(i) - dt * 0.35, z = p.getZ(i) + dt * 0.15 * Math.cos(i + t)
    if (y < 0 || x > 17) { x = -17; y = 2 + Math.random() * 7; z = (Math.random() - 0.5) * 26 }
    p.setXYZ(i, x, y, z)
  }
  p.needsUpdate = true
}
