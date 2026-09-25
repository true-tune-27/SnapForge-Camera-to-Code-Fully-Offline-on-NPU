import { describe, it, expect } from 'vitest'

// Component indexer tests live in src/index/components.test.ts
// This file validates the ground-truth index.sfx exists
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('Ground Truth Index', () => {
  it('bench/repos/acme-web/index.sfx exists and is valid JSON', () => {
    const indexPath = resolve(__dirname, '..', '..', 'bench', 'repos', 'acme-web', 'index.sfx')
    const content = readFileSync(indexPath, 'utf-8')
    const index = JSON.parse(content)
    expect(index.components).toBeDefined()
    expect(index.components.length).toBeGreaterThanOrEqual(18)
    expect(index.tokens).toBeDefined()
    expect(index.conventions).toBeDefined()
  })
})
