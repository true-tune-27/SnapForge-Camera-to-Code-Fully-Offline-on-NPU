import { describe, it, expect } from 'vitest'
import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaDir = resolve(__dirname, '..', '..', 'schema')
const fixturesDir = resolve(__dirname, '..', 'fixtures')

function loadSchema(name: string) {
  return JSON.parse(readFileSync(resolve(schemaDir, name), 'utf-8'))
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  return ajv
}

describe('Fixture Validation', () => {
  const ajv = createAjv()
  const layoutSchema = loadSchema('layout.v1.schema.json')
  const validateLayout = ajv.compile(layoutSchema)

  it('compiles the layout schema', () => {
    expect(validateLayout).toBeDefined()
  })

  const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))

  it('has exactly 20 layout fixtures', () => {
    expect(files.length).toBe(20)
  })

  describe('validates all fixtures against layout.v1.schema.json', () => {
    for (const file of files) {
      it(`validates ${file}`, () => {
        const fixture = JSON.parse(readFileSync(resolve(fixturesDir, file), 'utf-8'))
        const valid = validateLayout(fixture)
        if (!valid) {
          // eslint-disable-next-line no-console
          console.error(`Validation errors in ${file}:`, validateLayout.errors)
        }
        expect(valid).toBe(true)
      })
    }
  })
})
