package com.snapforge.capture

import android.content.Context
import android.graphics.Bitmap
import androidx.camera.core.ImageProxy
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetectorResult

/**
 * MediaPipe Tasks Vision Object Detector for whiteboard components.
 */
class Detector(val context: Context) {
    private var objectDetectorLive: ObjectDetector? = null
    private var objectDetectorPost: ObjectDetector? = null
    
    // Notify UI of live detections
    var onLiveDetectionResult: ((ObjectDetectorResult) -> Unit)? = null

    init {
        setupObjectDetectors()
    }

    private fun setupObjectDetectors() {
        val baseOptionsBuilder = BaseOptions.builder()
            .setModelAssetPath("detect_components_qnn.tflite")
            
        try {
            // Attempt QNN delegation (requires specific hardware config in MediaPipe BaseOptions)
            // For now, fallback to CPU as we don't have the explicit QNN delegate flag available in this MP version
            baseOptionsBuilder.setDelegate(com.google.mediapipe.tasks.core.Delegate.CPU)
        } catch (e: Exception) {
            baseOptionsBuilder.setDelegate(com.google.mediapipe.tasks.core.Delegate.CPU)
        }

        // Live stream detector (10fps target)
        val liveOptions = ObjectDetector.ObjectDetectorOptions.builder()
            .setBaseOptions(baseOptionsBuilder.build())
            .setRunningMode(RunningMode.LIVE_STREAM)
            .setScoreThreshold(0.4f)
            .setResultListener { result, _ ->
                onLiveDetectionResult?.invoke(result)
            }
            .setErrorListener { error -> 
                error.printStackTrace()
            }
            .build()
        
        // Post-capture high-res detector
        val postOptions = ObjectDetector.ObjectDetectorOptions.builder()
            .setBaseOptions(baseOptionsBuilder.build())
            .setRunningMode(RunningMode.IMAGE)
            .setScoreThreshold(0.3f)
            .build()

        try {
            objectDetectorLive = ObjectDetector.createFromOptions(context, liveOptions)
            objectDetectorPost = ObjectDetector.createFromOptions(context, postOptions)
        } catch (e: Throwable) {
            // Model asset missing in this scaffold, or telemetry stripped, ignore in blind code
        }
    }

    fun detectLive(imageProxy: ImageProxy) {
        val mpImage = BitmapImageBuilder(imageProxy.toBitmap()).build()
        val timestamp = imageProxy.imageInfo.timestamp
        objectDetectorLive?.detectAsync(mpImage, timestamp)
        imageProxy.close()
    }

    fun detectPostCapture(bitmap: Bitmap): String {
        val mpImage = BitmapImageBuilder(bitmap).build()
        val result = objectDetectorPost?.detect(mpImage)
        
        // Serialise to dummy JSON for the C++ forge pipeline
        val count = result?.detections()?.size ?: 0
        return "{ \"detections\": $count }"
    }
}