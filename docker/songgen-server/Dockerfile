# SongGeneration Studio (https://github.com/6Morpheus6/SongGeneration-Studio),
# wrapping Tencent AI Lab's LeVo song-generation model. Every step here mirrors
# that project's own Pinokio install script (install.js / torch.js) command
# for command — not a guessed setup — because its pinned dependency versions
# are load-bearing: the project's own requirements.txt says plainly that
# Tencent's upstream requirements.txt uses newer versions that are
# INCOMPATIBLE with the model code.
#
# Built into /opt/songgen-app rather than the eventual runtime directory
# (/app/app, mounted as a volume in docker-compose.yml) on purpose: model
# weights (~15GB) need to persist on that volume across container restarts,
# which means the code has to be there too, which means it can't be baked
# into an image layer at the path the volume will later cover — a bind mount
# hides whatever was already at that path. entrypoint.sh seeds the volume
# from here on its first run, the same pattern official images like
# postgres use for "code + data must share a directory that also has to
# persist."
FROM nvidia/cuda:12.8.0-devel-ubuntu22.04

ARG PYTHON_VERSION=3.11

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1 \
    HF_HUB_DISABLE_UPDATE_CHECK=1 \
    HF_HOME=/app/hf-cache

RUN apt-get update && apt-get install -y --no-install-recommends \
      git git-lfs \
      python${PYTHON_VERSION} \
      python3-pip \
      ffmpeg \
      libsndfile1 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python${PYTHON_VERSION} /usr/bin/python3 \
    && ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /opt

# The Studio wrapper (this app's own routes, schemas, web UI we don't use —
# AIVideo talks to its API directly) supplies main.py etc. on top of the
# model code cloned below (install.js steps 1 and 4).
RUN git clone --depth 1 https://github.com/6Morpheus6/SongGeneration-Studio studio-src

# The actual model code (codeclm/, tools/, third_party/) — install.js step 1.
RUN GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/6Morpheus6/songgeneration-tencent songgen-app

# install.js step 2: pinned deps, then the --no-deps set.
RUN pip install --no-cache-dir -r studio-src/requirements.txt \
    && pip install --no-cache-dir -r studio-src/requirements_nodeps.txt --no-deps

# torch.js (Linux/NVIDIA branch) — this exact CUDA 12.8 build is what the
# pinned torch==2.7.0 wheel is compiled for.
RUN pip install --no-cache-dir torch==2.7.0 torchvision==0.22.0 torchaudio==2.7.0 \
      --index-url https://download.pytorch.org/whl/cu128 --force-reinstall \
    && pip install --no-cache-dir numpy==1.26.4

# install.js steps 4-5: the wrapper's own Python + web files land on top of
# the cloned model code.
RUN cp studio-src/main.py studio-src/generation.py studio-src/model_server.py \
       studio-src/models.py studio-src/gpu.py studio-src/config.py \
       studio-src/schemas.py studio-src/sse.py studio-src/timing.py \
       songgen-app/ \
    && mkdir -p songgen-app/web/static \
    && cp studio-src/web/static/* songgen-app/web/static/

# install.js steps 6-8: the three patches the wrapper ships (Windows flash-
# attention fix, a 24-bit Demucs decode fix, and the separate-stems decode
# path) — none are Windows-specific in effect, all three are needed.
RUN cp studio-src/patches/builders.py songgen-app/codeclm/models/builders.py \
    && mkdir -p songgen-app/third_party/demucs/models \
    && cp studio-src/patches/demucs/apply.py songgen-app/third_party/demucs/models/apply.py \
    && mkdir -p songgen-app/tools/gradio \
    && cp studio-src/patches/gradio/levo_inference_lowmem.py songgen-app/tools/gradio/levo_inference_lowmem.py

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8190
ENTRYPOINT ["/app/entrypoint.sh"]
