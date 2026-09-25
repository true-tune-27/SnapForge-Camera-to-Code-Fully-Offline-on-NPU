import { describe, it, expect } from 'vitest'
import { emitTsx } from './emit.js'
import type { DesignSystemIndex, Layout } from '@snapforge/schema'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve as pathResolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// import { execSync } from 'node:child_process'
// import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = pathResolve(__dirname, '..', '..', 'bench', 'fixtures')
const _acmeRepo = pathResolve(__dirname, '..', '..', 'bench', 'repos', 'acme-web')

// Same ACME_INDEX used across all renderer tests
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

describe('Compiles Gate (P2.4 — Acceptance Gate 1)', () => {
  const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    it(`emitted TSX for ${file} parses without diagnostics`, () => {
      const layout: Layout = JSON.parse(readFileSync(pathResolve(fixturesDir, file), 'utf-8'))
      const output = emitTsx(layout, ACME_INDEX)

      // Use the TypeScript compiler API to parse and check for syntax errors
      const ts = require('typescript')
      const sourceFile = ts.createSourceFile(
        `Generated_${file.replace('.json', '')}.tsx`,
        output,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      )

      // Check for parse diagnostics (syntax errors)
      // createSourceFile doesn't produce semantic diagnostics, but it does detect syntax errors
      // via parseDiagnostics on the internal sourceFile object.
      const parseDiags = (sourceFile as any).parseDiagnostics ?? []
      
      if (parseDiags.length > 0) {
        const messages = parseDiags.map((d: any) => {
          const pos = sourceFile.getLineAndCharacterOfPosition(d.start)
          return `  Line ${pos.line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`
        }).join('\n')
        expect.fail(`Parse errors in emitted TSX for ${file}:\n${messages}\n\nGenerated output:\n${output}`)
      }

      // Additionally verify the output is non-empty and contains expected structure
      expect(output.length).toBeGreaterThan(0)
      expect(output).toContain('// forged by SnapForge')
    })
  }
})
