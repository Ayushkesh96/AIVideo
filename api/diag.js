/** GET /api/diag — TEMPORARY. Reads the real account balance (needs the
 *  account:usage permission) and probes the cheapest generation. */
const https = require('https');
const { URL } = require('url');
const { applyCors } = require('./_video');
const { requestJson, HttpError } = require('./_http');
const { buildUrl } = require('./_keyframe');

const k = () => (process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_API_KEY || '').trim();
const HOST = 'https://gen.pollinations.ai';

function probe(url) {
  const t = new URL(url);
  return new Promise(resolve => {
    const rq = https.get({ hostname: t.hostname, path: `${t.pathname}${t.search}`,
      headers: { Authorization: `Bearer ${k()}` } }, resp => {
      const c = []; let n = 0;
      resp.on('data', d => { n += d.length; if (c.length < 3) c.push(d); if (n > 3000) resp.destroy(); });
      resp.on('close', () => {
        const type = resp.headers['content-type'] || '';
        resolve({ status: resp.statusCode, contentType: type, bytes: n,
          ok: resp.statusCode === 200 && type.startsWith('image/'),
          body: /json|text/.test(type) ? Buffer.concat(c).toString('utf8').slice(0, 260) : null });
      });
    });
    rq.setTimeout(30000, () => rq.destroy(new Error('timeout')));
    rq.on('error', e => resolve({ error: e.message }));
  });
}

module.exports = async (req, res) => {
  applyCors(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const headers = { Authorization: `Bearer ${k()}` };
  const out = { keyPrefix: k() ? `${k().slice(0, 6)}…${k().slice(-4)}` : null };

  for (const [field, path] of [['keyInfo', '/account/key'], ['balance', '/account/balance'], ['profile', '/account/profile']]) {
    try {
      out[field] = await requestJson(`${HOST}${path}`, { headers, timeoutMs: 15000 });
    } catch (err) {
      out[field] = { error: err.message, status: err instanceof HttpError ? err.statusCode : null };
    }
  }

  out.imageProbe = await probe(buildUrl({ prompt: 'a red fox', seed: 11, width: 384, height: 384 }));
  out.canGenerate = Boolean(out.imageProbe.ok);
  res.status(200).json(out);
};
