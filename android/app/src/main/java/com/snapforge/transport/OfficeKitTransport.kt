package com.snapforge.transport

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Office Kit Transport: Uses Android's ClipboardManager to send payloads.
 * 
 * iQOO Office Kit's "Shared Clipboard" feature automatically syncs the
 * Android clipboard to the paired laptop. By writing our JSON payload
 * to the clipboard, Office Kit transports it over USB without needing
 * raw ADB sockets or INTERNET permission.
 * 
 * Fallback: Also writes the payload to a file in shared storage that
 * Office Kit's "File Transfer" can pick up.
 */
class OfficeKitTransport(private val context: Context) : TransportClient {
    
    companion object {
        private const val TAG = "OfficeKitTransport"
        private const val CLIP_LABEL = "snapforge_payload"
        private const val PAYLOAD_FILENAME = "snapforge_latest.json"
    }

    private var isConnected = false

    override suspend fun connect() {
        isConnected = true
        Log.i(TAG, "Office Kit transport ready (clipboard + file bridge)")
    }

    /**
     * Receives index.sfx from the laptop.
     * In the Office Kit flow, the laptop places the index on the shared clipboard
     * or in the Office Kit shared folder. For the demo, we read from assets.
     */
    override suspend fun receiveIndex(): ByteArray = withContext(Dispatchers.IO) {
        context.assets.open("mock/index.sfx").use { it.readBytes() }
    }

    /**
     * Sends the forge payload to the laptop via two channels:
     * 1. System Clipboard (synced by Office Kit Shared Clipboard)
     * 2. File in shared storage (accessible by Office Kit File Transfer)
     */
    override suspend fun sendForgePayload(payload: ByteArray) {
        val payloadStr = String(payload, Charsets.UTF_8)
        
        // Channel 1: Write to system clipboard (Office Kit syncs this)
        withContext(Dispatchers.Main) {
            try {
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText(CLIP_LABEL, payloadStr)
                clipboard.setPrimaryClip(clip)
                Log.i(TAG, "Payload written to clipboard (${payload.size} bytes)")
            } catch (e: Exception) {
                Log.w(TAG, "Clipboard write failed: ${e.message}")
            }
        }
        
        // Channel 2: Write to file for Office Kit File Transfer pickup
        withContext(Dispatchers.IO) {
            try {
                val outputDir = context.getExternalFilesDir(null) ?: context.filesDir
                val outputFile = File(outputDir, PAYLOAD_FILENAME)
                outputFile.writeText(payloadStr)
                Log.i(TAG, "Payload written to file: ${outputFile.absolutePath}")
            } catch (e: Exception) {
                Log.w(TAG, "File write failed: ${e.message}")
            }
        }
    }

    override suspend fun mirrorPreview(stream: ByteArray) {
        // Office Kit screen mirroring handles this natively
        Log.d(TAG, "Preview mirror handled by Office Kit screen share")
    }

    override suspend fun disconnect() {
        isConnected = false
        Log.i(TAG, "Office Kit transport disconnected")
    }
}
