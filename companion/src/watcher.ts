import chokidar from 'chokidar'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { indexComponents } from './index/components.js'
import { extractConventions } from './index/conventions.js'
import { extractTokens } from './index/tokens.js'
import type { DesignSystemIndex } from '@snapforge/schema'

export interface WatcherEvents {
  indexUpdated: (index: DesignSystemIndex) => void
  error: (err: Error) => void
}

export declare interface RepoWatcher {
  on<U extends keyof WatcherEvents>(event: U, listener: WatcherEvents[U]): this
  emit<U extends keyof WatcherEvents>(event: U, ...args: Parameters<WatcherEvents[U]>): boolean
}

export class RepoWatcher extends EventEmitter {
  private watcher: any = null
  private repoPath: string
  private isBuilding = false
  private needsRebuild = false
  
  constructor(repoPath: string) {
    super()
    this.repoPath = repoPath
  }

  async start(): Promise<DesignSystemIndex> {
    // Initial build
    const index = await this.buildIndex()
    
    // Start watching
    this.watcher = chokidar.watch([
      path.join(this.repoPath, 'src/**/*.{ts,tsx,js,jsx}'),
      path.join(this.repoPath, 'package.json'),
      path.join(this.repoPath, 'tsconfig.json')
    ], {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      cwd: this.repoPath
    })

    const onChange = () => {
      if (this.isBuilding) {
        this.needsRebuild = true
        return
      }
      this.triggerRebuild()
    }

    this.watcher
      .on('add', onChange)
      .on('change', onChange)
      .on('unlink', onChange)

    return index
  }

  private async triggerRebuild() {
    this.isBuilding = true
    try {
      const index = await this.buildIndex()
      this.emit('indexUpdated', index)
    } catch (err: any) {
      this.emit('error', err)
    } finally {
      this.isBuilding = false
      if (this.needsRebuild) {
        this.needsRebuild = false
        this.triggerRebuild()
      }
    }
  }

  private async buildIndex(): Promise<DesignSystemIndex> {
    const components = indexComponents({ projectPath: this.repoPath, componentsDirs: ['src'] })
    const conventions = extractConventions({ projectPath: this.repoPath, componentsDirs: ['src'] })
    const tokens = extractTokens({ projectPath: this.repoPath })
    
    return {
      repo: {
        name: path.basename(this.repoPath),
        framework: 'react',
        indexedAt: new Date().toISOString()
      },
      components,
      conventions,
      tokens
    }
  }

  async close() {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }
}

export function watchRepo(repoPath: string): RepoWatcher {
  return new RepoWatcher(repoPath)
}
