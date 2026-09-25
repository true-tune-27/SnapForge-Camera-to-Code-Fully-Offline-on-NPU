import { describe, it, expect } from 'vitest'
import { emitTsx } from './emit'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, '..', '..', 'bench', 'fixtures')
const indexSfxPath = resolve(__dirname, '..', '..', 'bench', 'repos', 'acme-web', 'index.sfx')

describe('Linter Compatibility', () => {
  it('generates code that passes standard ESLint rules', async () => {
    const index = JSON.parse(readFileSync(indexSfxPath, 'utf-8'))
    const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))
    
    // Setup a strict ESLint instance purely for testing the generated TSX output
    const eslint = new ESLint({
      useEslintrc: false,
      overrideConfig: {
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'module',
          ecmaFeatures: { jsx: true }
        },
        plugins: ['@typescript-eslint', 'react'],
        rules: {
          'no-unused-vars': 'off', // We might import things and not use them immediately in mock code
          '@typescript-eslint/no-unused-vars': 'error',
          'react/jsx-uses-react': 'error',
          'react/jsx-uses-vars': 'error',
          'no-undef': 'error' // Ensure all variables (components) are imported or defined
        }
      }
    })

    // Take just 5 fixtures to keep the test fast
    for (const file of files.slice(0, 5)) {
      const layout = JSON.parse(readFileSync(resolve(fixturesDir, file), 'utf-8'))
      const output = emitTsx(layout, index)
      
      // Lint the raw string output
      const results = await eslint.lintText(output, { filePath: file.replace('.json', '.tsx') })
      
      // If there are errors, print the first one for debugging
      if (results[0].errorCount > 0) {
        console.error(`Lint error in ${file}:`, results[0].messages[0])
      }
      
      expect(results[0].errorCount).toBe(0)
    }
  })
})
