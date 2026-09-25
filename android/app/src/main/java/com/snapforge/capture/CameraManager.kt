package com.snapforge.capture

import android.content.Context
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.common.util.concurrent.ListenableFuture
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraManager(private val context: Context, private val sweepController: SweepController) {
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    val frameBuffer = FrameBuffer(8)

    fun startCamera(
        lifecycleOwner: LifecycleOwner,
        surfaceProvider: Preview.SurfaceProvider,
        onCameraCapabilityChecked: (Boolean) -> Unit
    ) {
        val cameraProviderFuture: ListenableFuture<ProcessCameraProvider> = ProcessCameraProvider.getInstance(context)

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            // 1. Preview Use Case
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(surfaceProvider)
            }

            // 2. ImageAnalysis Use Case
            val imageAnalyzer = ImageAnalysis.Builder()
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_BLOCK_PRODUCER)
                .setImageQueueDepth(8)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor) { image ->
                        if (sweepController.shouldCaptureFrame()) {
                            val pose = sweepController.getCurrentPose()
                            frameBuffer.push(image, pose)
                        } else {
                            image.close()
                        }
                    }
                }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    lifecycleOwner, 
                    cameraSelector, 
                    preview, 
                    imageAnalyzer
                )
                
                // Concurrent camera requires querying capabilities, defaulting to false for now
                onCameraCapabilityChecked(false) 
                
            } catch (exc: Exception) {
                // Ignore
            }

        }, ContextCompat.getMainExecutor(context))
    }
}