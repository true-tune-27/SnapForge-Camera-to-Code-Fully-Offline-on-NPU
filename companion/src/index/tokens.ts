import { Project } from 'ts-morph'
import type { DesignTokens, TokenScale, ColorScale } from '@snapforge/schema'
import path from 'node:path'
import { existsSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

export interface TokensOptions {
  projectPath: string
}

function extractFromThemeModule(projectPath: string, project: Project): DesignTokens | null {
  const themeFiles = [
    'src/theme.ts', 'src/tokens.ts', 'src/design-tokens.ts',
    'src/theme/tokens.ts', 'src/theme/index.ts'
  ]
  
  for (const rel of themeFiles) {
    const fullPath = path.join(projectPath, rel)
    if (!existsSync(fullPath)) continue
    
    const sf = project.getSourceFile(fullPath)
    if (!sf) continue
    
    // Transpile TS to JS
    const js = ts.transpileModule(sf.getFullText(), {
      compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText
    
    const context = {
      exports: {} as any,
      module: { exports: {} as any },
      require: () => { throw new Error('require not allowed') },
      console: { log: () => {} }
    }
    
    try {
      vm.createContext(context)
      vm.runInContext(js, context, { timeout: 1000 })
      
      const exported = context.exports.tokens || context.exports.theme || context.exports.default
      if (exported) {
        return {
          space: exported.space || exported.spacing || {},
          radius: exported.radius || exported.borderRadius || {},
          color: exported.colors || exported.color || {}
        }
      }
    } catch (err) {
      console.warn(`Failed to evaluate theme module ${rel}`, err)
    }
  }
  
  return null
}

function extractFromTailwind(projectPath: string): DesignTokens | null {
  // If there's a tailwind config, we'd normally require it and call resolveConfig.
  // In a real app we'd spawn a child process since requiring untrusted code is unsafe.
  // For the hackathon, we can try to parse it safely or return a stub.
  const twPath = path.join(projectPath, 'tailwind.config.js')
  if (!existsSync(twPath)) return null
  
  // Dummy extraction for tailwind if the file exists but we don't want to eval it unsafely
  return {
    space: { '4': 16, '8': 32 },
    radius: { 'md': 8 },
    color: {}
  }
}

function extractFromCss(_projectPath: string, project: Project): DesignTokens | null {
  const space: TokenScale = {}
  const radius: TokenScale = {}
  const color: ColorScale = {}
  
  let found = false
  
  // A simple regex approach instead of full PostCSS for speed
  for (const sf of project.getSourceFiles()) {
    if (sf.getFilePath().endsWith('.css')) {
      const text = sf.getFullText()
      const matches = text.matchAll(/--(space|radius|color)-([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)
      for (const match of matches) {
        found = true
        const [, type, name, val] = match
        const numVal = parseFloat(val)
        if (type === 'space' && !isNaN(numVal)) space[name] = numVal
        if (type === 'radius' && !isNaN(numVal)) radius[name] = numVal
        if (type === 'color') color[name] = val
      }
    }
  }
  
  if (found) return { space, radius, color }
  return null
}

export function extractTokens(options: TokensOptions): DesignTokens {
  const tsConfigFilePath = path.join(options.projectPath, 'tsconfig.json')
  const project = new Project({ tsConfigFilePath })
  
  // 1. Theme module
  const fromTheme = extractFromThemeModule(options.projectPath, project)
  if (fromTheme) return fromTheme
  
  // 2. Tailwind
  const fromTw = extractFromTailwind(options.projectPath)
  if (fromTw) return fromTw
  
  // 3. CSS
  const fromCss = extractFromCss(options.projectPath, project)
  if (fromCss) return fromCss
  
  // Fallback
  return {
    space: { '4': 4, '8': 8, '16': 16, '24': 24, '32': 32 },
    radius: { sm: 4, md: 8, lg: 16, full: 9999 },
    color: {}
  }
}
