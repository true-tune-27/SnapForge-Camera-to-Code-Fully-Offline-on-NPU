package com.snapforge.transport

import android.net.LocalSocket
import android.net.LocalSocketAddress
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.io.OutputStream
import java.nio.ByteBuffer

/**
 * P4.8: USB Backend (ADB Reverse link-local fallback)
 * Bypasses the INTERNET permission restriction by using Unix Domain Sockets.
 * 
 * To bridge this from the developer laptop:
 *   adb reverse localabstract:snapforge tcp:<ephemeral_port>
 */
class UsbTransport : TransportClient {
    private var socket: LocalSocket? = null
    private var inputStream: InputStream? = null
    private var outputStream: OutputStream? = null

    override suspend fun connect() = withContext(Dispatchers.IO) {
        socket = LocalSocket()
        // Connect to the abstract Unix socket namespace mapped to ADB reverse
        socket?.connect(LocalSocketAddress("snapforge"))
        inputStream = socket?.inputStream
        outputStream = socket?.outputStream
    }

    override suspend fun receiveIndex(): ByteArray = withContext(Dispatchers.IO) {
        val inStream = inputStream ?: throw IllegalStateException("Not connected")
        
        // Read 4-byte big-endian length prefix
        val lengthBuffer = ByteArray(4)
        var bytesRead = 0
        while (bytesRead < 4) {
            val result = inStream.read(lengthBuffer, bytesRead, 4 - bytesRead)
            if (result == -1) throw java.io.EOFException()
            bytesRead += result
        }
        
        val payloadLength = ByteBuffer.wrap(lengthBuffer).int
        val payload = ByteArray(payloadLength)
        
        // Read msgpack payload
        bytesRead = 0
        while (bytesRead < payloadLength) {
            val result = inStream.read(payload, bytesRead, payloadLength - bytesRead)
            if (result == -1) throw java.io.EOFException()
            bytesRead += result
        }
        
        payload
    }

    override suspend fun sendForgePayload(payload: ByteArray) = withContext(Dispatchers.IO) {
        val outStream = outputStream ?: throw IllegalStateException("Not connected")
        
        // Write 4-byte big-endian length prefix
        val lengthBuffer = ByteBuffer.allocate(4).putInt(payload.size).array()
        outStream.write(lengthBuffer)
        
        // Write msgpack payload
        outStream.write(payload)
        outStream.flush()
    }

    override suspend fun mirrorPreview(stream: ByteArray) {
        // Implement in CH3
    }

    override suspend fun disconnect() = withContext(Dispatchers.IO) {
        try {
            inputStream?.close()
            outputStream?.close()
            socket?.close()
        } catch (e: Exception) {
            // Ignore
        } finally {
            inputStream = null
            outputStream = null
            socket = null
        }
        Unit
    }
}
