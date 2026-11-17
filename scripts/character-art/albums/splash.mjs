// Compatibility for existing local study scripts.
import { loadArtModule } from '../preview-paths.mjs'

export const { renderSplashContent, installSplashSection, standalonePage } = await loadArtModule('albums/splash.mjs')
