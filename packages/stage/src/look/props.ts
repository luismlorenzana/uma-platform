// The look slice's own pieces (LK1): what the CC0 kits lack, drawn here as small pixel textures on simple shapes, at the
// slice's pixel scale: grounds, cloth, stone, wood, banners, bunting, fires, lamps, furniture and particles.
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh,
  MeshDepthMaterial, MeshStandardMaterial, NearestFilter, PlaneGeometry, PointLight, Points, PointsMaterial, RepeatWrapping, RGBADepthPacking, SRGBColorSpace,
  Vector3, type Object3D,
} from 'three'
import { windy } from './atmos.js'

/** A seeded random stream, so a scene lays out the same every load. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
}

/** A small pixel texture drawn in code: nearest sampling, no mipmaps, repeating. */
export function pixelTex(draw: (g: CanvasRenderingContext2D) => void, w: number, h: number): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.magFilter = t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

const at = <T>(list: readonly T[], i: number): T => list[((i % list.length) + list.length) % list.length]!

export const STAVES = () => pixelTex((g) => {
  for (let x = 0; x < 16; x++) { g.fillStyle = at(['#6a4426', '#7c5130', '#8a5c36', '#5e3b20'], x); g.fillRect(x, 0, 1, 16) }
  g.fillStyle = '#3a3a40'; g.fillRect(0, 3, 16, 1); g.fillRect(0, 12, 16, 1); g.fillStyle = '#6a6a72'; g.fillRect(0, 2, 16, 1); g.fillRect(0, 11, 16, 1)
}, 16, 16)
export const SACK = () => pixelTex((g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 3 ? '#c9b48a' : '#b39c72'; g.fillRect(x, y, 1, 1) } }, 8, 8)
/** Fieldstone: rounded stones in three greys with dark mortar. */
export const STONES = () => pixelTex((g) => {
  g.fillStyle = '#4a4740'; g.fillRect(0, 0, 16, 16)
  for (const [x, y, w, h, c] of [[0, 0, 7, 4, '#9a968b'], [8, 0, 8, 4, '#85817a'], [0, 5, 4, 5, '#7a766e'], [5, 5, 6, 5, '#a29e92'], [12, 5, 4, 5, '#8e8a80'], [0, 11, 8, 5, '#8a867c'], [9, 11, 7, 5, '#9c988c']] as const) {
    g.fillStyle = c; g.fillRect(x, y, w, h); g.fillStyle = '#b8b4a6'; g.fillRect(x, y, w - 1, 1); g.fillStyle = '#5e5a52'; g.fillRect(x, y + h - 1, w, 1)
  }
}, 16, 16)
/** Clay tiles: rows of rounded tiles, light on top, dark under. */
export const TILES = () => pixelTex((g) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = y % 4, k = (x + (Math.floor(y / 4) % 2) * 2) % 4; g.fillStyle = r === 3 ? '#5a2416' : k === 0 ? '#7a3420' : r === 0 ? '#c8643a' : '#a64a2a'; g.fillRect(x, y, 1, 1) }
}, 16, 16)
/** Planks, dark or light: grain lines and a seam every four texels. */
export const PLANKS = (dark = true) => pixelTex((g) => {
  const cols = dark ? ['#4a2e1a', '#56361f', '#603d24', '#3e2616'] : ['#8a6038', '#966a40', '#a07448', '#7a5230']
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = y % 4 === 3 ? at(cols, 3) : at(cols, (x * 7 + y * 3 + Math.floor(y / 4) * 5) % 3); g.fillRect(x, y, 1, 1) }
}, 16, 16)
/** Brick: red-brown courses in a running bond. */
export const BRICK = () => pixelTex((g) => {
  g.fillStyle = '#3a2a22'; g.fillRect(0, 0, 16, 16)
  for (let row = 0; row < 4; row++) for (let b = -1; b < 2; b++) {
    const x = b * 8 + (row % 2) * 4, y = row * 4
    g.fillStyle = at(['#7a3a28', '#8a4430', '#6e3424'], row + b); g.fillRect(x, y, 7, 3); g.fillStyle = '#9a5038'; g.fillRect(x, y, 6, 1)
  }
}, 16, 16)

