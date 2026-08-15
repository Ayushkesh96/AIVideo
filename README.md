# AIVideo — AI Cinema Studio

A browser-based text-to-video studio. Type a prompt, pick a camera move, and get
back an actual video file rendered by a frontier video model.

## How generation works

Three engines, tried in order. The first one that answers wins:

| | Engine | Needs a key | What it can do |
|---|---|---|---|
| 0 | **Your own GPU** — LTX-Video, Wan 2.2, CogVideoX via ComfyUI | no (needs hardware) | Open weights you run yourself. No per-clip fee, no upstream policy. See [docs/self-hosting.md](docs/self-hosting.md) |
| 1 | **Keyed video model** — Veo, Sora, Kling, Wan, Hailuo, LTX, Runway, Luma | yes | Genuinely depicts the prompt, including motion, up to 4K |
| 2 | **Pollinations, anonymously** | **no** | A real video model, attempted with no credentials at all |
| 3 | **Local keyframe engine** | no | Generates stills for the prompt and animates them under a virtual camera |

**Engine 2 is the no-key path.** With nothing configured, the studio still asks a
real video model for a real clip. That request can be refused or rate limited —
anonymous access is a courtesy, not a guarantee — and when it is, engine 3 takes
over. The "Render Engine" badge shows amber for this best-effort state and green
once a key makes it reliable.

Engine 3 is honest about what it is: it interpolates between stills, so it
cannot invent motion. A prompt like *"the dog turns its head"* will not do that.
Only engines 1 and 2 can.

### If you want it to work without any key

Deploy as-is. Engine 2 runs by default. If clips stop arriving, you have hit the
anonymous limit — a **free** key from [enter.pollinations.ai](https://enter.pollinations.ai)
(no credit card) set as `POLLINATIONS_KEY` lifts it. That is the cheapest route
to reliable generation and the only "free" one that exists: image generation is
cheap enough to give away anonymously, video is 100–1000× the GPU cost, so no
provider offers unlimited keyless video.

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
| `POLLINATIONS_KEY` | Pollinations | `wan` | 1080p | **free tier** |

Providers are tried in that order and the first one with a key wins;
Pollinations runs last and needs no key at all. Redeploy after adding one — the
studio reads capabilities at page load.

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
npm run build            # rebuild index.html from styles/ and js/
npm run check            # fail if index.html is out of sync
npm test                 # backend smoke tests (includes the sync check)
```

Editing `js/` or `styles/` without running `npm run build` changes nothing in
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
