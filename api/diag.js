/**
 * GET /api/diag — TEMPORARY cross-check.
 *
 * Hits the image endpoint and the video endpoint with the same credential and
 * reports both, including the upstream error body.
 *
 * The distinction matters: images are cheap and video is expensive, so if
 * images succeed and video 402s the account has *some* credit and video is
 * simply out of reach, whereas both failing means the balance is flat empty.
 * A bare status code cannot tell those apart.
 */

const https = require('https');
const { URL } = require('url');
const { applyCors } = require('./_video');
const { buildUrl } = require('./_keyframe');

function key() {
  return (process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_API_KEY || '').trim();
}

function probe(url, label) {
  return new Promise(resolve => {
    const t = new URL(url);
    const started = Date.now();
    const req = https.get(
      { hostname: t.hostname, path: `${t.pathname}${t.search}`, headers: { Authorization: `Bearer ${key()}` } },
      r => {
        const chunks = [];
        let bytes = 0;
        r.on('data', c => {
          bytes += c.length;
          // Keep only the head: enough to read an error body, not a whole file.
          if (chunks.length < 4) chunks.push(c);
          if (bytes > 4096) r.destroy();
        });
        r.on('close', () => {
          const type = r.headers['content-type'] || '';
          const body = Buffer.concat(chunks).toString('utf8').slice(0, 400);
          resolve({
            label,
            status: r.statusCode,
            contentType: type,
            bytes,
            elapsedMs: Date.now() - started,
            ok: r.statusCode === 200 && (type.startsWith('image/') || type.startsWith('video/')),
            // Only surface the body when it isn't binary media.
            body: type.startsWith('application/json') || type.startsWith('text/') ? body : null
          });
        });
      }
    );
    req.setTimeout(50000, () => req.destroy(new Error('timed out')));
    req.on('error', e => resolve({ label, error: e.message, elapsedMs: Date.now() - started }));
  });
}

module.exports = async (req, res) => {
  applyCors(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const prompt = 'a red fox in deep snow';

  const image = await probe(
    buildUrl({ prompt, seed: 7, width: 512, height: 512 }),
    'image (cheap)'
  );

  const video = await probe(
    `https://gen.pollinations.ai/video/${encodeURIComponent(prompt)}?model=wan&duration=4&width=854&height=480`,
    'video wan (expensive)'
  );

  res.status(200).json({
    keyLoaded: Boolean(key()),
    image,
    video,
    conclusion: image.ok && video.ok ? 'both work'
      : image.ok && !video.ok ? 'images work, video refused — credit too low for video, or model not entitled'
        : !image.ok && !video.ok ? 'both refused — account has no usable credit'
          : 'video works, images refused — unexpected'
  });
};
