package com.snapforge.capture

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * P4.6 Voice loop - In-memory bounded PCM buffer (16kHz Mono).
 * Dossier §12: Audio must strictly stay in memory and be discarded immediately.
 */
class AudioRecorder {
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private val sampleRate = 16000
    private val bufferSize = AudioRecord.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
    ) * 2

    // Max 30 seconds of audio to prevent unbounded memory growth
    private val MAX_BYTES = sampleRate * 2 * 30 
    private val outStream = ByteArrayOutputStream()

    @SuppressLint("MissingPermission")
    fun startRecording() {
        if (isRecording) return
        
        outStream.reset()
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize
        )

        audioRecord?.startRecording()
        isRecording = true

        Thread {
            val audioBuffer = ByteArray(bufferSize)
            while (isRecording && outStream.size() < MAX_BYTES) {
                val read = audioRecord?.read(audioBuffer, 0, audioBuffer.size) ?: 0
                if (read > 0) {
                    outStream.write(audioBuffer, 0, read)
                }
            }
            stopRecording()
        }.start()
    }

    fun stopRecording() {
        if (!isRecording) return
        isRecording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }

    /**
     * Converts the PCM 16-bit bytes into floats [-1.0f, 1.0f] required by whisper.cpp
     */
    suspend fun getAudioAsFloats(): FloatArray = withContext(Dispatchers.Default) {
        val bytes = outStream.toByteArray()
        val floats = FloatArray(bytes.size / 2)
        val byteBuffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        for (i in floats.indices) {
            floats[i] = byteBuffer.short.toFloat() / 32768.0f
        }
        
        // Dossier §12: Discard buffer immediately after extracting to float array
        outStream.reset()
        floats
    }
}
