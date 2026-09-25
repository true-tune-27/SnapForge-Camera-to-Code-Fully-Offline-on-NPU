package com.snapforge.capture

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetectorResult

@Composable
fun DetectionOverlay(result: ObjectDetectorResult?) {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val canvasWidth = size.width
        val canvasHeight = size.height

        result?.detections()?.forEach { detection ->
            val box = detection.boundingBox()
            val category = detection.categories().firstOrNull()
            val score = category?.score() ?: 0f
            
            // Default assumes a normalised box, but MP gives pixel coords 
            // relative to the original image. We'd map them to Canvas size here.
            // Simplified mapping for the skeleton:
            val left = box.left * (canvasWidth / 1080f)
            val top = box.top * (canvasHeight / 1920f)
            val width = box.width() * (canvasWidth / 1080f)
            val height = box.height() * (canvasHeight / 1920f)
            
            val isLowConfidence = score < 0.6f
            val color = if (isLowConfidence) Color.Red else Color.Green
            
            val style = if (isLowConfidence) {
                Stroke(width = 4f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(20f, 20f), 0f))
            } else {
                Stroke(width = 4f)
            }

            drawRect(
                color = color,
                topLeft = Offset(left, top),
                size = Size(width, height),
                style = style
            )
        }
    }
}