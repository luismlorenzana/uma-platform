// Static batching (LK1): a scene's still pieces merged into one mesh per material, so the phone draws dozens of meshes a
// pass instead of thousands (the town square was about 5,000 draws a frame on High across its passes). Kit pieces and
// `solid` props are candidates; anything moving (figures, flames, banners, lamps, particles) is left as it is, and a
// subtree marked `userData.batch = false` is skipped (the tavern's walls, which hide one by one).
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, type Material, type Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** A copy of a geometry with plain float attributes (the pack's quantized ones would clip once moved) and a 32-bit index. */
function plain(g: BufferGeometry): BufferGeometry {
  const out = new BufferGeometry()
  for (const [name, attr] of Object.entries(g.attributes)) {
    const a = attr as BufferAttribute
    const f = new Float32Array(a.count * a.itemSize)
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) f[i * a.itemSize + k] = a.getComponent(i, k)
    out.setAttribute(name, new BufferAttribute(f, a.itemSize))
  }
  if (g.index) out.setIndex(new BufferAttribute(Uint32Array.from(g.index.array as ArrayLike<number>), 1))
  return out
}

function skipped(o: Object3D, root: Object3D): boolean {
  for (let p: Object3D | null = o; p && p !== root; p = p.parent) if (p.userData.batch === false) return true
  return false
}

/** Merges `root`'s still meshes by material, in `root`'s space. Returns the meshes before and after. */
export function batchStatic(root: Object3D): { before: number; after: number } {
  root.updateMatrixWorld(true)
  const toRoot = new Matrix4().copy(root.matrixWorld).invert()
  const groups = new Map<string, { material: Material; cast: boolean; receive: boolean; parts: BufferGeometry[]; meshes: Mesh[] }>()
  let before = 0
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || (m as { isInstancedMesh?: boolean }).isInstancedMesh || Array.isArray(m.material)) return
    if (!(m.userData.kit || m.userData.static) || skipped(m, root) || !m.visible) return
    before++
    const g = m.geometry, names = Object.keys(g.attributes).sort().join(',')
    const key = `${m.material.uuid}|${m.castShadow ? 1 : 0}${m.receiveShadow ? 1 : 0}|${names}|${g.index ? 'i' : 'n'}`
    let group = groups.get(key)
    if (!group) groups.set(key, (group = { material: m.material, cast: m.castShadow, receive: m.receiveShadow, parts: [], meshes: [] }))
    const part = plain(g)
    part.applyMatrix4(new Matrix4().multiplyMatrices(toRoot, m.matrixWorld))
    group.parts.push(part)
    group.meshes.push(m)
  })
  let after = 0
  for (const group of groups.values()) {
    if (group.meshes.length < 2) continue
    const merged = mergeGeometries(group.parts, false)
    if (!merged) continue
    for (const m of group.meshes) m.removeFromParent()
    const mesh = new Mesh(merged, group.material)
    mesh.castShadow = group.cast
    mesh.receiveShadow = group.receive
    // Its geometry is the scene's own, freed with the scene; a kit material stays the kit's (disposeTree checks).
    mesh.userData = { batched: true }
    root.add(mesh)
    after++
  }
  for (const group of groups.values()) if (group.meshes.length < 2) after++
  return { before, after }
}
