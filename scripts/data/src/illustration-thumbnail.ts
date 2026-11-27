import type { Illustration } from '@luismlorenzana/uma-data'
import sharp from 'sharp'
import type { PutPicture } from './character-family-release'

export async function writeIllustrationThumbnail(put: PutPicture, stem: string, fullSize: Uint8Array): Promise<NonNullable<Illustration['thumbnail']>> {
  const { data, info } = await sharp(fullSize)
    .resize({ width: 320, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
  const file = await put(`${stem}-thumb`, data)
  return { ...file, width: info.width, height: info.height }
}
