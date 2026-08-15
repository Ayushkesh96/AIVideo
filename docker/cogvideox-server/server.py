"""
Minimal FastAPI server around diffusers' CogVideoX pipeline.

Not ComfyUI — CogVideoX doesn't have a mature, official ComfyUI node graph the
way LTX-Video and Wan do (see docs/self-hosting.md for why those two are
bundled as ComfyUI workflows and this one isn't), so this talks to the model
directly through Hugging Face's own diffusers library instead. Same job as
ComfyUI's /prompt + /history: submit a generation, poll until it's done.

Runs one job at a time on purpose — a single consumer GPU can't usefully do
two video diffusion runs at once, and serializing them means "job N+1 is
queued" is always literally true, not a race to reason about.

CPU-offloaded (enable_sequential_cpu_offload) so CogVideoX-2b fits well under
10GB VRAM, at the cost of being slower than keeping the whole model resident —
the same trade-off the reference Gradio app this was adapted from
(pinokiofactory/cogstudio) makes. Set COGVIDEOX_FULL_GPU=1 to keep the model
fully on the GPU instead, if you have the VRAM to spare and want it faster.
"""

import base64
import io
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Dict, Optional

import torch
from diffusers import CogVideoXPipeline, CogVideoXDPMScheduler
from diffusers.utils import export_to_video
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

MODEL_ID = os.environ.get("COGVIDEOX_MODEL", "THUDM/CogVideoX-2b")
FULL_GPU = os.environ.get("COGVIDEOX_FULL_GPU", "").strip() == "1"
AUTH_TOKEN = os.environ.get("COGVIDEOX_TOKEN", "").strip()

# Unlike the ComfyUI setup in docker/docker-compose.yml, this server's port is
# published straight to the host — there's no separate reverse proxy in front
# of it providing auth. So, unlike ComfyUI (which has none at all and that's
# just accepted), a missing token here fails loudly at startup rather than
# silently serving a GPU-accessible endpoint to anyone who can reach the port.
# Set COGVIDEOX_ALLOW_NO_AUTH=1 to explicitly opt out (e.g. it's only ever
# reachable on a private network you already trust).
if not AUTH_TOKEN and os.environ.get("COGVIDEOX_ALLOW_NO_AUTH", "").strip() != "1":
    raise SystemExit(
        "COGVIDEOX_TOKEN is not set. Generate one (openssl rand -hex 32) and set it in "
        "docker/.env, or set COGVIDEOX_ALLOW_NO_AUTH=1 to run without auth on a trusted network."
    )
