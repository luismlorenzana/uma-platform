// The kits the world is built from (uma-quest Q5's format, Q37): a game hands in a parsed kit and its page's URL, loaded
// once as a texture, nearest filtering, no mipmaps, at one texel a device pixel like the sprites. Until a page loads, or
// if it can't, a kind's stand-in drawn in code stands in. Which kits a game uses is its own content (uma-platform ST1).
import { CanvasTexture, NearestFilter, SRGBColorSpace, TextureLoader, type Texture } from 'three'
import { kitMissing, type KitAtlas } from '../formats/index.js'
import { drawStandInKit, standInKitAtlas } from './standInKit.js'

export type KitKind = 'biome' | 'town'
export interface LoadedKit { kit: KitAtlas; page: Texture }

/** A kit's atlas, checked: a kit missing any role the builder needs is refused here, never drawn half. */
export function checkedKit(kit: KitAtlas, name: string): KitAtlas {
  const missing = kitMissing(kit)
  if (missing.length) throw new Error(`${name} is missing ${missing.join(', ')}`)
  return kit
}

const pixel = <T extends Texture>(page: T): T => {
  page.magFilter = NearestFilter
  page.minFilter = NearestFilter
  page.generateMipmaps = false
  page.colorSpace = SRGBColorSpace
  return page
}

/** A kind's stand-in, drawn in code (Q5): the town until Q15, and the forest while its art loads or if it can't. */
export function standInKit(kind: KitKind): LoadedKit {
  const kit = standInKitAtlas(kind)
  return { kit, page: pixel(new CanvasTexture(drawStandInKit(kit))) }
}

const loaded = new Map<KitKind, LoadedKit>()
const pending = new Map<KitKind, Promise<LoadedKit>>()

/** A kind's kit page, loaded once; a page that fails to load leaves the stand-in in place. */
export function loadKitPage(kind: KitKind, kit: KitAtlas, url: string): Promise<LoadedKit | null> {
  let page = pending.get(kind)
  if (!page) {
    page = new TextureLoader().loadAsync(url).then((texture) => {
      const made = { kit, page: pixel(texture) }
      loaded.set(kind, made)
      return made
    })
    pending.set(kind, page)
  }
  return page.catch(() => null)
}

/** The kit already loaded for a kind, or null (a fight builds its battle set from it, else the stand-in). */
export const loadedKit = (kind: KitKind): LoadedKit | null => loaded.get(kind) ?? null
