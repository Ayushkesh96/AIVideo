/**
 * Smoke tests for the video generation backend.
 *
 * No network: a stub provider is injected into the registry so the full
 * submit -> poll -> resolve lifecycle can be exercised deterministically.
 * The job-token cases are the important ones — that token is client-supplied
 * data that ends up in an upstream request path.
 *
 *   npm test
 */

const assert = require('assert');
const path = require('path');

const providers = require('../api/_providers');
const video = require('../api/_video');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

// --- input normalisation ----------------------------------------------------

console.log('\nnormalizeInput');

test('rejects an empty prompt', () => {
  assert.throws(() => video.normalizeInput({}), /prompt is required/i);
  assert.throws(() => video.normalizeInput({ prompt: '   ' }), /prompt is required/i);
});

test('rejects an over-long prompt', () => {
  assert.throws(() => video.normalizeInput({ prompt: 'x'.repeat(2001) }), /too long/i);
});

test('defaults aspect ratio, quality and duration', () => {
  const out = video.normalizeInput({ prompt: 'a fox' });
  assert.strictEqual(out.aspectRatio, '16:9');
  assert.strictEqual(out.quality, '1080p');
  assert.strictEqual(out.durationSec, 5);
  assert.strictEqual(out.height, 1080);
  assert.strictEqual(out.width, 1920);
});

test('falls back to a known aspect ratio when given junk', () => {
  assert.strictEqual(video.normalizeInput({ prompt: 'a', aspectRatio: '3:2' }).aspectRatio, '16:9');
});

test('maps 4k to 2160p and keeps dimensions even', () => {
  const out = video.normalizeInput({ prompt: 'a', quality: '4k', aspectRatio: '21:9' });
  assert.strictEqual(out.height, 2160);
  assert.strictEqual(out.width % 2, 0, 'width must be even for chroma subsampling');
});

test('clamps duration into the supported range', () => {
  assert.strictEqual(video.normalizeInput({ prompt: 'a', durationSec: 999 }).durationSec, 12);
  assert.strictEqual(video.normalizeInput({ prompt: 'a', durationSec: -4 }).durationSec, 2);
  assert.strictEqual(video.normalizeInput({ prompt: 'a', durationSec: 'abc' }).durationSec, 5);
});

test('portrait swaps the long edge', () => {
  const out = video.normalizeInput({ prompt: 'a', aspectRatio: '9:16', quality: '1080p' });
  assert.ok(out.width < out.height, `expected portrait, got ${out.width}x${out.height}`);
});

// --- job tokens -------------------------------------------------------------

console.log('\njob tokens');

// The registry only holds real providers, so borrow one that is configurable
// via env for the round-trip cases.
process.env.FAL_KEY = process.env.FAL_KEY || 'test-key';

test('round-trips a token', () => {
  const token = providers.encodeJob('fal', 'req-123', { model: 'fal-ai/veo3', app: 'fal-ai/veo3', label: 'Veo 3' });
  const decoded = providers.decodeJob(token);
  assert.strictEqual(decoded.provider.id, 'fal');
  assert.strictEqual(decoded.jobId, 'req-123');
  assert.strictEqual(decoded.meta.app, 'fal-ai/veo3');
});

test('rejects a malformed token', () => {
  assert.throws(() => providers.decodeJob('not-base64-json'), /malformed|invalid|unknown/i);
  assert.throws(() => providers.decodeJob(''), /missing/i);
  assert.throws(() => providers.decodeJob('x'.repeat(5000)), /oversized/i);
});

test('rejects an unknown provider', () => {
  const token = Buffer.from(JSON.stringify({ p: 'evil', j: 'x' })).toString('base64url');
  assert.throws(() => providers.decodeJob(token), /unknown provider/i);
});

test('rejects a job id carrying a path traversal', () => {
  const token = Buffer.from(JSON.stringify({ p: 'fal', j: '../../etc/passwd\n' })).toString('base64url');
  assert.throws(() => providers.decodeJob(token), /invalid job id/i);
});

test('rejects meta that would escape the upstream host', () => {
  // meta.app is interpolated into a queue.fal.run path; a scheme or authority
  // here would be an SSRF.
  const token = Buffer.from(JSON.stringify({
    p: 'fal', j: 'ok', m: { app: 'https://evil.example.com/x' }
  })).toString('base64url');
  assert.throws(() => providers.decodeJob(token), /invalid app/i);
});

test('drops unknown meta fields rather than trusting them', () => {
  const token = Buffer.from(JSON.stringify({
    p: 'fal', j: 'ok', m: { app: 'fal-ai/veo3', pollUrl: 'https://evil.example.com' }
  })).toString('base64url');
  const decoded = providers.decodeJob(token);
  assert.strictEqual(decoded.meta.pollUrl, undefined, 'a url must never survive decoding');
});

// --- lifecycle against a stub provider --------------------------------------

console.log('\ngeneration lifecycle (stubbed provider)');

