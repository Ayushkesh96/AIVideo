/**
 * CogVideoX adapter — a self-hosted model server, but not ComfyUI.
 *
 * CogVideoX doesn't have a mature, official ComfyUI workflow the way
 * LTX-Video and Wan do (community wrapper nodes exist but aren't part of
 * ComfyUI's own template gallery — see docs/self-hosting.md), so this talks
 * to a small standalone FastAPI server instead, built specifically for this
 * repo: docker/cogvideox-server/. It wraps diffusers' CogVideoXPipeline
 * directly, the same approach pinokiofactory/cogstudio's Gradio app uses.
 *
 * Protocol (see docker/cogvideox-server/server.py):
 *   POST {host}/generate {prompt, width, height, num_frames, ...} -> {job_id}
 *   GET  {host}/status/{job_id} -> {status, video_url?, error?}
 *   GET  {host}/videos/{job_id}.mp4 -> the media bytes
 *
 * Same "own the generation" pitch as the ComfyUI provider: no per-clip fee,
 * no upstream content policy, needs a GPU (8-10GB with the CPU-offloaded
 * 2B model). Sits right after `selfhosted` in the registry — both are "your
 * own GPU" tiers and should outrank every metered API either way.
 */

const { requestJson, HttpError } = require('../_http');

// CogVideoX trains at 8fps; frame count must be 4k+1. Getting this wrong
// doesn't error, it just silently truncates or pads, so it's worth deriving
// correctly from the requested duration rather than hard-coding one length.
const NATIVE_FPS = 8;
const MAX_RESOLUTION = 480; // CogVideoX's native output height (720x480)

function baseUrl() {
  const raw = (process.env.COGVIDEOX_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

function authHeaders() {
  const token = (process.env.COGVIDEOX_TOKEN || '').trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Nearest frame count of the form 4k+1 the model actually accepts. */
function frameCountFor(durationSec) {
  const raw = Math.max(1, Math.round(durationSec * NATIVE_FPS));
  const k = Math.max(2, Math.round((raw - 1) / 4));
  return k * 4 + 1;
}

const provider = {
  id: 'cogvideox',
  label: 'CogVideoX (self-hosted)',
  envKeys: ['COGVIDEOX_URL'],

  isConfigured() {
    return Boolean(baseUrl());
  },

  capabilities() {
    const model = (process.env.COGVIDEOX_MODEL_LABEL || 'CogVideoX (self-hosted)').trim();
    return {
      id: 'cogvideox',
      label: 'CogVideoX (self-hosted)',
      configured: provider.isConfigured(),
      selfHosted: true,
      activeModel: 'cogvideox',
      activeModelLabel: model,
      maxResolution: parseInt(process.env.COGVIDEOX_MAX_HEIGHT, 10) || MAX_RESOLUTION,
      durations: [2, 3, 4, 5, 6, 8, 10, 12],
      audio: false,
      models: []
    };
  },

  async submit(input) {
    const host = baseUrl();
    if (!host) throw new Error('COGVIDEOX_URL is not set');

    let res;
    try {
      res = await requestJson(`${host}/generate`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: {
          prompt: input.prompt,
          negative_prompt: input.negativePrompt || '',
          width: input.width,
          height: input.height,
          num_frames: frameCountFor(input.durationSec),
          seed: Number.isFinite(input.seed) ? input.seed : undefined,
          fps: NATIVE_FPS
        },
        // The model can take several minutes to load on a cold box before
        // generation even starts; this is just the submit call, which
        // returns as soon as the job is queued, but a slow box still needs
        // room to accept the connection at all.
        timeoutMs: 30000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 401) {
        throw new Error('CogVideoX server rejected the request — check COGVIDEOX_TOKEN matches the server\'s.');
      }
      throw new Error(`Could not reach the CogVideoX server at ${host}: ${err.message}`);
    }

    if (!res || !res.job_id) throw new Error('CogVideoX server did not return a job_id');
    return { jobId: res.job_id, meta: { label: provider.capabilities().activeModelLabel } };
  },

  async poll(jobId, meta) {
    const host = baseUrl();
    let res;
    try {
      res = await requestJson(`${host}/status/${encodeURIComponent(jobId)}`, {
        headers: authHeaders(),
        timeoutMs: 15000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return { status: 'failed', error: 'CogVideoX server restarted and lost this job — try again.' };
      }
      return { status: 'failed', error: `CogVideoX server unavailable: ${err.message}` };
    }

    if (!res) return { status: 'running', progress: 0.4, detail: 'Rendering on your GPU' };

    if (res.status === 'failed') {
      return { status: 'failed', error: res.error || 'CogVideoX generation failed.' };
    }

    if (res.status === 'succeeded' && res.video_url) {
      return {
        status: 'succeeded',
        progress: 1,
        videoUrl: `${host}${res.video_url}`,
        // The box may be on a private network or require the bearer token,
        // so the browser cannot be expected to fetch it directly.
        needsProxy: true,
        modelLabel: meta && meta.label
      };
    }

    const detail = res.status === 'queued'
      ? 'Queued on your GPU'
      : Number.isFinite(res.elapsed_seconds)
        ? `Rendering on your GPU (${res.elapsed_seconds}s)`
        : 'Rendering on your GPU';
    return { status: 'running', progress: res.status === 'queued' ? 0.1 : 0.5, detail };
  },

  downloadHeaders() {
    return authHeaders();
  },

  // Exposed for testing — pure, no network, and the 4k+1 rounding is exactly
  // the kind of off-by-one that's worth pinning down with a test rather than
  // trusting by inspection.
  frameCountFor,

  ownsUrl(url) {
    const host = baseUrl();
    if (!host) return false;
    try {
      return new URL(url).origin === new URL(host).origin;
    } catch (err) {
      return false;
    }
  }
};

module.exports = provider;
