/**
 * GET /api/song-proxy?job=<id>&track=<index>
 *
 * Streams a finished track from the song server. The credential is attached
 * here and never reaches the browser — same reasoning as video-proxy.js,
 * including piping rather than buffering (a full-length track can run to
 * tens of megabytes) and forwarding Range headers so <audio> can seek.
 *
 * The destination is not caller-supplied — resolveDownload rebuilds it from
 * the configured song server and refuses any host it doesn't own.
 */

const https = require('https');
const { URL } = require('url');
const { applyCors, resolveDownload } = require('./_song');

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
          return res.end('too many redirects from the song server');
        }
        const next = new URL(upstream.headers.location, target);
        const forwarded = next.hostname === target.hostname
          ? headers
          : { Range: headers.Range };
        Object.keys(forwarded).forEach(k => forwarded[k] === undefined && delete forwarded[k]);
        return pipeUpstream(next.toString(), forwarded, res, redirectsLeft - 1);
      }

      if (status !== 200 && status !== 206) {
        upstream.resume();
        res.statusCode = 502;
        return res.end(`song server returned ${status} for this track`);
      }

      res.statusCode = status;
      res.setHeader('Content-Type', upstream.headers['content-type'] || 'audio/wav');
      ['content-length', 'content-range', 'accept-ranges'].forEach(h => {
        if (upstream.headers[h]) res.setHeader(h, upstream.headers[h]);
      });
      res.setHeader('Cache-Control', 'private, max-age=3600');

      upstream.pipe(res);
      upstream.on('error', () => res.destroy());
    }
  );

  req.setTimeout(UPSTREAM_TIMEOUT_MS, () => req.destroy(new Error('song server stream timed out')));
  req.on('error', err => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end(`song server stream failed: ${err.message}`);
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

  const jobId = req.query && req.query.job;
  const trackIdx = req.query && req.query.track;
  if (!jobId) {
    return res.status(400).json({ success: false, error: 'job id is required' });
  }

  let download;
  try {
    download = await resolveDownload(String(jobId), trackIdx);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }

  const headers = Object.assign({}, download.headers);
  if (req.headers && req.headers.range) headers.Range = req.headers.range;

  pipeUpstream(download.url, headers, res, MAX_REDIRECTS);
};
