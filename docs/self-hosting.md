# Running your own video model

This is the path where the generation is genuinely yours: open weights, your
GPU, no per-clip fee, no upstream content policy, no API key that can be
revoked.

## What this actually is

Products like Higgsfield are not a secret algorithm. They are a product layer —
camera presets, motion controls, a shot timeline — running on video diffusion
models. This repo already has that layer. What follows swaps the rented model
underneath it for one you run.

The models are open and the good ones are Apache-2.0:

| Model | Params | License | VRAM (realistic) | Notes |
|---|---|---|---|---|
| **LTX-Video 2B** | 2B | Apache 2.0 | **8–12 GB** | Fastest. The one to start on. |
| **LTX-Video 13B** | 13B | Apache 2.0 (tiered above $10M rev.) | 16–24 GB with FP8 | Much better motion |
| **Wan 2.2 (14B)** | 14B | Apache 2.0 | 65–80 GB at 720p | Best photorealism, esp. faces |
| **HunyuanVideo** | 13B | Tencent (territorial limits — read it) | 45–60 GB | Strong, licence needs care |
| **CogVideoX** | 5B | Apache 2.0 | 12–18 GB | Good middle ground |

**Start with LTX-Video 2B.** It runs on a single consumer card and proves the
pipeline before you spend on bigger hardware.

## The one hard requirement

**A GPU.** Vercel functions have none, so the model cannot run inside this app.
The app stays on Vercel and talks to a GPU box over HTTP.

Options, cheapest first:

- **Your own NVIDIA card** — 12 GB+ runs LTX-Video 2B. Free after the hardware.
- **RunPod / Vast.ai** — rent by the hour, roughly $0.20–0.80/hr for a 24 GB card
- **Modal** — serverless GPU, per-second billing, scales to zero between clips
- **Hugging Face Inference Endpoints** — managed, more expensive, least setup

## Setup

### 1. Install ComfyUI on the GPU machine

```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# Video output node used by the bundled workflow
cd custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite
cd ..
```

Download LTX-Video 2B into `models/checkpoints/` and the T5 text encoder into
`models/clip/` from the Lightricks repo on Hugging Face.

### 2. Start it, reachable from Vercel

```bash
python main.py --listen 0.0.0.0 --port 8188
```

It must be reachable from the internet for Vercel to call it. **Do not expose
ComfyUI directly** — it has no authentication and its API can read and write
files on the box. Put a reverse proxy in front that requires a bearer token,
then set `COMFYUI_TOKEN` to match.

### 3. Point the app at it

In Vercel → Settings → Environment Variables:

```
COMFYUI_URL=https://your-gpu-box.example.com
COMFYUI_TOKEN=whatever-your-proxy-requires
COMFYUI_MODEL_LABEL=LTX-Video 2B (self-hosted)
```

Redeploy. The Render Engine badge turns green and reads your label. Self-hosted
outranks every metered provider, so if `COMFYUI_URL` is set it wins.

## Using your own workflow

The bundled graph (`workflows/ltx-video-t2v.json`) is a **starting point, not a
guarantee** — ComfyUI node schemas move between versions, and yours may differ.
The reliable path is to build a workflow that works in your ComfyUI, then let
the app drive it.

1. Build and test the workflow in the ComfyUI UI
2. Rename four nodes (right-click → Title) so the app can find them:

   | Rename this node | To |
   |---|---|
   | Positive CLIP Text Encode | `AIVIDEO_PROMPT` |
   | Negative CLIP Text Encode | `AIVIDEO_NEGATIVE` |
   | Empty latent / EmptyLTXVLatentVideo | `AIVIDEO_LATENT` |
   | KSampler | `AIVIDEO_SAMPLER` |

3. **Save (API Format)** — not the normal save; the API format is what the
   `/prompt` endpoint accepts
4. Point at it: `COMFYUI_WORKFLOW=/path/to/your-workflow.json`, or paste the
   JSON directly into that variable

Matching by title rather than node id means editing the graph doesn't break the
wiring.

### What gets injected

| Node title | Fields set |
|---|---|
| `AIVIDEO_PROMPT` | `text` — prompt plus camera, rig and lens phrasing |
| `AIVIDEO_NEGATIVE` | `text` — negative prompt |
| `AIVIDEO_LATENT` | `width`, `height`, and `length`/`num_frames` from duration × fps + 1 |
| `AIVIDEO_SAMPLER` | `seed` / `noise_seed` |

Set `COMFYUI_FPS` if your workflow isn't 24fps, or the clip length will be wrong.

A workflow with no `AIVIDEO_PROMPT` node is rejected with an explicit error
rather than run — otherwise it would quietly render whatever prompt was saved
in the graph and look like the app was ignoring you.

## Checking it works

```bash
curl https://your-app.vercel.app/api/video-providers
```

`active` should be `selfhosted` and `keyless` should be `false`. If generation
fails, the studio badge turns red and its tooltip carries ComfyUI's own error —
including per-node validation failures, which is usually a missing model file or
a renamed node.

## Cost, honestly

| Route | Cost |
|---|---|
| Self-hosted, own GPU | electricity |
| Self-hosted, rented GPU | ~$0.20–0.80/hr while running |
| Veo / Sora / Kling via API | roughly $0.10–0.50 **per clip** |

Self-hosting wins at volume and loses on convenience: you maintain the box,
the models, and the workflow. The metered providers still produce better
results per clip today — Veo 3.1 and Sora 2 are ahead of any open model. The
gap is narrowing and Wan 2.2 is genuinely close for photorealism.

Both paths are wired, and the app picks whichever you've configured.
