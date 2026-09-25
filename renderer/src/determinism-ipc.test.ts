import { describe, it, expect } from 'vitest'
import { emitTsx } from './emit'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(__dirname, '..', '..', 'bench', 'fixtures')
const acmeIndexFile = resolve(__dirname, '..', '..', 'bench', 'repos', 'acme-web', 'index.sfx')

// This script will be invoked by node to run the emit in a separate process
const _scriptPath = resolve(__dirname, '..', 'dist', 'cli.js')

describe('Cross-Process Determinism', () => {
  it('produces identical byte output across different V8 isolates', () => {
    const layoutPath = resolve(fixturesDir, 'login-form.json')
    
    // 1. Run in THIS process
    const layout = JSON.parse(readFileSync(layoutPath, 'utf-8'))
    const index = JSON.parse(readFileSync(acmeIndexFile, 'utf-8'))
    const localOutput = emitTsx(layout, index)
    
    // 2. Run in a CHILD process (using the built CLI tool)
    // The CLI isn't built for raw stdout emitting easily without compiling,
    // so let's just write a tiny inline script and eval it in a new node process
    const evalScript = `
      import { readFileSync } from 'node:fs';
      import { emitTsx } from 'file://${resolve(__dirname, 'emit.ts').replace(/\\/g, '/')}';
      const layout = JSON.parse(readFileSync('${layoutPath.replace(/\\/g, '/')}', 'utf-8'));
      const index = JSON.parse(readFileSync('${acmeIndexFile.replace(/\\/g, '/')}', 'utf-8'));
      process.stdout.write(emitTsx(layout, index));
    `
    
    const tmpFile = resolve(__dirname, 'tmp-eval.ts')
    writeFileSync(tmpFile, evalScript)
    
    try {
      const childOutput = execFileSync(process.execPath, ['--import', 'tsx', tmpFile], { 
        encoding: 'utf-8',
        env: { ...process.env }
      })
      expect(localOutput).toBe(childOutput)
    } finally {
      unlinkSync(tmpFile)
    }
  })
})