/** A pixel-art ground from a palette: clustered value noise and blade marks, `n` texels square, tileable. */
export function pixelGround(palette: readonly string[], n = 64, seed = 7, blades = true): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')!
  const rnd = seeded(seed)
  const grid = (k: number) => Array.from({ length: k * k }, rnd)
  // Clumps about 8 and 4 texels across, whatever the texture's size.
  const k1 = Math.max(8, Math.round(n / 8)), k2 = Math.max(16, Math.round(n / 4))
  const g1 = grid(k1), g2 = grid(k2)
  const sample = (gr: number[], k: number, x: number, y: number) => {
    const fx = (x / n) * k, fy = (y / n) * k, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0
    const v = (i: number, j: number) => gr[(((j % k) + k) % k) * k + (((i % k) + k) % k)]!
    const sm = (t: number) => t * t * (3 - 2 * t)
    return (v(x0, y0) * (1 - sm(tx)) + v(x0 + 1, y0) * sm(tx)) * (1 - sm(ty)) + (v(x0, y0 + 1) * (1 - sm(tx)) + v(x0 + 1, y0 + 1) * sm(tx)) * sm(ty)
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

/** Lusher and drier patches laid across a ground in its shader: two octaves of world-space noise, stepped on the texel
 * grid so the pixel look holds. (Turning tiles was tried and dropped: it broke the texture's continuity into a grid.) */
export function breakTiling(mat: MeshStandardMaterial): void {
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
  mat.customProgramCacheKey = () => 'breakTiling'
}

/** Grass tufts, clover and small flowers scattered as crossed pixel cards (the nature kit's role in the references), lit
 * like the ground and swaying. `blocked` keeps them off paving and floors. */
export function scatter(area: { w: number; d: number }, blocked: (x: number, z: number) => boolean, counts: readonly number[] = [420, 420, 420, 220]): Group {
  const g = new Group()
  const card = (draw: (c: CanvasRenderingContext2D) => void) => pixelTex(draw, 16, 16)
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
  const rnd = seeded(11)
  for (const [k, tex] of kinds.entries()) {
    const count = counts[k] ?? 0
    if (!count) continue
    const mat = new MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: DoubleSide, roughness: 1 })
    windy(mat, 0.16)
    const mesh = new InstancedMesh(cross, mat, count)
    const m = new Matrix4(), rot = new Matrix4(), sc = new Matrix4()
    let n = 0, tries = 0
    while (n < count && tries++ < count * 20) {
      const x = (rnd() - 0.5) * area.w, z = (rnd() - 0.5) * area.d
      if (blocked(x, z)) continue
      const s = 0.7 + rnd() * 0.7
      m.makeTranslation(x, 0, z).multiply(rot.makeRotationY(rnd() * Math.PI)).multiply(sc.makeScale(s, s * (0.8 + rnd() * 0.5), s))
      mesh.setMatrixAt(n++, m)
    }
    mesh.count = n
    mesh.receiveShadow = true
    g.add(mesh)
  }
  return g
}

/** Bunting between two points: a sagging line of pennants. */
// Muted a step from primaries: the references' focal colours are rich, not toy-bright.
export function bunting(a: Vector3, b: Vector3, colours = ['#a8303a', '#c89a34', '#34509a', '#357a46', '#6e3a88']): Group {
  const g = new Group()
  const n = Math.round(a.distanceTo(b) / 0.7)
  const geo = new BufferGeometry()
  // Wound to face +z, toward every camera family: a double-sided face seen from behind turns its normal over.
  geo.setAttribute('position', new BufferAttribute(new Float32Array([0.26, 0, 0, -0.26, 0, 0, 0, -0.55, 0]), 3))
  // Normals up, as the grass cards: a pennant seen against the sun reads by its colour, not as a black triangle.
  geo.setAttribute('normal', new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), 3))
  const mats = colours.map((color) => new MeshStandardMaterial({ color, side: DoubleSide, roughness: 0.8 }))
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, p = a.clone().lerp(b, t)
    p.y -= Math.sin(Math.PI * t) * 1.1
    const m = new Mesh(geo, at(mats, i))
    m.position.copy(p)
    m.lookAt(p.clone().add(new Vector3(0, 0, 1)))
    m.castShadow = true
    m.userData.flutter = i
    g.add(m)
  }
  return g
}

