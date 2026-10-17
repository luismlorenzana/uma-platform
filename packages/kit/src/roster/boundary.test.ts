import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const forbidden = /\b(?:from|import)\s*\(?\s*['"](?:react(?:-dom)?|motion|phaser)(?:\/[^'"]*)?['"]/

describe('roster package boundary', () => {
  it('keeps every production module free of React, Motion and Phaser imports', () => {
    const files = readdirSync(new URL('.', import.meta.url)).filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
    )
    const offenders = files.filter((file) => forbidden.test(readFileSync(new URL(file, import.meta.url), 'utf8')))
    expect(offenders).toEqual([])
  })
})
