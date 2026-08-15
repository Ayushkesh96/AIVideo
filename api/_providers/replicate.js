/**
 * Replicate text-to-video adapter.
 *
 * Uses the owner/name prediction route rather than a pinned version hash, so a
 * model publishing a new version keeps working without a redeploy:
 *   POST https://api.replicate.com/v1/models/{owner}/{name}/predictions
 *   GET  https://api.replicate.com/v1/predictions/{id}
 *
 * Replicate hosts a moving catalogue. REPLICATE_VIDEO_MODEL overrides the
 * default so any text-to-video model on the platform can be pointed at without
 * touching this file.
 */

const { requestJson, HttpError } = require('../_http');

const API_HOST = 'https://api.replicate.com/v1';

const MODELS = {
  'wan': {
    id: 'wan-video/wan-2.2-t2v-fast',
    label: 'Wan 2.2 T2V (fast)',
    maxResolution: 720,
    durations: [5],
    audio: false
  },
  'veo3': {
    id: 'google/veo-3',
    label: 'Google Veo 3',
    maxResolution: 1080,
    durations: [8],
    audio: true
  },
  'hailuo': {
    id: 'minimax/video-01',
    label: 'MiniMax Video 01',
    maxResolution: 720,
    durations: [6],
    audio: false
  },
  'ltx': {
    id: 'lightricks/ltx-video',
    label: 'LTX Video',
    maxResolution: 720,
    durations: [5],
    audio: false
  }
};

const DEFAULT_MODEL_KEY = 'wan';

function apiToken() {
  return process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY || '';
}

function resolveModel(requestedKey) {
  const override = (process.env.REPLICATE_VIDEO_MODEL || '').trim();
  if (override) {
    const known = Object.values(MODELS).find(m => m.id === override);
    return known || { id: override, label: override, maxResolution: 1080, durations: [5], audio: false };
  }
  return MODELS[requestedKey] || MODELS[DEFAULT_MODEL_KEY];
}

function authHeaders() {
  return {
    Authorization: `Bearer ${apiToken()}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Replicate model inputs are not standardised. These are the keys the common
 * video models accept; unknown keys are rejected by the API, so this stays
 * deliberately small and lets the model apply its own defaults for the rest.
 */
function buildInput(input) {
  const payload = {
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio,
    duration: input.durationSec,
    resolution: input.height >= 1080 ? '1080p' : '720p'
  };
  if (input.negativePrompt) payload.negative_prompt = input.negativePrompt;
  if (Number.isFinite(input.seed)) payload.seed = input.seed;
  return payload;
}

const provider = {
  id: 'replicate',
  label: 'Replicate',
  envKeys: ['REPLICATE_API_TOKEN'],

  isConfigured() {
    return Boolean(apiToken());
  },

  capabilities() {
    const model = resolveModel(DEFAULT_MODEL_KEY);
    return {
      id: 'replicate',
      label: 'Replicate',
      configured: provider.isConfigured(),
      activeModel: model.id,
      activeModelLabel: model.label,
      maxResolution: model.maxResolution,
      durations: model.durations,
      audio: model.audio,
      models: Object.keys(MODELS).map(key => Object.assign({ key }, MODELS[key]))
    };
  },

  async submit(input) {
    const model = resolveModel(input.modelKey);
    const [owner, name] = model.id.split('/');
    if (!owner || !name) {
      throw new Error(`REPLICATE_VIDEO_MODEL must be "owner/name", got "${model.id}"`);
    }

    let res;
    try {
      res = await requestJson(`${API_HOST}/models/${owner}/${name}/predictions`, {
        method: 'POST',
        headers: authHeaders(),
        body: { input: buildInput(input) },
        timeoutMs: 30000
      });
    } catch (err) {
      // A rejected input key is the single most common failure here, and the
      // bare 422 tells the user nothing actionable.
      if (err instanceof HttpError && err.statusCode === 422) {
        throw new Error(`${model.id} rejected the request inputs: ${err.message}`);
      }
      throw err;
    }

    if (!res || !res.id) throw new Error('Replicate did not return a prediction id');
    return { jobId: res.id, meta: { model: model.id, label: model.label } };
  },

  async poll(jobId, meta) {
    let res;
    try {
      res = await requestJson(`${API_HOST}/predictions/${encodeURIComponent(jobId)}`, {
        headers: authHeaders(),
        timeoutMs: 20000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        // Replicate garbage-collects prediction output after about an hour.
        return { status: 'failed', error: 'Replicate prediction not found (output expires after ~1 hour)' };
      }
      throw err;
    }

    const state = String(res && res.status || '').toLowerCase();

    if (state === 'starting') return { status: 'queued', progress: 0.05, detail: 'Starting model' };
    if (state === 'processing') {
      return { status: 'running', progress: 0.5, detail: lastLogLine(res.logs) || 'Generating' };
    }
    if (state === 'failed' || state === 'canceled') {
      return { status: 'failed', error: res.error ? String(res.error) : `Replicate prediction ${state}` };
    }
    if (state !== 'succeeded') {
      return { status: 'running', progress: 0.3, detail: state || 'Working' };
    }

    const videoUrl = extractVideoUrl(res.output);
    if (!videoUrl) return { status: 'failed', error: 'Replicate succeeded without a video url' };

    return {
      status: 'succeeded',
      progress: 1,
      videoUrl,
      needsProxy: false,
      modelLabel: meta && meta.label
    };
  }
};

function lastLogLine(logs) {
  if (typeof logs !== 'string' || !logs) return null;
  const lines = logs.trim().split('\n').filter(Boolean);
  return lines.length ? lines[lines.length - 1].slice(0, 120) : null;
}

function extractVideoUrl(output) {
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    // Video models that emit an array put the clip last when they also return
    // preview frames.
    for (let i = output.length - 1; i >= 0; i--) {
      if (typeof output[i] === 'string') return output[i];
    }
    return null;
  }
  if (typeof output === 'object') {
    if (typeof output.video === 'string') return output.video;
    if (typeof output.url === 'string') return output.url;
  }
  return null;
}

module.exports = provider;
