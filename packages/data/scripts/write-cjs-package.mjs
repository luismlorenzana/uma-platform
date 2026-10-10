// Marks dist/cjs as CommonJS so Node and TypeScript read its .js and .d.ts files as such (the package is ESM).
import { writeFileSync } from 'node:fs'
writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{ "type": "commonjs" }\n')
