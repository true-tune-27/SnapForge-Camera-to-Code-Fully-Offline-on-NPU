package com.snapforge.telemetry

import java.util.concurrent.ConcurrentLinkedDeque

data class TraceEvent(
    val stageName: String,
    val startTimeMs: Long,
    val endTimeMs: Long = 0,
    val accelerator: String = "CPU",
    val bytesIn: Long = 0,
    val bytesOut: Long = 0
) {
    val durationMs: Long get() = if (endTimeMs > 0) endTimeMs - startTimeMs else 0
}

/**
 * P6.1: Local ring buffer for trace events.
 * No data leaves the device.
 */
object TraceManager {
    private const val MAX_EVENTS = 100
    private val buffer = ConcurrentLinkedDeque<TraceEvent>()

    fun record(event: TraceEvent) {
        buffer.addLast(event)
        if (buffer.size > MAX_EVENTS) {
            buffer.removeFirst()
        }
    }

    fun getRecentEvents(): List<TraceEvent> {
        return buffer.toList()
    }

    fun clear() {
        buffer.clear()
    }
}
