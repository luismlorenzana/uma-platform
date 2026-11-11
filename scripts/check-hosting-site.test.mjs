import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { checkHostingSite } from './check-hosting-site.mjs'

const wf = (fallback, only) => 'env:\n  HOSTING_SITE: $' + `{{ vars.HOSTING_SITE || '${fallback}' }}\n` +
  `      - run: pnpm dlx firebase-tools@15.22.4 deploy ${only} --non-interactive\n`
const fb = (site) => ({ hosting: { site } })

test('passes when all three name the same site', () => assert.deepEqual(checkHostingSite(fb('uma-platform'), wf('uma-platform', '--only hosting:uma-platform')), []))
test('fails when firebase.json names no site', () => assert.ok(checkHostingSite({ hosting: {} }, wf('uma-platform', '--only hosting:uma-platform')).length > 0))
test('fails when the default differs', () => assert.equal(checkHostingSite(fb('uma-platform'), wf('uma-rpg', '--only hosting:uma-platform')).length, 1))
test('fails when the deploy is unnamed or names another site', () => {
  assert.equal(checkHostingSite(fb('uma-platform'), wf('uma-platform', '--only hosting')).length, 1)
  assert.equal(checkHostingSite(fb('uma-platform'), wf('uma-platform', '--only hosting:uma-rpg')).length, 1)
})
test("the repo's own firebase.json and workflow agree", async () => {
  const root = new URL('..', import.meta.url)
  assert.deepEqual(checkHostingSite(JSON.parse(await readFile(new URL('firebase.json', root), 'utf8')),
    await readFile(new URL('.github/workflows/deploy-app.yml', root), 'utf8')), [])
})
