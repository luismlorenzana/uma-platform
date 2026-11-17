// Compatibility for existing local study scripts.
import { loadArtModule } from '../preview-paths.mjs'

export const { renderApprovedAlbum, renderPortraitsPage, renderSplashPage, renderUniverseAlbums } = await loadArtModule('albums/universe-album.mjs')
