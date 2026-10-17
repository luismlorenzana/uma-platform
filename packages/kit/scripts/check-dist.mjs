// Every entry must load in plain Node ESM, the way a game's Vitest loads its dependencies: relative imports in `dist`
// carry their `.js` (0.1.1). Phaser stays out, behind the Hub scene's lazy import.
for (const entry of ['ui', 'shell', 'hub', 'roster']) await import(`@luismlorenzana/uma-kit/${entry}`)
