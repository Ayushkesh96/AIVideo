# CogVideoX server

A small FastAPI wrapper around Hugging Face's `diffusers` CogVideoX pipeline
— not ComfyUI. See [`server.py`](server.py)'s module docstring and
[`../../docs/self-hosting.md`](../../docs/self-hosting.md#bigger-models-wan-22-hunyuanvideo-cogvideox)
for why CogVideoX gets its own server instead of a bundled ComfyUI workflow
like LTX-Video and Wan 2.1.

Adapted from [pinokiofactory/cogstudio](https://github.com/pinokiofactory/cogstudio)'s
approach — same `diffusers` pipeline, same `enable_sequential_cpu_offload()`
trick that gets CogVideoX-2b running under 10GB VRAM — rebuilt as a plain
HTTP API instead of a Gradio UI, since this app already provides its own UI
and just needs something to submit jobs to.

## Bring it up

This is a `profile`-gated service in the parent [`docker-compose.yml`](../docker-compose.yml)
— it doesn't start with a plain `docker compose up` (a GPU can't usefully run
this and ComfyUI at once, and most people only want one):

```bash
cd docker
cp .env.example .env   # set COGVIDEOX_TOKEN — openssl rand -hex 32
docker compose --profile cogvideox up -d --build cogvideox
```

First start downloads the model (~5GB for CogVideoX-2b, ~11GB for -5b) to the
`cogvideox-hf-cache` volume on first `/generate` request — there's nothing to
pre-download by hand, unlike the ComfyUI setup.

## Point AIVideo at it

```
COGVIDEOX_URL=https://your-host:8189
COGVIDEOX_TOKEN=<the same value as in docker/.env>
```

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `COGVIDEOX_MODEL` | `THUDM/CogVideoX-2b` | `THUDM/CogVideoX-5b` is noticeably better and needs more VRAM |
| `COGVIDEOX_FULL_GPU` | unset | Set `1` to skip CPU offload — faster, but needs the model to fit in VRAM outright |
| `COGVIDEOX_TOKEN` | — | Required (or set `COGVIDEOX_ALLOW_NO_AUTH=1` — see below) |
| `COGVIDEOX_ALLOW_NO_AUTH` | unset | Set `1` to run without a token, only if the port is never reachable from an untrusted network |

Unlike the ComfyUI setup, this server's port is published straight to the
host rather than sitting behind a separate proxy — it has its own
bearer-token check built in (`server.py`), and refuses to start at all if
`COGVIDEOX_TOKEN` isn't set and you haven't explicitly opted out.

## Why 2b by default, and what "self-hosted" honestly means here

CogVideoX-2b is the one documented to run comfortably under 10GB VRAM with
CPU offload. It won't match Veo or Sora, and it's noticeably behind LTX-Video
2B and Wan 2.1 on motion quality in most side-by-side comparisons — it's
included because it's a genuinely different open model with its own
character, not because it's the best option here. If VRAM allows, `-5b` or
one of the bundled ComfyUI workflows will usually look better.
