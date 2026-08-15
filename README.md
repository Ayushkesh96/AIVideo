# AIVideo — AI Cinema Studio

A browser-based text-to-video studio. Type a prompt, pick a camera move, and get
back a video file. **Works with zero configuration, zero accounts, and zero
cost** — the default renderer runs entirely in your browser. Adding a provider
key upgrades generation to a hosted AI video model.

## How generation works

Three engines, tried in order. The first one available wins:

| | Engine | Needs | What it can do |
|---|---|---|---|
| 0 | **Your own GPU** — LTX-Video, Wan 2.2, CogVideoX via ComfyUI | hardware, no fees | Open weights you run yourself. No per-clip cost, no upstream policy. See [docs/self-hosting.md](docs/self-hosting.md) |
| 1 | **Keyed video model** — Veo, Sora, Kling, Wan, Hailuo, LTX, Runway, Luma | an API key (paid) | Genuinely depicts the prompt, including motion, up to 4K |
| 2 | **Free on-device engine** | nothing | Renders a cinematic procedural scene for the prompt in your browser — camera moves, grading, grain, atmosphere — and records it to a real video file |

**Engine 2 is the default.** With nothing configured the studio makes no
upstream calls at all: the scene is synthesized, animated and recorded entirely
client-side, so it is unlimited and free forever. It is honest about what it is
— a procedural renderer, not a diffusion model. It composes a scene *inspired
by* the prompt; it cannot photorealistically depict arbitrary text. For that,
add a key (engine 1) or point it at your own GPU (engine 0).

With a funded `POLLINATIONS_KEY` there is also a middle path: real AI stills
are generated for the prompt and animated under a virtual camera. Generation on
gen.pollinations.ai is metered (anonymous and zero-balance requests are
refused), so this path only activates when a key with balance is configured.

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
| `POLLINATIONS_KEY` | Pollinations | `wan` | 1080p | metered (pollen) |

Providers are tried in that order and the first one with a key wins. Redeploy
after adding one — the studio reads capabilities at page load. With no key at
all, the free on-device engine renders every clip.

To pin a different model on a provider, set the matching override
(`GOOGLE_VEO_MODEL`, `FAL_VIDEO_MODEL`, `REPLICATE_VIDEO_MODEL`,
`RUNWAY_VIDEO_MODEL`, `LUMA_VIDEO_MODEL`). Model ids move as providers ship new
versions; these let you follow a rename without a code change.

### About 4K

Only Veo 3.1 and Luma Ray 2 advertise true 4K output. On any other model the 4K
button is **disabled rather than faked** — the studio will not upscale a 720p
render and call it 4K. The local fallback engine does render its canvas at
3840×2160 when you pick 4K, but that is an upscaled composite of generated
stills, not a 4K model render.

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
  _keyframe.js        text-to-image backend for the fallback engine
js/
  video-engine.js     client: submit, poll with backoff, resolve to a blob
  ai-synth.js         fallback: keyframe interpolation under a virtual camera
  studio.js           studio controller and generation pipeline
```

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
