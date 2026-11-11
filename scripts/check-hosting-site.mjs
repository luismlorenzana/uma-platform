// Every Hosting deploy names its site (the cloud plan's IN7, IN15): the uma-rpg project hosts four apps, so an unnamed
// deploy could land on another app's site. firebase.json's `hosting.site`, the workflow's HOSTING_SITE default and its
// `--only hosting:<site>` must all agree. Copied from uma-quest at 47ca16d (from uma-rpg's H169), for deploy-app.yml.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/** Returns the problems found, or an empty list. */
export function checkHostingSite(firebaseJson, workflow) {
  const problems = []
  const hosting = firebaseJson?.hosting
  const site = Array.isArray(hosting) ? undefined : hosting?.site
  if (!site) problems.push('firebase.json must hold one hosting config with a site')
  const fallback = /HOSTING_SITE:\s*\$\{\{\s*vars\.HOSTING_SITE\s*\|\|\s*'([^']+)'\s*\}\}/.exec(workflow)?.[1]
  if (fallback !== site) problems.push(`the workflow's HOSTING_SITE default is ${fallback ?? '(none)'}, not ${site}`)
  const deploys = [...workflow.matchAll(/firebase-tools@[^\s]+\s+deploy\b([^\n]*)/g)].map((m) => m[1])
  if (deploys.length === 0) problems.push('the workflow has no firebase-tools deploy step')
  for (const args of deploys) {
    const only = args.match(/--only\s+(\S+)/)?.[1]
    if (only !== `hosting:${site}`) problems.push(`a deploy runs with --only ${only ?? '(none)'}, not hosting:${site}`)
  }
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('..', import.meta.url)
  const problems = checkHostingSite(JSON.parse(await readFile(new URL('firebase.json', root), 'utf8')),
    await readFile(new URL('.github/workflows/deploy-app.yml', root), 'utf8'))
  for (const p of problems) console.error(`check-hosting-site: ${p}`)
  process.exit(problems.length ? 1 : 0)
}
