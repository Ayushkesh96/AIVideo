# AIVideo — AI Cinema Studio

A browser-based text-to-video studio. Type a prompt, pick a camera move, and get
back a video file. **Works with zero configuration, zero accounts, and zero
cost** — the default renderer runs entirely in your browser. Adding a provider
key upgrades generation to a hosted AI video model.

## How generation works

Two engines, tried in order. The first one available wins:

| | Engine | Needs | What it can do |
|---|---|---|---|
| 0 | **Your own GPU** — LTX-Video, Wan 2.1 and CogVideoX-2b bundled and ready to run; Wan 2.2/HunyuanVideo via ComfyUI's template gallery | hardware, no fees | Open weights you run yourself. No per-clip cost, no upstream policy. `docker/` has a one-command setup for either backend. See [docs/self-hosting.md](docs/self-hosting.md) |
| 1 | **Keyed video model** — Veo, Sora, Kling, Wan, Hailuo, LTX, Runway, Luma | an API key (paid) | Genuinely depicts the prompt, including motion, up to 4K |
| 2 | **Free on-device engine** | nothing | Renders a cinematic procedural scene for the prompt in your browser — camera moves, grading, grain, atmosphere — and records it to a real video file |

**Engine 2 is the default.** With nothing configured the studio makes no
upstream calls at all: the scene is synthesized, animated and recorded entirely
client-side, so it is unlimited and free forever, with no metered or paid
dependency of any kind. It is honest about what it is — a procedural renderer,
not a diffusion model. It composes a scene *inspired by* the prompt; it cannot
photorealistically depict arbitrary text. For that, add a key (engine 1) or
point it at your own GPU (engine 0).

## Song Studio (nav → Audio)

A second, independent pipeline: structured lyrics (intro/verse/chorus/
bridge/outro) and style controls (genre, mood, voice, instruments, BPM) —
generated into a full song with vocals, via a self-hosted
[SongGeneration Studio](https://github.com/6Morpheus6/SongGeneration-Studio)
server. Unlike video, there's no free on-device fallback here — there's no
honest procedural substitute for singing — so it needs `SONGGEN_URL`
configured to do anything. `docker/` has a one-command setup. See
[docs/song-generation.md](docs/song-generation.md).

## Enabling real video generation

Set **one** of these in your environment (Vercel → Project → Settings →
Environment Variables, or a local `.env`):

| Variable | Provider | Default model | Max | Cost |
|---|---|---|---|---|
| `GEMINI_API_KEY` | Google Veo | `veo-3.1-generate-preview` | 4K, native audio | paid |
| `FAL_KEY` | fal.ai | `fal-ai/veo3` | 4K, native audio | paid |
| `REPLICATE_API_TOKEN` | Replicate | `wan-video/wan-2.2-t2v-fast` | 720p | paid |
| `RUNWAYML_API_SECRET` | Runway | `gen4_turbo` | 720p | paid |
| `LUMAAI_API_KEY` | Luma | `ray-2` | 4K | paid |

Providers are tried in that order and the first one with a key wins. Redeploy
after adding one — the studio reads capabilities at page load. With no key at
all, the free on-device engine renders every clip.

To pin a different model on a provider, set the matching override
(`GOOGLE_VEO_MODEL`, `FAL_VIDEO_MODEL`, `REPLICATE_VIDEO_MODEL`,
`RUNWAY_VIDEO_MODEL`, `LUMA_VIDEO_MODEL`). Model ids move as providers ship new
versions; these let you follow a rename without a code change.

### About 4K

Only Veo 3.1 and Luma Ray 2 advertise true 4K output. On any other configured
model the 4K button is **disabled rather than faked** — the studio will not
upscale a 720p render and call it 4K. The free on-device engine renders its
canvas natively at 3840×2160 when you pick 4K, which is real resolution for a
procedural scene, but is not a diffusion model's 4K output.

## Running locally

```bash
cp .env.example .env     # add a provider key (optional)
npm start                # http://localhost:5173
```

The server prints which providers it found on startup.

## Development

`index.html` ships as one self-contained file with the CSS and JS inlined. The
inlined copies are **generated** — `styles/` and `js/` are the source.

```bash
npm run bundle            # rebuild index.html from styles/ and js/
npm run check            # fail if index.html is out of sync
npm test                 # backend smoke tests (includes the sync check)
```

Editing `js/` or `styles/` without running `npm run bundle` changes nothing in
the browser. `npm test` catches that.

## Architecture

```
api/
  _http.js            shared HTTPS client (timeouts, redirect + size caps)
  _video.js           input validation, job lifecycle, provider selection
  _providers/         one adapter per provider, all behind one interface
  video-create.js     POST  submit a generation, returns a job token
  video-status.js     GET   one poll tick
  video-proxy.js      GET   streams key-gated media without exposing the key
  video-providers.js  GET   which models are reachable
  _song.js             audio counterpart to _video.js — one provider, no registry
  _providers/songgen.js talks to a self-hosted SongGeneration Studio server
  song-create.js       POST  submit a song generation, returns a job id
  song-status.js       GET   one poll tick
  song-proxy.js        GET   streams a finished track without exposing the token
  song-providers.js    GET   configured state + genre vocabulary
js/
  video-engine.js     client: submit, poll with backoff, resolve to a blob
  neural-engine.js    free on-device engine: procedural scene renderer
  post-fx.js          shared finishing pass — grade, atmosphere, grain
  studio.js           video studio controller and generation pipeline
  song-studio.js      song studio controller: sections, style, player, library
workflows/            bundled ComfyUI graphs (API format) for the self-hosted video engine
docker/               one-command setup (Docker Compose) for every self-hosted engine
```

See [docs/self-hosting.md](docs/self-hosting.md) (video) and
[docs/song-generation.md](docs/song-generation.md) (audio) for the full
picture on either self-hosted pipeline.

Generation is two-phase because video models take 30s to several minutes and a
serverless function cannot hold a request open that long. `create` submits and
returns a token; the browser polls `status` until the clip is ready.

The job token is opaque, client-held state — Vercel functions share no memory,
so the job cannot live server-side. It therefore never carries a URL, only a
provider id and that provider's job id, and each adapter rebuilds its endpoints
against a hard-coded host. A tampered token cannot point the server anywhere.

## Notes

- Camera moves are sent to real models **as language** ("a slow push-in toward
  the subject"), not as a canvas transform, which is the only way a video model
  can act on them.
- Veo gates its output URL behind the API key, so those renders stream through
  `/api/video-proxy`. The key never reaches the browser.
- Provider request shapes are implemented against published REST docs but were
  not exercised against live endpoints from the build sandbox. If a provider has
  changed a field name, the model override env vars are the first thing to try.
