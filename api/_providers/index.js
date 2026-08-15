/**
 * Provider registry + job-token codec.
 *
 * Vercel functions are stateless and share no memory between invocations, so a
 * generation job cannot live in a server-side map: `create` and `status` may
 * run on different instances. Instead the whole job identity is handed back to
 * the client as an opaque token and returned on each poll.
 *
 * That makes the token untrusted input. It is therefore never allowed to carry
 * a URL — only a provider id plus the provider's own job id, from which each
 * adapter rebuilds its endpoints against a hard-coded host. A token cannot
 * point the server at an arbitrary destination.
 */

const fal = require('./fal');
const replicate = require('./replicate');
const google = require('./google');
const runway = require('./runway');
const luma = require('./luma');
const selfhosted = require('./selfhosted');
const cogvideox = require('./cogvideox');
const stockfootage = require('./stockfootage');

// Order is the auto-selection preference.
//
// Self-hosted comes first: if you are running your own GPU, that is a
// deliberate choice and it should not be silently outranked by a metered API.
// Two self-hosted adapters exist (ComfyUI and a standalone CogVideoX server)
// because they're genuinely different backends, not tiers of one — both rank
// above every metered provider regardless of which one you've set up. Then
// the keyed providers by quality-per-call — each of these actually depicts
// the prompt, real or self-hosted. stockfootage ranks below all of them on
// purpose: it returns real but *generic* footage matched by keyword, not a
// custom render of the prompt, so a provider that can actually depict what
// was asked for should always win when one is configured. It still ranks
// above nothing being configured, since real footage beats the procedural
// fallback for anything it can find a match for, and it's free either way.
// Every provider is opt-in via its key; with nothing configured the studio
// runs entirely on the free on-device engine and makes no upstream calls at all.
const REGISTRY = [selfhosted, cogvideox, google, fal, replicate, runway, luma, stockfootage];
const BY_ID = REGISTRY.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

// Veo operation names contain slashes and dots; everything else is opaque ids.
const SAFE_JOB_ID = /^[A-Za-z0-9._\-\/]{1,300}$/;
const SAFE_MODEL_ID = /^[A-Za-z0-9._\-\/]{1,200}$/;

function all() {
  return REGISTRY.slice();
}

function configured() {
  return REGISTRY.filter(p => p.isConfigured());
}

function byId(id) {
  return BY_ID[id] || null;
}

/**
 * Chooses the provider to run a job on.
 * An explicit request wins if it has a key; otherwise the first configured
 * provider in preference order is used.
 */
function pick(preferredId) {
  if (preferredId) {
    const wanted = byId(preferredId);
    if (wanted && wanted.isConfigured()) return wanted;
  }
  return configured()[0] || null;
}

function capabilities() {
  const list = REGISTRY.map(p => p.capabilities());
  const active = configured()[0] || null;

  const keyed = REGISTRY.filter(p => p.isConfigured() && (p.envKeys || []).some(k => process.env[k]));

  return {
    providers: list,
    configured: list.filter(p => p.configured).map(p => p.id),
    active: active ? active.id : null,
    // The studio uses this to decide whether to offer 4K at all.
    maxResolution: list.filter(p => p.configured).reduce((max, p) => Math.max(max, p.maxResolution || 0), 0),
    keyless: keyed.length === 0,
    keyedProviders: keyed.map(p => p.id),
    // No provider configured: the free on-device engine is the renderer.
    fallbackOnly: !active
  };
}

function encodeJob(providerId, jobId, meta) {
  const payload = JSON.stringify({ p: providerId, j: jobId, m: meta || {} });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

/**
 * Decodes and validates a job token. Throws on anything malformed rather than
 * passing half-trusted values down into a URL builder.
 */
function decodeJob(token) {
  if (typeof token !== 'string' || !token || token.length > 4000) {
    throw new Error('missing or oversized job token');
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch (err) {
    throw new Error('malformed job token');
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('malformed job token');

  const provider = byId(parsed.p);
  if (!provider) throw new Error(`unknown provider in job token: ${parsed.p}`);
  if (!provider.isConfigured()) throw new Error(`${provider.label} is no longer configured on this deployment`);

  const jobId = String(parsed.j || '');
  if (!SAFE_JOB_ID.test(jobId)) throw new Error('invalid job id in token');

  // Only fields the adapters actually consume survive, and each is checked —
  // fal interpolates meta.app straight into a request path.
  const rawMeta = parsed.m && typeof parsed.m === 'object' ? parsed.m : {};
  const meta = {};
  ['model', 'app'].forEach(key => {
    if (typeof rawMeta[key] === 'string') {
      if (!SAFE_MODEL_ID.test(rawMeta[key])) throw new Error(`invalid ${key} in job token`);
      meta[key] = rawMeta[key];
    }
  });
  if (typeof rawMeta.label === 'string') meta.label = rawMeta.label.slice(0, 120);

  return { provider, jobId, meta };
}

/** True when some configured provider vouches for this URL (proxy allowlist). */
function providerOwnsUrl(url) {
  return configured().some(p => typeof p.ownsUrl === 'function' && p.ownsUrl(url));
}

module.exports = {
  all,
  configured,
  byId,
  pick,
  capabilities,
  encodeJob,
  decodeJob,
  providerOwnsUrl
};
