import type { ForgePayload } from '@snapforge/schema'

export interface PairedDevice {
  name: string
  secret: Buffer
}

export interface Transport {
  pair(): Promise<PairedDevice>
  sendIndex(index: Buffer): Promise<void>          // CH1, PC -> phone
  onForge(cb: (f: ForgePayload) => void): void     // CH2, phone -> PC
  mirrorPreview(stream: ReadableStream): Promise<void>  // CH3
  clipboard: { 
    read(): Promise<string>, 
    write(s: string): Promise<void> 
  }  // CH4
  close(): Promise<void>
}
