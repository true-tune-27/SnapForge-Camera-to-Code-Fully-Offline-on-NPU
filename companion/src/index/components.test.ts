import { describe, it, expect } from 'vitest'
import { indexComponents } from './components.js'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const acmeRepo = resolve(__dirname, '..', '..', '..', 'bench', 'repos', 'acme-web')
const minimalRepo = resolve(__dirname, '..', '..', '..', 'bench', 'repos', 'minimal-web')

describe('Component Indexer', () => {
  it('indexes acme-web correctly (fast path)', () => {
    const start = performance.now()
    const components = indexComponents({
      projectPath: acmeRepo,
      componentsDirs: ['src/components']
    })
    const time = performance.now() - start
    
    // Sort components for stable assertion
    components.sort((a, b) => a.name.localeCompare(b.name))
    
    // Validate we got components
    expect(components.length).toBeGreaterThan(0)
    
    // Verify specific mappings
    const switchComp = components.find(c => c.name === 'Switch')
    expect(switchComp).toBeDefined()
    expect(switchComp?.maps).toContain('control.switch')
    expect(switchComp?.import).toContain('@/components/ui/Switch')
    
    const cardComp = components.find(c => c.name === 'Card')
    expect(cardComp).toBeDefined()
    expect(cardComp?.maps).toContain('container.card')
    
    const buttonComp = components.find(c => c.name === 'Button')
    expect(buttonComp).toBeDefined()
    expect(buttonComp?.maps).toContain('button.primary')
    
    console.log(`Indexed acme-web in ${time.toFixed(2)}ms`)
    expect(time).toBeLessThan(4000) // Dossier requirement
  })

  it('indexes minimal-web correctly', () => {
    const components = indexComponents({
      projectPath: minimalRepo,
      componentsDirs: ['src/components']
    })
    
    // Validates against over-fitting
    expect(components.length).toBe(5)
  })
})
