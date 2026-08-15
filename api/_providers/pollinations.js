/**
 * Pollinations adapter — the lowest-friction real video model.
 *
 * Unlike every other provider here, this one is ALWAYS enabled: it is tried
 * with no credentials at all, because Pollinations serves some generation
 * anonymously. If anonymous video is allowed for the chosen model the user gets
 * real text-to-video with no signup whatsoever; if it is not, the request 401s
 * and the studio falls back to the local engine exactly as before. Attempting
 * costs nothing, so there is no reason not to.
 *
 * Setting POLLINATIONS_KEY (free, no credit card, from enter.pollinations.ai)
 * lifts the anonymous limits.
 *
 * Protocol differs from the others: it is SYNCHRONOUS and streams the finished
 * mp4 back on the same request rather than returning a job to poll:
 *
 *   GET https://gen.pollinations.ai/video/{prompt}?model=&duration=&width=&height=
 *
 * That is why it sets `synchronous` and implements `streamRequest` instead of
 * submit/poll — see api/video-direct.js.
 */

const HOST = 'https://gen.pollinations.ai';

const MODELS = {
  'wan': { id: 'wan', label: 'Wan (fast)', maxResolution: 720, durations: [5], audio: false },
  'seedance': { id: 'seedance-pro', label: 'Seedance Pro', maxResolution: 1080, durations: [5, 10], audio: false },
  'veo': { id: 'veo', label: 'Google Veo (alpha)', maxResolution: 1080, durations: [4, 6, 8], audio: true },
  'nova': { id: 'nova-reel', label: 'Amazon Nova Reel', maxResolution: 720, durations: [6], audio: false }
};

// Default to the fast model: it is the one most likely to complete inside a
// serverless request window, and the most likely to be allowed anonymously.
const DEFAULT_MODEL_KEY = 'wan';

function apiKey() {
  return process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_API_KEY || '';
}

function resolveModel(requestedKey) {
  const override = (process.env.POLLINATIONS_VIDEO_MODEL || '').trim();
  if (override) {
    const known = Object.values(MODELS).find(m => m.id === override);
    return known || { id: override, label: override, maxResolution: 1080, durations: [5], audio: false };
  }
  return MODELS[requestedKey] || MODELS[DEFAULT_MODEL_KEY];
}

const provider = {
  id: 'pollinations',
  label: 'Pollinations',
  envKeys: ['POLLINATIONS_KEY'],
  synchronous: true,

  // Deliberately always true: a keyless attempt is the whole point of this
  // adapter. Registry order keeps it last, so any real key still wins.
  isConfigured() {
    return true;
  },

  capabilities() {
    const model = resolveModel(DEFAULT_MODEL_KEY);
    return {
      id: 'pollinations',
      label: 'Pollinations',
      configured: true,
      keyless: !apiKey(),
      synchronous: true,
      activeModel: model.id,
      activeModelLabel: apiKey() ? model.label : `${model.label} (no key — best effort)`,
      maxResolution: model.maxResolution,
      durations: model.durations,
      audio: model.audio,
      models: Object.keys(MODELS).map(key => Object.assign({ key }, MODELS[key]))
    };
  },

  /**
   * Builds the upstream request for api/video-direct.js to stream from.
   * Returns a descriptor rather than performing the fetch so the route owns
   * the streaming and this stays consistent with the other adapters.
   */
  streamRequest(input) {
    const model = resolveModel(input.modelKey);
    const duration = model.durations.indexOf(input.durationSec) >= 0
      ? input.durationSec
      : model.durations[0];

    const params = new URLSearchParams({
      model: model.id,
      duration: String(duration),
      width: String(input.width),
      height: String(input.height)
    });
    if (input.height >= 1080) params.set('resolution', '1k');
    if (Number.isFinite(input.seed)) params.set('seed', String(input.seed));

    const headers = { Accept: 'video/mp4' };
    // Anonymous is a supported mode here; only send the header if we have one.
    if (apiKey()) headers.Authorization = `Bearer ${apiKey()}`;

    return {
      url: `${HOST}/video/${encodeURIComponent(input.prompt)}?${params}`,
      headers,
      label: model.label
    };
  },

  ownsUrl(url) {
    try {
      const host = new URL(url).hostname;
      return host === 'gen.pollinations.ai' || host.endsWith('.pollinations.ai');
    } catch (err) {
      return false;
    }
  }
};

module.exports = provider;
