// The sub-apps (AP1): each opens at /<id> from its own folder, src/apps/<id>/, with its API under /api/<id>/…, and
// imports nothing from another sub-app's folder (checked by scripts/check-sub-apps.test.mjs). Home draws a tile for each
// one registered here, with the numbers its summary returns (AP4). The Ranker (RK1) and Character Art (CA1) come next.
import type { ComponentType } from 'react'

export interface SummaryLine {
  readonly label: string
  readonly value: string
}

export interface SubApp {
  /** Its route and API prefix: /<id> and /api/<id>/…; lowercase words joined by hyphens. */
  readonly id: string
  readonly title: string
  /** One line under the title on its tile. */
  readonly blurb: string
  /** Its screen, loaded on first visit. */
  readonly load: () => Promise<{ default: ComponentType }>
  /** A few live numbers for its tile, from its own API. */
  readonly summary?: () => Promise<readonly SummaryLine[]>
}

const ID = /^[a-z]+(-[a-z]+)*$/

/** Refuses a registry with a malformed or repeated id, so two sub-apps can never share a route. */
export function checkRegistry(apps: readonly SubApp[]): readonly SubApp[] {
  const seen = new Set<string>()
  for (const app of apps) {
    if (!ID.test(app.id)) throw new Error(`Sub-app id "${app.id}" must be lowercase words joined by hyphens`)
    if (seen.has(app.id)) throw new Error(`Sub-app id "${app.id}" is registered twice`)
    seen.add(app.id)
  }
  return apps
}

export const SUB_APPS: readonly SubApp[] = checkRegistry([])
