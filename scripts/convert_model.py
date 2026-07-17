"""
Convert facebook/wav2vec2-base-960h to ONNX (INT8 quantized).

Output: public/models/wav2vec2.onnx (~95MB)

Run once from the project root:
    python scripts/convert_model.py
"""

import os
import sys
from pathlib import Path

MODEL_ID = "facebook/wav2vec2-base-960h"
OUT_DIR = Path(__file__).parent.parent / "public" / "models"
ONNX_FP32 = OUT_DIR / "wav2vec2_fp32.onnx"
ONNX_INT8  = OUT_DIR / "wav2vec2.onnx"

def install_if_missing(pkg, import_name=None):
    import importlib
    try:
        importlib.import_module(import_name or pkg)
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])

install_if_missing("transformers")
install_if_missing("onnx")
install_if_missing("onnxruntime")

import torch
import onnx
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── 1. Download model ────────────────────────────────────────
print(f"[1/4] Downloading {MODEL_ID} ...")
processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID)
model.eval()

# Save vocab for use in JS forced alignment
import json
vocab = processor.tokenizer.get_vocab()
vocab_path = OUT_DIR / "vocab.json"
with open(vocab_path, "w", encoding="utf-8") as f:
    json.dump(vocab, f, ensure_ascii=False, indent=2)
print(f"    Vocab saved → {vocab_path} ({len(vocab)} tokens)")

# ── 2. Export to ONNX (FP32) ────────────────────────────────
print("[2/4] Exporting to ONNX FP32 ...")
# 1 second of 16kHz audio as dummy input
dummy = torch.zeros(1, 16000)

with torch.no_grad():
    torch.onnx.export(
        model,
        dummy,
        str(ONNX_FP32),
        input_names=["input_values"],
        output_names=["logits"],
        dynamic_axes={
            "input_values": {0: "batch", 1: "audio_length"},
            "logits":       {0: "batch", 1: "time_steps"},
        },
        opset_version=17,
        do_constant_folding=True,
    )

size_fp32 = ONNX_FP32.stat().st_size / 1024 / 1024
print(f"    FP32 ONNX saved ({size_fp32:.1f} MB)")

# ── 3. Quantize to INT8 ─────────────────────────────────────
print("[3/4] Quantizing to INT8 ...")
from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic(
    str(ONNX_FP32),
    str(ONNX_INT8),
    weight_type=QuantType.QUInt8,
)

size_int8 = ONNX_INT8.stat().st_size / 1024 / 1024
print(f"    INT8 ONNX saved ({size_int8:.1f} MB)")

# Remove intermediate FP32 file
ONNX_FP32.unlink()
print(f"    FP32 intermediate removed")

# ── 4. Verify ────────────────────────────────────────────────
print("[4/4] Verifying ONNX model ...")
import onnxruntime as ort
import numpy as np

sess = ort.InferenceSession(str(ONNX_INT8), providers=["CPUExecutionProvider"])
dummy_np = np.zeros((1, 16000), dtype=np.float32)
logits = sess.run(["logits"], {"input_values": dummy_np})[0]
print(f"    Input:  (1, 16000)")
print(f"    Output: {logits.shape}  ← (batch, time_steps, vocab_size={logits.shape[-1]})")
print()
print("Done.")
print(f"Model → {ONNX_INT8}")
print(f"Vocab → {vocab_path}")
print()
print("Next: copy public/models/ contents are auto-served by Vite.")
