// The Hub's shapes (P48): what a game tells the kit about its pages and places. The places and pages themselves stay in
// each game; these are only their shapes.
import type { Palette } from './palettes.js'

/** Where a place stands on its page, as fractions of the map's width and height (its building's ground line). */
export interface PlaceAt {
  readonly x: number
  readonly y: number
}

/** A spot kept free of props without a building, `r` columns either side (2 by default): a plaza where Umas stand. */
export interface Clearing extends PlaceAt {
  readonly r?: number
}

/** A place as the map draws it: where it stands and which building frame it is. */
export interface MapPlace {
  readonly id: string
  /** The uma-art `buildings` frame, or another place's while it has none. */
  readonly frame: string
  readonly at: PlaceAt
}

/** One Hub page's ground: which uma-art tile page, its palette and props, and a stream if it has one. */
export interface PageGround {
  /** The page id, which seeds its layout. */
  readonly id: string
  /** The uma-art tile page: `town`, `learning`, `wilds`, `farmlands`, `racing`, `battle` … */
  readonly tiles: string
  readonly palette: Palette
  /** Props scattered on free ground; tall ones are 16 × 32. Defaults to `TILE_PROPS[tiles]`. */
  readonly props?: readonly TileProp[]
  /** A stream down the east edge, clear of every building (uma-rpg's Wilds). */
  readonly stream?: boolean
}

export interface TileProp {
  readonly id: string
  readonly tall: boolean
}
