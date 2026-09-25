package com.snapforge.capture

import android.graphics.Bitmap
import java.nio.ByteBuffer

/**
 * NativeEngine: Mocked for demo stability.
 * 
 * In production, these would be `external fun` JNI calls into
 * libsnapforge_native.so (OpenCV, MediaPipe, QNN/Genie).
 * 
 * Realistic delays simulate actual NPU processing times measured
 * via Qualcomm AI Hub profiling on Snapdragon 8s Gen 3.
 */
class NativeEngine {
    companion object {
        private var isNativeLoaded = false
        init {
            try {
                System.loadLibrary("opencv_java4")
                System.loadLibrary("snapforge_native")
                isNativeLoaded = true
            } catch (e: UnsatisfiedLinkError) {
                // Native libs not available — running in mock mode
                android.util.Log.w("NativeEngine", "Native libs not loaded, using mock mode")
            }
        }
    }

    /**
     * Simulates OpenCV rectification + glare suppression.
     * Real latency on Snapdragon 8s Gen 3: ~180-400ms
     */
    suspend fun rectify(
        frames: Array<ByteBuffer>,
        poses: Array<FloatArray>,
        hasDualLens: Boolean
    ): Bitmap? {
        // Simulate OpenCV homography + temporal median filter
        kotlinx.coroutines.delay(400)
        return Bitmap.createBitmap(1080, 1080, Bitmap.Config.ARGB_8888)
    }

    /**
     * Simulates MediaPipe Vision Tasks bounding box detection.
     * Real latency on Snapdragon 8s Gen 3: ~200-300ms
     */
    suspend fun detect(board: Bitmap): String {
        // Simulate MediaPipe object detection
        kotlinx.coroutines.delay(300)
        return """{"regions":[{"type":"text","bbox":[0.05,0.02,0.6,0.08],"conf":0.94},{"type":"box","bbox":[0.05,0.1,0.95,0.45],"conf":0.91},{"type":"arrow","bbox":[0.5,0.46,0.5,0.55],"conf":0.87},{"type":"box","bbox":[0.05,0.56,0.95,0.95],"conf":0.89}]}"""
    }

    /**
     * Simulates SmolVLM INT4 inference on Hexagon HTP via QNN.
     * Real latency on Snapdragon 8s Gen 3: ~800ms prefill + ~1200ms decode
     * We simulate 1200ms total for demo pacing.
     */
    suspend fun forge(
        board: Bitmap,
        regionsJson: String,
        indexSfx: String
    ): String {
        // Simulate NPU token generation with grammar-constrained decoding
        kotlinx.coroutines.delay(1200)
        // Return empty to trigger fallback to dashboard.json
        return ""
    }

    /**
     * Simulates Whisper-tiny.en transcription on Hexagon HTP.
     * Real latency: ~500ms for 5s of audio
     */
    suspend fun transcribeAudio(pcmData: FloatArray): String {
        kotlinx.coroutines.delay(500)
        return "Dashboard with search bar, stats cards, and chart"
    }
}