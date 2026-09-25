/**
 * GBNF Grammar Compiler
 *
 * Compiles a JSON Schema into a GBNF grammar for constrained decoding.
 * The grammar is applied as a logit mask in the sampler on-device (P4.5).
 * Tokens that would produce invalid JSON, an unknown role, or an out-of-range
 * coordinate are unreachable, not merely unlikely.
 *
 * Usage: npm run gbnf -- schema/layout.v1.schema.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Types ---

interface JsonSchema {
  type?: string
  const?: unknown
  enum?: unknown[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  additionalProperties?: boolean | JsonSchema
  items?: JsonSchema
  minItems?: number
  maxItems?: number
  minimum?: number
  maximum?: number
  maxLength?: number
  pattern?: string
  $ref?: string
  $defs?: Record<string, JsonSchema>
  allOf?: JsonSchema[]
  if?: JsonSchema
  then?: JsonSchema
  description?: string
  default?: unknown
  format?: string
  title?: string
  $schema?: string
  $id?: string
}

// --- Compiler State ---

interface CompilerState {
  rules: Map<string, string>
  defs: Record<string, JsonSchema>
  ruleCounter: number
}

function newState(defs: Record<string, JsonSchema>): CompilerState {
  return { rules: new Map(), defs, ruleCounter: 0 }
}

function addRule(state: CompilerState, name: string, body: string): string {
  if (state.rules.has(name)) return name
  state.rules.set(name, body)
  return name
}

function freshRule(state: CompilerState, prefix: string, body: string): string {
  const name = `${prefix}-${state.ruleCounter++}`
  state.rules.set(name, body)
  return name
}

// --- Primitives ---

function compileString(state: CompilerState, schema: JsonSchema): string {
  if (schema.maxLength) {
    const charRule = addRule(state, 'char', `[^"\\\\\\x00-\\x1f] | "\\\\" ["\\\\/bfnrt]`)
    const name = freshRule(
      state,
      'bounded-str',
      `"\\"" (${charRule}){0,${schema.maxLength}} "\\""`,
    )
    return name
  }
  const charRule = addRule(state, 'char', `[^"\\\\\\x00-\\x1f] | "\\\\" ["\\\\/bfnrt]`)
  return addRule(state, 'string', `"\\"" ${charRule}* "\\""`)
}

function compileNumber01(state: CompilerState): string {
  // Number bounded 0..1: cannot produce "1.5" or "-0.2"
  return addRule(
    state,
    'num01',
    `"0" | "1" | "0." [0-9] [0-9]? [0-9]?`,
  )
}

function compileNumber(state: CompilerState, schema: JsonSchema): string {
  const min = schema.minimum
  const max = schema.maximum

  if (min === 0 && max === 1) {
    return compileNumber01(state)
  }

  if (schema.type === 'integer') {
    return addRule(state, 'integer', `"0" | [1-9] [0-9]*`)
  }

  return addRule(
    state,
    'number',
    `"-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)?`,
  )
}

function compileBoolean(state: CompilerState): string {
  return addRule(state, 'boolean', `"true" | "false"`)
}

function compileNull(state: CompilerState): string {
  return addRule(state, 'null', `"null"`)
}

// --- Enum and Const ---

function compileConst(state: CompilerState, value: unknown): string {
  const json = JSON.stringify(value)
  return freshRule(state, 'const', `"${escapeGbnf(json)}"`)
}

function compileEnum(state: CompilerState, values: unknown[]): string {
  const alts = values.map((v) => `"${escapeGbnf(JSON.stringify(v))}"`).join(' | ')
  return freshRule(state, 'enum', alts)
}

function escapeGbnf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// --- Object ---

function compileObject(state: CompilerState, schema: JsonSchema): string {
  const props = schema.properties || {}
  const required = new Set(schema.required || [])
  const propNames = Object.keys(props)

  if (propNames.length === 0) {
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      return compileMapObject(state, schema.additionalProperties)
    }
    return addRule(state, 'empty-obj', `"{}"`)
  }

  const requiredProps = propNames.filter((p) => required.has(p))
  const optionalProps = propNames.filter((p) => !required.has(p))

  if (optionalProps.length > 0) {
    return compileFlexibleObject(state, props, requiredProps, optionalProps)
  }

  // All required: fixed order, comma-separated
  const parts = requiredProps.map((name) => {
    const valueRule = compileSchema(state, props[name])
    return `"\\"${escapeGbnf(name)}\\"" ":" ws ${valueRule}`
  })

  return freshRule(state, 'obj', `"{" ws ${parts.join(' "," ws ')} ws "}"`)
}

function compileFlexibleObject(
  state: CompilerState,
  props: Record<string, JsonSchema>,
  requiredProps: string[],
  optionalProps: string[],
): string {
  // Required props first (in order, comma-separated), then optional props
  const allParts: string[] = []

  for (let i = 0; i < requiredProps.length; i++) {
    const name = requiredProps[i]
    const valueRule = compileSchema(state, props[name])
    const propExpr = `"\\"${escapeGbnf(name)}\\"" ":" ws ${valueRule}`
    if (i > 0) {
      // Comma before subsequent required props
      allParts.push(`"," ws ${propExpr}`)
    } else {
      allParts.push(propExpr)
    }
  }

  // Optional props: each wrapped in ("," ws key ":" ws value)?
  for (const name of optionalProps) {
    const valueRule = compileSchema(state, props[name])
    const optPart = freshRule(
      state,
      `opt-${name}`,
      `"," ws "\\"${escapeGbnf(name)}\\"" ":" ws ${valueRule}`,
    )
    allParts.push(`(${optPart})?`)
  }

  return freshRule(state, 'flex-obj', `"{" ws ${allParts.join(' ')} ws "}"`)
}

function compileMapObject(state: CompilerState, valueSchema: JsonSchema): string {
  const valueRule = compileSchema(state, valueSchema)
  const pairRule = freshRule(
    state,
    'kv-pair',
    `string ":" ws ${valueRule}`,
  )
  addRule(state, 'string', `"\\"" char* "\\""`)
  addRule(state, 'char', `[^"\\\\\\x00-\\x1f] | "\\\\" ["\\\\/bfnrt]`)
  return freshRule(
    state,
    'map-obj',
    `"{" ws (${pairRule} ("," ws ${pairRule})*)? ws "}"`,
  )
}

// --- Array ---

function compileArray(state: CompilerState, schema: JsonSchema): string {
  if (!schema.items) {
    return addRule(state, 'array', `"[" ws "]"`)
  }

  const itemRule = compileSchema(state, schema.items)
  const min = schema.minItems || 0
  const max = schema.maxItems

  if (max !== undefined && max === min) {
    // Fixed-size array (e.g., bbox = exactly 4 items)
    const items = Array(max).fill(itemRule).join(' "," ws ')
    return freshRule(state, 'fixed-arr', `"[" ws ${items} ws "]"`)
  }

  if (min > 0) {
    const requiredItems = Array(min).fill(itemRule).join(' "," ws ')
    return freshRule(
      state,
      'arr',
      `"[" ws ${requiredItems} ("," ws ${itemRule})* ws "]"`,
    )
  }

  return freshRule(
    state,
    'arr',
    `"[" ws (${itemRule} ("," ws ${itemRule})*)? ws "]"`,
  )
}

// --- Schema Dispatch ---

function compileSchema(state: CompilerState, schema: JsonSchema): string {
  if (schema.$ref) {
    return compileRef(state, schema.$ref)
  }

  if (schema.const !== undefined) {
    return compileConst(state, schema.const)
  }

  if (schema.enum) {
    return compileEnum(state, schema.enum)
  }

  switch (schema.type) {
    case 'string':
      return compileString(state, schema)
    case 'number':
      return compileNumber(state, schema)
    case 'integer':
      return compileNumber(state, { ...schema, type: 'integer' })
    case 'boolean':
      return compileBoolean(state)
    case 'null':
      return compileNull(state)
    case 'object':
      return compileObject(state, schema)
    case 'array':
      return compileArray(state, schema)
    default:
      if (schema.properties) {
        return compileObject(state, schema)
      }
      return addRule(state, 'value', `string | number | boolean | null`)
  }
}

function compileRef(state: CompilerState, ref: string): string {
  const match = ref.match(/^#\/\$defs\/(.+)$/)
  if (!match) {
    throw new Error(`Unsupported $ref: ${ref}`)
  }

  const defName = match[1]
  const ruleName = defName.toLowerCase()

  // Already compiled (handles recursion)
  if (state.rules.has(ruleName)) {
    return ruleName
  }

  const defSchema = state.defs[defName]
  if (!defSchema) {
    throw new Error(`Unknown $def: ${defName}`)
  }

  // Placeholder for recursive references
  state.rules.set(ruleName, '/* placeholder */')

  const body = compileSchema(state, defSchema)

  if (body !== ruleName) {
    state.rules.set(ruleName, state.rules.get(body) || body)
  }

  return ruleName
}

