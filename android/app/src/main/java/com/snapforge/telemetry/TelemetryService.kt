package com.snapforge.telemetry

import android.app.Service
import android.content.Intent
import android.os.IBinder
import java.io.FileDescriptor
import java.io.PrintWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class TelemetryService : Service() {
    
    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * P6.1: Prints the latency table from dossier 07.
     * Can be invoked via: adb shell dumpsys activity service com.snapforge.telemetry.TelemetryService
     * Or if there's a system alias: adb shell dumpsys snapforge
     */
    override fun dump(fd: FileDescriptor, writer: PrintWriter, args: Array<out String>?) {
        val events = TraceManager.getRecentEvents()
        
        writer.println("SnapForge Telemetry Dump")
        writer.println("========================")
        
        if (events.isEmpty()) {
            writer.println("No trace events recorded.")
            return
        }

        val sdf = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)
        
        writer.println(String.format("%-25s | %-12s | %-12s | %-20s | %-10s", 
            "Stage", "Start", "Duration", "Accelerator", "Bytes Out"))
        writer.println("-".repeat(85))
        
        for (event in events) {
            val startStr = sdf.format(Date(event.startTimeMs))
            val durationStr = "${event.durationMs}ms"
            val bytesStr = if (event.bytesOut > 0) "${event.bytesOut} B" else "-"
            
            writer.println(String.format("%-25s | %-12s | %-12s | %-20s | %-10s",
                event.stageName, startStr, durationStr, event.accelerator, bytesStr))
        }
        
        writer.println("========================")
        writer.println("Total Events in Ring Buffer: ${events.size}")
    }
}
