// The hero scene (LK1, P158): a town square by day, laid out from the look bible: a hall at the back, houses around a
// paved square, a market stall, bunting, braziers, trees and flower beds at the edges, a foreground roof to blur in front,
// petals in the air, and our Uma sprites standing in it, lit and casting their silhouettes. Built from the CC0 modules
// (P159) on a 2 m grid, with the pieces they lack made here.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshDepthMaterial,
  MeshStandardMaterial, NearestFilter, PlaneGeometry, PointLight, Points, PointsMaterial, RGBADepthPacking, RepeatWrapping, SRGBColorSpace, Vector3,
  BoxGeometry, InstancedMesh, Matrix4, type Camera, type Object3D, type Scene,
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
  // Clumps about 8 and 4 texels across, whatever the texture's size.
  const k1 = Math.max(8, Math.round(n / 8)), k2 = Math.max(16, Math.round(n / 4))
  const g1 = grid(k1), g2 = grid(k2)
  const sample = (gr: number[], k: number, x: number, y: number) => {
    const fx = (x / n) * k, fy = (y / n) * k, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0
    const at = (i: number, j: number) => gr[((j % k) + k) % k * k + ((i % k) + k) % k]!
    const sm = (t: number) => t * t * (3 - 2 * t)
    return (at(x0, y0) * (1 - sm(tx)) + at(x0 + 1, y0) * sm(tx)) * (1 - sm(ty)) + (at(x0, y0 + 1) * (1 - sm(tx)) + at(x0 + 1, y0 + 1) * sm(tx)) * sm(ty)
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = 0.65 * sample(g1, k1, x, y) + 0.35 * sample(g2, k2, x, y) + (rnd() - 0.5) * 0.18
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

/** Lays lusher and drier patches across the ground in its shader: two octaves of world-space noise, stepped on the texel
 * grid so the pixel look holds. (Turning tiles was tried and dropped: it broke the texture's continuity into a grid.) */
function breakTiling(mat: MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D(map, vMapUv);
        // World-space patches, stepped on the texel grid: vMapUv spans 48 m a unit.
        vec2 p = floor(vMapUv * 1024.0) / 1024.0 * 24.0;
        float n = 0.0, amp = 0.6, freq = 0.11;
        for (int i = 0; i < 2; i++) {
          vec2 q = p * freq, c0 = floor(q), t = fract(q);
          t = t * t * (3.0 - 2.0 * t);
          float a = fract(sin(dot(c0, vec2(12.9898, 78.233))) * 43758.5453);
          float b = fract(sin(dot(c0 + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
          float c = fract(sin(dot(c0 + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
          float d = fract(sin(dot(c0 + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
          n += amp * mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
          amp *= 0.6; freq *= 2.9;
        }
        n = floor(n * 6.0) / 6.0;
        vec3 lush = vec3(0.82, 0.95, 0.74), dry = vec3(1.12, 1.04, 0.78);
        sampledDiffuseColor.rgb *= mix(lush, dry, smoothstep(0.25, 0.85, n));
        diffuseColor *= sampledDiffuseColor;
      #endif`)
  }
}

/** Grass tufts, clover and small flowers scattered over the grass as crossed pixel cards (the nature kit's role in the
 * references): they break the ground's tiling and give it depth. Kept off the paving and the buildings. */
function scatter(): Group {
  const g = new Group()
  const card = (draw: (c: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16
    draw(c.getContext('2d')!)
    const t = new CanvasTexture(c); t.magFilter = t.minFilter = NearestFilter; t.generateMipmaps = false; t.colorSpace = SRGBColorSpace
    return t
  }
  const blades = (c: CanvasRenderingContext2D, cols: string[]) => {
    for (let i = 0; i < 9; i++) {
      const x = 2 + ((i * 5) % 12), hgt = 6 + ((i * 7) % 8)
      for (let y = 0; y < hgt; y++) { c.fillStyle = cols[Math.min(cols.length - 1, Math.floor((y / hgt) * cols.length))]!; c.fillRect(x + (y > hgt / 2 && i % 2 ? 1 : 0), 15 - y, 1, 1) }
    }
  }
  const kinds = [
    card((c) => blades(c, ['#2e3a17', '#4c5d24', '#70822f', '#9ca64a'])),
    card((c) => blades(c, ['#3b4a1e', '#5d6f2b', '#86953a', '#b5b85a'])),
    card((c) => { for (let i = 0; i < 6; i++) { const x = 2 + (i * 5) % 11, y = 8 + (i * 3) % 6; c.fillStyle = '#4c5d24'; c.fillRect(x, y, 3, 2); c.fillStyle = '#70822f'; c.fillRect(x + 1, y - 1, 2, 1) } }),
    card((c) => { blades(c, ['#3b4a1e', '#5d6f2b', '#86953a']); for (const [x, y, col] of [[4, 6, '#f2d14b'], [9, 4, '#ffffff'], [12, 7, '#e86a8a']] as const) { c.fillStyle = col; c.fillRect(x, y, 2, 2) } }),
  ]
  const cross = new BufferGeometry()
  const q = 0.32
  cross.setAttribute('position', new BufferAttribute(new Float32Array([-q, 0, 0, q, 0, 0, q, 2 * q, 0, -q, 2 * q, 0, 0, 0, -q, 0, 0, q, 0, 2 * q, q, 0, 2 * q, -q]), 3))
  cross.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]), 2))
  cross.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  // Normals up: the cards take the ground's light, not the dark of a card seen edge-on to the sun.
  cross.setAttribute('normal', new BufferAttribute(new Float32Array(Array.from({ length: 8 }, () => [0, 1, 0]).flat()), 3))
  let seed = 11
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
  const blocked = (x: number, z: number) => (Math.abs(x) < 8.2 && Math.abs(z) < 6.2) || (Math.abs(x) < 2.2 && z > 0 && z < 20) || (Math.abs(x) < 6.4 && z < -7.4 && z > -17)
  for (const [k, tex] of kinds.entries()) {
    const count = k === 3 ? 220 : 420
    const mesh = new InstancedMesh(cross, new MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: DoubleSide, roughness: 1 }), count)
    const m = new Matrix4(), rot = new Matrix4(), sc = new Matrix4()
    let n = 0
    while (n < count) {
      const x = (rnd() - 0.5) * 60, z = (rnd() - 0.5) * 50
      if (blocked(x, z)) continue
      const s = 0.7 + rnd() * 0.7
      m.makeTranslation(x, 0, z).multiply(rot.makeRotationY(rnd() * Math.PI)).multiply(sc.makeScale(s, s * (0.8 + rnd() * 0.5), s))
      mesh.setMatrixAt(n++, m)
    }
    mesh.receiveShadow = true
    g.add(mesh)
  }
  return g
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

/** One of our Uma sprite sets, from the private local release, as a lit, shadow-casting standee that plays its idle loop.
 * Upright like uma-stage's sprites, and stretched by 1/cos of the camera's pitch to it each frame (uma-stage's
 * `spriteStretch`), so the camera looking down doesn't squash it. Its frames are pixel-passed at `pixelTexels` tall. */
interface SpriteFrameTex { map: CanvasTexture; normal: CanvasTexture; ms: number }
const FIGURE_HEIGHT = 1.9
async function figure(outfitId: number, x: number, z: number, pixelTexels: number | null, action = 'idle'): Promise<Mesh | null> {
  const json = (path: string) => fetch(privateUrl(`content/release/${path}`)).then((r) => r.json())
  const manifest = await json('manifest.json')
  const art = await json(manifest.art)
  const setPath = art.sprites?.[String(outfitId)]
  if (!setPath) return null
  const set = await json(setPath)
  const img = new Image()
  // The load event, not decode(): a hidden page may defer decode() indefinitely; drawImage decodes on use.
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error(`sprite page ${outfitId}`)); img.src = privateUrl(`content/release/${set.pages[0].path}`) })
  const tall = set.actions[action] ? action : 'idle'
  const frames: SpriteFrameTex[] = (set.actions[tall].frames as { x: number; y: number; w: number; h: number; dx: number; dy: number; ms: number | null }[]).map((f) => {
    const cell = document.createElement('canvas')
    cell.width = cell.height = set.cell
    cell.getContext('2d')!.drawImage(img, f.x, f.y, f.w, f.h, f.dx, f.dy, f.w, f.h)
    const art2 = pixelTexels ? pixelSprite(cell, Math.round(set.cell * (pixelTexels / 210)), 24) : cell
    const map = new CanvasTexture(art2)
    map.colorSpace = SRGBColorSpace
    map.magFilter = map.minFilter = NearestFilter
    map.generateMipmaps = false
    const normal = new CanvasTexture(silhouetteNormals(art2, pixelTexels ? 2 : 6))
    normal.magFilter = normal.minFilter = NearestFilter
    return { map, normal, ms: f.ms ?? 200 }
  })
  const size = set.cell * (FIGURE_HEIGHT / 210)
  const first = frames[0]!
  const mat = new MeshStandardMaterial({ map: first.map, normalMap: first.normal, alphaTest: 0.5, roughness: 0.85, side: DoubleSide,
    // A staged key on the characters (Octopath's spotlight): a little of their own colour lifts them off the ground.
    emissive: new Color('#ffffff'), emissiveMap: first.map, emissiveIntensity: 0.14 })
  // Pivot at the feet, so the stretch grows her upward from the ground.
  const geo = new PlaneGeometry(size, size)
  geo.translate(0, size / 2 - size * ((set.cell - set.foot.y) / set.cell), 0)
  const mesh = new Mesh(geo, mat)
  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: first.map, alphaTest: 0.5 })
  mesh.customDepthMaterial = depth
  mesh.castShadow = true
  mesh.position.set(x, 0, z)
  mesh.userData = { billboard: true, frames, frame: 0, clock: Math.random() * 400, depth }
  // A soft contact shadow under the feet: grounds her where the sun's shadow falls away from her.
  const blob = document.createElement('canvas')
  blob.width = blob.height = 32
  const bg = blob.getContext('2d')!, rg = bg.createRadialGradient(16, 16, 2, 16, 16, 16)
  rg.addColorStop(0, 'rgba(0,0,0,0.55)'); rg.addColorStop(1, 'rgba(0,0,0,0)')
  bg.fillStyle = rg; bg.fillRect(0, 0, 32, 32)
  const contact = new Mesh(new PlaneGeometry(0.9, 0.5), new MeshStandardMaterial({ map: new CanvasTexture(blob), transparent: true, depthWrite: false, color: '#000000', roughness: 1 }))
  contact.rotation.x = -Math.PI / 2
  contact.position.y = 0.03
  contact.userData.contact = true
  mesh.add(contact)
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
  // Olive greens from the references (ref-01, ref-04), not the saturated greens of a tile set.
  // One large texture, not a 64-texel tile: it repeats only every 48 m, beyond the view (the owner: "copy-pasted").
  const grassTex = pixelGround(['#2e3a17', '#3b4a1e', '#4c5d24', '#5d6f2b', '#70822f', '#86953a', '#9ca64a'], 1024)
  grassTex.repeat.set(72 / 48, 72 / 48)
  const grassMat = new MeshStandardMaterial({ map: grassTex, roughness: 1 })
  breakTiling(grassMat)
  const ground = new Mesh(new PlaneGeometry(72, 72), grassMat)
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
  root.add(scatter())
  const dust = drift()
  root.add(dust)
  return { root, flames, lights, bunting: lines, drift: dust, figures, ground }
}

/** Per frame: figures face the camera, flames flicker, bunting flutters, petals drift. */
export function animate(town: Town, camera: Camera, t: number, dt: number): void {
  for (const f of town.figures) {
    const dx = camera.position.x - f.position.x, dz = camera.position.z - f.position.z
    f.rotation.y = Math.atan2(dx, dz)
    // The camera's pitch to her: an upright card is foreshortened by cos(pitch), so she's stretched back by 1/cos.
    const pitch = Math.atan2(camera.position.y - f.position.y - 1, Math.hypot(dx, dz))
    f.scale.y = 1 / Math.max(0.5, Math.cos(pitch))
    const u = f.userData as { frames: { map: CanvasTexture; normal: CanvasTexture; ms: number }[]; frame: number; clock: number; depth: MeshDepthMaterial }
    u.clock += dt * 1000
    const cur = u.frames[u.frame]!
    if (u.clock >= cur.ms) {
      u.clock -= cur.ms
      u.frame = (u.frame + 1) % u.frames.length
      const next = u.frames[u.frame]!, m = f.material as MeshStandardMaterial
      m.map = next.map; m.emissiveMap = next.map; m.normalMap = next.normal
      u.depth.map = next.map
    }
  }
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
