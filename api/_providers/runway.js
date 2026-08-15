/**
 * Runway adapter (Gen-4 / Veo via the Runway developer API).
 *
 *   POST https://api.dev.runwayml.com/v1/text_to_video -> { id }
 *   GET  https://api.dev.runwayml.com/v1/tasks/{id}    -> { status, output }
 *
 * Runway pins behaviour to a dated API version header; omitting it is a 400,
 * so RUNWAY_API_VERSION exists to move forward without a code change.
 */

const { requestJson, HttpError } = require('../_http');

const API_HOST = 'https://api.dev.runwayml.com/v1';
const DEFAULT_VERSION = '2024-11-06';

const MODELS = {
  'gen4': { id: 'gen4_turbo', label: 'Runway Gen-4 Turbo', maxResolution: 720, durations: [5, 10], audio: false },
  'veo3': { id: 'veo3', label: 'Veo 3 (via Runway)', maxResolution: 1080, durations: [8], audio: true }
};

const DEFAULT_MODEL_KEY = 'gen4';

// Runway takes an explicit pixel ratio string rather than an aspect name.
const RATIOS = {
  '16:9': '1280:720',
  '9:16': '720:1280',
  '1:1': '960:960',
  '21:9': '1584:672'
};

function apiKey() {
  return process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_KEY || '';
}

function resolveModel(requestedKey) {
  const override = (process.env.RUNWAY_VIDEO_MODEL || '').trim();
  if (override) {
    const known = Object.values(MODELS).find(m => m.id === override);
    return known || { id: override, label: override, maxResolution: 1080, durations: [5], audio: false };
  }
  return MODELS[requestedKey] || MODELS[DEFAULT_MODEL_KEY];
}

function authHeaders() {
  return {
    Authorization: `Bearer ${apiKey()}`,
    'X-Runway-Version': process.env.RUNWAY_API_VERSION || DEFAULT_VERSION,
    'Content-Type': 'application/json'
  };
}

const provider = {
  id: 'runway',
  label: 'Runway',
  envKeys: ['RUNWAYML_API_SECRET'],

  isConfigured() {
    return Boolean(apiKey());
  },

  capabilities() {
    const model = resolveModel(DEFAULT_MODEL_KEY);
    return {
      id: 'runway',
      label: 'Runway',
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

    const res = await requestJson(`${API_HOST}/text_to_video`, {
      method: 'POST',
      headers: authHeaders(),
      body: {
        model: model.id,
        promptText: input.prompt,
        ratio: RATIOS[input.aspectRatio] || RATIOS['16:9'],
        duration
      },
      timeoutMs: 30000
    });

    if (!res || !res.id) throw new Error('Runway did not return a task id');
    return { jobId: res.id, meta: { model: model.id, label: model.label } };
  },

  async poll(jobId, meta) {
    let res;
    try {
      res = await requestJson(`${API_HOST}/tasks/${encodeURIComponent(jobId)}`, {
        headers: authHeaders(),
        timeoutMs: 20000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return { status: 'failed', error: 'Runway task not found' };
      }
      throw err;
    }

    const state = String(res && res.status || '').toUpperCase();
    const progress = Number.isFinite(res && res.progress) ? Math.max(0.05, Math.min(0.99, res.progress)) : null;

    if (state === 'PENDING' || state === 'THROTTLED') {
      return { status: 'queued', progress: 0.05, detail: state === 'THROTTLED' ? 'Rate limited, waiting' : 'Queued' };
    }
    if (state === 'RUNNING') {
      return { status: 'running', progress: progress || 0.5, detail: 'Generating' };
    }
    if (state === 'FAILED' || state === 'CANCELLED') {
      return { status: 'failed', error: res.failure || res.failureCode || `Runway task ${state}` };
    }
    if (state !== 'SUCCEEDED') {
      return { status: 'running', progress: progress || 0.3, detail: state || 'Working' };
    }

    const videoUrl = Array.isArray(res.output) && typeof res.output[0] === 'string' ? res.output[0] : null;
    if (!videoUrl) return { status: 'failed', error: 'Runway succeeded without a video url' };

    return { status: 'succeeded', progress: 1, videoUrl, needsProxy: false, modelLabel: meta && meta.label };
  }
};

module.exports = provider;
