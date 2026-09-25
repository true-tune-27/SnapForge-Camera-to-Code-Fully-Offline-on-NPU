#!/usr/bin/env python3
import os
import argparse
from huggingface_hub import snapshot_download

# Pinned revisions for reproducibility (P5.1)
MODELS = {
    "smolvlm": {
        "repo": "HuggingFaceTB/SmolVLM-500M-Instruct",
        "revision": "main" # Pinned hash removed, using main
    },
    "qwen2.5-coder": {
        "repo": "Qwen/Qwen2.5-Coder-1.5B-Instruct",
        "revision": "e1f81dcc0ea92ebf68e06385cfd4a0f443b749d2"
    },
    "whisper-tiny.en": {
        "repo": "openai/whisper-tiny.en",
        "revision": "13636402ecfc9cf25595304b7352358cb5a3d001"
    }
}

def fetch_model(model_id: str, out_dir: str):
    if model_id not in MODELS:
        raise ValueError(f"Unknown model: {model_id}. Supported: {list(MODELS.keys())}")
    
    config = MODELS[model_id]
    target_dir = os.path.join(out_dir, model_id, "hf")
    
    print(f"Fetching {config['repo']} (revision {config['revision']}) into {target_dir}...")
    
    # Idempotent: HuggingFace hub handles caching, but we ensure it lands in our local structure
    snapshot_download(
        repo_id=config['repo'],
        revision=config['revision'],
        local_dir=target_dir,
        ignore_patterns=["*.msgpack", "*.h5", "coreml/*"]
    )
    print("Fetch complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch model weights from HF")
    parser.add_argument("--model", type=str, required=True, choices=MODELS.keys())
    parser.add_argument("--out-dir", type=str, default="./weights")
    args = parser.parse_args()
    
    fetch_model(args.model, args.out_dir)
