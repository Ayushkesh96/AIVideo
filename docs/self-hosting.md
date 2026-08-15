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

## Two ways to start, both wired

This repo ships two ready-to-run workflows. Pick with `COMFYUI_MODEL`:

| `COMFYUI_MODEL` | Model | Params | License | VRAM (realistic) | Character |
|---|---|---|---|---|---|
| `ltx` (default) | **LTX-Video 2B** | 2B | Apache 2.0 | **8–12 GB** | Fastest, good motion |
| `wan2.1` | **Wan 2.1 T2V** | 1.3B | Apache 2.0 | **6–8 GB** | Slower per clip, often steadier subjects/faces |

**Start with whichever fits your card; both run on a single consumer GPU.**
They're genuinely different models, not tiers of the same one — worth trying
both on the same prompt if you have the VRAM for either.

For anything beyond these two, see [Bigger models](#bigger-models-wan-22-hunyuanvideo-cogvideox) below.

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

```bash
cd docker
cp .env.example .env   # set COMFYUI_TOKEN — openssl rand -hex 32
docker compose up -d --build
```

Brings up ComfyUI plus an authenticated reverse proxy in front of it (ComfyUI
itself has no login). Full walkthrough, including where to download the model
weights, in [`docker/README.md`](../docker/README.md).

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

In Vercel → Settings → Environment Variables:

```
COMFYUI_URL=https://your-gpu-box.example.com
COMFYUI_TOKEN=whatever-your-proxy-requires
COMFYUI_MODEL=ltx            # or wan2.1 — picks the bundled workflow
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
| **CogVideoX** | 5B | Apache 2.0 | 12–18 GB | Community wrapper node ([kijai/ComfyUI-CogVideoXWrapper](https://github.com/kijai/ComfyUI-CogVideoXWrapper)), not in ComfyUI's built-in template gallery |

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

`active` should be `selfhosted` and `keyless` should be `false`. `providers`
will include an entry with `id: "selfhosted"` whose `models` array lists both
bundled options. If generation fails, the studio badge turns red and its
tooltip carries ComfyUI's own error — including per-node validation failures,
which is usually a missing model file or a renamed node.

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
