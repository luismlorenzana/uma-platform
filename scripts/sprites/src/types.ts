import type { SpriteBounds, SpriteBox, SpritePoint } from '@luismlorenzana/uma-data'

export interface NativeFrame {
  file: string; ms?: number | null; headLocked: boolean; headOffset?: SpritePoint
  grip?: SpritePoint & { angle: number }; off?: SpritePoint; cast?: SpritePoint
  hold: string; air?: boolean; hit: SpritePoint; bounds?: SpriteBounds; handOcclusion?: SpriteBox; view?: string
}
export interface NativeAction {
  loop: boolean; events: Record<string, number | number[]>; frames: NativeFrame[]
  [key: string]: unknown
}
export interface NativeFace extends SpriteBox { file: string }
export interface NativeAtlas {
  id: number; revision: number; profile: string; cell: number; logicalCell: number
  foot: SpritePoint; hit: SpritePoint; headBox: SpriteBox; faceBox: SpriteBox
  approvedKey: string; faces: Record<string, NativeFace>; actions: Record<string, NativeAction>
  [key: string]: unknown
}
export interface Gate {
  decision: 'approved' | 'changes' | null; at?: string; note?: string; hashes?: Record<string, string>
  preservedBattle?: { revision: number; hashes: Record<string, string> }
  [key: string]: unknown
}
export interface Reviews { schemaVersion: number; outfits: Record<string, Record<string, { key: Gate; set: Gate }>> }
export interface Pixels { data: Buffer; width: number; height: number }
export interface Recipe {
  source: string; sha256: string
  literal?: string
  crop?: { left: number; top: number; width: number; height: number }
  pad?: { width: number; height: number }
  binary?: boolean
  resize?: { width: number; height: number }
  threshold?: number
  translate?: { x: number; y: number }
  breathe?: { dy: number; below: number }
  cleanup?: 'all-alpha' | 'opaque-haze'
  lock?: { source: string; box: SpriteBox; offset: SpritePoint; opaqueOnly?: boolean }
  extract?: { left: number; top: number; width: number; height: number }
}
export interface ExportConfig {
  schemaVersion: 2
  atlasText: string
  outputs: Record<string, Recipe>
  handPalette: 'skin' | 'glove'
  facingScales?: Record<string, { sx: number; sy: number }[]>
}
export function runtimeFiles(a: NativeAtlas): string[] {
  return [...new Set([a.approvedKey, ...Object.values(a.actions).flatMap(v => v.frames.map(f => f.file)), ...Object.values(a.faces).map(f => f.file), 'atlas.json'])]
}
export function keyFiles(a: NativeAtlas): string[] {
  return [...new Set([a.approvedKey, ...(a.actions.turnaround?.frames.map(f => f.file) ?? []), 'identity.md'])]
}
