package com.google.android.datatransport.runtime;

import android.content.Context;

/**
 * Stub implementation of TransportRuntime to satisfy MediaPipe Tasks Vision's telemetry 
 * requirements without actually including the network-capable DataTransport library,
 * preserving our offline-only Manifest Lock invariants.
 */
public class TransportRuntime {
    public static void initialize(Context context) {
        // Do nothing. Telemetry is blackholed.
    }
    
    public static TransportRuntime getInstance() {
        return new TransportRuntime();
    }
}
