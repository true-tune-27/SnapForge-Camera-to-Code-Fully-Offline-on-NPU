import { describe, it, expect } from 'vitest'
import { emitTsx } from './emit.js'
import type { DesignSystemIndex, Layout } from '@snapforge/schema'
import ts from 'typescript'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve as pathResolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = pathResolve(__dirname, '..', '..', 'bench', 'fixtures')

const MOCK_INDEX: DesignSystemIndex = {
  repo: { name: 'acme-web', framework: 'react-ts', indexedAt: new Date().toISOString() },
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
    {
      name: 'Card',
      import: '@/components/ui/card',
      export: 'named',
      props: [{ name: 'children', type: 'ReactNode' }],
      maps: ['container.card', 'container.panel'],
      usageCount: 50,
    },
    {
      name: 'SettingRow',
      import: '@/components/settings/row',
      export: 'default',
      props: [{ name: 'label', type: 'string' }],
      maps: ['row'],
      usageCount: 147,
    },
    {
      name: 'PrimaryButton',
      import: '@/components/ui/button',
      export: 'named',
      props: [{ name: 'children', type: 'ReactNode' }, { name: 'variant', type: 'string' }],
      maps: ['button.primary'],
      usageCount: 80,
    },
    {
      name: 'Switch',
      import: '@/components/ui/switch',
      export: 'named',
      props: [{ name: 'checked', type: 'boolean' }],
      maps: ['control.switch'],
      usageCount: 30,
    },
    {
      name: 'Input',
      import: '@/components/ui/input',
      export: 'named',
      props: [{ name: 'label', type: 'string' }],
      maps: ['input'],
      usageCount: 100,
    },
    {
      name: 'Title',
      import: '@/components/typography/title',
      export: 'named',
      props: [{ name: 'children', type: 'ReactNode' }],
      maps: ['heading'],
      usageCount: 60,
    },
    {
      name: 'Text',
      import: '@/components/typography/text',
      export: 'named',
      props: [{ name: 'children', type: 'ReactNode' }],
      maps: ['text'],
      usageCount: 300,
    }
  ]
}

describe('TSX Emitter', () => {
  it('emits basic valid TSX', () => {
    const layout: Layout = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'SettingsScreen' },
      nodes: [
        {
          role: 'container',
          variant: 'card',
          conf: 0.95,
          bbox: [0.1, 0.1, 0.9, 0.9],
          children: [
            {
              role: 'heading',
              text: 'Settings',
              conf: 0.99,
              bbox: [0.1, 0.1, 0.9, 0.2]
            },
            {
              role: 'row',
              label: 'Notifications',
              conf: 0.9,
              bbox: [0.1, 0.3, 0.9, 0.4]
            }
          ]
        }
      ],
      unresolved: []
    }

    const output = emitTsx(layout, MOCK_INDEX)
    
    // Check header
    expect(output).toContain('// forged by SnapForge · layout')
    // Check component
    expect(output).toContain('export const SettingsScreen = () => {')
    // Check imports
    expect(output).toContain("import { Card } from \"@/components/ui/card\";")
    expect(output).toContain("import SettingRow from \"@/components/settings/row\";")
    expect(output).toContain("import { Title } from \"@/components/typography/title\";")
    
    // Check validity
    const sf = ts.createSourceFile('test.tsx', output, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    expect(sf.statements.length).toBeGreaterThan(0)
  })

  describe('Fixtures compile successfully', () => {
    const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))
    
    for (const file of files) {
      it(`emits syntactically valid TSX for ${file}`, () => {
        const layout: Layout = JSON.parse(readFileSync(pathResolve(fixturesDir, file), 'utf-8'))
        const output = emitTsx(layout, MOCK_INDEX)
        
        const sf = ts.createSourceFile(file.replace('.json', '.tsx'), output, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
        // Check for parse diagnostics (errors)
        const diagnostics = (sf as any).parseDiagnostics
        if (diagnostics && diagnostics.length > 0) {
          console.error(`Syntax errors in ${file}:`)
          console.error(output)
          throw new Error('Parse error')
        }
        
        expect(output).toContain('export const ' + layout.surface.name)
      })
    }
  })
})