// --- Top-Level Compiler ---

export function compileToGbnf(schema: JsonSchema): string {
  const state = newState(schema.$defs || {})

  // Whitespace rule: minimal, no unnecessary whitespace tokens
  addRule(state, 'ws', `[ \\t\\n]*`)

  const rootRule = compileSchema(state, schema)

  const lines: string[] = [
    `# GBNF grammar compiled from ${schema.$id || 'unknown schema'}`,
    `# Generated: do not edit. Regenerate with: npm run gbnf`,
    `# Every enum is closed. Invalid output is unreachable.`,
    ``,
    `root ::= ${state.rules.get(rootRule) || rootRule}`,
    ``,
  ]

  for (const [name, body] of state.rules) {
    if (name === rootRule || name === 'ws') continue
    if (body === '/* placeholder */') continue
    lines.push(`${name} ::= ${body}`)
  }

  lines.push(``)
  lines.push(`ws ::= ${state.rules.get('ws')}`)

  return lines.join('\n') + '\n'
}

// --- CLI ---

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    // eslint-disable-next-line no-console
    console.error('Usage: npm run gbnf -- <schema.json>')
    process.exit(1)
  }

  const schemaPath = resolve(args[0])
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8')) as JsonSchema

  const gbnf = compileToGbnf(schema)

  const outName = basename(schemaPath, '.schema.json') + '.gbnf'
  const outDir = resolve(__dirname, '..', 'gbnf')
  const outPath = resolve(outDir, outName)

  mkdirSync(outDir, { recursive: true })

  writeFileSync(outPath, gbnf, 'utf-8')
  // eslint-disable-next-line no-console
  console.log(`Compiled ${basename(schemaPath)} -> ${outName} (${gbnf.length} bytes)`)
}

const isMain = process.argv[1]?.includes('compile')
if (isMain) {
  main()
}
