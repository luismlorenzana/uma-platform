// The pixel art the kit draws with, handed in by each game (P48): uma-art's atlases are imported by the game's bundler
// (`?url` and the JSON index), so the kit never imports image files itself.
import { createContext, useContext, type ReactNode } from 'react'

export interface AtlasFrame {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** Buildings only: where chimney smoke rises, in the frame's art pixels. */
  readonly smoke?: { readonly x: number; readonly y: number }
}
export interface AtlasIndex {
  readonly width: number
  readonly height: number
  readonly frames: Readonly<Record<string, AtlasFrame>>
}
export interface Atlas {
  readonly url: string
  readonly index: AtlasIndex
}
/** uma-art's `ui` (marks), `tiles` and `buildings` atlases. Any may be missing; what needs it falls back. */
export interface KitArt {
  readonly ui?: Atlas
  readonly tiles?: Atlas
  readonly buildings?: Atlas
}

const ArtContext = createContext<KitArt>({})

export function KitArtProvider({ art, children }: { art: KitArt; children: ReactNode }) {
  return <ArtContext.Provider value={art}>{children}</ArtContext.Provider>
}

export const useKitArt = (): KitArt => useContext(ArtContext)
