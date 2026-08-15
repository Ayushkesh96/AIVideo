/**
 * Luma Dream Machine adapter.
 *
 *   POST https://api.lumalabs.ai/dream-machine/v1/generations     -> { id, state }
 *   GET  https://api.lumalabs.ai/dream-machine/v1/generations/{id} -> { state, assets }
 *
 * Luma is the one provider here that takes duration and resolution as strings
 * with unit suffixes ("5s", "1080p"), so the mapping is explicit.
 */

const { requestJson, HttpError } = require('../_http');

const API_HOST = 'https://api.lumalabs.ai/dream-machine/v1';

const MODELS = {
  'ray2': { id: 'ray-2', label: 'Luma Ray 2', maxResolution: 2160, durations: [5, 9], audio: false },
  'ray-flash2': { id: 'ray-flash-2', label: 'Luma Ray Flash 2', maxResolution: 1080, durations: [5, 9], audio: false }
};

const DEFAULT_MODEL_KEY = 'ray2';

function apiKey() {
  return process.env.LUMAAI_API_KEY || process.env.LUMA_API_KEY || '';
}

function resolveModel(requestedKey) {
  const override = (process.env.LUMA_VIDEO_MODEL || '').trim();
  if (override) {
    const known = Object.values(MODELS).find(m => m.id === override);
    return known || { id: override, label: override, maxResolution: 1080, durations: [5], audio: false };
  }
  return MODELS[requestedKey] || MODELS[DEFAULT_MODEL_KEY];
}

function authHeaders() {
  return {
    Authorization: `Bearer ${apiKey()}`,
    'Content-Type': 'application/json'
  };
}

const provider = {
  id: 'luma',
  label: 'Luma Dream Machine',
  envKeys: ['LUMAAI_API_KEY'],

  isConfigured() {
    return Boolean(apiKey());
  },

  capabilities() {
    const model = resolveModel(DEFAULT_MODEL_KEY);
    return {
      id: 'luma',
      label: 'Luma Dream Machine',
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
    const duration = model.durations.indexOf(input.durationSec) >= 0 ? input.durationSec : model.durations[0];

    let resolution = '720p';
    if (input.height >= 2160 && model.maxResolution >= 2160) resolution = '4k';
    else if (input.height >= 1080) resolution = '1080p';

    const res = await requestJson(`${API_HOST}/generations`, {
      method: 'POST',
      headers: authHeaders(),
      body: {
        generation_type: 'video',
        model: model.id,
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        resolution,
        duration: `${duration}s`
      },
      timeoutMs: 30000
    });

    if (!res || !res.id) throw new Error('Luma did not return a generation id');
    return { jobId: res.id, meta: { model: model.id, label: model.label } };
  },

  async poll(jobId, meta) {
    let res;
    try {
      res = await requestJson(`${API_HOST}/generations/${encodeURIComponent(jobId)}`, {
        headers: authHeaders(),
        timeoutMs: 20000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return { status: 'failed', error: 'Luma generation not found' };
      }
      throw err;
    }

    const state = String(res && res.state || '').toLowerCase();

    if (state === 'queued') return { status: 'queued', progress: 0.05, detail: 'Queued' };
    if (state === 'dreaming') return { status: 'running', progress: 0.5, detail: 'Dreaming' };
    if (state === 'failed') {
      return { status: 'failed', error: res.failure_reason || 'Luma generation failed' };
    }
    if (state !== 'completed') {
      return { status: 'running', progress: 0.3, detail: state || 'Working' };
    }

    const videoUrl = res.assets && typeof res.assets.video === 'string' ? res.assets.video : null;
    if (!videoUrl) return { status: 'failed', error: 'Luma completed without a video url' };

    return { status: 'succeeded', progress: 1, videoUrl, needsProxy: false, modelLabel: meta && meta.label };
  }
};

module.exports = provider;
