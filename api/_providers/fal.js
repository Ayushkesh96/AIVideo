/**
 * fal.ai text-to-video adapter (queue API).
 *
 * fal fronts most of the frontier video models behind one queue protocol, so
 * this single adapter covers Veo, Sora, Kling, Wan, Hailuo and LTX. Which one
 * runs is a model id, not a code path.
 *
 * Protocol:
 *   POST https://queue.fal.run/{model}            -> { request_id, status_url }
 *   GET  https://queue.fal.run/{app}/requests/{id}/status
 *   GET  https://queue.fal.run/{app}/requests/{id}
 *
 * Note {app} is only the first two segments of the model id: a request for
 * `fal-ai/kling-video/v2/master/text-to-video` is polled at
 * `fal-ai/kling-video/requests/...`. Getting this wrong 404s every poll.
 */

const { requestJson, HttpError } = require('../_http');

const QUEUE_HOST = 'https://queue.fal.run';

/**
 * Model ids drift as providers ship new versions. Everything here is
 * overridable with FAL_VIDEO_MODEL so a rename upstream is a dashboard edit
 * rather than a redeploy.
 */
const MODELS = {
  'veo3': {
    id: 'fal-ai/veo3',
    label: 'Google Veo 3',
    maxResolution: 2160,
    durations: [4, 6, 8],
    audio: true,
    build: input => ({
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      duration: `${input.durationSec}s`,
      resolution: input.height >= 2160 ? '4K' : (input.height >= 1080 ? '1080p' : '720p'),
      generate_audio: input.audio !== false,
      negative_prompt: input.negativePrompt || undefined
    })
  },
  'sora2': {
    id: 'fal-ai/sora-2/text-to-video',
    label: 'OpenAI Sora 2',
    maxResolution: 1080,
    durations: [4, 8, 12],
    audio: true,
    build: input => ({
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio === '9:16' ? '9:16' : '16:9',
      duration: String(input.durationSec),
      resolution: input.height >= 1080 ? '1080p' : '720p'
    })
  },
  'kling': {
    id: 'fal-ai/kling-video/v2/master/text-to-video',
    label: 'Kling 2 Master',
    maxResolution: 1080,
    durations: [5, 10],
    audio: false,
    build: input => ({
      prompt: input.prompt,
      duration: String(input.durationSec >= 10 ? 10 : 5),
      aspect_ratio: input.aspectRatio,
      negative_prompt: input.negativePrompt || undefined
    })
  },
  'hailuo': {
    id: 'fal-ai/minimax/hailuo-02/standard/text-to-video',
    label: 'MiniMax Hailuo 02',
    maxResolution: 1080,
    durations: [6, 10],
    audio: false,
    build: input => ({
      prompt: input.prompt,
      duration: String(input.durationSec >= 10 ? 10 : 6),
      resolution: input.height >= 1080 ? '1080P' : '768P'
    })
  },
  'wan': {
    id: 'fal-ai/wan/v2.2-a14b/text-to-video',
    label: 'Wan 2.2 A14B',
    maxResolution: 1080,
    durations: [5],
    audio: false,
    build: input => ({
      prompt: input.prompt,
      resolution: input.height >= 1080 ? '1080p' : '720p',
      aspect_ratio: input.aspectRatio,
      negative_prompt: input.negativePrompt || undefined
    })
  },
  'ltx': {
    id: 'fal-ai/ltx-video-13b-distilled',
    label: 'LTX Video 13B (fast)',
    maxResolution: 768,
    durations: [5],
    audio: false,
    build: input => ({
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      negative_prompt: input.negativePrompt || undefined
    })
  }
};

const DEFAULT_MODEL_KEY = 'veo3';

function apiKey() {
  return process.env.FAL_KEY || process.env.FAL_API_KEY || '';
}

/** Resolves the model id to submit against, honouring an env override. */
function resolveModel(requestedKey) {
  const override = (process.env.FAL_VIDEO_MODEL || '').trim();
  if (override) {
    const known = Object.values(MODELS).find(m => m.id === override);
    if (known) return known;
    // An override we don't have metadata for still runs; we just can't claim
    // anything about its resolution ceiling.
    return { id: override, label: override, maxResolution: 1080, durations: [5], audio: false, build: MODELS[DEFAULT_MODEL_KEY].build };
  }
  return MODELS[requestedKey] || MODELS[DEFAULT_MODEL_KEY];
}

