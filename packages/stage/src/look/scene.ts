// A look scene (LK1): what a hero scene hands the look stage: its objects, its light and grade (the per-scene LUT, as
// parameters), its camera families, its switchable layers and its per-frame life.
import type { Camera, Group, Mesh, Object3D } from 'three'
import type { PostSettings } from './post.js'

/** The camera families (P160): Octopath's front view for exploring, Triangle Strategy's diagonal 3/4 for a tactics
 * board, and a high view. One look path; each game picks its family. */
export type CameraName = 'front' | 'tactics' | 'high'
export interface CameraPreset {
  readonly label: string
  readonly target: readonly [number, number, number]
  /** Degrees above the horizon. */
  readonly elevation: number
  /** Degrees about up, 0 looking toward −z. */
  readonly azimuth: number
  readonly distance: number
  readonly fov: number
}
export const CAMERA_LABELS: Record<CameraName, string> = { front: 'Octopath: front', tactics: 'Triangle Strategy: 3/4', high: 'High' }

export interface SceneLight {
  /** The key: the sun by day, the moon at night. */
  readonly key: { readonly colour: string; readonly intensity: number; readonly from: readonly [number, number, number]; readonly to: readonly [number, number, number]; readonly box: number }
  readonly hemi: { readonly sky: string; readonly ground: string; readonly intensity: number }
  readonly fog: { readonly colour: string; readonly density: number } | null
  /** The sky's gradient, top to horizon, or one colour. */
  readonly sky: readonly string[]
  readonly exposure: number
  /** The scene's grade over the post defaults. */
  readonly post: Partial<PostSettings>
  /** The characters' rim, from the key's side in screen space. */
  readonly rim: { readonly strength: number; readonly dir: readonly [number, number]; readonly colour: string }
}

export interface LookScene {
  readonly id: string
  readonly title: string
  readonly root: Group
  readonly figures: readonly Mesh[]
  readonly light: SceneLight
  readonly cameras: Readonly<Record<CameraName, CameraPreset>>
  /** The switchable life layers it has. */
  readonly layers: { readonly petals?: Object3D; readonly embers?: Object3D; readonly shafts?: Object3D; readonly dust?: Object3D }
  update(t: number, dt: number, camera: Camera): void
  dispose(): void
}

/** The camera's place for a preset's target and view: on a sphere about the target. */
export function orbit(target: readonly [number, number, number], view: { elevation: number; azimuth: number; distance: number }): [number, number, number] {
  const e = (view.elevation * Math.PI) / 180, a = (view.azimuth * Math.PI) / 180
  return [target[0] + view.distance * Math.cos(e) * Math.sin(a), target[1] + view.distance * Math.sin(e), target[2] + view.distance * Math.cos(e) * Math.cos(a)]
}
