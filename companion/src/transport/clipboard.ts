import crypto from 'node:crypto'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { Transport, PairedDevice } from './index.js'
import type { ForgePayload } from '@snapforge/schema'

const execAsync = promisify(exec)

export class ClipboardTransport implements Transport {
  private secret: Buffer
  private forgeCallbacks: Array<(f: ForgePayload) => void> = []
  private isPolling = false
  private pollInterval: NodeJS.Timeout | null = null
  private lastSeenPayloadStr = ''

  constructor() {
    this.secret = crypto.randomBytes(32)
  }

  async pair(): Promise<PairedDevice> {
    this.isPolling = true
    this.pollInterval = setInterval(() => this.pollClipboard(), 1000)
    
    return {
      name: 'Office-Kit-Shared-Clipboard',
      secret: this.secret
    }
  }
  
  private async pollClipboard() {
    if (!this.isPolling) return
    
    try {
      // Windows PowerShell command to read clipboard text
      const { stdout } = await execAsync('powershell.exe -command "Get-Clipboard"')
      const text = stdout.trim()
      
      // If clipboard changed and looks like our JSON
      if (text !== this.lastSeenPayloadStr && text.startsWith('{"layout":')) {
        this.lastSeenPayloadStr = text
        try {
          const payload = JSON.parse(text) as ForgePayload
          if (payload.layout && payload.layout.surface) {
            console.log('\n📥 Office Kit Sync Detected: Received new Forge Payload')
            for (const cb of this.forgeCallbacks) {
              cb(payload)
            }
          }
        } catch (e) {
          // Not a valid JSON payload, ignore
        }
      }
    } catch (e) {
      // Ignore PowerShell errors
    }
  }

  async sendIndex(index: Buffer): Promise<void> {
    // In the Office Kit flow, the index is pre-bundled in the Android app for demo stability
    // No-op for this hackathon scaffold
  }

  onForge(cb: (f: ForgePayload) => void): void {
    this.forgeCallbacks.push(cb)
  }

  async mirrorPreview(stream: ReadableStream): Promise<void> {
    // Handled natively by Office Kit Screen Mirroring
  }

  clipboard = {
    read: async (): Promise<string> => {
      const { stdout } = await execAsync('powershell.exe -command "Get-Clipboard"')
      return stdout.trim()
    },
    write: async (s: string): Promise<void> => {
      // Escape for powershell
      const escaped = s.replace(/"/g, '""')
      await execAsync(`powershell.exe -command "Set-Clipboard -Value \\"${escaped}\\""`)
    }
  }

  async close(): Promise<void> {
    this.isPolling = false
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }
}
