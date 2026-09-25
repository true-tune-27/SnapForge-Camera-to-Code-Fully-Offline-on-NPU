#!/usr/bin/env node
import path from 'node:path'
import { parseArgs } from 'node:util'
import { ClipboardTransport } from './transport/clipboard.js'
import { watchRepo } from './watcher.js'
import { landPayload } from './landing/index.js'
import { indexComponents } from './index/components.js'
import { extractTokens } from './index/tokens.js'
import { extractConventions } from './index/conventions.js'
import zlib from 'node:zlib'
import { promisify } from 'node:util'
import { readFileSync, existsSync } from 'node:fs'
import type { DesignSystemIndex } from '@snapforge/schema'

const gzip = promisify(zlib.gzip)

const { positionals, values: flags } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    watch: { type: 'boolean', short: 'w' },
    help: { type: 'boolean', short: 'h' },
  },
})

const command = positionals[0] || 'serve'
const targetDir = positionals[1] ? path.resolve(positionals[1]) : process.cwd()

async function main() {
  if (flags.help) {
    printHelp()
    return
  }

  switch (command) {
    case 'pair':
      await cmdPair()
      break
    case 'index':
      await cmdIndex()
      break
    case 'serve':
      await cmdServe()
      break
    case 'doctor':
      await cmdDoctor()
      break
    case 'forge':
      await cmdForge()
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

function printHelp() {
  console.log(`
\x1b[36mSnapForge\x1b[0m Companion CLI

Usage: snapforge <command> [repo-path] [options]

Commands:
  pair              Interactive pairing with a device
  index [--watch]   Index the repo, optionally keep watching
  serve             pair + index + watch + land (normal mode)
  doctor            Diagnose: is this a React+TS repo, tokens, git state
  forge <file.json> Land a layout JSON directly, no phone
  `)
}

async function cmdPair() {
  console.log(`\x1b[36mSnapForge\x1b[0m Pairing via Office Kit...`)
  const transport = new ClipboardTransport()
  const pairInfo = await transport.pair()
  console.log(`Device paired: \x1b[32m${pairInfo.name}\x1b[0m`)
  console.log(`Listening for clipboard syncs...`)
}

async function cmdIndex() {
  console.log(`\x1b[36mSnapForge\x1b[0m Indexing ${targetDir}...`)
  const startTime = Date.now()
  const components = await indexComponents({ projectPath: targetDir, componentsDirs: ['src/components', 'src/ui'] })
  const tokens = await extractTokens({ projectPath: targetDir })
  const conventions = extractConventions({ projectPath: targetDir, componentsDirs: ['src/components', 'src/ui'] })
  const elapsed = Date.now() - startTime
  console.log(`Indexed \x1b[32m${components.length} components\x1b[0m in ${elapsed}ms`)
  console.log(`Tokens: ${Object.keys(tokens.space || {}).length} space, ${Object.keys(tokens.radius || {}).length} radius`)
  console.log(`Conventions: ${conventions.styleSystem}, ${conventions.fileCase}, ${conventions.ext}`)

  if (flags.watch) {
    console.log(`Watching for changes...`)
    const watcher = watchRepo(targetDir)
    watcher.on('indexUpdated', (index: any) => {
      console.log(`Re-indexed: \x1b[32m${index.components.length} components\x1b[0m`)
    })
    await watcher.start()
  }
}

async function cmdServe() {
  console.log(`\x1b[36mSnapForge\x1b[0m Companion starting...`)
  console.log(`Target repository: \x1b[33m${targetDir}\x1b[0m`)

  const watcher = watchRepo(targetDir)
  let currentIndex: DesignSystemIndex | null = null
  const transport = new ClipboardTransport()

  const sendIndex = async (index: DesignSystemIndex) => {
    const jsonStr = JSON.stringify(index)
    const compressed = await gzip(jsonStr)
    await transport.sendIndex(compressed).catch(() => {})
  }

  watcher.on('indexUpdated', async (index: any) => {
    currentIndex = index
    console.log(`Index updated: \x1b[32m${index.components.length} components\x1b[0m`)
    await sendIndex(index)
  })

  currentIndex = await watcher.start()
  console.log(`Initial index complete: \x1b[32m${currentIndex.components.length} components\x1b[0m`)

  transport.onForge(async (payload: any) => {
    console.log(`Received forge request for \x1b[36m${payload.layout.surface.name}\x1b[0m`)
    if (!currentIndex) return
    const result = await landPayload({ repoPath: targetDir, payload, index: currentIndex })
    if (result.success) {
      console.log(`\x1b[32mSuccessfully landed\x1b[0m on branch \x1b[33m${result.branch}\x1b[0m`)
    } else {
      console.error(`\x1b[31mFailed to land:\x1b[0m ${result.error}`)
    }
  })

  console.log(`Waiting for Office Kit connection...`)
  const pairInfo = await transport.pair()
  console.log(`Device paired: \x1b[32m${pairInfo.name}\x1b[0m`)
  await sendIndex(currentIndex)
}

async function cmdDoctor() {
  console.log(`\x1b[36mSnapForge\x1b[0m Doctor — diagnosing ${targetDir}\n`)
  let ok = true

  // Check: Is this a React+TS repo?
  const tsconfigPath = path.join(targetDir, 'tsconfig.json')
  if (existsSync(tsconfigPath)) {
    console.log(`  ✅ tsconfig.json found`)
  } else {
    console.log(`  ❌ tsconfig.json NOT found — this doesn't look like a TypeScript project`)
    ok = false
  }

  // Check: package.json has react
  const pkgPath = path.join(targetDir, 'package.json')
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps.react) {
      console.log(`  ✅ React ${deps.react} found`)
    } else {
      console.log(`  ❌ React not found in dependencies`)
      ok = false
    }
    if (deps.typescript) {
      console.log(`  ✅ TypeScript ${deps.typescript} found`)
    }
  } else {
    console.log(`  ❌ package.json NOT found`)
    ok = false
  }

  // Check: Can we find components?
  try {
    const components = await indexComponents({ projectPath: targetDir, componentsDirs: ['src/components', 'src/ui'] })
    if (components.length > 0) {
      console.log(`  ✅ Found ${components.length} components`)
      if (components.length > 200) {
        console.log(`  ⚠️  ${components.length} components — indexing may be slow`)
      }
    } else {
      console.log(`  ⚠️  No components found — check your component directories`)
    }
  } catch (e: any) {
    console.log(`  ❌ Component indexing failed: ${e.message}`)
    ok = false
  }

  // Check: Can we find tokens?
  try {
    const tokens = await extractTokens({ projectPath: targetDir })
    const spaceCount = Object.keys(tokens.space || {}).length
    const radiusCount = Object.keys(tokens.radius || {}).length
    if (spaceCount > 0 || radiusCount > 0) {
      console.log(`  ✅ Token source found: ${spaceCount} space, ${radiusCount} radius tokens`)
    } else {
      console.log(`  ⚠️  No token source found — looked for theme.ts, tokens.ts, tailwind.config, CSS custom properties`)
    }
  } catch {
    console.log(`  ⚠️  Token extraction failed`)
  }

  // Check: Is git clean?
  try {
    const { execSync } = await import('node:child_process')
    const status = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf-8' })
    if (status.trim() === '') {
      console.log(`  ✅ Git working tree is clean`)
    } else {
      const changedFiles = status.trim().split('\n').length
      console.log(`  ⚠️  Git working tree has ${changedFiles} modified files`)
    }
  } catch {
    console.log(`  ⚠️  Could not check git status`)
  }

  console.log(`\n${ok ? '✅ Repository looks good!' : '❌ Some issues found — see above'}`)
}

async function cmdForge() {
  const layoutFile = positionals[1]
  if (!layoutFile) {
    console.error('Usage: snapforge forge <layout.json>')
    process.exit(1)
  }

  console.log(`\x1b[36mSnapForge\x1b[0m Forging from ${layoutFile}...`)
  const layout = JSON.parse(readFileSync(path.resolve(layoutFile), 'utf-8'))

  // Index the current directory as the repo
  const repoDir = process.cwd()
  const components = await indexComponents({ projectPath: repoDir, componentsDirs: ['src/components', 'src/ui'] })
  const tokens = await extractTokens({ projectPath: repoDir })
  const conventions = extractConventions({ projectPath: repoDir, componentsDirs: ['src/components', 'src/ui'] })

  const index: DesignSystemIndex = {
    repo: { name: path.basename(repoDir), framework: 'react-ts', indexedAt: new Date().toISOString() },
    components,
    tokens,
    conventions,
  }

  const result = await landPayload({
    repoPath: repoDir,
    payload: { layout },
    index,
  })

  if (result.success) {
    console.log(`\x1b[32mForged successfully!\x1b[0m Branch: ${result.branch}`)
  } else {
    console.error(`\x1b[31mFailed:\x1b[0m ${result.error}`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
