/**
 * Minimal HTTPS helper shared by every provider adapter.
 *
 * The provider adapters run both on Vercel (@vercel/node) and inside the local
 * dev server, so this deliberately uses only `https` from core — no fetch
 * polyfill, no dependency that has to survive a serverless bundle.
 *
 * Everything here enforces a timeout, a redirect cap and a byte cap. A video
 * provider that hangs must not hold a serverless invocation open until the
 * platform kills it, because that turns into a 504 with no diagnostic.
 */

const https = require('https');
const { URL } = require('url');

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;

class HttpError extends Error {
  constructor(message, statusCode, body) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * Performs one request and buffers the response.
 *
 * Resolves with { statusCode, headers, buffer } for any completed response,
 * including 4xx/5xx — the caller decides what a bad status means, because
 * "job not ready yet" and "job failed" are both non-200 for some providers.
 */
function request(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxBytes = DEFAULT_MAX_BYTES
  } = options;

  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(url);
    } catch (err) {
      return reject(new Error(`invalid upstream url: ${url}`));
    }

    // Adapters build every URL from a hard-coded host, so this is a guard
    // against a malformed template rather than against user input — but it is
    // cheap and it keeps a mistake from becoming an SSRF.
    if (target.protocol !== 'https:') {
      return reject(new Error(`refusing non-https upstream: ${target.protocol}`));
    }

    const payload = body === null || body === undefined
      ? null
      : (Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));

    const reqHeaders = Object.assign({}, headers);
    if (payload && reqHeaders['Content-Length'] === undefined) {
      reqHeaders['Content-Length'] = payload.length;
    }

    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method,
        headers: reqHeaders
      },
      res => {
        const { statusCode, headers: resHeaders } = res;

        if (statusCode >= 300 && statusCode < 400 && resHeaders.location) {
          res.resume();
          if (maxRedirects <= 0) return reject(new Error('too many redirects'));
          const next = new URL(resHeaders.location, target).toString();
          return resolve(
            request(next, Object.assign({}, options, {
              maxRedirects: maxRedirects - 1,
              // A redirect after POST is a GET in practice for these APIs, and
              // replaying the body to a new host would leak the payload.
              method: method === 'POST' ? 'GET' : method,
              body: method === 'POST' ? null : body
            }))
          );
        }

        const chunks = [];
        let bytes = 0;
        res.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > maxBytes) {
            req.destroy();
            return reject(new Error(`upstream response exceeded ${maxBytes} bytes`));
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          resolve({ statusCode, headers: resHeaders, buffer: Buffer.concat(chunks) });
        });
        res.on('error', reject);
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`upstream timed out after ${timeoutMs}ms`));
    });
    req.on('error', reject);

    if (payload) req.write(payload);
    req.end();
  });
}

/** Request + JSON parse. Throws HttpError on a non-2xx so adapters can branch on status. */
async function requestJson(url, options = {}) {
  const res = await request(url, Object.assign({}, options, {
    headers: Object.assign({ Accept: 'application/json' }, options.headers || {})
  }));

  const text = res.buffer.toString('utf8');
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        throw new HttpError(`upstream returned non-JSON (${res.statusCode})`, res.statusCode, text.slice(0, 500));
      }
    }
  }

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const detail = extractErrorMessage(parsed) || text.slice(0, 500) || `HTTP ${res.statusCode}`;
    throw new HttpError(detail, res.statusCode, parsed || text.slice(0, 500));
  }

  return parsed;
}

/**
 * Providers disagree about where the human-readable failure lives. Pulling it
 * out here means a misconfigured key surfaces as "invalid credentials" in the
 * studio instead of a bare 401.
 */
function extractErrorMessage(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.detail === 'string') return payload.detail;
  if (Array.isArray(payload.detail) && payload.detail.length) {
    const first = payload.detail[0];
    if (typeof first === 'string') return first;
    if (first && typeof first.msg === 'string') return first.msg;
  }
  if (typeof payload.error === 'string') return payload.error;
  if (payload.error && typeof payload.error.message === 'string') return payload.error.message;
  if (typeof payload.message === 'string') return payload.message;
  if (typeof payload.title === 'string') return payload.title;
  return null;
}

module.exports = { request, requestJson, HttpError, extractErrorMessage };
