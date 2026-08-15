#!/usr/bin/env bash
# /app/app is a mounted volume (docker-compose.yml) so the ~15GB model
# weights survive a container restart. On a first run that volume is empty,
# so this seeds it from the code baked into the image at /opt/songgen-app
# (see the Dockerfile's comment on why it's built there and not directly at
# this path) before downloading weights and starting the server.
set -euo pipefail

RUNTIME_DIR="/app/app"
IMAGE_CODE_DIR="/opt/songgen-app"
WEIGHTS_MARKER="$RUNTIME_DIR/.aivideo-weights-downloaded"

mkdir -p "$RUNTIME_DIR"

if [ ! -d "$RUNTIME_DIR/codeclm" ]; then
  echo "[entrypoint] seeding the model code onto the persistent volume (first run)..."
  cp -a "$IMAGE_CODE_DIR/." "$RUNTIME_DIR/"
fi

cd "$RUNTIME_DIR"

if [ ! -f "$WEIGHTS_MARKER" ]; then
  echo "[entrypoint] downloading model weights (~15GB, first start only)..."
  pip install --no-cache-dir --quiet "huggingface_hub[cli]"

  # install.js step 9: the model weights (ckpt/, third_party/ additions).
  huggingface-cli download 6Morpheus6/SongGeneration-Runtime --local-dir .

  # install.js step 10: a file the current code needs but that's missing
  # from Tencent's own repo (too large for plain GitHub).
  mkdir -p tools
  huggingface-cli download 6Morpheus6/new_prompt.pt new_prompt.pt --local-dir tools

  touch "$WEIGHTS_MARKER"
  echo "[entrypoint] weights ready."
else
  echo "[entrypoint] weights already present, skipping download."
fi

export PYTHONPATH="$RUNTIME_DIR:$RUNTIME_DIR/codeclm/tokenizer/Flow1dVAE"
export PORT="${PORT:-8190}"

exec python3 main.py --host 0.0.0.0
