// Per-record WebP art, ported from uma-racer: one image per entry, fetched on demand by games rather than atlased.
// Atlases stay for the dense icon grids.

import sharp from 'sharp'
import { downloadImages, type DownloadFailure, type DownloadedImage, type ImageSource } from './download'

export type ArtFamily = 'outfit-portraits' | 'outfit-busts' | 'outfit-faces' | 'support-card-art'

export interface ArtFamilyConfig {
  family: ArtFamily
  /** Longest edge after normalization. */
  maxSize: number
  quality: number
  /** Portraits keep their cut-out; card art is a full opaque illustration. */
  alpha: boolean
  /** The download cache it reads: busts are cut from the portrait sources, never fetched twice. */
  source: 'outfit-portraits' | 'support-card-art'
}

export const ART_FAMILIES: Record<ArtFamily, ArtFamilyConfig> = {
  'outfit-portraits': { family: 'outfit-portraits', maxSize: 512, quality: 82, alpha: true, source: 'outfit-portraits' },
  'support-card-art': { family: 'support-card-art', maxSize: 600, quality: 80, alpha: false, source: 'support-card-art' },
  // Head-and-shoulders tiles for lists, like the original's Trainee Select.
  'outfit-busts': { family: 'outfit-busts', maxSize: 256, quality: 82, alpha: true, source: 'outfit-portraits' },
  // Face-and-ears tiles for dense lists, pickers, workers, pips and seats.
  'outfit-faces': { family: 'outfit-faces', maxSize: 192, quality: 82, alpha: true, source: 'outfit-portraits' },
}

export interface ArtImage {
  id: string
  bytes: Buffer
  width: number
  height: number
}

/** Where a bust sits in its portrait, as shares of the portrait's width (`cx`, `size`) and height (`top`). */
export interface BustCrop {
  cx: number
  top: number
  size: number
}

/** Busts start near the top so ears stay in, and take 60% of the frame: head and shoulders, as the original's tiles. */
export const BUST_DEFAULTS = { top: 0.02, size: 0.6 } as const
/** A face uses most of its bust crop: ears and chin keep air around them, while the torso stays out. */
export const FACE_DEFAULTS = { topInBust: 0, sizeInBust: 0.85 } as const
/** Rows where a stand portrait's face sits; arms and props mostly fall below it. */
const HEAD_BAND = [0.15, 0.4] as const

/**
 * The square to cut a bust from: centred on the horizontal centroid of opaque pixels in the head band, clamped inside
 * the portrait. `override` pins any part of it for the few portraits the centroid misreads.
 */
export function bustCrop(
  rgba: Uint8Array,
  width: number,
  height: number,
  override: Partial<BustCrop> = {},
): { left: number; top: number; size: number } {
  let sum = 0
  let count = 0
  for (let y = Math.round(height * HEAD_BAND[0]); y < Math.round(height * HEAD_BAND[1]); y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3]! > 128) {
        sum += x
        count += 1
      }
    }
  }
  const cx = override.cx !== undefined ? override.cx * width : count > 0 ? sum / count : width / 2
  const size = Math.round(Math.min(width, height) * (override.size ?? BUST_DEFAULTS.size))
  const left = Math.max(0, Math.min(width - size, Math.round(cx - size / 2)))
  const top = Math.max(0, Math.min(height - size, Math.round(height * (override.top ?? BUST_DEFAULTS.top))))
  return { left, top, size }
}

/**
 * The square to cut a face from. Its default is derived from the outfit's bust crop; a private face override may pin
 * any part directly as a share of the source portrait, with the same shape as a bust override.
 */
export function faceCrop(
  rgba: Uint8Array,
  width: number,
  height: number,
  bustOverride: Partial<BustCrop> = {},
  faceOverride: Partial<BustCrop> = {},
): { left: number; top: number; size: number } {
  const bust = bustCrop(rgba, width, height, bustOverride)
  const defaultSize = Math.round(bust.size * FACE_DEFAULTS.sizeInBust)
  const size = Math.max(1, Math.round(
    faceOverride.size === undefined ? defaultSize : Math.min(width, height) * faceOverride.size,
  ))
  const defaultCx = bust.left + bust.size / 2
  const cx = faceOverride.cx === undefined ? defaultCx : faceOverride.cx * width
  const defaultTop = bust.top + Math.round(bust.size * FACE_DEFAULTS.topInBust)
  const top = faceOverride.top === undefined ? defaultTop : Math.round(height * faceOverride.top)
  return {
    left: Math.max(0, Math.min(width - size, Math.round(cx - size / 2))),
    top: Math.max(0, Math.min(height - size, top)),
    size: Math.min(size, width, height),
  }
}

