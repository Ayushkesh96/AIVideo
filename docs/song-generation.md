# Song Studio: your own vocals-and-instrumentals model

The Song Studio panel (nav → Audio) writes structured lyrics and style
controls, then drives a self-hosted [SongGeneration Studio](https://github.com/6Morpheus6/SongGeneration-Studio)
server wrapping Tencent AI Lab's LeVo model into a full song — vocals,
instrumentals, and (optionally) separate stems.

## Why there's no free fallback here

The video studio always has somewhere to fall back to: a free on-device
procedural renderer with no model behind it at all. There's no honest
equivalent for singing — a procedural "song" would just be noise dressed up,
so the Song Studio doesn't pretend to have one. Without `SONGGEN_URL`
configured, the panel says so plainly and the generate button reports the
same rather than producing something fake.

## The one hard requirement

**A GPU with real VRAM** — 10GB minimum, 24GB+ recommended per the reference
project's own docs. LeVo is a substantially bigger model than the video
engines this app also drives, and it needs somewhere to run the same way
they do: Vercel functions have no GPU, so the app talks to a box that does,
over HTTP.

## Setup

### Fast path: Docker Compose

```bash
cd docker
cp .env.example .env   # set SONGGEN_TOKEN — openssl rand -hex 32
docker compose --profile songgen up -d --build songgen songgen-proxy
```

Brings up the server plus an authenticated reverse proxy in front of it (it
has no login of its own — same reasoning as the ComfyUI setup this repo also
ships). First start clones the model code, installs its pinned dependency
set, and downloads ~15GB of weights — expect it to take a while. Full
walkthrough: [`docker/songgen-server/README.md`](../docker/songgen-server/README.md).

### Point the app at it

In Vercel → Settings → Environment Variables:

```
SONGGEN_URL=https://your-gpu-box.example.com:8190
SONGGEN_TOKEN=whatever-your-proxy-requires
```

Redeploy. The Song Studio's provider badge turns green.

## Writing a song

Sections are the unit the model actually consumes — `[verse]`, `[chorus]`,
etc. tags in its own input format — so the editor exposes that structure
directly instead of a single freeform textarea:

| Section type | Needs lyrics |
|---|---|
| Verse, Chorus, Pre-Chorus, Bridge | Yes — one line of lyrics per line in the box |
| Intro, Outro, Instrumental | No — just marks where an instrumental passage goes |

At least one vocal section needs lyrics, or every section has to be
instrumental — a half-empty vocal section is rejected before it reaches the
model rather than silently producing something wrong.

Style fields (genre, mood, voice, timbre, instruments, BPM) are free text —
the server maps common genre names to a canonical set internally, so exact
spelling doesn't need to match anything. **Output** picks between a single
full mix and full-mix-plus-stems (vocals and instrumental as separate,
individually downloadable tracks).

## Checking it works

```bash
curl https://your-app.vercel.app/api/song-providers
```

`configured` should be `true`. There's no equivalent of the video studio's
`/api/video-selfhost-health` preflight check for this provider yet — the
first real generation is the check.

## What isn't wired up yet

**Reference-audio style cloning.** The reference server supports uploading a
track and matching its style; AIVideo's client doesn't call that endpoint.
It needs binary multipart proxying this app's request pipeline isn't built
for safely — see `api/_song.js`'s module comment for the full reasoning.
Worth adding later; not shipped half-working now.

**A self-hosted health check**, the audio equivalent of
`/api/video-selfhost-health` for the video engines — checking the server is
actually reachable and has weights downloaded before a generation is
submitted, rather than finding out 3-6 minutes later.

## Architecture

```
api/
  _song.js             input validation, job lifecycle — the audio
                        counterpart to _video.js, deliberately simpler
                        (one provider, no registry)
  _providers/songgen.js talks to the self-hosted server; request/response
                        shapes read directly from its own source
  song-create.js        POST  submit a generation, returns a job id
  song-status.js        GET   one poll tick
  song-proxy.js         GET   streams a finished track without exposing
                        SONGGEN_TOKEN to the browser
  song-providers.js     GET   configured state + genre vocabulary for the UI
js/
  song-studio.js         panel controller: section editor, style controls,
                        generation polling, stems-aware player, library
```

Same two-phase shape as video generation and for the same reason: a song can
take minutes, longer than a serverless function can hold a request open, so
`song-create` submits and returns immediately and the browser polls
`song-status` until it's done.
