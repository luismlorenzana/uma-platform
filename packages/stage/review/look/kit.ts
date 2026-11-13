// The kit for the look slice (P159): the CC0 Quaternius modules as raw material, loaded once each, cloned per use,
// their materials redrawn at the slice's pixel scale. Private files on disk (content/authoring/licensed/).
import { Cache, Group, Mesh, type Material, type MeshStandardMaterial, type Object3D, type Texture } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { pixelate } from './pixel.js'

declare const __REPO__: string
const fsUrl = (path: string) => '/@fs' + path.split('/').map((s) => encodeURIComponent(s)).join('/')
export const DIRS = {
  village: `${__REPO__}/content/authoring/licensed/quaternius/medieval-village-megakit-standard/Medieval Village MegaKit[Standard]/glTF/`,
  nature: `${__REPO__}/content/authoring/licensed/quaternius/stylized-nature-megakit-standard/glTF/`,
} as const
export const privateUrl = (path: string) => fsUrl(`${__REPO__}/${path}`)

// Every module points at the same few texture files: load each image once.
Cache.enabled = true
const loader = new GLTFLoader()
const loaded = new Map<string, Promise<Object3D>>()
const materials = new Set<MeshStandardMaterial>()

function load(kit: keyof typeof DIRS, name: string): Promise<Object3D> {
  const key = `${kit}/${name}`
  let p = loaded.get(key)
  if (!p) {
    p = loader.loadAsync(fsUrl(`${DIRS[kit]}${name}.gltf`)).then((g) => {
      g.scene.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        m.castShadow = m.receiveShadow = true
        for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as MeshStandardMaterial[]) {
          if (!mat.userData.original) mat.userData.original = { map: mat.map, normalMap: mat.normalMap, roughnessMap: mat.roughnessMap }
          materials.add(mat)
        }
      })
      return g.scene
    })
    loaded.set(key, p)
  }
  return p
}

/** A placed copy of a module: position, turn (radians about up) and scale. */
export async function piece(kit: keyof typeof DIRS, name: string, x = 0, y = 0, z = 0, turn = 0, scale = 1): Promise<Object3D> {
  const o = (await load(kit, name)).clone(true)
  o.position.set(x, y, z)
  o.rotation.y = turn
  o.scale.setScalar(scale)
  return o
}

export interface PixelSettings { on: boolean; texels: number; levels: number; normals: boolean }
export const PIXEL_DEFAULTS: PixelSettings = { on: true, texels: 96, levels: 24, normals: true }

/** Every kit material at the pixel scale (or back to its source maps). */
export function applyPixels(s: PixelSettings): void {
  for (const mat of materials) {
    const o = mat.userData.original as { map: Texture | null; normalMap: Texture | null; roughnessMap: Texture | null }
    mat.map = o.map && s.on ? pixelate(o.map, s.texels, s.levels) : o.map
    mat.normalMap = !s.normals ? null : o.normalMap && s.on ? pixelate(o.normalMap, s.texels, 256, false) : o.normalMap
    mat.roughnessMap = o.roughnessMap && s.on ? pixelate(o.roughnessMap, s.texels, 256, false) : o.roughnessMap
    mat.needsUpdate = true
  }
}

/** Every material the kit has loaded, for the scene's own tweaks. */
export const kitMaterials = (): ReadonlySet<Material> => materials

export function group(...children: Object3D[]): Group { const g = new Group(); g.add(...children); return g }
