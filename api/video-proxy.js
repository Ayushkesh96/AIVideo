/**
 * GET /api/video-proxy?job=<token>
 *
 * Streams a finished video that the provider gates behind the API key (Veo is
 * the current case). The credential is attached here and never reaches the
 * browser.
 *
 * This pipes rather than buffers: a 4K clip can run to hundreds of megabytes,
 * which would blow the function's memory if it were read into a Buffer first.
 * Range headers are forwarded both ways so <video> can seek.
 *
 * The destination is not caller-supplied — resolveDownload rebuilds it from
 * the provider and refuses any host no configured provider claims.
 */

const https = require('https');
const { URL } = require('url');
const { applyCors, resolveDownload } = require('./_video');

const MAX_REDIRECTS = 4;
const UPSTREAM_TIMEOUT_MS = 60000;

function pipeUpstream(url, headers, res, redirectsLeft) {
  const target = new URL(url);
  if (target.protocol !== 'https:') {
    res.statusCode = 502;
    return res.end('refusing non-https upstream');
  }

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
        if (redirectsLeft <= 0) {
          res.statusCode = 502;
          return res.end('too many redirects from provider');
        }
        const next = new URL(upstream.headers.location, target);
        // Credentials are only for the provider's own API host. A redirect to
        // a signed CDN URL must not carry the key along.
        const forwarded = next.hostname === target.hostname
          ? headers
          : { Range: headers.Range };
        Object.keys(forwarded).forEach(k => forwarded[k] === undefined && delete forwarded[k]);
        return pipeUpstream(next.toString(), forwarded, res, redirectsLeft - 1);
      }

      if (status !== 200 && status !== 206) {
        upstream.resume();
        res.statusCode = 502;
        return res.end(`provider returned ${status} for the video file`);
      }

      res.statusCode = status;
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'video/mp4');
      ['content-length', 'content-range', 'accept-ranges'].forEach(h => {
        if (upstream.headers[h]) res.setHeader(h, upstream.headers[h]);
      });
      // Finished renders are immutable, and the token is the cache key.
      res.setHeader('Cache-Control', 'private, max-age=3600');

      upstream.pipe(res);
      upstream.on('error', () => res.destroy());
    }
  );

  req.setTimeout(UPSTREAM_TIMEOUT_MS, () => req.destroy(new Error('provider stream timed out')));
  req.on('error', err => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end(`provider stream failed: ${err.message}`);
    } else {
      res.destroy();
    }
  });
}

module.exports = async (req, res) => {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = req.query && req.query.job;
  if (!token) {
    return res.status(400).json({ success: false, error: 'job token is required' });
  }

  let download;
  try {
    download = await resolveDownload(String(token));
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }

  const headers = Object.assign({}, download.headers);
  if (req.headers && req.headers.range) headers.Range = req.headers.range;

  pipeUpstream(download.url, headers, res, MAX_REDIRECTS);
};
