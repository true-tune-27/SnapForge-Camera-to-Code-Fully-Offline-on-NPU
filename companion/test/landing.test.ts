import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as git from 'isomorphic-git'
import { landPayload } from '../src/landing/index.js'

import type { ForgePayload } from '@snapforge/schema'

const execAsync = promisify(exec)

describe('Landing Service', () => {
  let tempRepoPath: string

  beforeAll(async () => {
    // 1. Create a temp directory
    tempRepoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'snapforge-test-'))
    
    // 2. Copy minimal-web to temp dir
    const sourceDir = path.resolve(__dirname, '..', '..', 'bench', 'repos', 'minimal-web')
    await execAsync(`xcopy "${sourceDir}" "${tempRepoPath}" /E /I /Q /Y`)
    
    // 3. Initialize git and commit
    await execAsync(`git init`, { cwd: tempRepoPath })
    await execAsync(`git config core.autocrlf false`, { cwd: tempRepoPath })
    await execAsync(`git config user.name "Test User"`, { cwd: tempRepoPath })
    await execAsync(`git config user.email "test@example.com"`, { cwd: tempRepoPath })
    await execAsync(`npm install typescript@5.6.2 --no-save`, { cwd: tempRepoPath })
    await execAsync(`git add .`, { cwd: tempRepoPath })
    await execAsync(`git commit -m "Initial commit"`, { cwd: tempRepoPath })
  }, 30000)

  afterAll(async () => {
    // Clean up
    if (tempRepoPath) {
      await fs.rm(tempRepoPath, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('refuses to land if HEAD is on protected branch (master)', async () => {
    const payload: ForgePayload = {
      layout: {
        id: 'mock-1',
        surface: { kind: 'screen', id: 'screen-1', name: 'MockNewScreen' },
        nodes: [
          { id: '1', kind: 'container', role: 'container.panel', parentId: 'screen-1', children: [], style: {} }
        ],
        unresolved: []
      }
    }

    const index: DesignSystemIndex = {
      repo: { name: 'test', framework: 'react', indexedAt: new Date().toISOString() },
      components: [],
      conventions: {
        screenDir: 'src/components',
        fileCase: 'PascalCase',
        ext: '.tsx',
        exportStyle: 'named',
        styleSystem: 'tailwind',
        importAlias: '@/'
      },
      tokens: { space: {}, radius: {} }
    }

    const result = await landPayload({
      repoPath: tempRepoPath,
      payload,
      index
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/HEAD is on protected branch/)
  })

  it('lands successfully on a feature branch', async () => {
    // Checkout a non-protected branch
    await execAsync(`git checkout -b feature/ui-test`, { cwd: tempRepoPath })

    const payload: ForgePayload = {
      layout: {
        id: 'MockNewScreen',
        surface: { kind: 'screen', id: 'screen-1', name: 'MockNewScreen' },
        nodes: [
          { id: '1', kind: 'container', role: 'container.panel', parentId: 'screen-1', children: [], style: {} }
        ],
        unresolved: []
      }
    }

    const index: DesignSystemIndex = {
      repo: { name: 'test', framework: 'react', indexedAt: new Date().toISOString() },
      components: [],
      conventions: {
        screenDir: 'src/components',
        fileCase: 'PascalCase',
        ext: '.tsx',
        exportStyle: 'named',
        styleSystem: 'tailwind',
        importAlias: '@/'
      },
      tokens: { space: {}, radius: {} }
    }

    const result = await landPayload({
      repoPath: tempRepoPath,
      payload,
      index
    })

    // It should succeed and create a new branch snapforge/MockNewScreen-*
    if (!result.success) console.error(result.error)
    expect(result.success).toBe(true)
    expect(result.branch).toMatch(/^snapforge\/MockNewScreen-/)

    // Assert the branch exists
    const branches = await git.listBranches({ fs, dir: tempRepoPath })
    expect(branches).toContain(result.branch)

    const targetFile = path.join(tempRepoPath, 'src/components/MockNewScreenScreen.tsx')
    const exists = await fs.access(targetFile).then(() => true).catch(() => false)
    if (!exists) {
      console.log('Files in src/components:', await fs.readdir(path.join(tempRepoPath, 'src/components')))
    }
    expect(exists).toBe(true)
    
    // Switch back to main/master, working tree should be untouched
    await execAsync(`git checkout master`, { cwd: tempRepoPath })
    
    // File shouldn't exist on master
    const existsOnMaster = await fs.access(targetFile).then(() => true).catch(() => false)
    expect(existsOnMaster).toBe(false)
  }, 30000)
})
