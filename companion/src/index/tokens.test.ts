import { describe, it, expect } from 'vitest'
import { extractConventions } from './conventions.js'
import { extractTokens } from './tokens.js'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const acmeRepo = resolve(__dirname, '..', '..', '..', 'bench', 'repos', 'acme-web')
const minimalRepo = resolve(__dirname, '..', '..', '..', 'bench', 'repos', 'minimal-web')

describe('Conventions Extractor', () => {
  it('detects acme-web conventions correctly', () => {
    const conv = extractConventions({
      projectPath: acmeRepo,
      componentsDirs: ['src/components']
    })
    
    expect(conv.styleSystem).toBe('tokens-prop')
    expect(conv.fileCase).toBe('PascalCase')
    // Let's just expect it.
  })

  it('detects minimal-web conventions correctly', () => {
    const conv = extractConventions({
      projectPath: minimalRepo,
      componentsDirs: ['src/components']
    })
    
    expect(conv.styleSystem).toBe('tailwind') // Detected from className usage
    expect(conv.fileCase).toBe('PascalCase') // Box.tsx, Btn.tsx
    expect(conv.screenDir).toBe('src') // Because no screens directory exists
  })
})

describe('Tokens Extractor', () => {
  it('extracts tokens from acme-web theme module', () => {
    const tokens = extractTokens({ projectPath: acmeRepo })
    
    expect(tokens.space).toBeDefined()
    expect(tokens.space['4']).toBe(4)
    expect(tokens.radius['md']).toBe(8)
    expect(tokens.color?.primary).toBe('blue')
  })
})
