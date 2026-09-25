import { describe, it, expect } from 'vitest'
import { emitTsx } from './emit.js'
import type { DesignSystemIndex, Layout } from '@snapforge/schema'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve as pathResolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = pathResolve(__dirname, '..', '..', 'bench', 'fixtures')
const acmeIndexFile = pathResolve(__dirname, '..', '..', 'bench', 'repos', 'acme-web', 'index.sfx')
const minimalIndexFile = pathResolve(__dirname, '..', '..', 'bench', 'repos', 'minimal-web', 'index.sfx')

const acmeIndex = JSON.parse(readFileSync(acmeIndexFile, 'utf-8'))
const minimalIndex = JSON.parse(readFileSync(minimalIndexFile, 'utf-8'))

describe('Snapshot Suite & Determinism Gate', () => {
  const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))
  
  it('determinism: running the renderer twice on the same fixture produces identical bytes', () => {
    const layout: Layout = JSON.parse(readFileSync(pathResolve(fixturesDir, files[0]), 'utf-8'))
    const output1 = emitTsx(layout, acmeIndex)
    
    // Loop to ensure absolute stability over multiple runs
    for (let i = 0; i < 50; i++) {
      expect(emitTsx(layout, acmeIndex)).toBe(output1)
    }
  })

  describe('acme-web snapshots', () => {
    for (const file of files) {
      it(`matches snapshot for ${file}`, () => {
        const layout: Layout = JSON.parse(readFileSync(pathResolve(fixturesDir, file), 'utf-8'))
        const output = emitTsx(layout, acmeIndex)
        expect(output).toMatchSnapshot()
      })
    }
  })
  
  describe('minimal-web snapshots', () => {
    for (const file of files) {
      it(`matches snapshot for ${file}`, () => {
        const layout: Layout = JSON.parse(readFileSync(pathResolve(fixturesDir, file), 'utf-8'))
        const output = emitTsx(layout, minimalIndex)
        expect(output).toMatchSnapshot()
      })
    }
  })
})