/** Replaces a registry entry's methods for the duration of a test. */
function withStubProvider(behaviour, fn) {
  const target = providers.byId('fal');
  const original = {
    submit: target.submit,
    poll: target.poll,
    isConfigured: target.isConfigured
  };
  Object.assign(target, behaviour);
  return Promise.resolve()
    .then(fn)
    .finally(() => Object.assign(target, original));
}

(async () => {
  // Ensure fal is the picked provider for these cases.
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  await testAsync('createJob returns a token on success', () => withStubProvider({
    isConfigured: () => true,
    submit: async input => {
      assert.ok(input.prompt.length > 0);
      assert.strictEqual(input.height, 1080);
      return { jobId: 'stub-1', meta: { model: 'stub/model', app: 'fal-ai/veo3', label: 'Stub' } };
    }
  }, async () => {
    const res = await video.createJob({ prompt: 'a fox in snow' });
    assert.strictEqual(res.success, true);
    assert.ok(res.job, 'expected a job token');
    assert.strictEqual(res.provider, 'fal');
  }));

  await testAsync('createJob degrades to fallback when the provider throws', () => withStubProvider({
    isConfigured: () => true,
    submit: async () => { throw new Error('upstream on fire'); }
  }, async () => {
    const res = await video.createJob({ prompt: 'a fox' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.fallback, true, 'a provider failure must not kill the run');
    assert.match(res.error, /on fire/);
  }));

  await testAsync('pollJob reports queued then running then succeeded', () => withStubProvider({
    isConfigured: () => true,
    submit: async () => ({ jobId: 'stub-2', meta: { app: 'fal-ai/veo3', label: 'Stub' } })
  }, async () => {
    const created = await video.createJob({ prompt: 'a fox' });
    const target = providers.byId('fal');

    target.poll = async () => ({ status: 'queued', progress: 0.05, detail: 'Queued at 3' });
    let out = await video.pollJob(created.job);
    assert.strictEqual(out.status, 'queued');

    target.poll = async () => ({ status: 'running', progress: 0.5 });
    out = await video.pollJob(created.job);
    assert.strictEqual(out.status, 'running');

    target.poll = async () => ({ status: 'succeeded', videoUrl: 'https://cdn.example.com/a.mp4', needsProxy: false });
    out = await video.pollJob(created.job);
    assert.strictEqual(out.status, 'succeeded');
    assert.strictEqual(out.videoUrl, 'https://cdn.example.com/a.mp4');
    assert.strictEqual(out.proxied, false);
  }));

  await testAsync('a key-gated result is routed through the proxy, never exposed raw', () => withStubProvider({
    isConfigured: () => true,
    submit: async () => ({ jobId: 'stub-3', meta: { app: 'fal-ai/veo3' } }),
    poll: async () => ({ status: 'succeeded', videoUrl: 'https://generativelanguage.googleapis.com/v1beta/files/x', needsProxy: true })
  }, async () => {
    const created = await video.createJob({ prompt: 'a fox' });
    const out = await video.pollJob(created.job);
    assert.strictEqual(out.proxied, true);
    assert.ok(out.videoUrl.startsWith('/api/video-proxy?job='), `got ${out.videoUrl}`);
    assert.ok(!out.videoUrl.includes('googleapis.com'), 'the credentialed url must not reach the client');
  }));

  await testAsync('a failed job reports fallback rather than throwing', () => withStubProvider({
    isConfigured: () => true,
    submit: async () => ({ jobId: 'stub-4', meta: {} }),
    poll: async () => ({ status: 'failed', error: 'content policy' })
  }, async () => {
    const created = await video.createJob({ prompt: 'a fox' });
    const out = await video.pollJob(created.job);
    assert.strictEqual(out.status, 'failed');
    assert.strictEqual(out.fallback, true);
    assert.match(out.error, /content policy/);
  }));

  await testAsync('no configured provider yields a fallback instruction, not an error', async () => {
    const saved = {};
    ['FAL_KEY', 'FAL_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'REPLICATE_API_TOKEN',
      'REPLICATE_API_KEY', 'RUNWAYML_API_SECRET', 'RUNWAY_API_KEY', 'LUMAAI_API_KEY', 'LUMA_API_KEY']
      .forEach(k => { saved[k] = process.env[k]; delete process.env[k]; });
    try {
      const res = await video.createJob({ prompt: 'a fox' });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.fallback, true);
      assert.strictEqual(res.reason, 'no_provider_configured');
      assert.ok(res.hint, 'expected a hint naming the env vars');
    } finally {
      Object.keys(saved).forEach(k => { if (saved[k] !== undefined) process.env[k] = saved[k]; });
    }
  });

  // --- bundle freshness -----------------------------------------------------

  console.log('\nbundle');

  await testAsync('index.html is in sync with styles/ and js/', () => {
    const { execFileSync } = require('child_process');
    execFileSync(process.execPath, [path.join(__dirname, '..', 'build.js'), '--check'], { stdio: 'pipe' });
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})();
