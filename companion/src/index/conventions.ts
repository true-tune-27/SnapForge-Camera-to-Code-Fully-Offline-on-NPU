import { Project, Node } from 'ts-morph'
import type { Conventions, FileCase, StyleSystem, ExportStyle } from '@snapforge/schema'
import path from 'node:path'

export interface ConventionsOptions {
  projectPath: string
  componentsDirs: string[]
}

function getFileCase(filename: string): FileCase {
  const base = path.parse(filename).name
  if (base.includes('-')) return 'kebab-case'
  if (/^[A-Z]/.test(base)) return 'PascalCase'
  return 'camelCase'
}

export function extractConventions(options: ConventionsOptions): Conventions {
  const tsConfigFilePath = path.join(options.projectPath, 'tsconfig.json')
  const project = new Project({ tsConfigFilePath })
  
  const compilerOptions = project.getCompilerOptions()
  const paths = compilerOptions.paths || {}
  const importAlias = Object.keys(paths)[0]?.replace(/\/\*$/, '') || '@/'

  let pascalCount = 0
  let kebabCount = 0
  let camelCount = 0
  let tsxCount = 0
  let jsxCount = 0
  
  const screenDirs = new Map<string, number>()
  
  const componentSourceFiles = project.getSourceFiles().filter(sf => {
    return options.componentsDirs.some(dir => sf.getFilePath().includes(dir))
  })

  // Detect file casing and extensions
  for (const sf of project.getSourceFiles()) {
    const filePath = sf.getFilePath()
    const ext = path.extname(filePath)
    
    if (ext === '.tsx') tsxCount++
    if (ext === '.jsx') jsxCount++
    
    // For file case, only look at component files to avoid config noise
    if (componentSourceFiles.includes(sf)) {
      const caseType = getFileCase(path.basename(filePath))
      if (caseType === 'PascalCase') pascalCount++
      else if (caseType === 'kebab-case') kebabCount++
      else camelCount++
    }
    
    // Screen dir
    const base = path.basename(filePath, ext)
    if (base.endsWith('Screen') || base.endsWith('Page')) {
      const dir = path.dirname(filePath)
      const rel = path.relative(options.projectPath, dir).replace(/\\/g, '/')
      screenDirs.set(rel, (screenDirs.get(rel) || 0) + 1)
    }
  }

  const fileCase: FileCase = 
    pascalCount >= kebabCount && pascalCount >= camelCount ? 'PascalCase' : 
    kebabCount >= camelCount ? 'kebab-case' : 'camelCase'
    
  const ext = tsxCount >= jsxCount ? '.tsx' : '.jsx'
  
  let screenDir = 'src/screens'
  let maxScreens = -1
  for (const [dir, count] of screenDirs.entries()) {
    if (count > maxScreens) {
      maxScreens = count
      screenDir = dir
    }
  }
  
  // Actually, if screenDirs is empty, fallback to 'src/screens' or 'src' for minimal-web
  if (screenDirs.size === 0) {
    // If no screens found, just return 'src' or 'src/screens'
    screenDir = 'src'
  }

  let namedExportCount = 0
  let defaultExportCount = 0
  
  let usesStyledComponents = 0
  let usesCssModules = 0
  let usesTailwind = 0
  let usesTokensProp = 0

  for (const sf of componentSourceFiles) {
    // Check export style
    for (const [_, decs] of sf.getExportedDeclarations()) {
      for (const dec of decs) {
        let isDefault = false
        if (Node.isFunctionDeclaration(dec) || Node.isClassDeclaration(dec)) {
          isDefault = dec.isDefaultExport()
        } else if (Node.isVariableDeclaration(dec)) {
           const exportAssigns = sf.getExportAssignments()
           isDefault = exportAssigns.some(ea => ea.getExpression().getText() === dec.getName())
        }
        
        if (isDefault) defaultExportCount++
        else namedExportCount++
      }
    }
    
    // Check styling
    const text = sf.getFullText()
    
    if (text.includes('styled-components')) {
      usesStyledComponents++
    }
    if (text.includes('.module.css') || text.includes('.module.scss')) {
      usesCssModules++
    }
    
    let hasTokensProp = false
    let hasClassName = false
    
    sf.forEachDescendant(node => {
      if (Node.isPropertySignature(node)) {
        const name = node.getName()
        if (['pad', 'space', 'gap', 'radius'].includes(name)) {
          hasTokensProp = true
        }
        if (name === 'className') {
          hasClassName = true
        }
      }
    })
    
    if (hasTokensProp) usesTokensProp++
    else if (hasClassName || text.includes('className=')) usesTailwind++
  }

  const exportStyle: ExportStyle = namedExportCount >= defaultExportCount ? 'named' : 'default'
  
  let styleSystem: StyleSystem = 'tailwind'
  const maxStyle = Math.max(usesStyledComponents, usesCssModules, Math.max(usesTokensProp, usesTailwind))
  
  if (maxStyle === usesTokensProp && usesTokensProp > 0) styleSystem = 'tokens-prop'
  else if (maxStyle === usesCssModules && usesCssModules > 0) styleSystem = 'css-modules'
  else if (maxStyle === usesStyledComponents && usesStyledComponents > 0) styleSystem = 'styled-components'

  return {
    screenDir,
    fileCase,
    ext,
    exportStyle,
    styleSystem,
    importAlias
  }
}
