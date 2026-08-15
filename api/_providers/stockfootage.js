/**
 * Stock footage adapter (Pexels).
 *
 * Not AI generation — this is a fundamentally different technique, and the
 * distinction matters: it searches Pexels' library of real, camera-shot
 * video for a clip matching keywords in the prompt, and plays that clip
 * directly. No model, no training, no GPU, because there is nothing being
 * synthesized — the output is genuine footage someone actually filmed.
 *
 * That is also its honest limit: it can only return what exists. "a dog
 * running in snow" has good odds of a real match; "a cybernetic dragon
 * skateboarding on Mars" does not, and correctly reports no result so the
 * studio falls back rather than returning something unrelated.
 *
 * Protocol (https://www.pexels.com/api/documentation/, stable and versionless):
 *   GET https://api.pexels.com/videos/search?query=&orientation=&per_page=
 *     -> { videos: [{ id, duration, video_files: [{ link, width, height, file_type }] }] }
 *   GET https://api.pexels.com/videos/videos/{id}
 *     -> the same single video, re-fetched fresh in poll() rather than
 *        carrying a file URL through the job token
 *
 * The actual video files are served from videos.pexels.com with no
 * credential required, so — unlike every other provider here — the
 * finished clip is handed to the browser directly rather than proxied:
 * there is no key to protect in that URL. Only the search/lookup calls to
 * api.pexels.com need the API key.
 */

const { requestJson, HttpError } = require('../_http');

const API_HOST = 'https://api.pexels.com/videos';

// Camera/style jargon the rest of this app stuffs into every prompt
// (buildModelPrompt() in js/studio.js) so a real diffusion model has
// something to act on. A keyword search engine does worse with it, not
// better — "shot on a 35mm lens" isn't a search term, it's noise that
// dilutes the actual subject. Stripped before searching, not before
// sending to any other provider.
const STYLE_STOPWORDS = new Set([
  'a', 'an', 'the', 'with', 'and', 'of', 'in', 'on', 'at', 'to',
  'cinematic', 'photorealistic', 'natural', 'motion', 'shot', 'lens', 'anamorphic',
  'flare', 'volumetric', 'hyperrealistic', 'hyper', 'realistic', 'masterpiece',
  'ultra', 'detailed', 'orbiting', 'camera', 'movement', 'handheld', 'shake', 'drone',
  'flight', 'fpv', 'fast', 'slow', 'mist', 'dolly', 'push', 'pull', 'tilt', 'pan',
  'wide', 'close', 'closeup', 'up', 'medium', 'establishing', 'framing', 'style',
  '4k', '8k', 'rig', 'zoom'
]);

/**
 * Reduces a prompt to the handful of concrete content words a stock search
 * engine actually matches on. Pure and deterministic, so it's fully unit
 * tested without a network call.
 */
function cleanSearchQuery(rawPrompt) {
  const words = String(rawPrompt || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !STYLE_STOPWORDS.has(w))
    // Lens focal lengths (24mm, 35mm, 50mm, 85mm, ...) are a fixed set of
    // words in the UI, but any of them can appear — a pattern catches all
    // of them instead of hardcoding each one.
    .filter(w => !/^\d+mm$/.test(w));
  // A handful of nouns outperforms a full sentence on a search index; this
  // isn't a semantic model, it's keyword matching.
  return words.slice(0, 6).join(' ').trim();
}

function apiKey() {
  return (process.env.PEXELS_API_KEY || '').trim();
}

/** Pexels sends the raw key as the header value, not a Bearer token. */
function authHeaders() {
  return { Authorization: apiKey() };
}

function orientationFor(aspectRatio) {
  if (aspectRatio === '9:16') return 'portrait';
  if (aspectRatio === '1:1') return 'square';
  return 'landscape'; // 16:9 and 21:9 both read as landscape to Pexels' three-way filter
}

