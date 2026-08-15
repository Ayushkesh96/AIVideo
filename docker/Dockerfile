# ComfyUI, built from source so it stays current — the video model nodes
# (Wan, LTX-Video) move fast enough that a stale pinned image goes stale in
# weeks. entrypoint.sh does the same "git pull" on every container start, so
# rebuilding this image is only needed when the CUDA/Python base itself needs
# to change.
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ARG COMFYUI_REPO=https://github.com/comfyanonymous/ComfyUI
ARG PYTHON_VERSION=3.11

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      git \
      python${PYTHON_VERSION} \
      python3-pip \
      ffmpeg \
      libgl1 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python${PYTHON_VERSION} /usr/bin/python3 \
    && ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

RUN git clone --depth 1 "$COMFYUI_REPO" ComfyUI

WORKDIR /app/ComfyUI

# CUDA build of torch first — the plain PyPI wheel is CPU-only and ComfyUI
# would silently fall back to it, turning every render into an hours-long CPU
# job with no error to explain why.
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 \
    && pip install --no-cache-dir -r requirements.txt

# The video output node the bundled workflows (workflows/*.json) render
# through. Everything else — model weights, additional custom nodes — is
# supplied at runtime via the volumes in docker-compose.yml, not baked in.
RUN git clone --depth 1 https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite custom_nodes/ComfyUI-VideoHelperSuite \
    && pip install --no-cache-dir -r custom_nodes/ComfyUI-VideoHelperSuite/requirements.txt

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8188
ENTRYPOINT ["/app/entrypoint.sh"]
