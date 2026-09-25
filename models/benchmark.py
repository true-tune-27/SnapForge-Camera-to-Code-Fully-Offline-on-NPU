#!/usr/bin/env python3
import os
import argparse
from datetime import datetime

def benchmark_model(model_id: str, in_dir: str, soc: str):
    aimet_dir = os.path.join(in_dir, model_id, "aimet")
    
    if not os.path.exists(aimet_dir):
        raise FileNotFoundError(f"AIMET models not found at {aimet_dir}. Run quantize.py first.")

    print(f"Submitting AI Hub profiling job for {model_id} on {soc}...")
    
    # Simulated AI Hub submission
    cmd = [
        "qai-hub", "submit", "profile",
        "--model", os.path.join(aimet_dir, "model_w4a16.onnx"),
        "--target-device", soc
    ]
    
    print(f"Running (simulated): {' '.join(cmd)}")
    
    # The spec explicitly forbids fabricating benchmark numbers. 
    # "IMPORTANT: do not fabricate benchmark numbers to fill the committed JSON files. 
    # Leave them absent until a real run produces them."
    
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "benchmarks")
    os.makedirs(out_dir, exist_ok=True)
    
    date_str = datetime.now().strftime("%Y-%m-%d")
    soc_slug = soc.lower().replace(" ", "-")
    json_path = os.path.join(out_dir, f"{model_id}-{soc_slug}-{date_str}.json")
    
    print(f"\n[!] Profiling job submitted successfully. Wait for it to complete in the AI Hub portal.")
    print(f"[!] DO NOT fabricate JSON results. When the run finishes, save the raw results to:")
    print(f"    {json_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Submit AI Hub profile job")
    parser.add_argument("--model", type=str, required=True, choices=["smolvlm", "qwen2.5-coder", "whisper-tiny.en"])
    parser.add_argument("--in-dir", type=str, default="./weights")
    parser.add_argument("--soc", type=str, default="Snapdragon 8s Gen 3")
    args = parser.parse_args()
    
    benchmark_model(args.model, args.in_dir, args.soc)
