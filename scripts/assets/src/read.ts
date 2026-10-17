// Reads the master sets the asset pipeline needs from the local release, verified against the manifest
// (ported from uma-racer's pack reader), plus the private scenario-crest override.

import type { Outfit, ReleaseManifest, Scenario, Skill, SupportCard } from '@luismlorenzana/uma-data'
import { OVERRIDES_DIR, readLocalManifest, readLocalSet } from '@uma-platform/data-pipeline/release-dir'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface AssetInputs {
  manifest: ReleaseManifest
  outfits: Outfit[]
  supportCards: SupportCard[]
  skills: Skill[]
  scenarios: Scenario[]
}

export async function readAssetInputs(releaseDir: string): Promise<AssetInputs> {
  const manifest = await readLocalManifest(releaseDir)
  if (!manifest) throw new Error('No local release; run pnpm data:import first')
  const [outfits, supportCards, skills, scenarios] = await Promise.all([
    readLocalSet(releaseDir, manifest, 'outfits'),
    readLocalSet(releaseDir, manifest, 'support-cards'),
    readLocalSet(releaseDir, manifest, 'skills'),
    readLocalSet(releaseDir, manifest, 'scenarios'),
  ])
  return { manifest, outfits, supportCards, skills, scenarios }
}

/**
 * Optional private crest sources, `content/overrides/scenario-icons.json`: `{ "icons": { "<scenarioId>": "https://…" } }`.
 * Without it, crests come from the URL derived from each scenario id.
 */
export async function readScenarioIconOverrides(
  scenarios: readonly Scenario[],
  path = resolve(OVERRIDES_DIR, 'scenario-icons.json'),
): Promise<Map<number, string>> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch {
    return new Map()
  }
  const icons = (JSON.parse(raw) as { icons?: unknown } | null)?.icons
  if (!icons || typeof icons !== 'object' || Array.isArray(icons)) throw new Error('scenario-icons.json must hold an "icons" object')
  const known = new Set(scenarios.map((scenario) => scenario.id))
  const overrides = new Map<number, string>()
  for (const [key, url] of Object.entries(icons as Record<string, unknown>)) {
    const id = Number(key)
    if (!Number.isSafeInteger(id) || !known.has(id)) throw new Error(`scenario-icons.json names an unknown scenario id: ${key}`)
    if (typeof url !== 'string' || !/^https:\/\//.test(url)) throw new Error(`scenario-icons.json has an invalid source for ${key}`)
    overrides.set(id, url)
  }
  return overrides
}

type CropOverrides = Record<string, { cx?: number; top?: number; size?: number }>

async function readCropOverrides(path: string, filename: string): Promise<CropOverrides> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch {
    return {}
  }
  const parsed = JSON.parse(raw) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error(`${filename} must be an object`)
  for (const [id, crop] of Object.entries(parsed as Record<string, unknown>)) {
    const values = typeof crop === 'object' && crop !== null ? crop as Record<string, unknown> : {}
    if (typeof crop !== 'object' || crop === null || Array.isArray(crop) || Object.keys(values).some((key) => !['cx', 'top', 'size'].includes(key)) ||
      Object.values(values).some((value) => typeof value !== 'number' || !(value >= 0 && value <= 1))) {
      throw new Error(`${filename} has an invalid crop for ${id}`)
    }
  }
  return parsed as CropOverrides
}

/** Optional private bust pins: `{ "<outfitId>": { "cx": 0.5, "top": 0.02, "size": 0.6 } }`. */
export async function readBustCrops(path = resolve(OVERRIDES_DIR, 'bust-crops.json')): Promise<CropOverrides> {
  return readCropOverrides(path, 'bust-crops.json')
}

/** Optional private face pins, with the same shape as bust pins. */
export async function readFaceCrops(path = resolve(OVERRIDES_DIR, 'face-crops.json')): Promise<CropOverrides> {
  return readCropOverrides(path, 'face-crops.json')
}
