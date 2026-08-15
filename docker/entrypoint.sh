#!/usr/bin/env bash
# Runs on every container start (not just image build), so:
#  - ComfyUI itself updates via git pull, matching the "built from source to
#    stay current" choice in the Dockerfile.
#  - EXTRA_CUSTOM_NODES (comma-separated git URLs) get cloned on first start
#    without needing an image rebuild — the pattern most ComfyUI Docker setups
#    use, since custom nodes change far more often than the base image.
set -euo pipefail

cd /app/ComfyUI

if [ -d .git ]; then
  echo "[entrypoint] updating ComfyUI..."
  git pull --ff-only || echo "[entrypoint] git pull failed (local changes?) — continuing with the current checkout"
fi

if [ -n "${EXTRA_CUSTOM_NODES:-}" ]; then
  IFS=',' read -ra NODES <<< "$EXTRA_CUSTOM_NODES"
  for repo in "${NODES[@]}"; do
    repo="$(echo "$repo" | xargs)" # trim whitespace
    [ -z "$repo" ] && continue
    name="$(basename "$repo" .git)"
    dest="custom_nodes/$name"
    if [ -d "$dest" ]; then
      echo "[entrypoint] updating custom node $name..."
      (cd "$dest" && git pull --ff-only || true)
    else
      echo "[entrypoint] installing custom node $name..."
      git clone --depth 1 "$repo" "$dest"
      [ -f "$dest/requirements.txt" ] && pip install --no-cache-dir -r "$dest/requirements.txt"
    fi
  done
fi

exec python3 main.py --listen 0.0.0.0 --port 8188 ${COMFYUI_EXTRA_ARGS:-}
