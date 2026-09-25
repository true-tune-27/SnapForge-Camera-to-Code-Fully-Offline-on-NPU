import type {
  LayoutNode,
  DesignSystemIndex,
  ComponentEntry,
  ExportStyle,
  ComponentProp,
} from '@snapforge/schema'

export type ComponentResolution = {
  kind: 'component'
  name: string
  importPath: string
  exportStyle: ExportStyle
  propMapping: Record<string, string | number | boolean>
  droppedFields: string[]
}

export type PrimitiveResolution = {
  kind: 'primitive'
  element: string
  candidates: string[]
}

export type UnresolvedResolution = {
  kind: 'unresolved'
  reason: string
}

export type Resolution = ComponentResolution | PrimitiveResolution | UnresolvedResolution

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  )

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[a.length][b.length]
}

function stringSimilarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase())
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0
  return 1.0 - dist / maxLen
}

const PRIMITIVE_MAP: Record<string, string> = {
  heading: 'h1',
  text: 'p',
  container: 'div',
  row: 'div',
  column: 'div',
  button: 'button',
  input: 'input',
  image: 'img',
  list: 'ul',
  divider: 'hr',
  icon: 'span',
  badge: 'span',
  control: 'div',
}

/**
 * Maps layout node fields to component props based on index data
 */
function mapProps(node: LayoutNode, props: ComponentProp[]): { mapping: Record<string, any>; dropped: string[] } {
  const mapping: Record<string, any> = {}
  const dropped: string[] = []
  const availableProps = new Set(props.map((p) => p.name))

  if (node.text !== undefined || node.label !== undefined) {
    const textVal = node.text ?? node.label
    if (availableProps.has('text')) mapping['text'] = textVal
    else if (availableProps.has('label')) mapping['label'] = textVal
    else if (availableProps.has('children')) mapping['children'] = textVal
    else if (availableProps.has('title')) mapping['title'] = textVal
    else dropped.push(node.text !== undefined ? 'text' : 'label')
  }

  if (node.state !== undefined) {
    const isChecked = node.state === 'on'
    if (availableProps.has('checked')) mapping['checked'] = isChecked
    else if (availableProps.has('defaultChecked')) mapping['defaultChecked'] = isChecked
    else if (availableProps.has('value') && props.find(p => p.name === 'value')?.type === 'boolean') mapping['value'] = isChecked
    else if (availableProps.has('isOpen')) mapping['isOpen'] = isChecked
    else dropped.push('state')
  }

  if (node.value !== undefined) {
    if (availableProps.has('value') && props.find(p => p.name === 'value')?.type === 'number') mapping['value'] = node.value
    else if (availableProps.has('progress')) mapping['progress'] = node.value
    else dropped.push('value')
  }

  // Variant is typically mapped if it exists, but the schema mapping itself implies the variant is handled.
  // We can pass it along if the component explicitly asks for it.
  if (node.variant && availableProps.has('variant')) {
    mapping['variant'] = node.variant
  }

  return { mapping, dropped }
}

/**
 * Deterministically resolves a layout node against the index.
 */
export function resolve(node: LayoutNode, index: DesignSystemIndex): Resolution {
  const lookupKey = node.variant ? `${node.role}.${node.variant}` : node.role

  // 1. Exact Match
  const exactMatches = index.components.filter((comp) => comp.maps.includes(lookupKey))

  if (exactMatches.length > 0) {
    exactMatches.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount // descending usageCount
      }
      if (a.import.length !== b.import.length) {
        return a.import.length - b.import.length // ascending import length
      }
      return a.name.localeCompare(b.name) // ascending alphabetical
    })

    const match = exactMatches[0]
    const { mapping, dropped } = mapProps(node, match.props)
    
    return {
      kind: 'component',
      name: match.name,
      importPath: match.import,
      exportStyle: match.export,
      propMapping: mapping,
      droppedFields: dropped,
    }
  }

  // 2. Fuzzy Match
  type ScoredComponent = { comp: ComponentEntry; score: number }
  const fuzzyScores: ScoredComponent[] = index.components.map((comp) => ({
    comp,
    score: Math.max(
      stringSimilarity(lookupKey, comp.name),
      stringSimilarity(node.role, comp.name)
    ),
  }))

  // Sort by score descending, then same tie breakers
  fuzzyScores.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score
    if (b.comp.usageCount !== a.comp.usageCount) return b.comp.usageCount - a.comp.usageCount
    if (a.comp.import.length !== b.comp.import.length) return a.comp.import.length - b.comp.import.length
    return a.comp.name.localeCompare(b.comp.name)
  })

  if (fuzzyScores.length > 0 && fuzzyScores[0].score > 0.75) {
    const match = fuzzyScores[0].comp
    const { mapping, dropped } = mapProps(node, match.props)
    
    return {
      kind: 'component',
      name: match.name,
      importPath: match.import,
      exportStyle: match.export,
      propMapping: mapping,
      droppedFields: dropped,
    }
  }

  // 3. Primitive Fallback
  const element = PRIMITIVE_MAP[node.role] || 'div'
  const candidates = fuzzyScores.slice(0, 3).map((s) => s.comp.name)

  // Sort candidates deterministically before returning
  candidates.sort((a, b) => a.localeCompare(b))

  return {
    kind: 'primitive',
    element,
    candidates,
  }
}