/** A hanging banner: a cloth on a gilt rod, a swallowtail hem, a border and a horseshoe emblem, as pixel art. */
export function banner(x: number, y: number, z: number, field: string, trim: string): Group {
  const w = 12, h = 30
  const t = pixelTex((g) => {
    g.fillStyle = field; g.fillRect(0, 0, w, h)
    g.fillStyle = trim; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h)
    for (const [px, py] of [[4, 8], [3, 9], [3, 10], [3, 11], [3, 12], [4, 13], [7, 8], [8, 9], [8, 10], [8, 11], [8, 12], [7, 13], [5, 7], [6, 7]] as const) g.fillRect(px, py, 1, 1)
    g.fillRect(3, 14, 2, 1); g.fillRect(7, 14, 2, 1)
    g.fillStyle = field; g.fillRect(3, 10, 1, 1); g.fillRect(8, 10, 1, 1)
    g.fillStyle = trim; g.fillRect(2, 19, 8, 1)
    g.clearRect(0, h - 1, w, 1)
    for (let i = 0; i < 5; i++) g.clearRect(6 - i, h - 5 + i, 2 * i, 1)
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = 2; yy < h - 5; yy++) g.fillRect(w - 2, yy, 1, 1)
  }, w, h)
  t.wrapS = t.wrapT = 1001 // ClampToEdge
  const cloth = new Mesh(new PlaneGeometry(0.9, 2.25), new MeshStandardMaterial({ map: t, alphaTest: 0.5, side: DoubleSide, roughness: 0.9 }))
  cloth.geometry.translate(0, -1.125, 0)
  cloth.castShadow = true
  cloth.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: t, alphaTest: 0.5 })
  cloth.userData.flutter = x
  const rod = new Mesh(new CylinderGeometry(0.035, 0.035, 1.15, 6), new MeshStandardMaterial({ color: '#c9a24a', roughness: 0.4, metalness: 0.7 }))
  rod.rotation.z = Math.PI / 2
  const out = new Group()
  out.add(rod, cloth)
  out.position.set(x, y, z)
  out.userData.banner = true
  return out
}

/** A flame: an emissive cone that flickers, with its light. `lights` collects the light for the scene's flicker. */
export function flame(size: number, lights: PointLight[] | null, intensity = 18, distance = 9): Group {
  const g = new Group()
  const f = new Mesh(new ConeGeometry(0.22 * size, 0.6 * size, 8), new MeshStandardMaterial({ color: '#ff9a30', emissive: '#ff8a20', emissiveIntensity: 3.5 }))
  f.userData.flame = true
  g.add(f)
  if (lights) {
    const light = new PointLight('#ffa64a', intensity, distance, 2)
    light.position.y = 0.2 * size
    light.userData.base = intensity
    lights.push(light)
    g.add(light)
  }
  return g
}

/** A brazier: an iron tripod, a bowl and a fire. */
export function brazier(x: number, z: number, lights: PointLight[]): Group {
  const g = new Group()
  const iron = new MeshStandardMaterial({ color: '#2a2622', roughness: 0.6, metalness: 0.4 })
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const leg = solid(new CylinderGeometry(0.035, 0.035, 1.2, 6), iron, Math.cos(a) * 0.18, 0.58, Math.sin(a) * 0.18)
    leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25)
    g.add(leg)
  }
  const bowl = solid(new CylinderGeometry(0.32, 0.18, 0.22, 10), iron, 0, 1.22, 0)
  const fire = flame(1, lights)
  fire.position.y = 1.6
  g.add(bowl, fire)
  g.position.set(x, 0, z)
  return g
}