OUTPUT_DIR = Path(os.environ.get("COGVIDEOX_OUTPUT_DIR", "/app/output"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# CogVideoX-2b is documented to want float16; CogVideoX-5b wants bfloat16.
# Guessing wrong here doesn't crash, it just degrades quality silently, so
# this is worth getting right rather than hard-coding one dtype for both.
DTYPE = torch.bfloat16 if "5b" in MODEL_ID.lower() else torch.float16

app = FastAPI(title="AIVideo CogVideoX server")

jobs: Dict[str, dict] = {}
jobs_lock = threading.Lock()
generation_lock = threading.Lock()  # serializes actual GPU work across jobs

pipe: Optional[CogVideoXPipeline] = None
pipe_lock = threading.Lock()


def get_pipe() -> CogVideoXPipeline:
    """Lazy-loads the pipeline on first request rather than at import time,
    so the server comes up (and answers /health) immediately even while the
    ~5-10GB of weights are still downloading on a fresh box."""
    global pipe
    if pipe is not None:
        return pipe
    with pipe_lock:
        if pipe is None:
            print(f"[cogvideox-server] loading {MODEL_ID} ({DTYPE})...", flush=True)
            p = CogVideoXPipeline.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
            p.scheduler = CogVideoXDPMScheduler.from_config(
                p.scheduler.config, timestep_spacing="trailing"
            )
            if FULL_GPU:
                p.to("cuda")
            else:
                p.enable_sequential_cpu_offload()
            p.vae.enable_tiling()
            p.vae.enable_slicing()
            pipe = p
            print("[cogvideox-server] model ready", flush=True)
        return pipe


def require_auth(authorization: Optional[str]):
    if not AUTH_TOKEN:
        return  # only reachable with COGVIDEOX_ALLOW_NO_AUTH=1 — see the startup check above
    expected = f"Bearer {AUTH_TOKEN}"
    if authorization != expected:
        raise HTTPException(401, "invalid or missing bearer token")


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 720
    height: int = 480
    num_frames: int = Field(default=49, ge=9, le=161)  # CogVideoX wants 4k+1 frames
    num_inference_steps: int = Field(default=50, ge=10, le=100)
    guidance_scale: float = 6.0
    seed: Optional[int] = None
    fps: int = 8


def run_generation(job_id: str, req: GenerateRequest):
    with jobs_lock:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["started_at"] = time.time()

    try:
        p = get_pipe()
        generator = None
        if req.seed is not None:
            generator = torch.Generator().manual_seed(req.seed)

        # Only one generation runs on the GPU at a time — see the module
        # docstring. Other jobs stay "queued" in the jobs dict until this
        # releases the lock.
        with generation_lock:
            result = p(
                prompt=req.prompt,
                negative_prompt=req.negative_prompt or None,
                num_videos_per_prompt=1,
                num_inference_steps=req.num_inference_steps,
                num_frames=req.num_frames,
                guidance_scale=req.guidance_scale,
                width=req.width,
                height=req.height,
                generator=generator,
            )

        frames = result.frames[0]
        out_path = OUTPUT_DIR / f"{job_id}.mp4"
        export_to_video(frames, str(out_path), fps=req.fps)

        with jobs_lock:
            jobs[job_id]["status"] = "succeeded"
            jobs[job_id]["video_path"] = str(out_path)
    except Exception as err:  # noqa: BLE001 — reported to the caller, not swallowed
        print(f"[cogvideox-server] job {job_id} failed: {err}", flush=True)
        with jobs_lock:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(err)


@app.get("/health")
async def health():
    return {"ok": True, "model": MODEL_ID, "model_loaded": pipe is not None}


@app.post("/generate")
async def generate(req: GenerateRequest, authorization: Optional[str] = Header(None)):
    require_auth(authorization)

    job_id = uuid.uuid4().hex[:12]
    with jobs_lock:
        jobs[job_id] = {"status": "queued", "created_at": time.time()}

    threading.Thread(target=run_generation, args=(job_id, req), daemon=True).start()
    return {"job_id": job_id}


@app.get("/status/{job_id}")
async def status(job_id: str, authorization: Optional[str] = Header(None)):
    require_auth(authorization)

    with jobs_lock:
        job = jobs.get(job_id)
    if job is None:
        raise HTTPException(404, "unknown job id")

    out = {"status": job["status"]}
    if job["status"] == "succeeded":
        out["video_url"] = f"/videos/{job_id}.mp4"
    elif job["status"] == "failed":
        out["error"] = job.get("error", "generation failed")
    elif job["status"] == "running" and job.get("started_at"):
        out["elapsed_seconds"] = int(time.time() - job["started_at"])
    return out


@app.get("/videos/{filename}")
async def get_video(filename: str, authorization: Optional[str] = Header(None)):
    require_auth(authorization)

    # filename is always "{job_id}.mp4" from status() above, and job ids are
    # hex-only from uuid4().hex — no path traversal is reachable through it,
    # but resolve()-and-check anyway rather than trust that invariant forever.
    path = (OUTPUT_DIR / filename).resolve()
    if OUTPUT_DIR.resolve() not in path.parents or not path.is_file():
        raise HTTPException(404, "video not found")
    return FileResponse(path, media_type="video/mp4")
