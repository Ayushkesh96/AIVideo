/**
 * Shared keyframe fetcher for the text-to-image backend.
 *
 * Used by both the Vercel function (api/generate-video.js) and the local dev
 * server (server.js) so the two can't drift.
 *
 * Returns a data: URL rather than proxying the image URL, because the studio
 * draws these onto the recording canvas — a cross-origin image would taint it
 * and MediaRecorder would refuse to capture the result.
 */

const https = require('https');

// gen.pollinations.ai is the current unified gateway. The old
// image.pollinations.ai/prompt/{...} host is legacy, and generation there now
// requires the same credential anyway.
const UPSTREAM_HOST = 'gen.pollinations.ai';
const REQUEST_TIMEOUT_MS = 45000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 12 * 1024 * 1024;

// Appended to every prompt so plain requests still come back looking like a
// frame of cinema rather than a stock photo.
const STYLE_SUFFIX = 'cinematic film still, shot on 35mm anamorphic, volumetric light, photorealistic, ultra detailed, 8k';

// Nudges the composition along the shot so consecutive keyframes differ in a
// way the interpolator can read as motion, instead of being unrelated re-rolls.
const SHOT_STAGES = [
  'wide establishing framing',
  'medium framing, subject centered',
  'closer framing, shallow depth of field',
  'tight close-up framing'
];

// Image-editing models accept a reference frame, which is what makes chaining
// possible: frame N is an edit of frame N-1 rather than an unrelated image at a
// new seed. That continuity is the whole difference between a slideshow and
// something that reads as motion.
const CHAIN_MODEL = 'kontext';

// Phrases that ask for a small forward step rather than a new composition.
// Asking for a big change breaks continuity as badly as re-rolling would.
const CHAIN_NUDGE = 'continue this exact scene one moment later, same subject, same setting, same lighting, slight natural movement';

function clampDimension(value, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(256, Math.min(2048, n));
}

/**
 * Builds the upstream image URL.
 *
 * When `chainFrom` is a previously-generated frame's URL, this becomes an
 * image-to-image edit of that frame. Passing the upstream URL (rather than the
 * decoded bytes) is what makes chaining possible at all — the model service
 * fetches the reference itself, and these URLs are deterministic, so the frame
 * it pulls is exactly the one the client already has.
 */
function buildUrl({ prompt, seed, width, height, shotProgress, chainFrom }) {
  const stage = SHOT_STAGES[
    Math.min(SHOT_STAGES.length - 1, Math.round((shotProgress || 0) * (SHOT_STAGES.length - 1)))
  ];

  const chaining = typeof chainFrom === 'string' && /^https:\/\//.test(chainFrom);

  // A chained frame is an edit instruction, not a fresh scene description.
  const full = chaining
    ? `${CHAIN_NUDGE}. ${String(prompt || '').trim()}`
    : `${String(prompt || '').trim()}, ${stage}, ${STYLE_SUFFIX}`;

  const params = new URLSearchParams({
    width: String(clampDimension(width, 1280)),
    height: String(clampDimension(height, 720)),
    nologo: 'true',
    seed: String(Number.isFinite(+seed) ? Math.abs(Math.trunc(+seed)) % 1000000 : 1)
  });

  if (chaining) {
    params.set('model', CHAIN_MODEL);
    params.set('image', chainFrom);
  }

  // No credential in the URL. This exact string is returned to the browser as
  // `sourceUrl` so the next frame can chain from it, so anything in the query
  // string is public. The key travels as a request header instead.
  return `https://${UPSTREAM_HOST}/image/${encodeURIComponent(full)}?${params}`;
}

function apiKey() {
  return (process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_API_KEY || '').trim();
}

function authHeaders() {
  const key = apiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

function get(url, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: authHeaders() }, res => {
      const { statusCode, headers } = res;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error('too many redirects'));
        return resolve(get(new URL(headers.location, url).toString(), redirectsLeft - 1));
      }

      if (statusCode !== 200) {
        res.resume();
        return reject(new Error(`upstream responded ${statusCode}`));
      }

      const contentType = headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        // An HTML error page would otherwise be base64'd and handed to the
        // browser as a broken "image".
        res.resume();
        return reject(new Error(`upstream returned ${contentType || 'unknown type'}, expected an image`));
      }

      const chunks = [];
      let bytes = 0;
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) {
          req.destroy();
          return reject(new Error('keyframe exceeded size limit'));
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        if (!chunks.length) return reject(new Error('upstream returned an empty body'));
        resolve({ buffer: Buffer.concat(chunks), contentType });
      });
      res.on('error', reject);
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`upstream timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
  });
}

/**
 * Resolves to a payload the studio can consume directly.
 * Never throws: a failed keyframe reports success:false so the client can fall
 * back to the on-device engine instead of the whole run dying.
 */
async function fetchKeyframe(params) {
  const prompt = String(params.prompt || '').trim();
  if (!prompt) {
    return { success: false, error: 'prompt is required' };
  }

  const url = buildUrl({ ...params, prompt });

  try {
    const { buffer, contentType } = await get(url, MAX_REDIRECTS);
    return {
      success: true,
      type: 'ai_diffusion_keyframe',
      dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
      // The client passes this back as `chainFrom` for the next frame. It has
      // to be the upstream URL: a data: URL cannot be used as a reference
      // image, because the model service has to fetch it itself.
      sourceUrl: url,
      chained: Boolean(params.chainFrom),
      prompt,
      seed: params.seed,
      cameraMotion: params.cameraMotion
    };
  } catch (err) {
    return { success: false, fallback: true, error: err.message, sourceUrl: url };
  }
}

module.exports = { fetchKeyframe, buildUrl };
