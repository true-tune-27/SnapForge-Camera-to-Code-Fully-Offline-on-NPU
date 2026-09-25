import type { Transport, PairedDevice } from './index.js'
import type { ForgePayload } from '@snapforge/schema'

/**
 * iQOO Office Kit SDK Adapter.
 * We do not have the SDK in this environment. This is a thin shim 
 * that must be completed by a human with SDK access.
 */
export class OfficeKitTransport implements Transport {
  
  async pair(): Promise<PairedDevice> {
    // TODO(officekit): bind to SDK pairing method (e.g., OfficeKit.startPairing())
    throw new Error('officekit pair() not implemented')
  }

  async sendIndex(_index: Buffer): Promise<void> {
    // TODO(officekit): bind Office Kit PC->Phone send method
    throw new Error('Not implemented')
  }

  onForge(_cb: (f: ForgePayload) => void): void {
    // TODO(officekit): bind Office Kit Phone->PC receive method
    throw new Error('Not implemented')
  }

  async mirrorPreview(_stream: ReadableStream): Promise<void> {
    // TODO(officekit): bind Office Kit video streaming
    throw new Error('Not implemented')
  }

  clipboard = {
    read: async (): Promise<string> => {
      // TODO(officekit): bind Office Kit clipboard.read()
      throw new Error('Not implemented')
    },
    write: async (_s: string): Promise<void> => {
      // TODO(officekit): bind Office Kit clipboard.write()
      throw new Error('Not implemented')
    }
  }

  async close(): Promise<void> {
    // TODO(officekit): bind to SDK cleanup/disconnect method
    throw new Error('officekit close() not implemented')
  }
}
