# SnapForge Model Conversion Runbook

> **Warning:** These scripts cannot be run automatically by Antigravity or CI. They require a human with a Qualcomm AI Hub account and the QNN SDK installed locally. This conversion is performed **prior to hour zero** of the hackathon.

This directory contains the conversion pipeline (Phase 5.1) for bringing HuggingFace models down to INT4 (W4A16) and generating Hexagon QNN context binaries.

## Prerequisites

1. **Qualcomm AI Engine Direct (QNN) SDK v2.28+** installed.
2. **Qualcomm AI Hub CLI** (`qai-hub`) authenticated (`qai-hub configure --api_token <TOKEN>`).
3. **HuggingFace Hub** authenticated (`huggingface-cli login`).
4. **AIMET** (AI Model Efficiency Toolkit) installed for quantization.

## Pipeline Steps

The pipeline is designed to be idempotent and resumable. If a step fails, fix the issue and re-run; it will pick up where it left off.

Run these steps for each model (`smolvlm`, `qwen2.5-coder`, `whisper-tiny.en`).

### 1. Fetch
Downloads the safetensors from HF. We pin the exact Git revision hashes to ensure reproducible quantization.
```bash
python fetch.py --model smolvlm
```
**Expected time:** 2-5 minutes (network dependent).

### 2. Export to ONNX
Converts the HF model to ONNX opset 17 via Optimum.
```bash
python export.py --model smolvlm
```
**Expected time:** 5-10 minutes.

### 3. Quantize (W4A16)
Uses AIMET for post-training quantization.
```bash
python quantize.py --model smolvlm
```
**CRITICAL:** For the vision model (`smolvlm`), this script uses a calibration set of 128 whiteboard sketches. *Do not use ImageNet.* ImageNet's natural photo distribution will skew the quantization ranges and destroy our high-contrast line art accuracy.
**Expected time:** 15-30 minutes.

### 4. Compile (AI Hub)
Submits the quantized model to Qualcomm AI Hub to generate the QNN context binary for the Snapdragon 8s Gen 3 (Hexagon HTP).
```bash
python compile.py --model smolvlm
```
**Expected time:** 10-20 minutes on the AI Hub queue.

### 5. Validate
Checks the cosine similarity of the quantized model against the FP16 reference.
```bash
python validate.py --model smolvlm
```
**Threshold:** `0.985`. If the score drops below this, *do not proceed*. The model will hallucinate on-device. Stop, inspect the calibration data, and re-quantize.

### 6. Benchmark
Submits a profiling job to AI Hub to get accurate latency and memory metrics.
```bash
python benchmark.py --model smolvlm
```
**Rule of Truth:** When this finishes, download the JSON results and save them in `models/benchmarks/`. **Do not fabricate or guess these numbers.** If we haven't measured it yet, we don't claim it in the docs.
