// Every entry must load in plain Node ESM, the way a game's Vitest loads its dependencies: relative imports in `dist`
// carry their `.js` (0.1.1). Phaser stays out, behind the Hub scene's lazy import, and Firebase behind `/auth`'s.
import { readdirSync, readFileSync } from 'node:fs'

for (const entry of ['ui', 'shell', 'hub', 'roster', 'auth', 'places']) await import(`@luismlorenzana/uma-kit/${entry}`)

// `/auth` may name `firebase` only in `import()`: a static import would put the SDK in every game's startup bundle.
const auth = new URL('../dist/auth/', import.meta.url)
for (const file of readdirSync(auth).filter((name) => name.endsWith('.js'))) {
  const code = readFileSync(new URL(file, auth), 'utf8')
  if (/(?:^|[\s;])(?:import|export)\b[^()]*?\bfrom\s*['"]firebase/m.test(code) || /^\s*import\s*['"]firebase/m.test(code)) {
    throw new Error(`dist/auth/${file} imports firebase statically`)
  }
}
// Nor may `/places`: it takes auth as a value.
const places = new URL('../dist/places/', import.meta.url)
for (const file of readdirSync(places).filter((name) => name.endsWith('.js'))) {
  if (readFileSync(new URL(file, places), 'utf8').includes('firebase')) throw new Error(`dist/places/${file} names firebase`)
}
