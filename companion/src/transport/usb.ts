import net from 'node:net'
import crypto from 'node:crypto'
import { encode, decode } from '@msgpack/msgpack'
import type { Transport, PairedDevice } from './index.js'
import type { ForgePayload } from '@snapforge/schema'

const PROTOCOL_VERSION = 1
const HMAC_LEN = 32

export class UsbTransport implements Transport {
  private server: net.Server | null = null
  private socket: net.Socket | null = null
  private secret: Buffer
  private forgeCallbacks: Array<(f: ForgePayload) => void> = []

  constructor() {
    this.secret = crypto.randomBytes(32)
  }

  async pair(): Promise<PairedDevice> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        if (this.socket) {
          socket.destroy() // Only allow one connection
          return
        }
        
        this.socket = socket
        
        // Handle incoming data
        let buffer = Buffer.alloc(0)
        
        socket.on('data', (chunk) => {
          buffer = Buffer.concat([buffer, chunk as Buffer])
          
          while (buffer.length >= 4) {
            const frameLen = buffer.readUInt32BE(0)
            const totalLen = 4 + frameLen
            
            if (buffer.length < totalLen) {
              break // Need more data
            }
            
            const frame = buffer.subarray(4, totalLen)
            buffer = buffer.subarray(totalLen)
            
            this.handleFrame(frame)
          }
        })
        
        socket.on('close', () => {
          this.socket = null
        })
        
        socket.on('error', (err) => {
          console.error('USB Transport socket error:', err)
        })
      })

      // Bind exclusively to loopback 127.0.0.1 on ephemeral port
      this.server.listen(0, '127.0.0.1', () => {
        resolve({
          name: 'USB-Tethered-Device',
          secret: this.secret
        })
      })

      this.server.on('error', reject)
    })
  }
  
  // Public for testing
  getServerPort(): number | null {
    if (!this.server) return null
    const address = this.server.address()
    if (address && typeof address === 'object') return address.port
    return null
  }

  private handleFrame(frame: Buffer) {
    if (frame.length < 1 + HMAC_LEN) {
      console.error('Frame too small')
      return
    }
    
    const version = frame[0]
    if (version !== PROTOCOL_VERSION) {
      console.error(`Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${version}`)
      return
    }
    
    const hmac = frame.subarray(1, 1 + HMAC_LEN)
    const payload = frame.subarray(1 + HMAC_LEN)
    
    const expectedHmac = crypto.createHmac('sha256', this.secret)
      .update(frame.subarray(0, 1)) // version
      .update(payload)
      .digest()
      
    if (!crypto.timingSafeEqual(hmac, expectedHmac)) {
      console.error('HMAC verification failed')
      return
    }
    
    try {
      const decoded = decode(payload) as any
      if (decoded && decoded.type === 'FORGE') {
        const forgePayload = decoded.payload as ForgePayload
        for (const cb of this.forgeCallbacks) {
          cb(forgePayload)
        }
      }
    } catch (err) {
      console.error('Failed to decode msgpack payload', err)
    }
  }

  private sendFrame(type: string, payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('No device paired/connected'))
      }
      
      const msgpackBody = encode({ type, payload })
      
      const hmac = crypto.createHmac('sha256', this.secret)
        .update(Buffer.from([PROTOCOL_VERSION]))
        .update(msgpackBody)
        .digest()
        
      const frameLen = 1 + HMAC_LEN + msgpackBody.length
      const header = Buffer.alloc(4)
      header.writeUInt32BE(frameLen, 0)
      
      const frame = Buffer.concat([
        header,
        Buffer.from([PROTOCOL_VERSION]),
        hmac,
        msgpackBody
      ])
      
      this.socket.write(frame, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async sendIndex(index: Buffer): Promise<void> {
    // Send index buffer as binary inside msgpack
    await this.sendFrame('INDEX', index)
  }

  onForge(cb: (f: ForgePayload) => void): void {
    this.forgeCallbacks.push(cb)
  }

  async mirrorPreview(stream: ReadableStream): Promise<void> {
    // A simplified stream consumer that sends chunks as 'PREVIEW_CHUNK'
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        await this.sendFrame('PREVIEW_CHUNK', value)
      }
    } finally {
      reader.releaseLock()
    }
  }

  clipboard = {
    read: async (): Promise<string> => {
      throw new Error('usb clipboard read not implemented')
    },
    write: async (s: string): Promise<void> => {
      await this.sendFrame('CLIPBOARD_WRITE', s)
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.destroy()
        this.socket = null
      }
      if (this.server) {
        this.server.close(() => resolve())
        this.server = null
      } else {
        resolve()
      }
    })
  }
}
