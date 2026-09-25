import ts from 'typescript'
import { createHash } from 'node:crypto'
import type { Layout, LayoutNode, DesignSystemIndex, Unresolved } from '@snapforge/schema'
import { resolve } from './resolve.js'
import { snapSpace, snapRadius } from './tokens.js'

/** Helper to create JSX text */
function createJsxText(text: string) {
  return ts.factory.createJsxText(text, false)
}

/** Helper to attach a synthetic comment to a TS node */
function addComment<T extends ts.Node>(node: T, text: string, kind: ts.SyntaxKind.SingleLineCommentTrivia | ts.SyntaxKind.MultiLineCommentTrivia = ts.SyntaxKind.MultiLineCommentTrivia): T {
  return ts.addSyntheticTrailingComment(node, kind, text, true)
}

interface ProcessedNode {
  type: 'resolved' | 'unresolved'
  y0: number
  x0: number
  node?: LayoutNode
  unresolved?: Unresolved
}

export function emitTsx(layout: Layout, index: DesignSystemIndex): string {
  // 1. Gather all nodes to process (flatten root nodes + root unresolved into a unified list, wait, 
  // actually we process recursively but we need to insert unresolved regions where they belong.
  // For simplicity, we just put unresolved regions at the root level alongside root nodes,
  // or we could assign them to the deepest container.
  // Let's implement the deepest container assignment.)
  
  const unresolvedPool = [...layout.unresolved]

  function containsBBox(parent?: [number, number, number, number], child?: [number, number, number, number]) {
    if (!parent || !child) return false
    return child[0] >= parent[0] && child[1] >= parent[1] && child[2] <= parent[2] && child[3] <= parent[3]
  }

  // To properly insert unresolved, we could build a tree structure. 
  // For now, let's keep it simple: we process nodes recursively and build JSX.
  // If we want to interleave unresolved, we can do it during the children processing of each container.

  const importsToEmit = new Map<string, Set<string>>()
  const defaultImportsToEmit = new Map<string, string>()

  function addImport(path: string, name: string, isDefault: boolean) {
    if (isDefault) {
      defaultImportsToEmit.set(path, name)
    } else {
      if (!importsToEmit.has(path)) importsToEmit.set(path, new Set())
      importsToEmit.get(path)!.add(name)
    }
  }

  function createJsxElement(
    tagName: string,
    attributes: Record<string, any>,
    children: ts.JsxChild[],
    comments: string[] = []
  ): ts.JsxElement | ts.JsxSelfClosingElement {
    const jsxAttrs = Object.entries(attributes).map(([key, value]) => {
      let init: ts.JsxExpression | ts.StringLiteral
      if (typeof value === 'string') {
        init = ts.factory.createStringLiteral(value)
      } else if (typeof value === 'number') {
        init = ts.factory.createJsxExpression(undefined, ts.factory.createNumericLiteral(value))
      } else if (typeof value === 'boolean') {
        init = ts.factory.createJsxExpression(undefined, value ? ts.factory.createTrue() : ts.factory.createFalse())
      } else {
        init = ts.factory.createStringLiteral(String(value))
      }
      return ts.factory.createJsxAttribute(ts.factory.createIdentifier(key), init)
    })

    const attrs = ts.factory.createJsxAttributes(jsxAttrs)
    
    let element: ts.JsxElement | ts.JsxSelfClosingElement
    if (children.length === 0) {
      element = ts.factory.createJsxSelfClosingElement(ts.factory.createIdentifier(tagName), undefined, attrs)
    } else {
      element = ts.factory.createJsxElement(
        ts.factory.createJsxOpeningElement(ts.factory.createIdentifier(tagName), undefined, attrs),
        children,
        ts.factory.createJsxClosingElement(ts.factory.createIdentifier(tagName))
      )
    }

    for (const comment of comments) {
      addComment(element, comment)
    }

    return element
  }

  // Process a node and its children
  function processNode(node: LayoutNode, unresolvedInScope: Unresolved[]): ts.JsxChild {
    const res = resolve(node, index)
    
    let tagName = 'div'
    const attributes: Record<string, any> = {}
    const comments: string[] = []

    if (res.kind === 'component') {
      tagName = res.name
      Object.assign(attributes, res.propMapping)
      addImport(res.importPath, res.name, res.exportStyle === 'default')
      if (res.droppedFields && res.droppedFields.length > 0) {
        comments.push(` dropped fields: ${res.droppedFields.join(', ')} `)
      }
    } else if (res.kind === 'primitive') {
      tagName = res.element
      comments.push(` TODO(snapforge): no component matched ${node.variant ? node.role + '.' + node.variant : node.role} — closest: ${res.candidates.join(', ')} `)
    } else if (res.kind === 'unresolved') {
      return ts.factory.createJsxExpression(undefined, ts.factory.createIdentifier(`/* TODO(snapforge): ${res.reason} */`))
    }

    // Token snapping
    if (node.pad !== undefined) {
      const snap = snapSpace(node.pad, undefined, index.tokens.space)
      attributes['pad'] = snap.token
      if (!snap.confident) comments.push(` pad was exactly ${snap.exactPx.toFixed(1)}px `)
    }
    if (node.gap !== undefined) {
      const snap = snapSpace(node.gap, undefined, index.tokens.space)
      attributes['gap'] = snap.token
      if (!snap.confident) comments.push(` gap was exactly ${snap.exactPx.toFixed(1)}px `)
    }
    if (node.radius !== undefined) {
      const snap = snapRadius(node.radius, index.tokens.radius)
      attributes['radius'] = snap.token
    }

    // Children processing
    let jsxChildren: ts.JsxChild[] = []

    // If node has its own children
    const childNodes = node.children || []
    
    // Sort children and unresolved regions together based on bbox
    const items: ProcessedNode[] = []
    
    for (const child of childNodes) {
      items.push({
        type: 'resolved',
        y0: child.bbox ? child.bbox[1] : 0,
        x0: child.bbox ? child.bbox[0] : 0,
        node: child
      })
    }
    
    // Find unresolved regions that belong in this container
    const myUnresolved = unresolvedInScope.filter(u => containsBBox(node.bbox, u.bbox))
    for (const u of myUnresolved) {
      items.push({
        type: 'unresolved',
        y0: u.bbox[1],
        x0: u.bbox[0],
        unresolved: u
      })
      // Remove from scope so they aren't processed again
      const idx = unresolvedInScope.indexOf(u)
      if (idx !== -1) unresolvedInScope.splice(idx, 1)
    }

    // Sort by y0 asc, x0 asc, then tie breaks
    items.sort((a, b) => {
      if (Math.abs(a.y0 - b.y0) > 0.01) return a.y0 - b.y0
      if (Math.abs(a.x0 - b.x0) > 0.01) return a.x0 - b.x0
      
      // Tie breaker: conf desc (only for resolved)
      const confA = a.node?.conf || 0
      const confB = b.node?.conf || 0
      if (Math.abs(confB - confA) > 0.001) return confB - confA
      
      // Total tie breaker
      const roleA = a.node?.role || 'z'
      const roleB = b.node?.role || 'z'
      return roleA.localeCompare(roleB)
    })

    for (const item of items) {
      if (item.type === 'resolved' && item.node) {
        jsxChildren.push(processNode(item.node, unresolvedInScope))
      } else if (item.type === 'unresolved' && item.unresolved) {
        const bboxStr = item.unresolved.bbox.map(n => n.toFixed(2)).join(', ')
        // JSX comments are best added as JSX expressions containing empty string with a comment, 
        // but TS compiler API requires some care. We'll create an empty expression with a comment.
        const expr = ts.factory.createJsxExpression(undefined, undefined)
        addComment(expr, ` TODO(snapforge): ${item.unresolved.reason} at bbox [${bboxStr}] `)
        jsxChildren.push(expr)
      }
    }

    // Text child
    if (attributes['children'] !== undefined) {
      const text = attributes['children']
      delete attributes['children']
      jsxChildren.push(createJsxText(text))
    }

    return createJsxElement(tagName, attributes, jsxChildren, comments)
  }

  // Root processing
  const rootItems: ProcessedNode[] = []
  const remainingUnresolved = [...unresolvedPool]
  
  for (const node of layout.nodes) {
    rootItems.push({
      type: 'resolved',
      y0: node.bbox ? node.bbox[1] : 0,
      x0: node.bbox ? node.bbox[0] : 0,
      node
    })
  }
  
  // Pass 1: Build the JSX for all root nodes and let them consume their unresolved regions
  const rootElements: ts.JsxChild[] = []
  
  // We need to sort root nodes first to ensure deterministic order of consumption and emission
  layout.nodes.sort((a, b) => {
    const y0A = a.bbox ? a.bbox[1] : 0
    const y0B = b.bbox ? b.bbox[1] : 0
    if (Math.abs(y0A - y0B) > 0.01) return y0A - y0B
    const x0A = a.bbox ? a.bbox[0] : 0
    const x0B = b.bbox ? b.bbox[0] : 0
    if (Math.abs(x0A - x0B) > 0.01) return x0A - x0B
    if (Math.abs(b.conf - a.conf) > 0.001) return b.conf - a.conf
    return a.role.localeCompare(b.role)
  })

  for (const node of layout.nodes) {
    rootElements.push(processNode(node, remainingUnresolved))
  }

  // Any remaining unresolved go to root level
  for (const u of remainingUnresolved) {
    const bboxStr = u.bbox.map(n => n.toFixed(2)).join(', ')
    const expr = ts.factory.createJsxExpression(undefined, undefined)
    addComment(expr, ` TODO(snapforge): ${u.reason} at bbox [${bboxStr}] `)
    rootElements.push(expr)
  }

  // Note: We might want to sort rootElements by bbox as well, but since some are already JSX elements,
  // we would need to map them back. Let's rebuild the root sorting properly.
  
  // We actually shouldn't just push them at the end. We should sort everything at the root together.
  // So let's re-do the root building.
  
  const rootScopeUnresolved = [...layout.unresolved]
  const builtNodes: { y0: number, x0: number, conf: number, role: string, element: ts.JsxChild }[] = []
  
  for (const node of layout.nodes) {
    const el = processNode(node, rootScopeUnresolved)
    builtNodes.push({
      y0: node.bbox ? node.bbox[1] : 0,
      x0: node.bbox ? node.bbox[0] : 0,
      conf: node.conf,
      role: node.role,
      element: el
    })
  }
  
  for (const u of rootScopeUnresolved) {
    const bboxStr = u.bbox.map(n => n.toFixed(2)).join(', ')
    const expr = ts.factory.createJsxExpression(undefined, undefined)
    addComment(expr, ` TODO(snapforge): ${u.reason} at bbox [${bboxStr}] `)
    builtNodes.push({
      y0: u.bbox[1],
      x0: u.bbox[0],
      conf: 0,
      role: 'z_unresolved',
      element: expr
    })
  }

  builtNodes.sort((a, b) => {
    if (Math.abs(a.y0 - b.y0) > 0.01) return a.y0 - b.y0
    if (Math.abs(a.x0 - b.x0) > 0.01) return a.x0 - b.x0
    if (Math.abs(b.conf - a.conf) > 0.001) return b.conf - a.conf
    return a.role.localeCompare(b.role)
  })

  // Determine root return
  let returnExpr: ts.Expression
  if (builtNodes.length === 1) {
    returnExpr = builtNodes[0].element as ts.Expression
  } else {
    // Wrap in fragment
    returnExpr = ts.factory.createJsxFragment(
      ts.factory.createJsxOpeningFragment(),
      builtNodes.map(b => b.element),
      ts.factory.createJsxJsxClosingFragment()
    )
  }

  // Import generation
  const importDecls: ts.ImportDeclaration[] = []
  
  // Sort paths alphabetically
  const sortedPaths = Array.from(new Set([...importsToEmit.keys(), ...defaultImportsToEmit.keys()])).sort()

  for (const path of sortedPaths) {
    let defaultImport: ts.Identifier | undefined = undefined
    let namedImports: ts.ImportSpecifier[] = []

    if (defaultImportsToEmit.has(path)) {
      defaultImport = ts.factory.createIdentifier(defaultImportsToEmit.get(path)!)
    }

    if (importsToEmit.has(path)) {
      const names = Array.from(importsToEmit.get(path)!).sort()
      namedImports = names.map(name => ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name)))
    }

    const importClause = ts.factory.createImportClause(
      false,
      defaultImport,
      namedImports.length > 0 ? ts.factory.createNamedImports(namedImports) : undefined
    )

    importDecls.push(ts.factory.createImportDeclaration(
      undefined,
      importClause,
      ts.factory.createStringLiteral(path)
    ))
  }

  // Add React import if we have JSX
  importDecls.unshift(ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(false, ts.factory.createIdentifier('React'), undefined),
    ts.factory.createStringLiteral('react')
  ))

  // Function generation
  const componentName = layout.surface.name
  
  let exportMod: ts.Modifier[] = [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)]
  let statement: ts.Statement

  if (index.conventions.exportStyle === 'default') {
    exportMod.push(ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword))
    statement = ts.factory.createFunctionDeclaration(
      exportMod,
      undefined,
      ts.factory.createIdentifier(componentName),
      undefined,
      [],
      undefined,
      ts.factory.createBlock([ts.factory.createReturnStatement(returnExpr)], true)
    )
  } else {
    statement = ts.factory.createVariableStatement(
      exportMod,
      ts.factory.createVariableDeclarationList([
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(componentName),
          undefined,
          undefined,
          ts.factory.createArrowFunction(
            undefined,
            undefined,
            [],
            undefined,
            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.factory.createBlock([ts.factory.createReturnStatement(returnExpr)], true)
          )
        )
      ], ts.NodeFlags.Const)
    )
  }

  // AST Printing
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const sourceFile = ts.factory.createSourceFile(
    [...importDecls, statement],
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  )

  const hash = createHash('sha256').update(JSON.stringify(layout)).digest('hex').substring(0, 6)
  
  // Attach the header comment to the first statement (the React import)
  if (sourceFile.statements.length > 0) {
    ts.addSyntheticLeadingComment(
      sourceFile.statements[0],
      ts.SyntaxKind.SingleLineCommentTrivia,
      ` forged by SnapForge · layout ${hash}`,
      true
    )
  }

  const result = printer.printFile(sourceFile)
  return result
}
