/**
 * POST /api/video-direct
 *
 * Streaming route for synchronous providers (Pollinations), which render and
 * return the finished mp4 on a single request rather than handing back a job
 * to poll.
 *
 * Streams rather than buffers, for the same reason as video-proxy: a finished
 * clip can be large, and reading it into memory first risks the function's
 * limit. The upstream URL is built by the provider adapter from a hard-coded
 * host — the request body only supplies the prompt and shape.
 *
 * On an upstream error the response is JSON, not video, so the client can tell
 * "the model refused" from "here is your clip" and fall back accordingly.
 */

const https = require('https');
const { URL } = require('url');
const { applyCors, resolveStream } = require('./_video');

/** Whether a credential was configured at all, which changes what a 401 means. */
function hasKey() {
  return Boolean((process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_API_KEY || '').trim());
}

const MAX_REDIRECTS = 4;
// Must stay under the function's maxDuration (see vercel.json) or the platform
// kills the invocation and the caller gets an opaque 504 instead of a reason.
//
// 60s is the Vercel Hobby ceiling, so this is sized for that. Video generation
// can legitimately take longer, which is why a slow model reports a timeout
// here and the studio falls back rather than hanging.
const UPSTREAM_TIMEOUT_MS = 55000;

function fail(res, status, message) {
  if (res.headersSent) return res.destroy();
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: false, fallback: true, error: message }));
}

function pipeUpstream(url, headers, res, redirectsLeft) {
  const target = new URL(url);
  if (target.protocol !== 'https:') return fail(res, 502, 'refusing non-https upstream');

  const req = https.get(
    {
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      headers
    },
    upstream => {
      const status = upstream.statusCode;

      if (status >= 300 && status < 400 && upstream.headers.location) {
        upstream.resume();
        if (redirectsLeft <= 0) return fail(res, 502, 'too many redirects from provider');
        const next = new URL(upstream.headers.location, target);
        // Only keep credentials on the provider's own host.
        const forwarded = next.hostname === target.hostname ? headers : { Accept: 'video/mp4' };
        return pipeUpstream(next.toString(), forwarded, res, redirectsLeft - 1);
      }

      // These three mean completely different things and need opposite
      // responses from the user. Collapsing them into one "set a key" message
      // told people with a working key to go set the key they already had.
      if (status === 401) {
        upstream.resume();
        return fail(res, 200, hasKey()
          ? 'Pollinations rejected the key (401) — it is invalid, revoked, or was pasted with stray whitespace. Replace POLLINATIONS_KEY and redeploy.'
          : 'No Pollinations key is set. Get a free one at enter.pollinations.ai and set POLLINATIONS_KEY.');
      }

      if (status === 402) {
        upstream.resume();
        return fail(res, 200, 'Pollinations balance is empty (402). Video costs far more pollen than images — top up or wait for the free allowance to reset at enter.pollinations.ai.');
      }

      if (status === 403) {
        upstream.resume();
        return fail(res, 200, 'Pollinations refused this model for your key (403). It may need paid pollen — try a cheaper model via POLLINATIONS_VIDEO_MODEL.');
      }

      if (status === 429) {
        upstream.resume();
        return fail(res, 200, 'Pollinations rate limit reached. Wait a moment, or set POLLINATIONS_KEY for a higher allowance.');
      }

      if (status !== 200) {
        upstream.resume();
        return fail(res, 200, `Video model returned ${status}.`);
      }

      const contentType = upstream.headers['content-type'] || '';
      if (!contentType.startsWith('video/')) {
        // An HTML or JSON error page would otherwise reach the browser as a
        // "video" that silently fails to decode.
        upstream.resume();
        return fail(res, 200, `Video model returned ${contentType || 'an unknown type'} instead of a video.`);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      if (upstream.headers['content-length']) {
        res.setHeader('Content-Length', upstream.headers['content-length']);
      }
      res.setHeader('Cache-Control', 'no-store');

      upstream.pipe(res);
      upstream.on('error', () => res.destroy());
    }
  );

  req.setTimeout(UPSTREAM_TIMEOUT_MS, () => req.destroy(new Error('video model timed out')));
  req.on('error', err => fail(res, 200, `Could not reach the video model: ${err.message}`));
}

module.exports = async (req, res) => {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (err) { body = {}; }
  }

  let descriptor;
  try {
    descriptor = resolveStream(body);
  } catch (err) {
    return res.status(400).json({ success: false, fallback: true, error: err.message });
  }

  pipeUpstream(descriptor.url, descriptor.headers, res, MAX_REDIRECTS);
};
