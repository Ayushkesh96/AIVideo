# ComfyUI in Docker, for AIVideo's self-hosted engine

Brings up a GPU-backed ComfyUI that AIVideo's `selfhosted` provider can drive,
with an authenticated reverse proxy in front of it — ComfyUI itself has no
login, and its API can read and write files on the box, so it must never be
exposed directly. See [`../docs/self-hosting.md`](../docs/self-hosting.md) for
the full picture (which model to pick, VRAM needs, non-Docker setup).

Looking for CogVideoX instead of LTX-Video/Wan? That's a separate, optional
service in the same `docker-compose.yml` — see
[`cogvideox-server/README.md`](cogvideox-server/README.md).

Looking for Song Studio (full songs with vocals, not video at all)? Also a
separate service pair here — see
[`songgen-server/README.md`](songgen-server/README.md) and
[`../docs/song-generation.md`](../docs/song-generation.md).

## Requirements

- A Linux host with an NVIDIA GPU (8 GB+ VRAM to start)
- Docker with the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) installed
- `docker compose` (bundled with current Docker)

## Setup

```bash
cd docker
cp .env.example .env
# edit .env — set COMFYUI_TOKEN at minimum:
#   openssl rand -hex 32

docker compose up -d --build
```

First start pulls the CUDA base image, clones ComfyUI, and installs Python
dependencies — this takes several minutes. Watch it with:

```bash
docker compose logs -f comfyui
```

## Download model weights

Nothing is baked into the image — weights are large and move fast, so they
belong on the host, in the folder `MODELS_PATH` points at (`./models` by
default). For the two workflows this repo ships (paths and filenames below
were correct at the time this was written — Hugging Face repos do get
reorganized, so if a `curl` 404s, search the repo for the current filename):

```bash
cd docker/models

# LTX-Video 2B — the lighter option, ~8-12 GB VRAM
mkdir -p checkpoints clip
curl -L -o checkpoints/ltx-video-2b-v0.9.5.safetensors \
  https://huggingface.co/Lightricks/LTX-Video/resolve/main/ltx-video-2b-v0.9.5.safetensors
curl -L -o clip/t5xxl_fp16.safetensors \
  https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors

# Wan 2.1 T2V 1.3B — lower VRAM still, different visual character
mkdir -p diffusion_models text_encoders vae
curl -L -o diffusion_models/wan2.1_t2v_1.3B_fp16.safetensors \
  https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_t2v_1.3B_fp16.safetensors
curl -L -o text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors \
  https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors
curl -L -o vae/wan_2.1_vae.safetensors \
  https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors
```

Restart the stack after adding weights: `docker compose restart comfyui`.

## Point AIVideo at it

In Vercel → Project → Settings → Environment Variables (or a local `.env`):

```
COMFYUI_URL=https://your-host:8188        # or a tunnel/domain in front of it
COMFYUI_TOKEN=<the same value as in docker/.env>
COMFYUI_MODEL=ltx                          # or wan2.1
```

If the box isn't already behind a public hostname, tunnel the proxy's port
(the one on `LISTEN_PORT`, not the internal `comfyui` service) — a Cloudflare
Tunnel or `ssh -R` are the usual choices. Redeploy AIVideo; the provider badge
should turn green with your model's label.

## Day to day

```bash
docker compose logs -f comfyui   # watch generation
docker compose restart comfyui   # after adding models or an EXTRA_CUSTOM_NODES entry
docker compose down              # stop everything (models/output on the host survive)
docker compose up -d --build     # rebuild after a Dockerfile change
```

`entrypoint.sh` runs `git pull` on ComfyUI itself and clones/updates anything
in `EXTRA_CUSTOM_NODES` on every start, so day-to-day you only need `restart`,
not `--build` — a full rebuild is only needed if the CUDA/Python base image
itself changes.
