#!/usr/bin/env python3
"""Export SmolVLM to ONNX using torch.onnx.export directly.

Bypasses optimum-cli to avoid torch/optimum version conflicts.
Produces a single model.onnx in weights/<model_id>/onnx/.
"""
import os
import argparse
import torch


def export_onnx(model_id: str, in_dir: str, out_dir: str):
    target_dir = os.path.join(out_dir, model_id, "onnx")
    os.makedirs(target_dir, exist_ok=True)

    hf_path = os.path.join(in_dir, model_id, "hf")
    if not os.path.exists(hf_path):
        raise FileNotFoundError(f"HF weights not found at {hf_path}. Run fetch.py first.")

    onnx_path = os.path.join(target_dir, "model.onnx")

    # Idempotent: skip if already exported
    if os.path.exists(onnx_path):
        print(f"ONNX model already exists at {onnx_path}. Skipping.")
        return

    print(f"Exporting {model_id} to ONNX (opset 17) in {target_dir}...")

    if model_id == "smolvlm":
        _export_smolvlm(hf_path, onnx_path)
    else:
        raise ValueError(f"Unsupported model: {model_id}")

    print(f"Export complete: {onnx_path}")
    print(f"  Size: {os.path.getsize(onnx_path) / 1024 / 1024:.1f} MB")


class _SmolVLMDecoder(torch.nn.Module):
    """Wrapper combining text_model + lm_head for ONNX export."""
    def __init__(self, text_model, lm_head):
        super().__init__()
        self.text_model = text_model
        self.lm_head = lm_head

    def forward(self, input_ids, attention_mask):
        outputs = self.text_model(input_ids=input_ids, attention_mask=attention_mask)
        hidden = outputs[0]  # last_hidden_state
        logits = self.lm_head(hidden)
        return logits


def _export_smolvlm(hf_path: str, onnx_path: str):
    """Export SmolVLM text decoder to ONNX via torch.onnx.export."""
    from transformers import AutoModelForVision2Seq, AutoProcessor

    print("Loading model from disk...")
    model = AutoModelForVision2Seq.from_pretrained(
        hf_path,
        torch_dtype=torch.float32,
        local_files_only=True,
    )
    model.eval()

    processor = AutoProcessor.from_pretrained(hf_path, local_files_only=True)

    # --- Build dummy inputs matching the model's forward signature ---
    print("Building dummy inputs...")

    # Structure: model.model.{vision_model, connector, text_model} + model.lm_head
    # For the text-decoder path we only need input_ids + attention_mask.
    # The on-device pipeline feeds pre-extracted vision features anyway,
    # so we export the *language* portion only (text_model + lm_head).
    vocab_size = model.config.text_config.vocab_size if hasattr(model.config, "text_config") else model.config.vocab_size
    seq_len = 64
    batch = 1

    dummy_input_ids = torch.randint(0, vocab_size, (batch, seq_len), dtype=torch.long)
    dummy_attention_mask = torch.ones(batch, seq_len, dtype=torch.long)

    # Wrap text_model + lm_head into a single exportable module
    print("Extracting text decoder (text_model + lm_head) for ONNX export...")
    decoder = _SmolVLMDecoder(model.model.text_model, model.lm_head)
    decoder.eval()

    # Export the decoder
    print("Running torch.onnx.export (this may take a few minutes)...")
    with torch.no_grad():
        torch.onnx.export(
            decoder,
            (dummy_input_ids, dummy_attention_mask),
            onnx_path,
            opset_version=17,
            input_names=["input_ids", "attention_mask"],
            output_names=["logits"],
            dynamic_axes={
                "input_ids": {0: "batch", 1: "seq_len"},
                "attention_mask": {0: "batch", 1: "seq_len"},
                "logits": {0: "batch", 1: "seq_len"},
            },
            do_constant_folding=True,
        )

    # Verify the export
    import onnx
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    print("ONNX model validated successfully.")

    # Also save the tokenizer/processor config alongside for later use
    target_dir = os.path.dirname(onnx_path)
    processor.save_pretrained(target_dir)
    print(f"Processor config saved to {target_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export models to ONNX")
    parser.add_argument("--model", type=str, required=True,
                        choices=["smolvlm", "qwen2.5-coder", "whisper-tiny.en"])
    parser.add_argument("--in-dir", type=str, default="./weights")
    parser.add_argument("--out-dir", type=str, default="./weights")
    args = parser.parse_args()

    export_onnx(args.model, args.in_dir, args.out_dir)
