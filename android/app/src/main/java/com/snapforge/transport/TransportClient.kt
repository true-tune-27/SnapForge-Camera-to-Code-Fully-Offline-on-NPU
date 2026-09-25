package com.snapforge.transport

/**
 * P4.8: The Transport Layer Interface
 * Matches the companion's P3.3 specification.
 * 
 * Wire format:
 * - 4-byte big-endian length + msgpack body
 * - MAC validation on frames
 */
interface TransportClient {
    /**
     * CH1: Reads the design system index (index.sfx) from the PC.
     */
    suspend fun receiveIndex(): ByteArray

    /**
     * CH2: Sends the generated TSX + layout payload back to the PC.
     */
    suspend fun sendForgePayload(payload: ByteArray)

    /**
     * CH3: Push UI preview state back to the companion.
     */
    suspend fun mirrorPreview(stream: ByteArray)
    
    /**
     * Lifecycle management
     */
    suspend fun connect()
    suspend fun disconnect()
}
