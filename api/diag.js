/**
 * GET /api/diag  — TEMPORARY diagnostic.
 *
 * Reports whether the configured Pollinations key is valid and what balance it
 * has, by asking the provider from the server side where the key lives.
 *
 * This exists to answer one question — "is generation failing because the
 * balance is empty?" — which is otherwise only observable by triggering a real
 * generation and reading the error.
 *
 * It exposes account balance on a public URL, so it is meant to be removed once
 * that question is answered. Nothing in the app depends on it.
 */

const { applyCors } = require('./_video');
const { requestJson, HttpError } = require('./_http');

const HOST = 'https://gen.pollinations.ai';

function apiKey() {
  return (process.env.POLLINATIONS_KEY || process.env.POLLINATIONS_API_KEY || '').trim();
}

module.exports = async (req, res) => {
  applyCors(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const key = apiKey();
  const out = {
    keyConfigured: Boolean(key),
    // Never the key itself — just enough to confirm which one is loaded and
    // catch the classic paste error of leading/trailing whitespace.
    keyPrefix: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : null,
    keyLength: key ? key.length : 0,
    keyHasWhitespace: key !== (process.env.POLLINATIONS_KEY || '').trim() ? null : /\s/.test(key)
  };

  if (!key) {
    return res.status(200).json(Object.assign(out, { error: 'POLLINATIONS_KEY is not set' }));
  }

  const headers = { Authorization: `Bearer ${key}` };

  try {
    out.keyInfo = await requestJson(`${HOST}/account/key`, { headers, timeoutMs: 15000 });
  } catch (err) {
    out.keyInfo = { error: err.message, status: err instanceof HttpError ? err.statusCode : null };
  }

  try {
    out.balance = await requestJson(`${HOST}/account/balance`, { headers, timeoutMs: 15000 });
  } catch (err) {
    out.balance = { error: err.message, status: err instanceof HttpError ? err.statusCode : null };
  }

  res.status(200).json(out);
};
