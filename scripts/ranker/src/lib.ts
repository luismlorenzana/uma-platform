// Shared by the Ranker's scripts: where things are on this Mac, the local release as a release source, the scoped
// gcloud, and the pure step that turns the old boards into the Ranker's first files (RK1, P131).
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReleaseClient, ReleaseSourceError, type ReleaseSource } from '@luismlorenzana/uma-data'
import {
  BOARDS, buildCatalog, emptyBoard, emptyLegacy, enemyImagePaths, legacyCharacterTiers, migrateUmasBoard, parseBoard, parseProfiles, profileProblems, profilesFromLegacy,
  tierPlan, type BoardId, type BoardState, type BoardStates, type CatalogInput, type LegacyHints, type LegacyUmasBoard, type TierCatalog, type UmaProfiles,
} from '@uma-platform/tiers'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const content = resolve(process.env.UMA_CONTENT_DIR ?? resolve(root, 'content'))
/** The local copy of the bucket's `ranker/` folder (AP17): the dev API reads it, push and pull move it. */
export const mirror = resolve(content, 'authoring/ranker')
export const BUCKET = process.env.CONTENT_BUCKET ?? 'uma-platform-content'
export const REMOTE = `gs://${BUCKET}/ranker`

/** How to start gcloud on this platform. On Windows gcloud is `gcloud.cmd`, which Node only runs through the shell, so
 *  every argument is quoted for cmd.exe (none of ours holds a quote). Elsewhere it runs directly. */
export function gcloudCommand(args: string[], platform: NodeJS.Platform = process.platform): { file: string; args: string[]; shell: boolean } {
  if (platform !== 'win32') return { file: 'gcloud', args, shell: false }
  if (args.some((a) => a.includes('"'))) throw new Error('A gcloud argument with a quote cannot be passed through cmd.exe.')
  return { file: 'gcloud.cmd', args: args.map((a) => `"${a}"`), shell: true }
}

/** gcloud storage, scoped to the owner's default configuration and the games' project; never `config set`. */
export function gcloud(args: string[], options: { allowFail?: boolean } = {}): string {
  try {
    const command = gcloudCommand(['storage', ...args])
    return execFileSync(command.file, command.args, {
      env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: process.env.CLOUDSDK_CORE_PROJECT ?? 'uma-rpg' },
      stdio: ['ignore', 'pipe', options.allowFail ? 'pipe' : 'inherit'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: command.shell,
    })
  } catch (error) {
    if (options.allowFail) return ''
    throw error
  }
}

/** `content/release` read like the bucket: files at their manifest paths, the `latest` channel made from the manifest. */
export function localRelease(dir = resolve(content, 'release')): ReleaseSource {
  return {
    async read(path) {
      const file = path.startsWith('files/') ? path.slice('files/'.length) : path.startsWith('manifests/') ? 'manifest.json' : path
      if (path.startsWith('channels/')) {
        const m = JSON.parse(await readFile(resolve(dir, 'manifest.json'), 'utf8')) as { version: string; schemaMajor: number; createdAt: string }
        return new TextEncoder().encode(JSON.stringify({ schemaMajor: m.schemaMajor, channel: 'latest', version: m.version, manifest: `manifests/v${m.schemaMajor}/${m.version}.json`, updatedAt: m.createdAt }))
      }
      try { return new Uint8Array(await readFile(resolve(dir, file))) } catch { throw new ReleaseSourceError(path, 404, `Missing ${path} in ${dir}`) }
    },
  }
}

export async function releaseInputs(source: ReleaseSource): Promise<Pick<CatalogInput, 'release' | 'characters' | 'outfits' | 'art'>> {
  const client = createReleaseClient({ source }), manifest = await client.manifest()
  const [characters, outfits, art] = await Promise.all([client.set(manifest, 'characters'), client.set(manifest, 'outfits'), client.art(manifest)])
  return { release: manifest.version, characters, outfits, art }
}

