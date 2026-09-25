import { describe, it, expect } from 'vitest'
import { emitTsx } from './emit.js'
import type { DesignSystemIndex, Layout } from '@snapforge/schema'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve as pathResolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = pathResolve(__dirname, '..', '..', 'bench', 'fixtures')

const ACME_INDEX: DesignSystemIndex = {
  repo: { name: 'acme-web', framework: 'react-ts', indexedAt: '2026-01-01T00:00:00Z' },
  conventions: {
    screenDir: 'src/screens',
    fileCase: 'PascalCase',
    ext: '.tsx',
    exportStyle: 'named',
    styleSystem: 'tokens-prop',
    importAlias: '@/',
  },
  tokens: {
    space: { '4': 4, '8': 8, '16': 16, '24': 24, '32': 32 },
    radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  },
  components: [
    { name: 'Card', import: '@/components/ui/card', export: 'named', props: [{ name: 'children', type: 'ReactNode' }], maps: ['container.card', 'container.panel'], usageCount: 50 },
    { name: 'SettingRow', import: '@/components/settings/row', export: 'default', props: [{ name: 'label', type: 'string' }], maps: ['row'], usageCount: 147 },
    { name: 'PrimaryButton', import: '@/components/ui/button', export: 'named', props: [{ name: 'children', type: 'ReactNode' }, { name: 'variant', type: 'string' }], maps: ['button.primary'], usageCount: 80 },
    { name: 'Switch', import: '@/components/ui/switch', export: 'named', props: [{ name: 'checked', type: 'boolean' }], maps: ['control.switch'], usageCount: 30 },
    { name: 'Input', import: '@/components/ui/input', export: 'named', props: [{ name: 'label', type: 'string' }], maps: ['input'], usageCount: 100 },
    { name: 'Title', import: '@/components/typography/title', export: 'named', props: [{ name: 'children', type: 'ReactNode' }], maps: ['heading'], usageCount: 60 },
    { name: 'Text', import: '@/components/typography/text', export: 'named', props: [{ name: 'children', type: 'ReactNode' }], maps: ['text'], usageCount: 300 }
  ]
}

// Build the set of all allowed import paths from the index
const allowedImports = new Set<string>()
for (const comp of ACME_INDEX.components) {
  allowedImports.add(comp.import)
}
// Also allow 'react' since the emitter may import React
allowedImports.add('react')

function extractImports(source: string): string[] {
  const sourceFile = ts.createSourceFile('test.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const imports: string[] = []

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text)
    }
  })

  return imports
}

describe('No Hallucinated Imports (P2.4 — Zero Tolerance)', () => {
  const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    it(`${file}: every import resolves to a known component or dependency`, () => {
      const layout: Layout = JSON.parse(readFileSync(pathResolve(fixturesDir, file), 'utf-8'))
      const output = emitTsx(layout, ACME_INDEX)
      const imports = extractImports(output)

      for (const imp of imports) {
        expect(
          allowedImports.has(imp),
          `Hallucinated import found: "${imp}" is not in the design system index or declared dependencies.\nFull output:\n${output}`
        ).toBe(true)
      }
    })
  }
})