/** Queue status/result paths key off the app id, not the full model path. */
function appId(modelId) {
  return modelId.split('/').slice(0, 2).join('/');
}

function authHeaders() {
  return {
    Authorization: `Key ${apiKey()}`,
    'Content-Type': 'application/json'
  };
}

const provider = {
  id: 'fal',
  label: 'fal.ai',
  envKeys: ['FAL_KEY'],

  isConfigured() {
    return Boolean(apiKey());
  },

  capabilities() {
    const model = resolveModel(DEFAULT_MODEL_KEY);
    return {
      id: 'fal',
      label: 'fal.ai',
      configured: provider.isConfigured(),
      activeModel: model.id,
      activeModelLabel: model.label,
      maxResolution: model.maxResolution,
      durations: model.durations,
      audio: model.audio,
      models: Object.keys(MODELS).map(key => ({
        key,
        id: MODELS[key].id,
        label: MODELS[key].label,
        maxResolution: MODELS[key].maxResolution,
        durations: MODELS[key].durations,
        audio: MODELS[key].audio
      }))
    };
  },

  async submit(input) {
    const model = resolveModel(input.modelKey);
    const body = model.build(input);

    // Providers reject explicit nulls on optional fields more often than they
    // reject a missing key.
    Object.keys(body).forEach(k => {
      if (body[k] === undefined || body[k] === null || body[k] === '') delete body[k];
    });

    const res = await requestJson(`${QUEUE_HOST}/${model.id}`, {
      method: 'POST',
      headers: authHeaders(),
      body,
      timeoutMs: 30000
    });

    if (!res || !res.request_id) {
      throw new Error('fal did not return a request_id');
    }

    return {
      jobId: res.request_id,
      meta: { model: model.id, app: appId(model.id), label: model.label }
    };
  },

  async poll(jobId, meta) {
    const app = (meta && meta.app) || appId(resolveModel().id);
    const base = `${QUEUE_HOST}/${app}/requests/${encodeURIComponent(jobId)}`;

    let status;
    try {
      status = await requestJson(`${base}/status?logs=1`, {
        headers: authHeaders(),
        timeoutMs: 20000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return { status: 'failed', error: 'fal job not found (it may have expired)' };
      }
      throw err;
    }

    const state = String(status && status.status || '').toUpperCase();

    if (state === 'IN_QUEUE') {
      const pos = Number(status.queue_position);
      return {
        status: 'queued',
        progress: 0.05,
        detail: Number.isFinite(pos) ? `Queued at position ${pos}` : 'Queued'
      };
    }

    if (state === 'IN_PROGRESS') {
      return { status: 'running', progress: 0.5, detail: latestLog(status) || 'Generating' };
    }

    if (state !== 'COMPLETED') {
      return { status: 'failed', error: `fal reported status ${state || 'unknown'}` };
    }

    const result = await requestJson(base, { headers: authHeaders(), timeoutMs: 20000 });
    const videoUrl = extractVideoUrl(result);
    if (!videoUrl) {
      return { status: 'failed', error: 'fal completed without returning a video url' };
    }

    return {
      status: 'succeeded',
      progress: 1,
      videoUrl,
      // fal's media CDN serves permissive CORS, so the browser can fetch it
      // directly and we avoid streaming it through the function.
      needsProxy: false,
      modelLabel: meta && meta.label
    };
  }
};

function latestLog(status) {
  if (!status || !Array.isArray(status.logs) || !status.logs.length) return null;
  const last = status.logs[status.logs.length - 1];
  return last && typeof last.message === 'string' ? last.message.slice(0, 120) : null;
}

/** Model outputs differ: `video.url`, `videos[0].url`, or a bare `url`. */
function extractVideoUrl(result) {
  if (!result || typeof result !== 'object') return null;
  if (result.video && typeof result.video.url === 'string') return result.video.url;
  if (Array.isArray(result.videos) && result.videos[0] && typeof result.videos[0].url === 'string') {
    return result.videos[0].url;
  }
  if (Array.isArray(result.output) && typeof result.output[0] === 'string') return result.output[0];
  if (typeof result.video_url === 'string') return result.video_url;
  if (typeof result.url === 'string') return result.url;
  return null;
}

module.exports = provider;
