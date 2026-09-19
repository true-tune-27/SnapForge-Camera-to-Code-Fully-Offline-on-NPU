# models/

Conversion scripts, AI Hub configs, committed benchmarks.

## What will live here (Phase 5)

Scripts for converting and quantising four models. **A human runs these** — they require
the Qualcomm SDK, an AI Hub account, and access to Hugging Face.

### For each of SmolVLM-500M-Instruct and Qwen2.5-Coder-1.5B-Instruct:
1. `fetch.py` — pull safetensors from Hugging Face, pin revision hash
2. `export.py` — ONNX opset 17 via Optimum
3. `quantize.py` — AIMET W4A16 post-training, 128-sample calibration set
4. `compile.py` — submit AI Hub job → QNN context binary
5. `validate.py` — per-layer cosine similarity vs FP16 reference (threshold 0.985)
6. `benchmark.py` — AI Hub profiling, results committed to `benchmarks/`

Plus Whisper-Tiny.en INT8 and the MediaPipe bundle.

## IMPORTANT

Do not fabricate benchmark numbers. Leave them absent until a real run produces them.
The dossier's §22 note says figures are targets until measured — inventing measurements
would make that note a lie.
