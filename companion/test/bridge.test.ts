import { describe, it, expect, afterAll } from 'vitest'
import net from 'node:net'
import crypto from 'node:crypto'
import { encode, decode } from '@msgpack/msgpack'
import { UsbTransport } from '../src/transport/usb.js'
import type { ForgePayload } from '@snapforge/schema'

const PROTOCOL_VERSION = 1
const HMAC_LEN = 32

describe('USB Transport Bridge', () => {
  let transport: UsbTransport
  
  afterAll(async () => {
    if (transport) await transport.close()
  })

  it('runs a loopback round trip (index out, forge back) securely', async () => {
    transport = new UsbTransport()
    const pairResult = await transport.pair()
    
    expect(pairResult.secret).toBeDefined()
    expect(pairResult.secret.length).toBe(32)
    
    const port = transport.getServerPort()
    expect(port).toBeDefined()
    expect(port).toBeGreaterThan(0)
    
    // Assert loopback binding: connect from a mock client
    const client = new net.Socket()
    
    // Try to connect to 127.0.0.1
    await new Promise<void>((resolve, reject) => {
      client.connect(port!, '127.0.0.1', () => resolve())
      client.on('error', reject)
    })
    
    // 1. Setup onForge listener on transport
    const forgeReceived = new Promise<ForgePayload>((resolve) => {
      transport.onForge((f) => resolve(f))
    })
    
    // 2. Setup client receiver for index
    const indexReceived = new Promise<Buffer>((resolve) => {
      let buffer = Buffer.alloc(0)
      client.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk])
        if (buffer.length >= 4) {
          const frameLen = buffer.readUInt32BE(0)
          if (buffer.length >= 4 + frameLen) {
            const frame = buffer.subarray(4, 4 + frameLen)
            const payloadBytes = frame.subarray(1 + HMAC_LEN)
            const decoded = decode(payloadBytes) as any
            if (decoded.type === 'INDEX') {
              resolve(Buffer.from(decoded.payload))
            }
          }
        }
      })
    })
    
    // 3. Send index from transport (PC -> Phone)
    const mockIndexData = Buffer.from('mock-index-data')
    await transport.sendIndex(mockIndexData)
    
    const receivedIndex = await indexReceived
    expect(receivedIndex.toString()).toBe('mock-index-data')
    
    // 4. Send ForgePayload from client (Phone -> PC)
    const mockForge: ForgePayload = {
      layout: {
        id: 'test',
        surface: { kind: 'screen', id: 'screen-1' },
        nodes: [],
        unresolved: []
      },
      patch: []
    }
    
    const msgpackBody = encode({ type: 'FORGE', payload: mockForge })
    const hmac = crypto.createHmac('sha256', pairResult.secret)
      .update(Buffer.from([PROTOCOL_VERSION]))
      .update(msgpackBody)
      .digest()
      
    const frameLen = 1 + HMAC_LEN + msgpackBody.length
    const header = Buffer.alloc(4)
    header.writeUInt32BE(frameLen, 0)
    
    const clientFrame = Buffer.concat([
      header,
      Buffer.from([PROTOCOL_VERSION]),
      hmac,
      msgpackBody
    ])
    
    client.write(clientFrame)
    
    // 5. Verify the forge payload was correctly unpacked by transport
    const receivedForge = await forgeReceived
    expect(receivedForge.layout.id).toBe('test')
    
    // 6. Security invariant: verify it's bound to loopback only.
    // Try to connect via local IP (e.g. 192.168.x.x or whatever, but loopback test is sufficient).
    // The node server listening on '127.0.0.1' implicitly refuses external interfaces.
    // We can verify this via server.address().address in node.
    // Since we can't easily access the raw server in our test without casting, we just verify our own address.
    // However, the test requirement is "assert the listener is bound to loopback"
    // Since we connect to 127.0.0.1 and it works, it is loopback.
    // To strictly assert it's NOT bound to 0.0.0.0, we would need to check the net.Server address.
    const serverAddress = (transport as any).server.address()
    expect(serverAddress.address).toBe('127.0.0.1')
    
    client.destroy()
  })
})
