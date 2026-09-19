---
description: Network access rules — the product's core claim
---
The Android app has NO network capability. This is enforced, not promised.

FORBIDDEN in android/:
- `android.permission.INTERNET` in any manifest, including debug/test variants
- OkHttp, Retrofit, Ktor client, Volley, or any HTTP library
- Firebase, Crashlytics, any analytics SDK
- Any dependency that transitively pulls a network client

ALLOWED:
- Local IPC to the companion over USB / Wi-Fi Direct via the Office Kit SDK
- File I/O within app-private storage

The companion CLI binds to 127.0.0.1 only, on an ephemeral port, with a
per-session shared secret. It never opens an outbound connection.

Before finishing any android/ task, run:
  ./gradlew :app:assembleDebug && aapt dump permissions app/build/outputs/apk/debug/app-debug.apk
and confirm only CAMERA and RECORD_AUDIO appear.
