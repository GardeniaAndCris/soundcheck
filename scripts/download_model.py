"""
Download pre-converted ONNX wav2vec2-base-960h from HuggingFace (Xenova/Transformers.js).
No PyTorch required.

Output:
    public/models/wav2vec2.onnx   (~90MB, quantized)
    public/models/vocab.json      (32-token char vocabulary)

Run:
    C:/ml/Scripts/python scripts/download_model.py
"""

import json
import shutil
from pathlib import Path
from huggingface_hub import hf_hub_download

OUT_DIR = Path(__file__).parent.parent / "public" / "models"
OUT_DIR.mkdir(parents=True, exist_ok=True)

REPO_ID   = "Xenova/wav2vec2-base-960h"
ONNX_FILE = "onnx/model_quantized.onnx"   # ~90MB INT8 quantized
VOCAB_FILE = "tokenizer_config.json"

# ── 1. Download ONNX model ──────────────────────────────────
print(f"[1/3] Downloading ONNX model from {REPO_ID} ...")
print(f"      File: {ONNX_FILE} (~90MB)")

local_onnx = hf_hub_download(
    repo_id=REPO_ID,
    filename=ONNX_FILE,
    local_dir=str(OUT_DIR / "_cache"),
)

dest_onnx = OUT_DIR / "wav2vec2.onnx"
shutil.copy2(local_onnx, dest_onnx)
size_mb = dest_onnx.stat().st_size / 1024 / 1024
print(f"      Saved: {dest_onnx} ({size_mb:.1f} MB)")

# ── 2. Download vocab ───────────────────────────────────────
print(f"[2/3] Downloading vocab ...")

# The vocab for wav2vec2-base-960h: 32 characters (A-Z + special tokens)
# Build it directly — it's stable and tiny, no need to download
VOCAB = {
    "<pad>": 0, "<s>": 1, "</s>": 2, "<unk>": 3,
    "|": 4,  # word boundary (space)
    "E": 5, "T": 6, "A": 7, "O": 8, "N": 9, "I": 10,
    "H": 11, "S": 12, "R": 13, "D": 14, "L": 15, "U": 16,
    "M": 17, "W": 18, "C": 19, "F": 20, "G": 21, "Y": 22,
    "P": 23, "B": 24, "V": 25, "K": 26, "'": 27, "X": 28,
    "J": 29, "Q": 30, "Z": 31,
}

vocab_path = OUT_DIR / "vocab.json"
with open(vocab_path, "w", encoding="utf-8") as f:
    json.dump(VOCAB, f, indent=2)
print(f"      Saved: {vocab_path} ({len(VOCAB)} tokens)")

# ── 3. Verify with onnxruntime ──────────────────────────────
print("[3/3] Verifying model ...")
try:
    import onnxruntime as ort
    import numpy as np

    sess = ort.InferenceSession(
        str(dest_onnx),
        providers=["CPUExecutionProvider"],
    )
    dummy = np.zeros((1, 16000), dtype=np.float32)
    logits = sess.run(["logits"], {"input_values": dummy})[0]
    print(f"      Input shape:  (1, 16000)")
    print(f"      Output shape: {logits.shape}  ← (batch, time_steps, vocab={logits.shape[-1]})")
    print()
    print("All good. Model ready for browser deployment.")
except ImportError:
    print("      (onnxruntime not available for verification, skipping)")

# ── Cleanup cache ───────────────────────────────────────────
cache_dir = OUT_DIR / "_cache"
if cache_dir.exists():
    shutil.rmtree(cache_dir)

print()
print(f"Output files:")
for f in sorted(OUT_DIR.iterdir()):
    print(f"  {f.name}  ({f.stat().st_size / 1024 / 1024:.1f} MB)")
