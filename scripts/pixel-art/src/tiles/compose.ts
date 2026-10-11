// Lays tiles out the way the game will: ground variants by a seeded hash, autotile masks from each cell's neighbours.
import { E, N, S, W } from './autotile.ts'
import { Img } from './image.ts'
import { hash2, seedOf, TILE } from './noise.ts'

/** The autotile mask of cell (x, y): which of its four neighbours are on the same network. */
export function maskAt(on: (x: number, y: number) => boolean, x: number, y: number): number {
  return (on(x, y - 1) ? N : 0) | (on(x + 1, y) ? E : 0) | (on(x, y + 1) ? S : 0) | (on(x - 1, y) ? W : 0)
}

/** Ground variant for a cell: mostly the calm base (0, 1), now and then a detail tile (2, 3). */
export function variantAt(label: string, x: number, y: number): number {
  const h = hash2(x, y, seedOf(label))
  return h < 0.5 ? 0 : h < 0.8 ? 1 : h < 0.9 ? 2 : 3
}

export interface Layer {
  /** Cells on this network (path, water). */
  on: (x: number, y: number) => boolean
  tiles: readonly Img[]
}

/** A cols × rows map at 1×: ground everywhere, then each layer's autotiles where it is on. */
export function composeMap(label: string, cols: number, rows: number, ground: readonly Img[], layers: readonly Layer[]): Img {
  const out = new Img(cols * TILE, rows * TILE)
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const layer = layers.find((l) => l.on(x, y))
      const tile = layer ? layer.tiles[maskAt(layer.on, x, y)] : ground[variantAt(label, x, y)]
      if (tile) out.copy(tile, x * TILE, y * TILE)
    }
  return out
}
