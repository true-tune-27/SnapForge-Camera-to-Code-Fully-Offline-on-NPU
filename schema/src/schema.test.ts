import { describe, it, expect } from 'vitest'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaDir = resolve(__dirname, '..')

function loadSchema(name: string) {
  return JSON.parse(readFileSync(resolve(schemaDir, name), 'utf-8'))
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  return ajv
}

describe('layout.v1.schema.json', () => {
  const ajv = createAjv()
  const schema = loadSchema('layout.v1.schema.json')
  const validate = ajv.compile(schema)

  it('compiles without errors', () => {
    expect(validate).toBeDefined()
    expect(typeof validate).toBe('function')
  })

  it('validates the settings screen worked example from dossier §21', () => {
    // Adapted from dossier §21 to match the schema:
    // - "emphasis" → "variant" (button)
    // - "control":"switch" → "ctrl":"switch" (inline control)
    // - "level" removed (not in schema — heading hierarchy handled by renderer)
    // - radius "medium" → "md" (abbreviated)
    const settingsScreen = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'SettingsScreen' },
      nodes: [
        {
          role: 'heading',
          text: 'Settings',
          conf: 0.96,
          bbox: [0.05, 0.04, 0.45, 0.1],
        },
        {
          role: 'container',
          variant: 'card',
          pad: 0.042,
          radius: 'md',
          conf: 0.94,
          bbox: [0.05, 0.14, 0.95, 0.72],
          children: [
            {
              role: 'row',
              label: 'Push notifications',
              ctrl: 'switch',
              state: 'on',
              conf: 0.91,
            },
            {
              role: 'row',
              label: 'Volume',
              ctrl: 'slider',
              value: 0.6,
              conf: 0.89,
            },
          ],
        },
        {
          role: 'button',
          variant: 'primary',
          text: 'Save changes',
          conf: 0.97,
          bbox: [0.15, 0.78, 0.85, 0.88],
        },
      ],
      unresolved: [
        {
          bbox: [0.7, 0.04, 0.93, 0.12],
          reason: 'illegible_handwriting',
        },
      ],
    }

    const valid = validate(settingsScreen)
    if (!valid) {
      // eslint-disable-next-line no-console
      console.error('Validation errors:', validate.errors)
    }
    expect(valid).toBe(true)
  })

  it('rejects a document with an unknown role', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [{ role: 'carousel', conf: 0.9 }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })

  it('rejects a document with an invalid variant for its role', () => {
    // button with a container variant
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [{ role: 'button', variant: 'card', conf: 0.9 }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })

  it('rejects bbox values outside 0..1', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [{ role: 'heading', conf: 0.9, bbox: [0, 0, 1.5, 1] }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })

  it('rejects negative bbox values', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [{ role: 'heading', conf: 0.9, bbox: [-0.1, 0, 0.5, 0.5] }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })

  it('rejects conf outside 0..1', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [{ role: 'heading', conf: 1.5 }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })

  it('rejects text exceeding maxLength', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [{ role: 'text', text: 'x'.repeat(121), conf: 0.9 }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })

  it('rejects missing required fields (schema, surface, nodes, unresolved)', () => {
    expect(validate({ surface: { kind: 'screen', name: 'T' }, nodes: [{ role: 'text', conf: 0.5 }], unresolved: [] })).toBe(false)
    expect(validate({ schema: 'snapforge.layout/v1', nodes: [{ role: 'text', conf: 0.5 }], unresolved: [] })).toBe(false)
    expect(validate({ schema: 'snapforge.layout/v1', surface: { kind: 'screen', name: 'T' }, unresolved: [] })).toBe(false)
    expect(validate({ schema: 'snapforge.layout/v1', surface: { kind: 'screen', name: 'T' }, nodes: [{ role: 'text', conf: 0.5 }] })).toBe(false)
  })

  it('rejects empty nodes array', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })

  it('rejects unknown unresolved reasons', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [{ role: 'text', conf: 0.5 }],
      unresolved: [{ bbox: [0, 0, 1, 1], reason: 'too_dark' }],
    }
    expect(validate(doc)).toBe(false)
  })

  it('rejects additional properties on nodes', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Test' },
      nodes: [{ role: 'heading', conf: 0.9, fontSize: 24 }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })

  it('accepts valid recursive children', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'Dashboard' },
      nodes: [
        {
          role: 'container',
          variant: 'card',
          conf: 0.92,
          bbox: [0.05, 0.1, 0.95, 0.9],
          children: [
            {
              role: 'row',
              conf: 0.88,
              children: [
                { role: 'icon', conf: 0.85 },
                { role: 'text', text: 'Hello', conf: 0.9 },
              ],
            },
          ],
        },
      ],
      unresolved: [],
    }
    expect(validate(doc)).toBe(true)
  })

  it('accepts all valid roles', () => {
    const roles = [
      'heading', 'text', 'container', 'row', 'column', 'button',
      'input', 'image', 'list', 'divider', 'icon', 'badge', 'control',
    ]
    for (const role of roles) {
      const doc = {
        schema: 'snapforge.layout/v1',
        surface: { kind: 'screen', name: 'Test' },
        nodes: [{ role, conf: 0.9 }],
        unresolved: [],
      }
      const valid = validate(doc)
      if (!valid) {
        // eslint-disable-next-line no-console
        console.error(`Role "${role}" rejected:`, validate.errors)
      }
      expect(valid).toBe(true)
    }
  })

  it('accepts a document with empty unresolved array', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'component', name: 'ProfileCard' },
      nodes: [{ role: 'container', variant: 'card', conf: 0.95 }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(true)
  })

  it('rejects non-PascalCase surface names', () => {
    const doc = {
      schema: 'snapforge.layout/v1',
      surface: { kind: 'screen', name: 'settings_screen' },
      nodes: [{ role: 'text', conf: 0.5 }],
      unresolved: [],
    }
    expect(validate(doc)).toBe(false)
  })
})

