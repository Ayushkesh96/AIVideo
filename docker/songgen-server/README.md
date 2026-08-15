# SongGeneration Studio server

Runs [6Morpheus6/SongGeneration-Studio](https://github.com/6Morpheus6/SongGeneration-Studio)
— a FastAPI backend for Tencent AI Lab's LeVo model — the way its own
Pinokio install script does, translated into a Dockerfile. See the
Dockerfile's own comments for exactly which steps come from where
(`install.js`, `torch.js`); nothing here is guessed at.

This app's Song Studio talks to the API this server exposes
(`/api/generate`, `/api/generation/{id}`, `/api/audio/{id}/{track}`) — see
[`../../docs/song-generation.md`](../../docs/song-generation.md) for how the
two connect and what to set. This file is about standing the server up.

## Requirements

- A Linux host with an NVIDIA GPU — **10GB VRAM minimum, 24GB+ recommended**
  per the reference project's own README
- **~50GB free disk** — the model weights alone are ~15GB, plus the CUDA
  image, PyTorch, and generated output
- Docker with the NVIDIA Container Toolkit installed
- Patience on first start: cloning the model code, installing the pinned
  dependency set, and downloading weights all happen the first time the
  container runs, not at `docker compose build`

## Bring it up

Profile-gated in the parent [`docker-compose.yml`](../docker-compose.yml) —
won't start with a plain `docker compose up`:

```bash
cd docker
cp .env.example .env   # set SONGGEN_TOKEN — openssl rand -hex 32
docker compose --profile songgen up -d --build songgen songgen-proxy
```

Watch first start (code seeding, then the ~15GB weight download):

```bash
docker compose logs -f songgen
```

## Point AIVideo at it

```
SONGGEN_URL=https://your-host:8190
SONGGEN_TOKEN=<the same value as in docker/.env>
```

## Why this is a heavier setup than the video engines

LeVo is a much bigger, more particular model than LTX-Video, Wan 2.1, or
CogVideoX-2b: a large pinned dependency set (the reference project's own
`requirements.txt` says outright that Tencent's current upstream
requirements are incompatible with the model code), a real ~15GB download,
and multi-minute generation times per the reference project's own docs
(3-6 minutes per song). None of that is this Dockerfile being unnecessarily
heavy — it's what the model actually needs.

## What isn't wired up yet

Reference-audio style cloning (`/api/upload-reference` on the reference
server) isn't connected from AIVideo's Song Studio — it needs binary
multipart proxying this app's request pipeline doesn't currently support
safely. The server itself supports it; only AIVideo's client side doesn't
call it yet. See `api/_song.js`'s module comment.
