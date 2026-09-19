# native/

C++20 via JNI, NDK r27. OpenCV 4.10 Android SDK, NEON-optimised.

## What will live here (Phase 4)

Three JNI entry points, per dossier §14:

1. `rectify(frames, poses) → RectifiedBoard`
   - Multi-frame homography (ORB/AKAZE features, RANSAC)
   - Dual-lens baseline (when available)
   - Glare suppression (per-pixel temporal median, NEON intrinsics)
   - Budget: 180ms for full 8-frame rectify

2. `detect(board) → Regions`
   - MediaPipe Tasks Vision 0.10 on LiteRT with QNN delegate
   - Rectangles, arrows/connectors, text regions
   - Budget: 95ms post-capture

3. `forge(board, regions, index) → Tsx`
   - Orchestrator, wires the full pipeline

## Build

Desktop OpenCV test binary for CI (no device needed):
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
ctest --test-dir build
```
