// The hero scene's interior at night (LK1, P158; ref-11, ref-08): a tavern seen through its missing front wall, as
// HD-2D shows a room. A dark base broken by warm pools (a hearth, hanging lamps, candles), a cool moon through the back
// windows with shafts, gilded pillars, a patterned rug, a bar with barrels and bottles, tables, dust in the lamplight,
// and our Umas at the tables and the bar. A side wall the camera stands behind is hidden, so the 3/4 view sees in.
import {
  CanvasTexture, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Vector3, type Camera, type Object3D, type PointLight,
} from 'three'
import { embers, shafts, stepEmbers, WIND } from './atmos.js'
import { batchStatic } from './batch.js'
import { disposeFigure, lookFigure, stepFigure, type CastSpot, type LookSprite } from './figures.js'
import type { LookKit } from './kit.js'
import { box, BRICK, cylinder, drift, flame, hangingLamp, pixelTex, PLANKS, SACK, seeded, solid, STAVES, stepDrift, stepFire } from './props.js'
import { CAMERA_LABELS, type CameraPreset, type LookScene, type SceneLight } from './scene.js'
import { disposeTree, STOREY } from './town.js'

const W = 14, D = 10, H = 2 * STOREY

/** The rug: a deep red field, a gold border, a diamond lattice and a medallion, with a fringe at the ends. */
const RUG = () => pixelTex((g) => {
  const w = 48, h = 32
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = Math.min(x, y, w - 1 - x, h - 1 - y)
    const lattice = (x + y) % 8 === 0 || (x - y + 64) % 8 === 0
    const dx = (x - w / 2 + 0.5) / 9, dy = (y - h / 2 + 0.5) / 6, r = dx * dx + dy * dy
    g.fillStyle = edge === 0 ? '#3a0c10' : edge <= 2 ? '#d4a84a' : edge === 3 ? '#3a0c10' : r < 0.55 ? (r < 0.25 ? '#e8c060' : '#2a1846') : lattice ? '#a8323a' : '#7a1c22'
    g.fillRect(x, y, 1, 1)
  }
}, 48, 32)

/** Gilded pillar wood: dark red-brown with shading across and gold bands. */
const PILLAR = () => pixelTex((g) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 8; x++) {
    const band = y % 16 === 0 || y % 16 === 1
    g.fillStyle = band ? (x % 4 === 0 ? '#f0d070' : '#c89a3a') : ['#3a1a14', '#4e241a', '#5c2c20', '#4e241a'][Math.floor(x / 2) % 4]!
    g.fillRect(x, y, 1, 1)
  }
}, 8, 32)

/** The night outside the windows: deep blue, lighter at the horizon, a few stars. */
function nightBackdrop(): Mesh {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 32
  const g = c.getContext('2d')!, grad = g.createLinearGradient(0, 0, 0, 32)
  grad.addColorStop(0, '#060a1c'); grad.addColorStop(0.7, '#14224a'); grad.addColorStop(1, '#2a3a6a')
  g.fillStyle = grad; g.fillRect(0, 0, 64, 32)
  const rnd = seeded(3)
  for (let i = 0; i < 40; i++) { g.fillStyle = rnd() > 0.7 ? '#ffffff' : '#9fb0e0'; g.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 22), 1, 1) }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  // Only behind the back wall, so it shows through the windows and nowhere else.
  const m = new Mesh(new PlaneGeometry(W, H), new MeshBasicMaterial({ map: t, fog: false }))
  m.position.set(0, H / 2, -D / 2 - 0.6)
  return m
}

/** A wall run along one side: the pieces per storey by index, windows set in, the side's facing for the cutaway. */
function wallRun(kit: LookKit, pieces: string[][], start: Vector3, step: Vector3, turn: number, facing: Vector3): Group {
  const g = new Group()
  pieces.forEach((row, s) => row.forEach((name, i) => {
    const p = start.clone().addScaledVector(step, i)
    g.add(kit.piece(name, p.x, s * STOREY, p.z, turn))
    if (name.includes('Window_Wide_Round')) {
      const glass = kit.piece('Window_Wide_Round1', p.x, s * STOREY, p.z, turn)
      // The moon comes in through the windows: their frames and glass cast no shadow.
      glass.traverse((o) => { o.castShadow = false })
      g.add(glass)
    }
    if (name.includes('Door_Round')) g.add(kit.piece('Door_1_Round', p.x - 0.53 * Math.cos(turn), s * STOREY, p.z + 0.53 * Math.sin(turn), turn))
  }))
  g.userData.facing = facing
  g.userData.at = start.clone().addScaledVector(step, (pieces[0]!.length - 1) / 2)
  return g
}

