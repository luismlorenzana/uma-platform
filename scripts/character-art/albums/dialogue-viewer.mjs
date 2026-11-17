// Compatibility for existing local study scripts.
import { loadArtModule } from '../preview-paths.mjs'

export const { renderDialogueViewer, numberWord } = await loadArtModule('albums/dialogue-viewer.mjs')
