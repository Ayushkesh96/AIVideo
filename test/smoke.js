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

  const ALL_KEYS = ['FAL_KEY', 'FAL_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'REPLICATE_API_TOKEN',
    'REPLICATE_API_KEY', 'RUNWAYML_API_SECRET', 'RUNWAY_API_KEY', 'LUMAAI_API_KEY', 'LUMA_API_KEY'];

  /** Runs fn with every provider key unset, then restores them. */
  async function withNoKeys(fn) {
    const saved = {};
    ALL_KEYS.forEach(k => { saved[k] = process.env[k]; delete process.env[k]; });
    try {
      return await fn();
    } finally {
      ALL_KEYS.forEach(k => { if (saved[k] !== undefined) process.env[k] = saved[k]; });
    }
  }

  await testAsync('with no keys at all, the studio is told to render on-device', () => withNoKeys(async () => {
    const res = await video.createJob({ prompt: 'a fox' });
    assert.strictEqual(res.success, false, 'no provider means no upstream attempt');
    assert.strictEqual(res.fallback, true, 'the free engine is the renderer');
    assert.strictEqual(res.reason, 'no_provider_configured');
  }));

  await testAsync('capabilities reports the free engine when nothing is configured', () => withNoKeys(async () => {
    const caps = video.capabilities();
    assert.strictEqual(caps.keyless, true, 'no keys means keyless');
    assert.deepStrictEqual(caps.keyedProviders, []);
    assert.strictEqual(caps.active, null, 'no provider may claim to be active without a key');
    assert.strictEqual(caps.fallbackOnly, true);
  }));

  await testAsync('a real key outranks the keyless state', async () => {
    process.env.FAL_KEY = 'test-key';
    const caps = video.capabilities();
    assert.strictEqual(caps.active, 'fal', 'a keyed provider must win');
    assert.strictEqual(caps.keyless, false);
    assert.ok(caps.keyedProviders.indexOf('fal') >= 0);
  });

  // --- self-hosted (ComfyUI) ------------------------------------------------

  console.log('\nself-hosted ComfyUI adapter');

  const selfhosted = providers.byId('selfhosted');

  await testAsync('self-hosted outranks metered providers when configured', () => withNoKeys(async () => {
    process.env.COMFYUI_URL = 'https://gpu.example.com';
    process.env.FAL_KEY = 'test-key';
    try {
      const caps = video.capabilities();
      assert.strictEqual(caps.active, 'selfhosted', 'your own GPU should win over a metered API');
    } finally {
      delete process.env.COMFYUI_URL;
      delete process.env.FAL_KEY;
    }
  }));

  await testAsync('every bundled workflow parses and exposes the injection points', async () => {
    const fsMod = require('fs');
    const WORKFLOW_FILES = ['ltx-video-t2v.json', 'wan2.1-t2v-1.3b.json'];
    WORKFLOW_FILES.forEach(name => {
      const graph = JSON.parse(
        fsMod.readFileSync(path.join(__dirname, '..', 'workflows', name), 'utf8')
      );
      const titles = Object.keys(graph).map(id => graph[id]._meta && graph[id]._meta.title);
      ['AIVIDEO_PROMPT', 'AIVIDEO_NEGATIVE', 'AIVIDEO_LATENT', 'AIVIDEO_SAMPLER'].forEach(t => {
        assert.ok(titles.indexOf(t) >= 0, `${name} is missing the ${t} node`);
      });

      // Every socket input (an [id, outputIndex] pair) must reference a node
      // that actually exists in this graph — a dangling reference is a job
      // ComfyUI will reject at submit time, not something worth shipping.
      Object.entries(graph).forEach(([id, node]) => {
        Object.entries(node.inputs || {}).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            const [refId] = value;
            assert.ok(graph[refId], `${name}: node ${id}.${field} references missing node ${refId}`);
          }
        });
      });

      // A KSampler-family node must never carry control_after_generate — it
      // is a frontend-only widget, not a real backend input, and including it
      // in the API-format prompt risks ComfyUI rejecting the job.
      Object.values(graph).forEach(node => {
        assert.ok(
          !('control_after_generate' in (node.inputs || {})),
          `${name}: control_after_generate must not appear in API-format inputs`
        );
      });
    });
  });

  await testAsync('COMFYUI_MODEL selects which bundled workflow and label are active', () => withNoKeys(async () => {
    process.env.COMFYUI_URL = 'https://gpu.example.com';
    try {
      process.env.COMFYUI_MODEL = 'wan2.1';
      let caps = selfhosted.capabilities();
      assert.strictEqual(caps.activeModel, 'wan2.1');
      assert.match(caps.activeModelLabel, /Wan 2\.1/);

      delete process.env.COMFYUI_MODEL;
      caps = selfhosted.capabilities();
      assert.strictEqual(caps.activeModel, 'ltx', 'ltx is the default when COMFYUI_MODEL is unset');
      assert.match(caps.activeModelLabel, /LTX-Video/);

      // An explicit label override always wins over the bundled default.
      process.env.COMFYUI_MODEL_LABEL = 'My Tuned LTX Box';
      caps = selfhosted.capabilities();
      assert.strictEqual(caps.activeModelLabel, 'My Tuned LTX Box');
      delete process.env.COMFYUI_MODEL_LABEL;

      // capabilities().models always lists every bundled option, regardless
      // of which one is active, so the caller can see what's available.
      assert.deepStrictEqual(caps.models.map(m => m.key).sort(), ['ltx', 'wan2.1']);
    } finally {
      delete process.env.COMFYUI_URL;
      delete process.env.COMFYUI_MODEL;
    }
  }));

  await testAsync('a custom COMFYUI_WORKFLOW override reports generic capabilities, not a bundled model\'s', () => withNoKeys(async () => {
    process.env.COMFYUI_URL = 'https://gpu.example.com';
    process.env.COMFYUI_WORKFLOW = JSON.stringify({
      '1': { class_type: 'CLIPTextEncode', inputs: { text: 'x' }, _meta: { title: 'AIVIDEO_PROMPT' } }
    });
    try {
      const caps = selfhosted.capabilities();
      assert.strictEqual(caps.activeModel, 'comfyui', 'a custom graph is not one of the named bundled models');
      assert.strictEqual(caps.activeModelLabel, 'Open-weight model', 'must not claim a bundled model\'s specs for an unknown graph');
    } finally {
      delete process.env.COMFYUI_URL;
      delete process.env.COMFYUI_WORKFLOW;
    }
  }));

  await testAsync('graphRequirements reads node types and model filenames from a graph', async () => {
    const graph = {
      '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'model.safetensors' } },
      '2': { class_type: 'CLIPTextEncode', inputs: { text: 'hello', clip: ['1', 1] } },
      '3': { class_type: 'VAEDecode', inputs: { samples: ['2', 0], vae: ['1', 2] } }
    };
    const req = selfhosted.graphRequirements(graph);
    assert.deepStrictEqual(req.nodeTypes.sort(), ['CLIPTextEncode', 'CheckpointLoaderSimple', 'VAEDecode']);
    assert.strictEqual(req.files.length, 1);
    assert.strictEqual(req.files[0].filename, 'model.safetensors');
    assert.strictEqual(req.files[0].classType, 'CheckpointLoaderSimple');
  });

  await testAsync('graphRequirements finds every model filename in both bundled workflows', async () => {
    const fsMod = require('fs');
    const EXPECTED = {
      'ltx-video-t2v.json': ['ltx-video-2b-v0.9.5.safetensors', 't5xxl_fp16.safetensors'],
      'wan2.1-t2v-1.3b.json': [
        'wan2.1_t2v_1.3B_fp16.safetensors', 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', 'wan_2.1_vae.safetensors'
      ]
    };
    Object.entries(EXPECTED).forEach(([name, expectedFiles]) => {
      const graph = JSON.parse(fsMod.readFileSync(path.join(__dirname, '..', 'workflows', name), 'utf8'));
      const req = selfhosted.graphRequirements(graph);
      const found = req.files.map(f => f.filename).sort();
      assert.deepStrictEqual(found, expectedFiles.sort(), `${name}: unexpected file list ${JSON.stringify(found)}`);
    });
  });

  await testAsync('checkHealth reports unconfigured without attempting any network call', async () => {
    delete process.env.COMFYUI_URL;
    const health = await selfhosted.checkHealth();
    assert.deepStrictEqual(health, { configured: false, reachable: false });
  });

  await testAsync('the proxy only accepts urls on the configured ComfyUI host', async () => {
    process.env.COMFYUI_URL = 'https://gpu.example.com';
    try {
      assert.strictEqual(selfhosted.ownsUrl('https://gpu.example.com/view?filename=a.mp4'), true);
      // A completed job must never be able to point the proxy elsewhere.
      assert.strictEqual(selfhosted.ownsUrl('https://evil.example.com/view?filename=a.mp4'), false);
    } finally {
      delete process.env.COMFYUI_URL;
    }
  });

  await testAsync('an untitled workflow fails loudly instead of rendering the wrong thing', async () => {
    process.env.COMFYUI_URL = 'https://gpu.example.com';
    process.env.COMFYUI_WORKFLOW = JSON.stringify({
      '1': { class_type: 'CLIPTextEncode', inputs: { text: 'hardcoded' }, _meta: { title: 'Untitled' } }
    });
    try {
      await assert.rejects(
        () => selfhosted.submit(video.normalizeInput({ prompt: 'a fox' })),
        /AIVIDEO_PROMPT/,
        'a workflow with no injection point must be reported, not silently run'
      );
    } finally {
      delete process.env.COMFYUI_URL;
      delete process.env.COMFYUI_WORKFLOW;
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
