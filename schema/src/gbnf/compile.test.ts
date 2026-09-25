import { describe, it, expect } from 'vitest'
import { compileToGbnf } from './compile.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaDir = resolve(__dirname, '..', '..')

describe('GBNF compiler', () => {
  it('compiles layout.v1 schema to a non-empty grammar', () => {
    const schema = JSON.parse(readFileSync(resolve(schemaDir, 'layout.v1.schema.json'), 'utf-8'))
    const gbnf = compileToGbnf(schema)

    expect(gbnf.length).toBeGreaterThan(0)
    expect(gbnf).toContain('root ::=')
    expect(gbnf).toContain('ws ::=')
  })

  it('produces closed role enum with all 13 roles', () => {
    const schema = JSON.parse(readFileSync(resolve(schemaDir, 'layout.v1.schema.json'), 'utf-8'))
    const gbnf = compileToGbnf(schema)

    const roles = [
      'heading', 'text', 'container', 'row', 'column', 'button',
      'input', 'image', 'list', 'divider', 'icon', 'badge', 'control',
    ]
    for (const role of roles) {
      // The GBNF contains strings like: "\"heading\""
      const expected = '"\\"' + role + '\\""'
      expect(gbnf).toContain(expected)
    }
  })

  it('constrains num01 to only produce 0..1 values', () => {
    const schema = JSON.parse(readFileSync(resolve(schemaDir, 'layout.v1.schema.json'), 'utf-8'))
    const gbnf = compileToGbnf(schema)

    expect(gbnf).toContain('num01 ::=')
    expect(gbnf).toMatch(/num01 ::= "0" \| "1" \| "0\."/)
  })

  it('includes comma separator between role and conf in node rule', () => {
    const schema = JSON.parse(readFileSync(resolve(schemaDir, 'layout.v1.schema.json'), 'utf-8'))
    const gbnf = compileToGbnf(schema)

    const nodeLines = gbnf.split('\n').filter((l: string) =>
      l.includes('role') && l.includes('conf') && l.includes('::='),
    )
    expect(nodeLines.length).toBeGreaterThan(0)
    for (const line of nodeLines) {
      const roleIdx = line.indexOf('role')
      const confIdx = line.indexOf('conf')
      if (roleIdx < confIdx) {
        const between = line.substring(roleIdx, confIdx)
        expect(between).toContain('","')
      }
    }
  })

  it('includes all unresolved reasons as closed enum', () => {
    const schema = JSON.parse(readFileSync(resolve(schemaDir, 'layout.v1.schema.json'), 'utf-8'))
    const gbnf = compileToGbnf(schema)

    const reasons = [
      'illegible_handwriting', 'ambiguous_shape', 'occluded',
      'out_of_frame', 'low_confidence',
    ]
    for (const reason of reasons) {
      // The GBNF contains strings like: "\"illegible_handwriting\""
      const expected = '"\\"' + reason + '\\""'
      expect(gbnf).toContain(expected)
    }
  })

  it('compiles a minimal schema', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', maxLength: 10 },
      },
    }
    const gbnf = compileToGbnf(schema)
    expect(gbnf).toContain('root ::=')
    expect(gbnf).toContain('name')
  })

  it('handles recursive schemas (children)', () => {
    const schema = JSON.parse(readFileSync(resolve(schemaDir, 'layout.v1.schema.json'), 'utf-8'))
    const gbnf = compileToGbnf(schema)

    expect(gbnf).toContain('children')
    expect(gbnf).toContain('node')
  })
})
