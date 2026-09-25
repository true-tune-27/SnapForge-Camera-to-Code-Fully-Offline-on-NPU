import { describe, it, expect } from 'vitest'
import { applyEdit } from './patch.js'
import { emitTsx } from './emit.js'
import type { Layout, Operation, DesignSystemIndex } from '@snapforge/schema'

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
    { name: 'Card', import: '@/components/ui/card', export: 'named', props: [{ name: 'children', type: 'ReactNode' }], maps: ['container.card'], usageCount: 50 },
    { name: 'Text', import: '@/components/typography/text', export: 'named', props: [{ name: 'children', type: 'ReactNode' }], maps: ['text'], usageCount: 300 }
  ]
}

describe('Voice Edit Patch Applier', () => {
  const initialLayout: Layout = {
    schema: 'snapforge.layout/v1',
    surface: { kind: 'component', name: 'SettingsCard' },
    nodes: [
      { role: 'text', text: 'Settings', conf: 0.9 },
      { role: 'container', variant: 'card', pad: 0.042, conf: 0.8, children: [] }
    ],
    unresolved: []
  }

  it('applies a valid replace operation', () => {
    // "make the card spacing match the dashboard" -> dashboard pad is 0.063
    const patch: Operation[] = [
      { op: 'replace', path: '/nodes/1/pad', value: 0.063 }
    ]

    const { layout: newLayout, rejected } = applyEdit(initialLayout, patch)
    
    expect(rejected).toHaveLength(0)
    expect(newLayout.nodes[1].pad).toBe(0.063)
    
    // Assert byte-identical for unaffected parts
    expect(newLayout.surface).toEqual(initialLayout.surface)
    expect(newLayout.nodes[0]).toEqual(initialLayout.nodes[0])
    
    // Assert re-render differences
    const oldCode = emitTsx(initialLayout, MOCK_INDEX)
    const newCode = emitTsx(newLayout, MOCK_INDEX)
    
    expect(oldCode).not.toBe(newCode)
    expect(oldCode).toContain('pad="16"') // 0.042 * 380 = 16px -> token 16
    expect(newCode).toContain('pad="24"') // 0.063 * 380 = 23.94px -> token 24
  })

  it('rejects patch if it breaks the schema', () => {
    const patch: Operation[] = [
      { op: 'replace', path: '/nodes/1/role', value: 'invalid_role_enum' }
    ]

    const { layout: newLayout, rejected } = applyEdit(initialLayout, patch)
    
    // Should reject the patch entirely
    expect(rejected).toEqual(patch)
    // Should return original layout
    expect(newLayout).toBe(initialLayout)
  })

  it('rejects patch targeting /schema', () => {
    const patch: Operation[] = [
      { op: 'replace', path: '/schema', value: 'snapforge.layout/v2' }
    ]

    const { layout: newLayout, rejected } = applyEdit(initialLayout, patch)
    expect(rejected).toEqual(patch)
    expect(newLayout).toBe(initialLayout)
  })

  it('rejects patch targeting /surface/kind', () => {
    const patch: Operation[] = [
      { op: 'replace', path: '/surface/kind', value: 'screen' }
    ]

    const { layout: newLayout, rejected } = applyEdit(initialLayout, patch)
    expect(rejected).toEqual(patch)
    expect(newLayout).toBe(initialLayout)
  })

  it('rejects patches with more than 20 operations', () => {
    const patch: Operation[] = Array(21).fill({ op: 'add', path: '/nodes/-', value: { role: 'text', conf: 1 } })
    
    const { layout: _newLayout, rejected } = applyEdit(initialLayout, patch)
    expect(rejected).toEqual(patch)
  })
})
