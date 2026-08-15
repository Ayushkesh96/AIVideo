/** GET /api/diag — TEMPORARY. Probes image then video. Removed after reading. */
const https = require('https');
const { URL } = require('url');
const { applyCors } = require('./_video');
const { buildUrl } = require('./_keyframe');

const k = () => (process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_API_KEY || '').trim();

function probe(url, label) {
  const t = new URL(url);
  const started = Date.now();
  return new Promise(resolve => {
    const rq = https.get({ hostname: t.hostname, path: `${t.pathname}${t.search}`,
      headers: { Authorization: `Bearer ${k()}` } }, resp => {
      const c = []; let n = 0;
      resp.on('data', d => { n += d.length; if (c.length < 3) c.push(d); if (n > 3000) resp.destroy(); });
      resp.on('close', () => {
        const type = resp.headers['content-type'] || '';
        resolve({ label, status: resp.statusCode, contentType: type, bytes: n,
          elapsedMs: Date.now() - started,
          ok: resp.statusCode === 200 && (type.startsWith('image/') || type.startsWith('video/')),
          body: /json|text/.test(type) ? Buffer.concat(c).toString('utf8').slice(0, 260) : null });
      });
    });
    rq.setTimeout(50000, () => rq.destroy(new Error('timeout')));
    rq.on('error', e => resolve({ label, error: e.message }));
  });
}

module.exports = async (req, res) => {
  applyCors(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const image = await probe(buildUrl({ prompt: 'a red fox', seed: 9, width: 384, height: 384 }), 'image');
  const video = await probe(
    'https://gen.pollinations.ai/video/' + encodeURIComponent('a red fox running in snow') + '?model=wan&duration=4&width=854&height=480',
    'video'
  );

  res.status(200).json({
    keyPrefix: k() ? `${k().slice(0, 6)}…${k().slice(-4)}` : null,
    image, video,
    verdict: image.ok && video.ok ? 'BOTH WORK — generation is live'
      : image.ok ? 'images work, video refused'
        : 'still refused'
  });
};
