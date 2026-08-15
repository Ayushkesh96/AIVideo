FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ARG PYTHON_VERSION=3.11

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/hf-cache

RUN apt-get update && apt-get install -y --no-install-recommends \
      python${PYTHON_VERSION} \
      python3-pip \
      ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python${PYTHON_VERSION} /usr/bin/python3 \
    && ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# CUDA build of torch first, same reasoning as docker/Dockerfile: the plain
# PyPI wheel is CPU-only, which would turn every render into an hours-long CPU
# job with no error to explain why.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu124

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 8189
# Weights (~5-10GB depending on COGVIDEOX_MODEL) download to HF_HOME on first
# request, not at build time — see docker/cogvideox-server/README.md.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8189"]
