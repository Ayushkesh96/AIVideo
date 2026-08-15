/** GET /api/diag — TEMPORARY. Probes the cheapest possible request and reports
 *  the provider's own balance message. Removed immediately after reading. */
const https = require('https');
const { URL } = require('url');
const { applyCors } = require('./_video');
const { buildUrl } = require('./_keyframe');

function key() {
  return (process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_API_KEY || '').trim();
}

module.exports = async (req, res) => {
  applyCors(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const k = key();
  const url = buildUrl({ prompt: 'a red fox', seed: 3, width: 384, height: 384 });
  const t = new URL(url);

  const r = await new Promise(resolve => {
    const rq = https.get(
      { hostname: t.hostname, path: `${t.pathname}${t.search}`, headers: { Authorization: `Bearer ${k}` } },
      resp => {
        const chunks = [];
        let bytes = 0;
        resp.on('data', c => { bytes += c.length; if (chunks.length < 3) chunks.push(c); if (bytes > 3000) resp.destroy(); });
        resp.on('close', () => resolve({
          status: resp.statusCode,
          contentType: resp.headers['content-type'] || '',
          bytes,
          body: /json|text/.test(resp.headers['content-type'] || '') ? Buffer.concat(chunks).toString('utf8').slice(0, 300) : null
        }));
      }
    );
    rq.setTimeout(30000, () => rq.destroy(new Error('timeout')));
    rq.on('error', e => resolve({ error: e.message }));
  });

  res.status(200).json({
    keyPrefix: k ? `${k.slice(0, 6)}…${k.slice(-4)}` : null,
    probe: r,
    canGenerate: r.status === 200 && String(r.contentType).startsWith('image/')
  });
};
