// The look kit (LK1, P159): the private CC0 modules, packed into one glb by `pnpm look:pack` with each piece a named root
// node, placed by cloning, and their materials redrawn at the slice's pixel scale. Nature's leaves, flowers and grass sway.
import type { Material, Mesh, MeshStandardMaterial, Object3D, Texture } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { windy } from './atmos.js'
import { pixelate } from './pixel.js'

export interface PixelSettings { on: boolean; texels: number; levels: number; normals: boolean }
/** 64 texels a texture: the owner's review of milestone 1 asked for a coarser grid, nearer the references' chunky pixels. */
export const PIXEL_DEFAULTS: PixelSettings = { on: true, texels: 64, levels: 24, normals: true }

/** Wind on foliage (layer 7), by material name: tree crowns a little, flowers and grass more, each by its height. */
const WIND: readonly (readonly [RegExp, number])[] = [[/^Leaves_|^Leaf/, 0.01], [/^(Leaves|Flowers|Grass)$/, 0.07]]

interface Originals { map: Texture | null; normalMap: Texture | null; roughnessMap: Texture | null }

export class LookKit {
  private readonly pieces = new Map<string, Object3D>()
  readonly materials = new Set<MeshStandardMaterial>()

  constructor(root: Object3D) {
    for (const child of root.children) this.pieces.set(child.name, child)
    root.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.castShadow = m.receiveShadow = true
      // Kit meshes share the kit's geometry and materials: a scene's dispose leaves them to the kit's.
      m.userData.kit = true
      for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as MeshStandardMaterial[]) {
        if (this.materials.has(mat)) continue
        mat.userData.original = { map: mat.map, normalMap: mat.normalMap, roughnessMap: mat.roughnessMap } satisfies Originals
        this.materials.add(mat)
        const wind = WIND.find(([re]) => re.test(mat.name))
        if (wind) windy(mat, wind[1])
      }
    })
  }

  /** The packed kit's bytes (a glb) as a kit. */
  static async parse(bytes: ArrayBuffer): Promise<LookKit> {
    const gltf = await new GLTFLoader().parseAsync(bytes, '')
    return new LookKit(gltf.scene)
  }

  get names(): string[] { return [...this.pieces.keys()] }

  /** A placed copy of a piece: position, turn (radians about up) and scale. */
  piece(name: string, x = 0, y = 0, z = 0, turn = 0, scale = 1): Object3D {
    const source = this.pieces.get(name)
    if (!source) throw new Error(`The look kit has no piece "${name}": add it to PIECES and run pnpm look:pack`)
    const o = source.clone(true)
    o.position.set(x, y, z)
    o.rotation.set(0, turn, 0)
    o.scale.setScalar(scale)
    return o
  }

  /** Every kit material at the pixel scale, or back to its packed maps. */
  applyPixels(s: PixelSettings): void {
    for (const mat of this.materials) {
      const o = mat.userData.original as Originals
      mat.map = o.map && s.on ? pixelate(o.map, s.texels, s.levels) : o.map
      mat.normalMap = !s.normals ? null : o.normalMap && s.on ? pixelate(o.normalMap, s.texels, 256, false) : o.normalMap
      mat.roughnessMap = o.roughnessMap && s.on ? pixelate(o.roughnessMap, s.texels, 256, false) : o.roughnessMap
      mat.needsUpdate = true
    }
  }

  dispose(): void {
    const textures = new Set<Texture>()
    for (const mat of this.materials) {
      const o = mat.userData.original as Originals
      for (const t of [o.map, o.normalMap, o.roughnessMap]) if (t) textures.add(t)
      ;(mat as Material).dispose()
    }
    for (const t of textures) t.dispose()
    for (const p of this.pieces.values()) p.traverse((o) => { const m = o as Mesh; if (m.isMesh) m.geometry.dispose() })
  }
}
