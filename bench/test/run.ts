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

const ajv = createAjv()
const layoutSchema = loadSchema('layout.v1.schema.json')
const validateLayout = ajv.compile(layoutSchema)

const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))
console.log(`Validating ${files.length} fixtures...`)

let failed = false
for (const file of files) {
  const fixture = JSON.parse(readFileSync(resolve(fixturesDir, file), 'utf-8'))
  const valid = validateLayout(fixture)
  if (!valid) {
    console.error(`❌ Validation failed in ${file}:`, validateLayout.errors)
    failed = true
  } else {
    console.log(`✅ ${file} is valid.`)
  }
}

if (failed) {
  process.exit(1)
} else {
  console.log('All fixtures valid!')
}
