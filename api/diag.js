/**
 * GET /api/diag — TEMPORARY.
 *
 * Runs one real video generation against the configured provider and reports
 * what came back, without streaming the clip. This is the only way to confirm
 * generation works end to end without a human clicking Generate.
 *
 * Costs a small amount of pollen per call. Removed once it has answered.
 */

const https = require('https');
const { URL } = require('url');
const { applyCors, resolveStream } = require('./_video');

module.exports = async (req, res) => {
  applyCors(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let descriptor;
  try {
    descriptor = resolveStream({
      prompt: (req.query && req.query.prompt) || 'a red fox running through deep snow',
      quality: '720p',
      durationSec: 4
    });
  } catch (err) {
    return res.status(200).json({ stage: 'resolve', error: err.message });
  }

  const target = new URL(descriptor.url);
  const started = Date.now();

  const upstream = https.get(
    {
      hostname: target.hostname,
      path: `${target.pathname}${target.search}`,
      headers: descriptor.headers
    },
    r => {
      // Read only the first chunk: enough to prove real bytes are arriving
      // without pulling the whole clip through the function.
      let bytes = 0;
      r.on('data', c => {
        bytes += c.length;
        if (bytes > 2048) r.destroy();
      });
      r.on('close', () => {
        res.status(200).json({
          provider: descriptor.provider,
          model: descriptor.label,
          upstreamStatus: r.statusCode,
          contentType: r.headers['content-type'] || null,
          firstBytes: bytes,
          elapsedMs: Date.now() - started,
          verdict: r.statusCode === 200 && String(r.headers['content-type'] || '').startsWith('video/')
            ? 'GENERATION WORKS'
            : `upstream refused (${r.statusCode})`
        });
      });
    }
  );

  upstream.setTimeout(55000, () => upstream.destroy(new Error('timed out after 55s')));
  upstream.on('error', err => {
    if (!res.headersSent) {
      res.status(200).json({ stage: 'upstream', error: err.message, elapsedMs: Date.now() - started });
    }
  });
};