/** The largest mp4 file Pexels offers for a video, capped by what was asked for. */
function bestFile(video, maxHeight) {
  const files = (video.video_files || []).filter(f => f.file_type === 'video/mp4' && f.link);
  if (!files.length) return null;
  const withinCap = files.filter(f => !maxHeight || f.height <= maxHeight * 1.5);
  const pool = withinCap.length ? withinCap : files;
  return pool.reduce((best, f) => (f.width * f.height > (best.width * best.height) ? f : best));
}

const provider = {
  id: 'stockfootage',
  label: 'Stock Footage (Pexels)',
  envKeys: ['PEXELS_API_KEY'],

  // Exposed for testing — pure, no network.
  cleanSearchQuery,

  isConfigured() {
    return Boolean(apiKey());
  },

  capabilities() {
    return {
      id: 'stockfootage',
      label: 'Stock Footage (Pexels)',
      configured: provider.isConfigured(),
      activeModel: 'pexels-search',
      activeModelLabel: 'Real stock footage (Pexels)',
      // Pexels does carry some 4K clips; this is a ceiling, not a promise —
      // what's actually returned depends on what matched the search.
      maxResolution: 2160,
      // Clip length is whatever the matched footage runs, not a dial the
      // studio controls — see the module comment.
      durations: [],
      audio: true,
      models: []
    };
  },

  async submit(input) {
    if (!apiKey()) throw new Error('PEXELS_API_KEY is not set');

    const orientation = orientationFor(input.aspectRatio);
    const primary = cleanSearchQuery(input.prompt);
    // A prompt that's entirely style words (rare, but possible) cleans down
    // to nothing — searching Pexels with an empty query returns whatever is
    // trending, which is a random clip wearing this prompt's name. Fail
    // instead, so the studio falls back to something that's actually
    // related to what was typed.
    if (!primary) {
      throw new Error('This prompt has no concrete subject to search stock footage for — try describing what should be in frame.');
    }

    const candidates = [primary, primary.split(' ').slice(0, 2).join(' ')];
    let found = null;

    for (const query of candidates) {
      if (!query) continue;
      let res;
      try {
        res = await requestJson(
          `${API_HOST}/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=5&size=large`,
          { headers: authHeaders(), timeoutMs: 15000 }
        );
      } catch (err) {
        if (err instanceof HttpError && err.statusCode === 401) {
          throw new Error('Pexels rejected the key — check PEXELS_API_KEY.');
        }
        throw new Error(`Could not reach Pexels: ${err.message}`);
      }

      const video = res && Array.isArray(res.videos) ? res.videos.find(v => bestFile(v, input.height)) : null;
      if (video) { found = video; break; }
    }

    if (!found) {
      throw new Error(`No stock footage matched "${primary}" — try simpler, more literal wording.`);
    }

    return { jobId: String(found.id), meta: { label: 'Pexels stock footage' } };
  },

  async poll(jobId, meta) {
    let video;
    try {
      video = await requestJson(`${API_HOST}/videos/${encodeURIComponent(jobId)}`, {
        headers: authHeaders(),
        timeoutMs: 15000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return { status: 'failed', error: 'That clip is no longer available on Pexels.' };
      }
      return { status: 'failed', error: `Pexels unavailable: ${err.message}` };
    }

    const file = video && bestFile(video, null);
    if (!file) {
      return { status: 'failed', error: 'Pexels returned this clip with no playable file.' };
    }

    return {
      status: 'succeeded',
      progress: 1,
      videoUrl: file.link,
      // No credential is required to fetch the file itself — see the
      // module comment — so there's nothing here for a proxy to protect.
      needsProxy: false,
      modelLabel: (meta && meta.label) || 'Pexels stock footage'
    };
  },

  ownsUrl(url) {
    try {
      const host = new URL(url).hostname;
      return host === 'videos.pexels.com' || host.endsWith('.videos.pexels.com');
    } catch (err) {
      return false;
    }
  }
};

module.exports = provider;
