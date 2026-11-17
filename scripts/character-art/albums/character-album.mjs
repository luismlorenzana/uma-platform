// Compatibility for existing local study scripts.
import { loadArtModule } from '../preview-paths.mjs'

export const { renderCharacterAlbum } = await loadArtModule('albums/character-album.mjs')
