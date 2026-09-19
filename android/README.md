# android/

Kotlin + Compose app. JNI bridge to native/. QNN runner for on-device inference.

## What will live here (Phase 4)

- Single Activity, Compose navigation, three screens: Capture, Preview, History
- CameraX dual-stream capture with IMU-guided sweep
- JNI bridge to native/ for rectification and detection
- QNN Genie runner with grammar-constrained decode
- Whisper.cpp for voice ASR
- Room DB for forge history
- EncryptedFile for cached index.sfx
- Office Kit transport client

## The manifest lock

`AndroidManifest.xml` declares exactly two permissions: `CAMERA` and `RECORD_AUDIO`.
No `INTERNET` permission. Ever. This is the product's core claim.

A Gradle task `verifyNoInternetPermission` fails the build if INTERNET appears
in the merged manifest. This runs on every build, not just CI.
