/**
 * Google Veo adapter (Gemini API long-running operations).
 *
 *   POST {BASE}/models/{model}:predictLongRunning  -> { name: "models/…/operations/…" }
 *   GET  {BASE}/{operationName}                    -> { done, response|error }
 *
 * Unlike fal and Replicate, the returned video URI is not publicly readable —
 * fetching it requires the API key. That is why this adapter reports
 * needsProxy: true and exposes downloadHeaders(): the browser can never be
 * handed the raw URI without also being handed the key.
 */

const { requestJson, HttpError } = require('../_http');

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

const MODELS = {
  'veo3.1': {
    id: 'veo-3.1-generate-preview',
    label: 'Google Veo 3.1',
    maxResolution: 2160,
    durations: [4, 6, 8],
    audio: true
  },
  'veo3': {
    id: 'veo-3.0-generate-001',
    label: 'Google Veo 3',
    maxResolution: 1080,
    durations: [8],
    audio: true
  },
  'veo3-fast': {
    id: 'veo-3.0-fast-generate-001',
    label: 'Google Veo 3 Fast',
    maxResolution: 1080,
    durations: [8],
    audio: true
  }
};

const DEFAULT_MODEL_KEY = 'veo3.1';

// Operation names are echoed back into a URL path, so they are validated
// rather than trusted — a job token is client-supplied data.
const OPERATION_NAME = /^models\/[A-Za-z0-9._-]+\/operations\/[A-Za-z0-9._-]+$/;

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

function resolveModel(requestedKey) {
  const override = (process.env.GOOGLE_VEO_MODEL || '').trim();
  if (override) {
    const known = Object.values(MODELS).find(m => m.id === override);
    return known || { id: override, label: override, maxResolution: 1080, durations: [8], audio: true };
  }
  return MODELS[requestedKey] || MODELS[DEFAULT_MODEL_KEY];
}

function authHeaders() {
  return {
    'x-goog-api-key': apiKey(),
    'Content-Type': 'application/json'
  };
}

const provider = {
  id: 'google',
  label: 'Google Veo',
  envKeys: ['GEMINI_API_KEY'],

  isConfigured() {
    return Boolean(apiKey());
  },

  capabilities() {
    const model = resolveModel(DEFAULT_MODEL_KEY);
    return {
      id: 'google',
      label: 'Google Veo',
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

    const parameters = {
      aspectRatio: input.aspectRatio === '9:16' ? '9:16' : '16:9',
      // Veo exposes resolution as a token, and only the 3.1 line accepts 4k.
      resolution: input.height >= 2160 && model.maxResolution >= 2160
        ? '4k'
        : (input.height >= 1080 ? '1080p' : '720p'),
      personGeneration: 'allow_adult'
    };
    if (input.negativePrompt) parameters.negativePrompt = input.negativePrompt;
    if (Number.isFinite(input.durationSec)) parameters.durationSeconds = input.durationSec;

    const res = await requestJson(`${BASE}/models/${encodeURIComponent(model.id)}:predictLongRunning`, {
      method: 'POST',
      headers: authHeaders(),
      body: { instances: [{ prompt: input.prompt }], parameters },
      timeoutMs: 30000
    });

    if (!res || typeof res.name !== 'string') {
      throw new Error('Veo did not return an operation name');
    }
    if (!OPERATION_NAME.test(res.name)) {
      throw new Error(`Veo returned an unexpected operation name: ${res.name}`);
    }

    return { jobId: res.name, meta: { model: model.id, label: model.label } };
  },

  async poll(jobId, meta) {
    if (!OPERATION_NAME.test(String(jobId || ''))) {
      return { status: 'failed', error: 'malformed Veo operation name' };
    }

    let res;
    try {
      res = await requestJson(`${BASE}/${jobId}`, { headers: authHeaders(), timeoutMs: 20000 });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return { status: 'failed', error: 'Veo operation not found (it may have expired)' };
      }
      throw err;
    }

    if (!res || res.done !== true) {
      return { status: 'running', progress: 0.5, detail: 'Veo is rendering' };
    }

    if (res.error) {
      return { status: 'failed', error: res.error.message || 'Veo generation failed' };
    }

    const uri = extractVideoUri(res.response);
    if (!uri) {
      // A finished operation with no sample is nearly always a safety block.
      const blocked = extractFilterReason(res.response);
      return {
        status: 'failed',
        error: blocked
          ? `Veo declined this prompt (${blocked})`
          : 'Veo finished without returning a video'
      };
    }

    return {
      status: 'succeeded',
      progress: 1,
      videoUrl: uri,
      // The URI is key-gated; it must be streamed through our own function.
      needsProxy: true,
      modelLabel: meta && meta.label
    };
  },

  /** Headers the proxy must attach when streaming a Veo file URI. */
  downloadHeaders() {
    return { 'x-goog-api-key': apiKey() };
  },

  /** The proxy will only stream hosts a provider claims. */
  ownsUrl(url) {
    try {
      const host = new URL(url).hostname;
      return host === 'generativelanguage.googleapis.com' || host.endsWith('.googleapis.com');
    } catch (err) {
      return false;
    }
  }
};

function extractVideoUri(response) {
  if (!response || typeof response !== 'object') return null;
  const gvr = response.generateVideoResponse || response;
  const samples = gvr.generatedSamples || gvr.generated_samples;
  if (Array.isArray(samples) && samples.length) {
    const video = samples[0].video || {};
    if (typeof video.uri === 'string') return video.uri;
    if (typeof video.url === 'string') return video.url;
  }
  if (Array.isArray(gvr.videos) && gvr.videos.length && typeof gvr.videos[0].uri === 'string') {
    return gvr.videos[0].uri;
  }
  return null;
}

function extractFilterReason(response) {
  if (!response || typeof response !== 'object') return null;
  const gvr = response.generateVideoResponse || response;
  if (typeof gvr.raiMediaFilteredReasons === 'string') return gvr.raiMediaFilteredReasons;
  if (Array.isArray(gvr.raiMediaFilteredReasons) && gvr.raiMediaFilteredReasons.length) {
    return String(gvr.raiMediaFilteredReasons[0]).slice(0, 200);
  }
  if (Number.isFinite(gvr.raiMediaFilteredCount) && gvr.raiMediaFilteredCount > 0) {
    return 'content policy filter';
  }
  return null;
}

module.exports = provider;