const NIGHT: SceneLight = {
  // The moon from behind the back wall, high on the left: pools of cool light under the windows.
  key: { colour: '#9db4ff', intensity: 1.5, from: [-9, 15, -22], to: [0, 0, -1], box: 12 },
  hemi: { sky: '#2e3e6e', ground: '#24160c', intensity: 0.7 },
  fog: { colour: '#120e0c', density: 0.011 },
  sky: ['#04050a'],
  exposure: 1.5,
  post: { bloomStrength: 0.85, bloomThreshold: 0.64, bloomRadius: 0.6, vignette: 0.32, saturation: 1.12, contrast: 1.22, split: 0.18, aperture: 0.0011 },
  // The lamps hang above: the characters' rim comes from overhead and warm.
  rim: { strength: 0.95, dir: [0.15, 0.98], colour: '#ffc480' },
}

const CAMERAS: Record<'front' | 'tactics' | 'high', CameraPreset> = {
  front: { label: CAMERA_LABELS.front, target: [0, 1.1, 0.3], elevation: 33, azimuth: 0, distance: 23, fov: 26 },
  tactics: { label: CAMERA_LABELS.tactics, target: [0.4, 1, -0.2], elevation: 42, azimuth: 38, distance: 25, fov: 25 },
  high: { label: CAMERA_LABELS.high, target: [0, 1.4, -1.2], elevation: 50, azimuth: 0, distance: 28, fov: 24 },
}