/** The old files the seed reads, already parsed. */
export interface SeedInputs {
  release: Pick<CatalogInput, 'release' | 'characters' | 'outfits' | 'art'>
  enemies: CatalogInput['enemies']
  imports: CatalogInput['imports']
  /** The old boards (`content/authoring/tiers/<board>.json`), raw: Playable Umas is still per character. */
  oldBoards: Partial<Record<BoardId, unknown>>
  oldUmas: LegacyUmasBoard | null
  /** The old rosters, for the cards' hints. */
  outfitRoster: LegacyHints['outfits']
  enemyRoster: LegacyHints['enemies']
  /** Claude's authored profiles (the sisters, and picks like the main Taiki's outfit), if written. */
  authored: UmaProfiles | null
  now: string
}
export interface SeedOutput {
  catalog: TierCatalog
  boards: BoardStates
  profiles: UmaProfiles
  legacy: LegacyHints
  plan: ReturnType<typeof tierPlan>
  /** Pack paths (`assets/enemies/…`) the catalog shows: the files to copy. */
  images: string[]
  /** Old default-outfit picks dropped because the outfit is now a sister's: `<characterId>:<outfitId>`. */
  dropped: string[]
}

/**
 * The Ranker's first files from the old ones (P131): every lettered board as it is; Playable Umas per outfit, the old cast
 * spread over the ten tiers; the old picks and Claude's sisters in the profiles (an authored entry wins).
 */
export function seedMirror(input: SeedInputs): SeedOutput {
  const characters = input.oldUmas ? legacyCharacterTiers(input.oldUmas) : []
  const legacy: LegacyHints = { ...emptyLegacy(), outfits: input.outfitRoster, characters, enemies: input.enemyRoster }
  const catalog = buildCatalog({ ...input.release, enemies: input.enemies, imports: input.imports, legacy })
  const authored = input.authored ?? { schemaVersion: 1 as const, kind: 'uma-profiles' as const, revision: 0, updatedAt: null, characters: {}, sisters: [] }
  const merged = input.oldUmas ? profilesFromLegacy(input.oldUmas, { ...authored, characters: {} }) : authored
  const profiles: UmaProfiles = { ...authored, characters: { ...merged.characters, ...authored.characters }, revision: Math.max(1, authored.revision), updatedAt: authored.updatedAt ?? input.now }
  // An old default-outfit pick that is now a sister's outfit (or no longer hers) is dropped, and said; a sister that
  // doesn't fit is an authoring mistake, and stops the seed.
  const sisterProblems = profileProblems({ ...profiles, characters: {} }, catalog)
  if (sisterProblems.length) throw new Error(`The sisters don't fit the catalog: ${sisterProblems.join(' ')}`)
  const dropped: string[] = []
  for (const [id, pick] of Object.entries(profiles.characters)) {
    if (pick.defaultOutfit !== undefined && profileProblems({ ...profiles, characters: { [id]: pick } }, catalog).length) {
      dropped.push(`${id}:${pick.defaultOutfit}`)
      const { defaultOutfit: _, ...rest } = pick
      if (Object.keys(rest).length) profiles.characters[id] = rest
      else delete profiles.characters[id]
    }
  }
  const boards = Object.fromEntries(BOARDS.map((b): [BoardId, BoardState] => {
    if (b.id === 'umas') return [b.id, input.oldUmas ? migrateUmasBoard(catalog, input.oldUmas, profiles, input.now) : emptyBoard('umas')]
    const raw = input.oldBoards[b.id]
    return [b.id, raw === undefined ? emptyBoard(b.id) : parseBoard(raw, b.id)]
  })) as BoardStates
  return { catalog, boards, profiles, legacy, plan: tierPlan(catalog, boards, profiles, input.now), images: [...enemyImagePaths(catalog)].sort(), dropped }
}

export const parseAuthored = (value: unknown): UmaProfiles => parseProfiles(value)