/** A hanging lamp: a chain from above, an iron cage, a glowing glass and a warm light. */
export function hangingLamp(x: number, y: number, z: number, top: number, lights: PointLight[], intensity = 9): Group {
  const g = new Group()
  const iron = new MeshStandardMaterial({ color: '#2a2420', roughness: 0.5, metalness: 0.6 })
  const chain = new Mesh(new CylinderGeometry(0.02, 0.02, top - y, 4), iron)
  chain.position.y = (top - y) / 2 + 0.3
  const cap = new Mesh(new ConeGeometry(0.28, 0.2, 6), iron)
  cap.position.y = 0.32
  const glass = new Mesh(new CylinderGeometry(0.2, 0.16, 0.42, 6), new MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb050', emissiveIntensity: 2.6 }))
  const base = new Mesh(new CylinderGeometry(0.12, 0.2, 0.08, 6), iron)
  base.position.y = -0.24
  const light = new PointLight('#ffb468', intensity, 10, 2)
  light.position.y = -0.3
  light.userData.base = intensity
  lights.push(light)
  g.add(chain, cap, glass, base, light)
  g.position.set(x, y, z)
  g.userData.swing = x + z
  return g
}

/** Petals or dust drifting through a volume. */
export function drift(count: number, box: { w: number; h: number; d: number }, colour = '#ffe6f0', size = 0.16): Points {
  const pos = new Float32Array(count * 3)
  const rnd = seeded(5)
  for (let i = 0; i < count; i++) pos.set([(rnd() - 0.5) * box.w, rnd() * box.h, (rnd() - 0.5) * box.d], i * 3)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  const t = pixelTex((g) => { g.fillStyle = colour; g.fillRect(2, 2, 4, 4); g.fillStyle = '#ffffff'; g.fillRect(3, 3, 2, 2) }, 8, 8)
  const p = new Points(geo, new PointsMaterial({ size, map: t, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }))
  p.userData.box = box
  return p
}
export function stepDrift(p: Points, t: number, dt: number, wind = 0.6, fall = 0.35): void {
  const box = p.userData.box as { w: number; h: number; d: number }
  const a = p.geometry.getAttribute('position') as BufferAttribute
  for (let i = 0; i < a.count; i++) {
    let x = a.getX(i) + dt * (wind + 0.3 * Math.sin(i)), y = a.getY(i) - dt * fall * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 0.5)), z = a.getZ(i) + dt * 0.15 * Math.cos(i + t)
    if (y < 0 || x > box.w / 2) { x = -box.w / 2; y = box.h * (0.25 + 0.75 * ((i * 0.618) % 1)); z = (((i * 0.377) % 1) - 0.5) * box.d }
    if (y > box.h) y = 0
    a.setXYZ(i, x, y, z)
  }
  a.needsUpdate = true
}

/** Flames flicker and their lights with them; banners and bunting flutter; hanging lamps swing a little. */
export function stepFire(lights: readonly PointLight[], flames: readonly Object3D[], t: number): void {
  lights.forEach((l, i) => { l.intensity = (l.userData.base as number) * (0.85 + 0.15 * Math.sin(t * 13 + i * 5) * Math.sin(t * 7.3 + i)) })
  for (const f of flames) f.scale.y = 1 + 0.12 * Math.sin(t * 17 + f.id)
}

/** A shape with a material, placed, casting and taking shadows. */
export function solid(geo: BufferGeometry, mat: MeshStandardMaterial, x: number, y: number, z: number, turn = 0): Mesh {
  const m = new Mesh(geo, mat)
  m.position.set(x, y, z)
  m.rotation.y = turn
  m.castShadow = m.receiveShadow = true
  // Still: merged with its material's other still pieces (batch.ts).
  m.userData.static = true
  return m
}
export const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d)
export const cylinder = (top: number, bottom: number, h: number, sides = 10) => new CylinderGeometry(top, bottom, h, sides)