/** The tavern by night, with its cast. */
export function buildTavern(kit: LookKit, cast: readonly { sprite: LookSprite; spot: CastSpot }[], spritePixels: number | null): LookScene {
  const root = new Group()
  const lights: PointLight[] = []
  const flames: Object3D[] = []
  root.add(nightBackdrop())
  // The floor: dark boards on the 2 m grid, and the rug in the middle.
  for (let x = -W / 2 + 1; x < W / 2; x += 2) for (let z = -D / 2 + 1; z < D / 2; z += 2) root.add(kit.piece('Floor_WoodDark', x, 0, z))
  // The room's floor as a slab with a thick front edge, as a cutaway shows a room: not floating in the dark.
  const slab = new MeshStandardMaterial({ map: BRICK(), roughness: 1, color: '#8a7a70' })
  slab.map!.repeat.set(7, 1)
  root.add(solid(box(W + 0.4, 0.9, D + 0.2), slab, 0, -0.46, 0))
  const rug = new Mesh(new PlaneGeometry(6, 4), new MeshStandardMaterial({ map: RUG(), roughness: 1 }))
  rug.rotation.x = -Math.PI / 2
  rug.position.set(-1.2, 0.025, 0.9)
  rug.receiveShadow = true
  root.add(rug)
  // The walls: brick below, plaster and timber above; windows round; a door on the left.
  const B = 'Wall_UnevenBrick_', P = 'Wall_Plaster_'
  const back = wallRun(kit, [
    [`${B}Straight`, `${B}Window_Wide_Round`, `${B}Straight`, `${B}Straight`, `${B}Straight`, `${B}Window_Wide_Round`, `${B}Straight`],
    [`${P}WoodGrid`, `${P}Window_Wide_Round`, `${P}WoodGrid`, `${P}Straight`, `${P}WoodGrid`, `${P}Window_Wide_Round`, `${P}WoodGrid`],
  ], new Vector3(-W / 2 + 1, 0, -D / 2), new Vector3(2, 0, 0), 0, new Vector3(0, 0, 1))
  const left = wallRun(kit, [
    [`${B}Straight`, `${B}Window_Wide_Round`, `${B}Door_Round`, `${B}Window_Wide_Round`, `${B}Straight`],
    [`${P}WoodGrid`, `${P}Straight`, `${P}WoodGrid`, `${P}Straight`, `${P}WoodGrid`],
  ], new Vector3(-W / 2, 0, -D / 2 + 1), new Vector3(0, 0, 2), Math.PI / 2, new Vector3(1, 0, 0))
  const right = wallRun(kit, [
    [`${B}Straight`, `${B}Straight`, `${B}Straight`, `${B}Straight`, `${B}Straight`],
    [`${P}WoodGrid`, `${P}Window_Wide_Round`, `${P}WoodGrid`, `${P}Window_Wide_Round`, `${P}WoodGrid`],
  ], new Vector3(W / 2, 0, D / 2 - 1), new Vector3(0, 0, -2), -Math.PI / 2, new Vector3(-1, 0, 0))
  const walls = [back, left, right]
  root.add(...walls)
  // Gilded pillars along the back and at its corners, a beam across them.
  const gilt = new MeshStandardMaterial({ color: '#c8963a', roughness: 0.6, metalness: 0.45 })
  const wood = new MeshStandardMaterial({ map: PILLAR(), roughness: 0.6 })
  wood.map!.repeat.set(2, 3)
  for (const [x, z] of [[-3.2, -3.5], [3.2, -3.5], [-W / 2 + 0.35, -D / 2 + 0.35], [W / 2 - 0.35, -D / 2 + 0.35]] as const) {
    root.add(solid(cylinder(0.26, 0.26, H - 0.6, 10), wood, x, H / 2, z))
    root.add(solid(box(0.7, 0.36, 0.7), gilt, x, 0.18, z))
    root.add(solid(box(0.74, 0.3, 0.74), gilt, x, H - 0.15, z))
  }
  const beam = new MeshStandardMaterial({ map: PLANKS(true), roughness: 0.85 })
  root.add(solid(box(W, 0.4, 0.4), beam, 0, H - 0.5, -3.5))
  // The hearth: a brick breast with a firebox, a mantel, logs and a fire whose light fills the back of the room.
  const brick = new MeshStandardMaterial({ map: BRICK(), roughness: 0.95 })
  brick.map!.repeat.set(2, 2)
  const hz = -D / 2 + 0.45
  root.add(solid(box(0.55, 1.7, 0.9), brick, -1.05, 0.85, hz), solid(box(0.55, 1.7, 0.9), brick, 1.05, 0.85, hz))
  root.add(solid(box(2.65, 0.5, 0.9), brick, 0, 1.95, hz), solid(box(2.2, H - 2.2, 0.7), brick, 0, 2.2 + (H - 2.2) / 2, hz - 0.1))
  root.add(solid(box(3, 0.14, 1.15), beam, 0, 2.27, hz + 0.1), solid(box(3.1, 0.1, 1.5), brick, 0, 0.05, hz + 0.4))
  const soot = new Mesh(new PlaneGeometry(1.6, 1.7), new MeshStandardMaterial({ color: '#120a08', roughness: 1 }))
  soot.position.set(0, 0.85, hz - 0.3)
  root.add(soot)
  const logs = new MeshStandardMaterial({ color: '#3a2214', roughness: 1 })
  for (const [x, r] of [[-0.25, 0.3], [0.25, -0.3]] as const) { const l = solid(cylinder(0.09, 0.09, 1.1, 6), logs, x, 0.2, hz - 0.05); l.rotation.set(Math.PI / 2, 0, r); root.add(l) }
  const fire = flame(1.7, lights, 34, 13)
  fire.position.set(0, 0.55, hz - 0.05)
  root.add(fire)
  fire.traverse((o) => { if (o.userData.flame) flames.push(o) })
  const sparks = embers([new Vector3(0, 0.5, hz)], 46)
  root.add(sparks.points)
  // The bar along the right wall: a counter, barrels behind it, shelves of bottles.
  const darkWood = new MeshStandardMaterial({ map: PLANKS(true), roughness: 0.8 })
  const lightWood = new MeshStandardMaterial({ map: PLANKS(false), roughness: 0.7 })
  root.add(solid(box(1, 1.1, 6), darkWood, 4.9, 0.55, -0.6), solid(box(1.25, 0.1, 6.2), lightWood, 4.85, 1.15, -0.6))
  const staves = new MeshStandardMaterial({ map: STAVES(), roughness: 0.85 })
  for (const z of [-3.2, -1.8, -0.4, 1.0]) root.add(solid(cylinder(0.36, 0.3, 0.95), staves, 6.3, 0.48, z))
  const shelf = new MeshStandardMaterial({ map: PLANKS(false), roughness: 0.8 })
  const glass = ['#3a8a4a', '#b8782a', '#6a2a6a', '#2a5a9a'].map((c) => new MeshStandardMaterial({ color: c, roughness: 0.15, metalness: 0.1, emissive: c, emissiveIntensity: 0.18 }))
  for (const y of [1.65, 2.35]) {
    root.add(solid(box(0.34, 0.06, 5.2), shelf, 6.75, y, -1.1))
    for (let i = 0; i < 11; i++) root.add(solid(cylinder(0.05, 0.07, 0.3, 6), glass[(i * 3 + Math.round(y)) % 4]!, 6.72, y + 0.18, -3.4 + i * 0.46))
  }
  // Tables with stools, mugs and a candle each; no light of their own (the bloom carries them).
  const top = new MeshStandardMaterial({ map: PLANKS(false), roughness: 0.75 })
  const candleWax = new MeshStandardMaterial({ color: '#f0e6c8', emissive: '#ffd890', emissiveIntensity: 0.4 })
  const candleFlame = new MeshStandardMaterial({ color: '#ffd070', emissive: '#ffb040', emissiveIntensity: 4 })
  const mug = new MeshStandardMaterial({ map: STAVES(), roughness: 0.8 })
  for (const [tx, tz] of [[-4.1, 1.4], [-0.9, -1.4], [1.7, 1.8]] as const) {
    root.add(solid(cylinder(0.78, 0.78, 0.08, 12), top, tx, 0.78, tz), solid(cylinder(0.08, 0.1, 0.74, 6), darkWood, tx, 0.37, tz), solid(cylinder(0.32, 0.36, 0.05, 8), darkWood, tx, 0.03, tz))
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + tx; root.add(solid(cylinder(0.22, 0.2, 0.46, 8), darkWood, tx + Math.cos(a) * 1.15, 0.23, tz + Math.sin(a) * 1.15)) }
    for (let k = 0; k < 2; k++) root.add(solid(cylinder(0.07, 0.065, 0.16, 7), mug, tx + 0.35 - k * 0.6, 0.9, tz + 0.2 - k * 0.3))
    root.add(solid(cylinder(0.05, 0.05, 0.22, 6), candleWax, tx, 0.93, tz - 0.25))
    const f = solid(cylinder(0, 0.035, 0.09, 5), candleFlame, tx, 1.09, tz - 0.25)
    f.castShadow = false
    f.userData.flame = true
    flames.push(f)
    root.add(f)
  }
  // Crates, barrels and sacks in the back-left corner.
  root.add(kit.piece('Prop_Crate', -6, 0, -3.9, 0.2, 0.55), kit.piece('Prop_Crate', -5.95, 0.55 * 1.05, -3.85, 0.9, 0.42))
  root.add(solid(cylinder(0.32, 0.27, 0.8), staves, -6.3, 0.4, -2.6), solid(cylinder(0.22, 0.28, 0.5, 7), new MeshStandardMaterial({ map: SACK(), roughness: 1 }), -5.2, 0.25, -4.3))
  // Hanging lamps: the room's warm pools.
  const lamps = [hangingLamp(-3.9, 3.5, -0.6, H, lights, 15), hangingLamp(0.3, 3.8, 0.9, H, lights, 15), hangingLamp(3.4, 3.5, -1.3, H, lights, 15), hangingLamp(-1.2, 3.3, 3.6, H, lights, 12)]
  root.add(...lamps)
  // Moonlight through the back windows, as shafts in the haze (ref-08).
  // Each runs from a window down to where its light lands on the floor, along the moon's direction.
  const moon = new Vector3(...NIGHT.key.to).sub(new Vector3(...NIGHT.key.from)).normalize()
  const beams = new Group()
  for (const [x, y] of [[-4, 1.7], [4, 1.7], [-4, 4.8], [4, 4.8]] as const) {
    const from = new Vector3(x, y, -D / 2), to = from.clone().addScaledVector(moon, y / -moon.y), mid = from.clone().lerp(to, 0.5)
    beams.add(shafts(new Vector3(...NIGHT.key.from), [[mid.x, mid.y, mid.z]], '#a8c0ff', y > 3 ? 0.1 : 0.14, from.distanceTo(to) * 1.15))
  }
  root.add(beams)
  const dust = drift(170, { w: 12, h: 5, d: 9 }, '#ffd8a0', 0.06)
  root.add(dust)
  const figures = cast.map(({ sprite, spot }) => lookFigure(sprite, spot, spritePixels))
  root.add(...figures)
  // Each wall merges on its own, so the cutaway can still hide it; then the rest of the room.
  for (const w of walls) { batchStatic(w); w.userData.batch = false }
  batchStatic(root)
  const toCamera = new Vector3()
  return {
    id: 'tavern', title: 'Tavern, night', root, figures, light: NIGHT, cameras: CAMERAS,
    layers: { embers: sparks.points, shafts: beams, petals: dust },
    update(t, dt, camera: Camera) {
      WIND.value = t
      for (const f of figures) stepFigure(f, camera, dt)
      stepFire(lights, flames, t)
      stepEmbers(sparks, t, dt)
      stepDrift(dust, t, dt, 0.08, 0.05)
      for (const l of lamps) l.rotation.z = 0.025 * Math.sin(t * 0.8 + (l.userData.swing as number))
      // The cutaway: a wall whose room side faces away from the camera is hidden, so the room shows.
      for (const w of walls) {
        toCamera.copy(camera.position).sub(w.userData.at as Vector3)
        w.visible = toCamera.dot(w.userData.facing as Vector3) > 0
      }
    },
    dispose() { for (const f of figures) disposeFigure(f); disposeTree(root) },
  }
}

