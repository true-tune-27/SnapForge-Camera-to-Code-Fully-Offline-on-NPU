import { describe, it, expect } from 'vitest'
import { resolve } from './resolve.js'
import type { DesignSystemIndex, LayoutNode } from '@snapforge/schema'
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
    space: { '4': 4, '8': 8, '16': 16 },
    radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  },
  components: [
    {
      name: 'Card',
      import: '@/components/ui/card',
      export: 'named',
      props: [{ name: 'children', type: 'ReactNode' }],
      maps: ['container.card'],
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
      name: 'GenericRow',
      import: '@/components/ui/row',
      export: 'named',
      props: [{ name: 'children', type: 'ReactNode' }],
      maps: ['row'],
      usageCount: 23,
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
      name: 'Slider',
      import: '@/components/ui/slider',
      export: 'named',
      props: [{ name: 'value', type: 'number' }],
      maps: ['control.slider'],
      usageCount: 10,
    }
  ]
}

describe('Component Resolver', () => {
  it('resolves exact match: container.card -> Card', () => {
    const node: LayoutNode = { role: 'container', variant: 'card', conf: 1 }
    const res = resolve(node, MOCK_INDEX)
    
    expect(res.kind).toBe('component')
    if (res.kind === 'component') {
      expect(res.name).toBe('Card')
      expect(res.importPath).toBe('@/components/ui/card')
    }
  })

  it('tie-breaks by usage count: SettingRow (147) beats GenericRow (23)', () => {
    const node: LayoutNode = { role: 'row', conf: 1, label: 'Push' }
    const res = resolve(node, MOCK_INDEX)
    
    expect(res.kind).toBe('component')
    if (res.kind === 'component') {
      expect(res.name).toBe('SettingRow')
      expect(res.propMapping).toHaveProperty('label', 'Push')
    }
  })

  it('returns primitive with candidates for unmappable component', () => {
    const node: LayoutNode = { role: 'divider', conf: 1 }
    const res = resolve(node, MOCK_INDEX)
    
    expect(res.kind).toBe('primitive')
    if (res.kind === 'primitive') {
      expect(res.element).toBe('hr')
      // Candidates are sorted alphabetically in the code
      expect(res.candidates.length).toBe(3)
    }
  })

  it('determinism check: resolves identically 100 times', () => {
    const node: LayoutNode = { role: 'container', variant: 'card', conf: 1 }
    const firstRes = resolve(node, MOCK_INDEX)
    const json = JSON.stringify(firstRes)
    
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(resolve(node, MOCK_INDEX))).toBe(json)
    }
  })

  it('fuzzy matches component by name', () => {
    // Add a component with no map but similar name
    const fuzzyIndex = {
      ...MOCK_INDEX,
      components: [
        ...MOCK_INDEX.components,
        {
          name: 'DividerLine',
          import: '@/components/ui/div',
          export: 'named' as const,
          props: [],
          maps: [],
          usageCount: 0
        }
      ]
    }
    const node: LayoutNode = { role: 'divider', conf: 1 }
    const res = resolve(node, fuzzyIndex)
    
    // "divider" vs "DividerLine" => Levenshtein dist is 4. Max len is 11.
    // Score = 1 - 4/11 = 0.63 < 0.75. So it will fall back to Primitive.
    // Let's test a closer name.
    
    const closerIndex = {
      ...MOCK_INDEX,
      components: [
        ...MOCK_INDEX.components,
        {
          name: 'Divider',
          import: '@/components/ui/divider',
          export: 'named' as const,
          props: [],
          maps: [],
          usageCount: 0
        }
      ]
    }
    const res2 = resolve(node, closerIndex)
    expect(res2.kind).toBe('component')
    if (res2.kind === 'component') {
      expect(res2.name).toBe('Divider')
    }
  })

  describe('Fixtures resolve without throwing', () => {
    const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))
    
    for (const file of files) {
      it(`resolves nodes in ${file}`, () => {
        const fixture = JSON.parse(readFileSync(pathResolve(fixturesDir, file), 'utf-8'))
        
        // Recursive walk
        const walk = (nodes: any[]) => {
          for (const n of nodes) {
            expect(() => resolve(n, MOCK_INDEX)).not.toThrow()
            if (n.children) {
              walk(n.children)
            }
          }
        }
        walk(fixture.nodes)
      })
    }
  })
})