describe('index.sfx.schema.json', () => {
  const ajv = createAjv()
  const schema = loadSchema('index.sfx.schema.json')
  const validate = ajv.compile(schema)

  it('compiles without errors', () => {
    expect(validate).toBeDefined()
    expect(typeof validate).toBe('function')
  })

  it('validates the acme-web example from dossier §11', () => {
    const index = {
      repo: {
        name: 'acme-web',
        framework: 'react-ts',
        indexedAt: '2026-03-14T09:22:10Z',
      },
      components: [
        {
          name: 'Card',
          import: '@/components/ui/card',
          export: 'named',
          props: [
            { name: 'padding', type: 'SpaceToken' },
            { name: 'radius', type: 'RadiusToken' },
            { name: 'elevated', type: 'boolean', optional: true },
          ],
          maps: ['container.card', 'container.panel'],
          usageCount: 147,
        },
        {
          name: 'SettingRow',
          import: '@/components/settings/row',
          export: 'named',
          props: [
            { name: 'label', type: 'string' },
            { name: 'children', type: 'ReactNode' },
          ],
          maps: ['row.labelled'],
          usageCount: 23,
        },
      ],
      tokens: {
        space: { '1': 4, '2': 8, '3': 12, '4': 16, '6': 24 },
        radius: { sm: 4, md: 10, lg: 20 },
      },
      conventions: {
        screenDir: 'src/screens',
        fileCase: 'PascalCase',
        ext: '.tsx',
        exportStyle: 'named',
        styleSystem: 'tokens-prop',
        importAlias: '@/',
      },
    }

    const valid = validate(index)
    if (!valid) {
      // eslint-disable-next-line no-console
      console.error('Validation errors:', validate.errors)
    }
    expect(valid).toBe(true)
  })

  it('rejects an index missing required component fields', () => {
    const index = {
      repo: { name: 'test', framework: 'react-ts', indexedAt: '2026-01-01T00:00:00Z' },
      components: [
        { name: 'Button' }, // missing import, export, props, maps, usageCount
      ],
      tokens: { space: {}, radius: {} },
      conventions: {
        screenDir: 'src',
        fileCase: 'PascalCase',
        ext: '.tsx',
        exportStyle: 'named',
        styleSystem: 'tailwind',
        importAlias: '@/',
      },
    }
    expect(validate(index)).toBe(false)
  })

  it('rejects invalid export style', () => {
    const index = {
      repo: { name: 'test', framework: 'react-ts', indexedAt: '2026-01-01T00:00:00Z' },
      components: [
        {
          name: 'Button',
          import: '@/ui/button',
          export: 'wildcard',
          props: [],
          maps: ['button.primary'],
          usageCount: 10,
        },
      ],
      tokens: { space: {}, radius: {} },
      conventions: {
        screenDir: 'src',
        fileCase: 'PascalCase',
        ext: '.tsx',
        exportStyle: 'named',
        styleSystem: 'tailwind',
        importAlias: '@/',
      },
    }
    expect(validate(index)).toBe(false)
  })

  it('rejects invalid style system', () => {
    const index = {
      repo: { name: 'test', framework: 'react-ts', indexedAt: '2026-01-01T00:00:00Z' },
      components: [],
      tokens: { space: {}, radius: {} },
      conventions: {
        screenDir: 'src',
        fileCase: 'PascalCase',
        ext: '.tsx',
        exportStyle: 'named',
        styleSystem: 'emotion',
        importAlias: '@/',
      },
    }
    expect(validate(index)).toBe(false)
  })
})
