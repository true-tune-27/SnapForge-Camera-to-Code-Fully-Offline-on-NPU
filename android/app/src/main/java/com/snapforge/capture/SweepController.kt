package com.snapforge.capture

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.sqrt

/**
 * Uses the accelerometer and gyroscope to detect sweep start/end,
 * and select 8 frames spaced evenly by angular displacement.
 */
class SweepController(context: Context) : SensorEventListener {
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val gyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
    
    private var isSweeping = false
    private var accumulatedAngle = 0f
    private var lastTimestamp: Long = 0
    
    private val _frameCount = MutableStateFlow(0)
    val frameCount: StateFlow<Int> = _frameCount.asStateFlow()

    private val ANGLE_THRESHOLD = 0.05f // Radians between frames
    private val SWEEP_MAX_FRAMES = 8

    fun startSweep() {
        isSweeping = true
        accumulatedAngle = 0f
        lastTimestamp = 0
        _frameCount.value = 0
        sensorManager.registerListener(this, gyro, SensorManager.SENSOR_DELAY_GAME)
    }

    fun stopSweep() {
        isSweeping = false
        sensorManager.unregisterListener(this)
    }

    private var lastFrameTimeMs: Long = 0

    // Called for each camera frame
    fun shouldCaptureFrame(): Boolean {
        if (!isSweeping || _frameCount.value >= SWEEP_MAX_FRAMES) return false
        
        val now = System.currentTimeMillis()
        val timeElapsed = lastFrameTimeMs != 0L && (now - lastFrameTimeMs > 250)
        
        if (_frameCount.value == 0 || accumulatedAngle >= ANGLE_THRESHOLD || timeElapsed) {
            _frameCount.value += 1
            accumulatedAngle = 0f
            lastFrameTimeMs = now
            if (_frameCount.value >= SWEEP_MAX_FRAMES) {
                stopSweep()
            }
            return true
        }
        return false
    }

    fun getCurrentPose(): FloatArray {
        // Return a dummy IMU pose matrix for the C++ rectifier's initial guess
        return floatArrayOf(
            1f, 0f, 0f, 0f,
            0f, 1f, 0f, 0f,
            0f, 0f, 1f, 0f,
            0f, 0f, 0f, 1f
        )
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || !isSweeping) return
        if (event.sensor.type == Sensor.TYPE_GYROSCOPE) {
            val dT = if (lastTimestamp != 0L) (event.timestamp - lastTimestamp) * 1.0f / 1000000000.0f else 0f
            lastTimestamp = event.timestamp
            
            val omegaMagnitude = sqrt(event.values[0] * event.values[0] + 
                                      event.values[1] * event.values[1] + 
                                      event.values[2] * event.values[2])
            accumulatedAngle += omegaMagnitude * dT
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}