# Running your own video model

This is the path where the generation is genuinely yours: open weights, your
GPU, no per-clip fee, no upstream content policy, no API key that can be
revoked.

## What this actually is

Products like Higgsfield are not a secret algorithm. They are a product layer —
camera presets, motion controls, a shot timeline — running on video diffusion
models. This repo already has that layer. What follows swaps the rented model
underneath it for one you run, via [ComfyUI](https://github.com/comfyanonymous/ComfyUI),
the standard open-source node editor for diffusion models.

## Three ways to start, all wired

Two backends, three ready-to-run models. Two run through ComfyUI (pick with
`COMFYUI_MODEL`); the third, CogVideoX, doesn't have a mature ComfyUI path
(see [Bigger models](#bigger-models-wan-22-hunyuanvideo-cogvideox) for why)
and runs through its own small server instead
([`docker/cogvideox-server/`](../docker/cogvideox-server/)).

| Backend | Model | Params | License | VRAM (realistic) | Character |
|---|---|---|---|---|---|
| ComfyUI, `COMFYUI_MODEL=ltx` (default) | **LTX-Video 2B** | 2B | Apache 2.0 | **8–12 GB** | Fastest, good motion |
| ComfyUI, `COMFYUI_MODEL=wan2.1` | **Wan 2.1 T2V** | 1.3B | Apache 2.0 | **6–8 GB** | Slower per clip, often steadier subjects/faces |
| Standalone, `COGVIDEOX_URL` | **CogVideoX-2b** | 2B | Apache 2.0 | **~8–10 GB** with CPU offload | Behind the other two on motion quality; a genuinely different model if you want to compare |

**Start with whichever fits your card; all three run on a single consumer
GPU.** They're genuinely different models, not tiers of one — worth trying
more than one on the same prompt if you have the VRAM.

Both self-hosted backends outrank every metered provider once configured —
if you set up two, the ComfyUI one wins as the deterministic tiebreak (see
[`api/_providers/index.js`](../api/_providers/index.js)).

For anything beyond these three, see [Bigger models](#bigger-models-wan-22-hunyuanvideo-cogvideox) below.

## The one hard requirement

**A GPU.** Vercel functions have none, so the model cannot run inside this app.
The app stays on Vercel and talks to a GPU box over HTTP.

Options, cheapest first:

- **Your own NVIDIA card** — 8 GB+ runs either bundled model. Free after the hardware.
- **RunPod / Vast.ai** — rent by the hour, roughly $0.20–0.80/hr for a 24 GB card
- **Modal** — serverless GPU, per-second billing, scales to zero between clips
- **Hugging Face Inference Endpoints** — managed, more expensive, least setup

## Setup

### Fast path: Docker Compose

For LTX-Video or Wan 2.1 (ComfyUI):

```bash
cd docker
cp .env.example .env   # set COMFYUI_TOKEN — openssl rand -hex 32
docker compose up -d --build
```

Brings up ComfyUI plus an authenticated reverse proxy in front of it (ComfyUI
itself has no login). Full walkthrough, including where to download the model
weights, in [`docker/README.md`](../docker/README.md).

For CogVideoX instead:

```bash
cd docker
cp .env.example .env   # set COGVIDEOX_TOKEN — openssl rand -hex 32
docker compose --profile cogvideox up -d --build cogvideox
```

No model download step needed — the server pulls the weights itself on first
request. Details in [`docker/cogvideox-server/README.md`](../docker/cogvideox-server/README.md).

### Manual path

```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# Video output node used by both bundled workflows
cd custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite
cd ..
```

Download the weights for whichever model you picked:

**LTX-Video 2B** — into `models/checkpoints/` and `models/clip/`:
- [`ltx-video-2b-v0.9.5.safetensors`](https://huggingface.co/Lightricks/LTX-Video) → `checkpoints/`
- [`t5xxl_fp16.safetensors`](https://huggingface.co/comfyanonymous/flux_text_encoders) → `clip/`

**Wan 2.1 T2V 1.3B** — into `models/diffusion_models/`, `models/text_encoders/`, `models/vae/`:
- [`wan2.1_t2v_1.3B_fp16.safetensors`](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged) → `diffusion_models/`
- [`umt5_xxl_fp8_e4m3fn_scaled.safetensors`](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged) → `text_encoders/`
- [`wan_2.1_vae.safetensors`](https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged) → `vae/`

Then start it, reachable from Vercel:

```bash
python main.py --listen 0.0.0.0 --port 8188
```

It must be reachable from the internet for Vercel to call it. **Do not expose
ComfyUI directly** — it has no authentication and its API can read and write
files on the box. Put a reverse proxy in front that requires a bearer token
(the Docker setup does this for you with Caddy), then set `COMFYUI_TOKEN` to
match.

### Point the app at it

In Vercel → Settings → Environment Variables, for ComfyUI:

```
COMFYUI_URL=https://your-gpu-box.example.com
COMFYUI_TOKEN=whatever-your-proxy-requires
COMFYUI_MODEL=ltx            # or wan2.1 — picks the bundled workflow
```

or for the standalone CogVideoX server:

```
COGVIDEOX_URL=https://your-gpu-box.example.com:8189
COGVIDEOX_TOKEN=whatever COGVIDEOX_TOKEN you set on the server
```

Redeploy. The Render Engine badge turns green and reads your model's label.
Self-hosted outranks every metered provider, so if `COMFYUI_URL` is set it
wins over `FAL_KEY`/`GEMINI_API_KEY`/etc.

`COMFYUI_MODEL_LABEL` overrides the label shown in the badge, and
`COMFYUI_MAX_HEIGHT` overrides the resolution ceiling offered in the UI —
useful if your card can (or can't) push past the bundled default.

## Bigger models: Wan 2.2, HunyuanVideo, CogVideoX

These aren't bundled as ready-to-run files here — their graphs are
substantially more complex (Wan 2.2's 14B text-to-video is a two-stage
high-noise/low-noise MoE pipeline; HunyuanVideo 1.5 needs an LLaVA text
encoder) and hand-authoring them wrong would be worse than not shipping them.
ComfyUI ships them correctly instead:

1. In the ComfyUI UI: **Workflow → Browse Templates → Video**, pick one
   (e.g. "Wan 2.2 14B Text to Video", "Hunyuan Video 1.5 Text to Video").
   ComfyUI downloads the exact weights list for you from the template's notes.
2. Run it once in the UI to confirm your card can actually produce a clip.
3. Rename four nodes so this app can drive it — see
   [Using your own workflow](#using-your-own-workflow) below.
4. **Save (API Format)**, then point `COMFYUI_WORKFLOW` at the saved file (or
   paste the JSON directly into that env var).

| Model | Params | License | VRAM (realistic) | Notes |
|---|---|---|---|---|
| **Wan 2.2 (14B)** | 14B | Apache 2.0 | **~20 GB** fp8-scaled on a 24 GB card; far less with the 4-step LoRA (~90s/clip vs ~9min) | Best photorealism of the open models, especially faces |
| **HunyuanVideo 1.5** | ~8B | Tencent (territorial limits — read it) | 24–40 GB | Strong motion, licence needs care |
| **CogVideoX-5b** | 5B | Apache 2.0 | ~16–18 GB | The bigger sibling of the bundled 2b — see [`docker/cogvideox-server/`](../docker/cogvideox-server/), set `COGVIDEOX_MODEL=THUDM/CogVideoX-5b` |

CogVideoX-2b is bundled and ready to run — see the table above — via a
standalone server rather than ComfyUI (a ComfyUI wrapper node for it exists,
[kijai/ComfyUI-CogVideoXWrapper](https://github.com/kijai/ComfyUI-CogVideoXWrapper),
but isn't in ComfyUI's own template gallery). The 5b variant just needs a
config change, `COGVIDEOX_MODEL=THUDM/CogVideoX-5b`, on the same server.

The VRAM figures above (except CogVideoX, estimated) come from ComfyUI's own
published numbers for the fp8-scaled repackaged weights on an RTX 4090 — a lot
lower than older Wan 2.2 estimates from before those quantized weights shipped.

## Using your own workflow

Whether it's one of the two bundled here, a downloaded template, or something
you built from scratch: the app finds four nodes **by title**, not by graph
shape, so any workflow works once they're renamed.

1. Build and test the workflow in the ComfyUI UI
2. Rename four nodes (right-click → Title):

   | Rename this node | To |
   |---|---|
   | Positive CLIP Text Encode | `AIVIDEO_PROMPT` |
   | Negative CLIP Text Encode | `AIVIDEO_NEGATIVE` |
   | The empty video latent node | `AIVIDEO_LATENT` |
   | The sampler node (KSampler or similar) | `AIVIDEO_SAMPLER` |

3. **Save (API Format)** — not the normal save; the API format is what the
   `/prompt` endpoint accepts
4. Point at it: `COMFYUI_WORKFLOW=/path/to/your-workflow.json`, or paste the
   JSON directly into that variable. This overrides `COMFYUI_MODEL` entirely.

Matching by title rather than node id means editing the graph doesn't break the
wiring.

### What gets injected

| Node title | Fields set |
|---|---|
| `AIVIDEO_PROMPT` | `text` — prompt plus camera, rig and lens phrasing |
| `AIVIDEO_NEGATIVE` | `text` — negative prompt |
| `AIVIDEO_LATENT` | `width`, `height`, and `length`/`num_frames` from duration × fps + 1 |
| `AIVIDEO_SAMPLER` | `seed` / `noise_seed` |

Each bundled model has its own native frame rate (LTX-Video 24fps, Wan 2.1
16fps) already wired in; set `COMFYUI_FPS` to override it for a custom
workflow running at another rate, or the clip length will come out wrong.

A workflow with no `AIVIDEO_PROMPT` node is rejected with an explicit error
rather than run — otherwise it would quietly render whatever prompt was saved
in the graph and look like the app was ignoring you. The bundled workflows
also never carry a `control_after_generate` field on the sampler node — that's
a ComfyUI *frontend* convenience, not something its `/prompt` API accepts, and
a workflow saved from the UI without switching that widget to a plain value
first will carry it by mistake.

## Checking it works

```bash
curl https://your-app.vercel.app/api/video-providers
```

`active` should be `selfhosted` (ComfyUI) or `cogvideox`, and `keyless` should
be `false`. `providers` will include an entry with `id: "selfhosted"` whose `models` array lists both
bundled options.

That only confirms `COMFYUI_URL` is *set* — not that ComfyUI is actually up or
has the model files the workflow needs. For that (ComfyUI only — the
CogVideoX server doesn't have an equivalent preflight check yet; `curl` its
own `/health` route directly to confirm it's up):

```bash
curl https://your-app.vercel.app/api/video-selfhost-health
```

This calls your ComfyUI box for real: a `/system_stats` reachability check,
plus one `/object_info` lookup per node type in the active workflow, cross-
checked against the filenames the graph actually references. A clean setup
reports `"ok": true`; otherwise `missingNodes` names any custom node ComfyUI
doesn't recognize (not installed) and `missingFiles` names any model weight
the graph references that isn't in ComfyUI's `models/` folders. The studio
runs this automatically on load and downgrades the badge — amber for "reachable
but incomplete", red for "unreachable" — with the same detail in its tooltip,
so you don't have to `curl` this by hand to see it.

If generation itself still fails despite `ok: true`, the studio badge turns
red and its tooltip carries ComfyUI's own error — including per-node
validation failures, which usually means a parameter the health check doesn't
inspect (a resolution or duration the model can't produce, for instance).

## Cost, honestly

| Route | Cost |
|---|---|
| Self-hosted, own GPU | electricity |
| Self-hosted, rented GPU | ~$0.20–0.80/hr while running |
| Veo / Sora / Kling via API | roughly $0.10–0.50 **per clip** |

Self-hosting wins at volume and loses on convenience: you maintain the box,
the models, and the workflow. The metered providers still produce better
results per clip today — Veo 3.1 and Sora 2 are ahead of any open model. The
gap is narrowing and Wan 2.2 is genuinely close for photorealism, at a VRAM
cost that's dropped a lot since fp8-scaled weights shipped.

Every path here is wired, and the app picks whichever you've configured.
