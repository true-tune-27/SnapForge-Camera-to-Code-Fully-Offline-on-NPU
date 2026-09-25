package com.snapforge.capture

import androidx.camera.core.ImageProxy

/**
 * Ring buffer for storing frames strictly in memory.
 * Maximum capacity: 8 frames. Overwrites oldest.
 */
class FrameBuffer(private val capacity: Int = 8) {
    private val frames = ArrayDeque<ImageProxy>(capacity)
    private val poses = ArrayDeque<FloatArray>(capacity)

    @Synchronized
    fun push(image: ImageProxy, pose: FloatArray) {
        if (frames.size == capacity) {
            val oldImage = frames.removeFirst()
            oldImage.close()
            poses.removeFirst()
        }
        frames.addLast(image)
        poses.addLast(pose)
    }

    @Synchronized
    fun clear() {
        frames.forEach { it.close() }
        frames.clear()
        poses.clear()
    }

    @Synchronized
    fun getFrames(): List<Pair<ImageProxy, FloatArray>> {
        return frames.zip(poses).toList()
    }
}