/** Cuts and encodes one bust from a portrait source. */
export async function encodeBust(config: ArtFamilyConfig, image: DownloadedImage, override?: Partial<BustCrop>): Promise<ArtImage> {
  const { data, info } = await sharp(image.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const box = bustCrop(data, info.width, info.height, override)
  const { data: bytes, info: encoded } = await sharp(image.bytes)
    .extract({ left: box.left, top: box.top, width: box.size, height: box.size })
    .resize({ width: config.maxSize, height: config.maxSize, withoutEnlargement: true })
    .webp({ quality: config.quality, alphaQuality: 90, effort: 5 })
    .toBuffer({ resolveWithObject: true })
  return { id: image.id, bytes, width: encoded.width, height: encoded.height }
}

/** Cuts and encodes one face from the same portrait source as its bust. */
export async function encodeFace(
  config: ArtFamilyConfig,
  image: DownloadedImage,
  bustOverride?: Partial<BustCrop>,
  faceOverride?: Partial<BustCrop>,
): Promise<ArtImage> {
  const { data, info } = await sharp(image.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const box = faceCrop(data, info.width, info.height, bustOverride, faceOverride)
  const { data: bytes, info: encoded } = await sharp(image.bytes)
    .extract({ left: box.left, top: box.top, width: box.size, height: box.size })
    .resize({ width: config.maxSize, height: config.maxSize, withoutEnlargement: true })
    .webp({ quality: config.quality, alphaQuality: 90, effort: 5 })
    .toBuffer({ resolveWithObject: true })
  return { id: image.id, bytes, width: encoded.width, height: encoded.height }
}

/** Normalizes one source image to the family's size and encoding without cropping it. */
export async function encodeArt(config: ArtFamilyConfig, image: DownloadedImage): Promise<ArtImage> {
  const pipeline = sharp(image.bytes).resize({
    width: config.maxSize,
    height: config.maxSize,
    fit: 'inside',
    withoutEnlargement: true,
  })
  const encoded = config.alpha
    ? pipeline.webp({ quality: config.quality, alphaQuality: 90, effort: 5 })
    : pipeline.flatten({ background: '#ffffff' }).webp({ quality: config.quality, effort: 5 })
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true })
  return { id: image.id, bytes: data, width: info.width, height: info.height }
}

export interface BuildArtOptions {
  cacheDir: string
  /** Bust crop pins by outfit id (`content/overrides/bust-crops.json`). */
  bustCrops?: Readonly<Record<string, Partial<BustCrop>>>
  /** Face crop pins by outfit id (`content/overrides/face-crops.json`). */
  faceCrops?: Readonly<Record<string, Partial<BustCrop>>>
  refresh?: boolean
  concurrency?: number
  fetcher?: typeof fetch
  onProgress?: (done: number, total: number) => void
}

export interface BuiltArtFamily {
  config: ArtFamilyConfig
  images: ArtImage[]
  cacheHits: number
  bytes: number
  /** Entries whose source art doesn't exist; games fall back to their icon. */
  skipped: DownloadFailure[]
}

/** `sources` are the family's source URLs (for busts, the portrait sources). */
export async function buildArtFamily(
  family: ArtFamily,
  sources: readonly ImageSource[],
  options: BuildArtOptions,
): Promise<BuiltArtFamily> {
  const config = ART_FAMILIES[family]
  const downloaded = await downloadImages(sources, {
    cacheDir: options.cacheDir,
    kind: config.source,
    refresh: options.refresh,
    concurrency: options.concurrency ?? 6,
    fetcher: options.fetcher,
    optional: true,
  })
  const images: ArtImage[] = []
  for (const image of downloaded.images) {
    images.push(config.family === 'outfit-busts'
      ? await encodeBust(config, image, options.bustCrops?.[image.id])
      : config.family === 'outfit-faces'
        ? await encodeFace(config, image, options.bustCrops?.[image.id], options.faceCrops?.[image.id])
        : await encodeArt(config, image))
    options.onProgress?.(images.length, downloaded.images.length)
  }
  return {
    config,
    images,
    cacheHits: downloaded.images.filter((image) => image.cacheHit).length,
    bytes: images.reduce((sum, image) => sum + image.bytes.length, 0),
    skipped: downloaded.failures,
  }
}
