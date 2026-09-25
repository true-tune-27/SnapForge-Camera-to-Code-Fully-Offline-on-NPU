import type { Layout, Operation } from '@snapforge/schema'
import * as jsonpatch from 'fast-json-patch'
import Ajv from 'ajv'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const layoutSchemaPath = resolve(__dirname, '..', '..', 'schema', 'layout.v1.schema.json')

let validator: any

function getValidator() {
  if (!validator) {
    const AjvConstructor = (Ajv as any).default || Ajv
    const ajv = new AjvConstructor({ allErrors: true, strict: false })
    const schema = JSON.parse(readFileSync(layoutSchemaPath, 'utf-8'))
    delete schema.$schema // bypass draft-2020 error in standard ajv
    validator = ajv.compile(schema)
  }
  return validator
}

export function applyEdit(layout: Layout, patch: Operation[]): { layout: Layout, rejected: Operation[] } {
  // Cap patch size
  if (patch.length > 20) {
    return { layout, rejected: patch }
  }

  // Reject operations targeting restricted paths
  for (const op of patch) {
    if (op.path === '/schema' || op.path.startsWith('/schema/')) {
      return { layout, rejected: patch }
    }
    if (op.path === '/surface/kind' || op.path.startsWith('/surface/kind/')) {
      return { layout, rejected: patch }
    }
  }

  // fast-json-patch mutates if we use applyPatch directly, so we clone
  const clonedLayout = JSON.parse(JSON.stringify(layout))
  
  try {
    const result = jsonpatch.applyPatch(clonedLayout, patch as any, true, false)
    
    // Validate the resulting document
    const validate = getValidator()
    const valid = validate(result.newDocument)
    
    if (!valid) {
      return { layout, rejected: patch }
    }
    
    return { layout: result.newDocument, rejected: [] }
  } catch (err) {
    // fast-json-patch throws on invalid paths (like array out of bounds, missing node)
    return { layout, rejected: patch }
  }
}
