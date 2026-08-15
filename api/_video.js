/**
 * Shared text-to-video job logic.
 *
 * Lives outside the route files so the Vercel functions and the local dev
 * server in server.js run the exact same code.
 *
 * The flow is deliberately two-phase. Video models take 30s to several
 * minutes; a serverless function cannot hold a request open that long, so
 * `createJob` submits and returns immediately with a token and `pollJob`
 * answers one short status question per call. The browser drives the loop.
 */

const providers = require('./_providers');

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '21:9'];

// Height drives the request; width follows from the aspect ratio. Providers
// take a resolution token rather than a pixel pair, so height is the honest
// unit to normalise on.
const QUALITY_HEIGHTS = { '720p': 720, '1080p': 1080, '4k': 2160 };

const MAX_PROMPT_CHARS = 2000;
const MIN_DURATION = 2;
const MAX_DURATION = 12;

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
}

function dimensionsFor(aspectRatio, height) {
  const ratios = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '21:9': 21 / 9 };
  const r = ratios[aspectRatio] || ratios['16:9'];
  // Even dimensions only — odd widths break h.264/vp9 chroma subsampling and
  // some providers reject them outright.
  const width = Math.round((height * r) / 2) * 2;
  return { width, height };
}

/**
 * Turns a raw request body into a validated provider input.
 * Throws on anything a provider would reject anyway, so the failure arrives
 * with a message the studio can show rather than a provider's 422.
 */
function normalizeInput(body) {
  const raw = body && typeof body === 'object' ? body : {};

  const prompt = String(raw.prompt || '').trim();
  if (!prompt) throw new Error('A prompt is required to generate a video.');
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new Error(`Prompt is too long (${prompt.length} chars, max ${MAX_PROMPT_CHARS}).`);
  }

  const aspectRatio = ASPECT_RATIOS.indexOf(raw.aspectRatio) >= 0 ? raw.aspectRatio : '16:9';

  const quality = QUALITY_HEIGHTS[raw.quality] ? raw.quality : '1080p';
  const { width, height } = dimensionsFor(aspectRatio, QUALITY_HEIGHTS[quality]);

  let durationSec = parseInt(raw.durationSec, 10);
  if (!Number.isFinite(durationSec)) durationSec = 5;
  durationSec = Math.max(MIN_DURATION, Math.min(MAX_DURATION, durationSec));

  const seed = Number.isFinite(+raw.seed) ? Math.abs(Math.trunc(+raw.seed)) % 2147483647 : undefined;

  return {
    prompt,
    aspectRatio,
    quality,
    width,
    height,
    durationSec,
    seed,
    audio: raw.audio !== false,
    negativePrompt: raw.negativePrompt ? String(raw.negativePrompt).slice(0, 500) : '',
    modelKey: raw.modelKey ? String(raw.modelKey).slice(0, 60) : '',
    providerId: raw.provider ? String(raw.provider).slice(0, 40) : ''
  };
}

/**
 * Submits a generation. Resolves with either a job token or an explicit
 * `fallback` instruction — a deployment with no API keys is a normal,
 * expected state, not an error, and the studio has a local engine for it.
 */
async function createJob(body) {
  const input = normalizeInput(body);
  const provider = providers.pick(input.providerId);

  if (!provider) {
    return {
      success: false,
      fallback: true,
      reason: 'no_provider_configured',
      error: 'No video model API key is configured on this deployment.',
      hint: 'Set FAL_KEY, GEMINI_API_KEY, REPLICATE_API_TOKEN, RUNWAYML_API_SECRET or LUMAAI_API_KEY in the environment to enable real text-to-video.'
    };
  }

  try {
    const { jobId, meta } = await provider.submit(input);
    return {
      success: true,
      job: providers.encodeJob(provider.id, jobId, meta),
      provider: provider.id,
      providerLabel: provider.label,
      model: (meta && meta.model) || null,
      modelLabel: (meta && meta.label) || null,
      request: {
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        quality: input.quality,
        width: input.width,
        height: input.height,
        durationSec: input.durationSec
      }
    };
  } catch (err) {
    // A provider that is down or rejecting must not kill the run — the studio
    // still has the keyframe synthesizer to fall back to.
    return {
      success: false,
      fallback: true,
      reason: 'provider_error',
      provider: provider.id,
      error: err.message || 'Provider submission failed.'
    };
  }
}

/** One poll tick. Never throws for an in-flight job; only for a bad token. */
async function pollJob(token) {
  const { provider, jobId, meta } = providers.decodeJob(token);

  try {
    const result = await provider.poll(jobId, meta);

    if (result.status === 'succeeded' && result.videoUrl) {
      return {
        success: true,
        status: 'succeeded',
        progress: 1,
        provider: provider.id,
        modelLabel: result.modelLabel || (meta && meta.label) || null,
        // A key-gated URL is never handed to the browser; it is replaced by a
        // same-origin proxy path that attaches the credential server-side.
        videoUrl: result.needsProxy
          ? `/api/video-proxy?job=${encodeURIComponent(token)}`
          : result.videoUrl,
        proxied: Boolean(result.needsProxy)
      };
    }

    if (result.status === 'failed') {
      return {
        success: false,
        status: 'failed',
        provider: provider.id,
        fallback: true,
        error: result.error || 'Generation failed.'
      };
    }

    return {
      success: true,
      status: result.status || 'running',
      progress: Number.isFinite(result.progress) ? result.progress : 0.4,
      detail: result.detail || null,
      provider: provider.id
    };
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      provider: provider.id,
      fallback: true,
      error: err.message || 'Polling failed.'
    };
  }
}

/**
 * Resolves the real, credentialed download for a job whose provider gates its
 * media behind the API key. Used only by the proxy route.
 */
async function resolveDownload(token) {
  const { provider, jobId, meta } = providers.decodeJob(token);
  const result = await provider.poll(jobId, meta);

  if (result.status !== 'succeeded' || !result.videoUrl) {
    throw new Error('job is not complete');
  }
  if (!providers.providerOwnsUrl(result.videoUrl)) {
    throw new Error('refusing to proxy a url no configured provider claims');
  }

  return {
    url: result.videoUrl,
    headers: typeof provider.downloadHeaders === 'function' ? provider.downloadHeaders() : {}
  };
}

module.exports = {
  applyCors,
  normalizeInput,
  createJob,
  pollJob,
  resolveDownload,
  capabilities: providers.capabilities,
  QUALITY_HEIGHTS,
  ASPECT_RATIOS
};
