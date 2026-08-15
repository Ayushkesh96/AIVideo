/**
 * Self-hosted open-source model adapter (ComfyUI backend).
 *
 * This is the "own the generation" path: instead of renting a closed model per
 * clip, the studio drives a ComfyUI server you run. Two open models are
 * bundled ready-to-run (COMFYUI_MODEL: 'ltx' or 'wan2.1' — see
 * BUNDLED_MODELS below); bigger ones (Wan 2.2, HunyuanVideo, CogVideoX) are
 * documented in docs/self-hosting.md via COMFYUI_WORKFLOW instead of bundled
 * here, because their graphs are complex enough that hand-authoring one
 * without being able to execute and verify it would risk shipping something
 * subtly wrong. No per-clip fee, no upstream content policy either way.
 *
 * It needs a GPU. That is the whole cost of owning it: Vercel functions have no
 * GPU, so COMFYUI_URL must point at a machine that does (a rented RunPod/Modal
 * box, or your own card — docker/ has a one-command local setup). See
 * docs/self-hosting.md.
 *
 * Protocol:
 *   POST {host}/prompt              { prompt: <workflow>, client_id } -> { prompt_id }
 *   GET  {host}/history/{prompt_id} -> { <id>: { status, outputs } }
 *   GET  {host}/view?filename=&subfolder=&type= -> the media bytes
 *
 * Workflows are version-sensitive, so the bundled ones are a starting point,
 * not a promise: export your own from ComfyUI in API format and point
 * COMFYUI_WORKFLOW at it. Parameters are injected by node title, which survives
 * node ids changing when you edit the graph.
 */

const fs = require('fs');
const path = require('path');
const { requestJson, HttpError } = require('../_http');

// Titles the adapter looks for when injecting parameters. Rename a node to one
// of these in ComfyUI and it gets wired automatically.
const NODE_TITLES = {
  positive: 'AIVIDEO_PROMPT',
  negative: 'AIVIDEO_NEGATIVE',
  latent: 'AIVIDEO_LATENT',
  sampler: 'AIVIDEO_SAMPLER'
};

// Bundled, ready-to-run workflows. Each is a verified starting point for one
// open model — see docs/self-hosting.md for how these were built and what
// they need in models/. COMFYUI_MODEL picks one; COMFYUI_WORKFLOW (a file
// path or inline JSON) overrides it entirely for a custom graph.
const BUNDLED_MODELS = {
  ltx: {
    file: 'ltx-video-t2v.json',
    label: 'LTX-Video 2B (self-hosted)',
    fps: 24,
    defaultMaxHeight: 1080
  },
  'wan2.1': {
    file: 'wan2.1-t2v-1.3b.json',
    label: 'Wan 2.1 T2V 1.3B (self-hosted)',
    fps: 16,
    defaultMaxHeight: 720
  }
};
const DEFAULT_MODEL_KEY = 'ltx';

function activeBundledModel() {
  const key = (process.env.COMFYUI_MODEL || DEFAULT_MODEL_KEY).trim().toLowerCase();
  return BUNDLED_MODELS[key] || BUNDLED_MODELS[DEFAULT_MODEL_KEY];
}

let cachedWorkflow = null;

function baseUrl() {
  const raw = (process.env.COMFYUI_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  // A GPU box on the public internet should not be open; this supports the
  // usual bearer-token reverse proxy in front of ComfyUI.
  const token = (process.env.COMFYUI_TOKEN || '').trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Loads the workflow graph, from COMFYUI_WORKFLOW or the bundled default. */
function loadWorkflow() {
  if (cachedWorkflow) return JSON.parse(JSON.stringify(cachedWorkflow));

  const override = (process.env.COMFYUI_WORKFLOW || '').trim();
  let source;

  if (override && override.startsWith('{')) {
    // Inline JSON in the env var, for platforms without a writable filesystem.
    source = override;
  } else {
    const file = override
      ? path.resolve(override)
      : path.join(__dirname, '..', '..', 'workflows', activeBundledModel().file);
    source = fs.readFileSync(file, 'utf8');
  }

  cachedWorkflow = JSON.parse(source);
  return JSON.parse(JSON.stringify(cachedWorkflow));
}

/** Finds a node by its _meta.title, which is what ComfyUI writes on rename. */
function findNode(graph, title) {
  return Object.keys(graph).find(id => {
    const node = graph[id];
    return node && node._meta && node._meta.title === title;
  }) || null;
}

/**
 * Injects the request into the graph.
 *
 * Only nodes the user has explicitly titled are touched. An untitled graph
 * still runs — it just renders whatever it was saved with, which is a
 * confusing result, so that case is reported rather than silently accepted.
 */
function applyInputs(graph, input) {
  const positiveId = findNode(graph, NODE_TITLES.positive);
  if (!positiveId) {
    throw new Error(
      `The workflow has no node titled "${NODE_TITLES.positive}". ` +
      'Rename your positive CLIP Text Encode node to that in ComfyUI so the prompt can be injected.'
    );
  }
  graph[positiveId].inputs.text = input.prompt;

  const negativeId = findNode(graph, NODE_TITLES.negative);
  if (negativeId) {
    graph[negativeId].inputs.text = input.negativePrompt ||
      'blurry, low quality, distorted, watermark, text, static image';
  }

  const latentId = findNode(graph, NODE_TITLES.latent);
  if (latentId) {
    const latent = graph[latentId].inputs;
    latent.width = input.width;
    latent.height = input.height;
    // Video latents count frames, not seconds. Each bundled model has its own
    // native frame rate (Wan 2.1 trains at 16fps, LTX-Video at 24fps); an
    // explicit COMFYUI_FPS always wins, for a custom workflow at another rate.
    const fps = parseInt(process.env.COMFYUI_FPS, 10) || activeBundledModel().fps;
    if (latent.length !== undefined) latent.length = input.durationSec * fps + 1;
    if (latent.num_frames !== undefined) latent.num_frames = input.durationSec * fps + 1;
    if (latent.batch_size !== undefined) latent.batch_size = 1;
  }

  const samplerId = findNode(graph, NODE_TITLES.sampler);
  if (samplerId && Number.isFinite(input.seed)) {
    const sampler = graph[samplerId].inputs;
    // KSampler calls it seed; some samplers call it noise_seed.
    if (sampler.seed !== undefined) sampler.seed = input.seed;
    if (sampler.noise_seed !== undefined) sampler.noise_seed = input.seed;
  }

  return graph;
}

/** Pulls a video (or animated image) out of a completed history entry. */
function extractOutput(outputs) {
  if (!outputs || typeof outputs !== 'object') return null;
  // VHS_VideoCombine writes `gifs` even for mp4/webm; newer save nodes use
  // `videos`; a frame-sequence workflow leaves `images`.
  for (const key of ['videos', 'gifs', 'images']) {
    for (const nodeId of Object.keys(outputs)) {
      const list = outputs[nodeId] && outputs[nodeId][key];
      if (Array.isArray(list) && list.length) {
        const file = list[list.length - 1];
        if (file && file.filename) return file;
      }
    }
  }
  return null;
}

function viewUrl(file) {
  const params = new URLSearchParams({
    filename: file.filename,
    subfolder: file.subfolder || '',
    type: file.type || 'output'
  });
  return `${baseUrl()}/view?${params}`;
}

// Widget fields across ComfyUI's standard loader nodes that hold a filename
// ComfyUI resolves from its models/ folder — the file a job actually needs to
// find on disk before it can run. Not an exhaustive list of every loader any
// custom node could define, but it covers every node the bundled workflows
// use and most community ones, since these are the stable core loader nodes.
const FILENAME_FIELDS = new Set(['ckpt_name', 'unet_name', 'clip_name', 'vae_name', 'lora_name']);

/**
 * Reads what a workflow graph actually needs from the ComfyUI instance that
 * will run it: every node class it uses (so a missing custom node is
 * detectable) and every model filename it references (so a missing weight
 * is). Pure and graph-only — no network — which is what makes this testable
 * without a live ComfyUI box, and what makes it work for a custom
 * COMFYUI_WORKFLOW just as well as for a bundled one.
 */
function graphRequirements(graph) {
  const nodeTypes = new Set();
  const files = [];

  Object.entries(graph).forEach(([nodeId, node]) => {
    if (!node || typeof node.class_type !== 'string') return;
    nodeTypes.add(node.class_type);

    const inputs = node.inputs || {};
    Object.entries(inputs).forEach(([field, value]) => {
      if (FILENAME_FIELDS.has(field) && typeof value === 'string' && value) {
        files.push({ nodeId, classType: node.class_type, field, filename: value });
      }
    });
  });

  return { nodeTypes: Array.from(nodeTypes), files };
}

/** GET {host}/object_info/{classType} — undefined if ComfyUI doesn't know the class at all. */
async function fetchObjectInfo(host, headers, classType) {
  try {
    const res = await requestJson(
      `${host}/object_info/${encodeURIComponent(classType)}`,
      { headers, timeoutMs: 10000 }
    );
    return res && res[classType] ? res[classType] : null;
  } catch (err) {
    return null;
  }
}

/** The combo (dropdown) choices ComfyUI reports for one required input field. */
function comboChoices(objectInfo, field) {
  const spec = objectInfo && objectInfo.input && objectInfo.input.required && objectInfo.input.required[field];
  return spec && Array.isArray(spec[0]) ? spec[0] : null;
}

function bytesToGB(bytes) {
  return Number.isFinite(bytes) ? Math.round((bytes / 1024 / 1024 / 1024) * 10) / 10 : null;
}

const provider = {
  id: 'selfhosted',
  label: 'Self-hosted (ComfyUI)',
  envKeys: ['COMFYUI_URL'],

  isConfigured() {
    return Boolean(baseUrl());
  },

  capabilities() {
    // A custom COMFYUI_WORKFLOW override means the running graph isn't one of
    // the bundled models, so its specs can't be assumed — fall back to a
    // generic label and a permissive ceiling instead of claiming figures that
    // may not describe what's actually running.
    const isCustom = Boolean((process.env.COMFYUI_WORKFLOW || '').trim());
    const bundled = activeBundledModel();
    const defaultLabel = isCustom ? 'Open-weight model' : bundled.label;
    const defaultMaxHeight = isCustom ? 2160 : bundled.defaultMaxHeight;

    return {
      id: 'selfhosted',
      label: 'Self-hosted (ComfyUI)',
      configured: provider.isConfigured(),
      selfHosted: true,
      activeModel: isCustom ? 'comfyui' : Object.keys(BUNDLED_MODELS).find(k => BUNDLED_MODELS[k] === bundled),
      activeModelLabel: (process.env.COMFYUI_MODEL_LABEL || defaultLabel).trim(),
      // Your GPU, your ceiling — this is a starting default, not a hard cap.
      // 4K is reachable because nothing upstream forbids it; whether it fits
      // in VRAM is a question for your hardware.
      maxResolution: parseInt(process.env.COMFYUI_MAX_HEIGHT, 10) || defaultMaxHeight,
      durations: [2, 3, 4, 5, 6, 8, 10, 12],
      audio: false,
      models: Object.keys(BUNDLED_MODELS).map(key => ({
        key,
        label: BUNDLED_MODELS[key].label,
        maxResolution: BUNDLED_MODELS[key].defaultMaxHeight
      }))
    };
  },

  /**
   * Live readiness check against the actual ComfyUI box, not just "is a URL
   * configured". `capabilities()` is synchronous and answers instantly from
   * env vars alone, so it can claim a provider is ready when the GPU box is
   * off or missing the model weights the graph needs — this is what a
   * generation would actually hit, checked in advance instead of found out
   * 45 seconds into a submitted job.
   *
   * Never throws: every failure mode (box unreachable, workflow file broken,
   * a node or file missing) is a normal, reportable outcome, not a bug.
   */
  async checkHealth() {
    const host = baseUrl();
    if (!host) return { configured: false, reachable: false };

    let stats;
    try {
      stats = await requestJson(`${host}/system_stats`, { headers: authHeaders(), timeoutMs: 8000 });
    } catch (err) {
      return {
        configured: true,
        reachable: false,
        error: `Could not reach ComfyUI at ${host}: ${err.message}`
      };
    }

    const device = stats && Array.isArray(stats.devices) ? stats.devices[0] : null;
    const vramTotalGB = device ? bytesToGB(device.vram_total) : null;
    const vramFreeGB = device ? bytesToGB(device.vram_free) : null;

    let graph;
    try {
      graph = loadWorkflow();
    } catch (err) {
      return {
        configured: true,
        reachable: true,
        ok: false,
        error: `The workflow could not be loaded: ${err.message}`,
        vramTotalGB,
        vramFreeGB
      };
    }

    const { nodeTypes, files } = graphRequirements(graph);
    const infoByType = {};
    await Promise.all(nodeTypes.map(async classType => {
      infoByType[classType] = await fetchObjectInfo(host, authHeaders(), classType);
    }));

    const missingNodes = nodeTypes.filter(t => !infoByType[t]);
    const missingFiles = [];
    files.forEach(({ nodeId, classType, field, filename }) => {
      const info = infoByType[classType];
      if (!info) return; // already reported as a missing node — don't double up
      const choices = comboChoices(info, field);
      // No enum list back from ComfyUI for this field means it isn't a
      // dropdown-of-files input after all (a custom node can reuse a
      // standard field name for something else) — nothing to check.
      if (choices && choices.indexOf(filename) === -1) {
        missingFiles.push({ nodeId, classType, field, filename });
      }
    });

    return {
      configured: true,
      reachable: true,
      ok: missingNodes.length === 0 && missingFiles.length === 0,
      missingNodes,
      missingFiles,
      vramTotalGB,
      vramFreeGB
    };
  },

  // Exposed for testing — pure and network-free, so it's the part of this
  // file that can actually be verified without a live ComfyUI box.
  graphRequirements,

  async submit(input) {
    const host = baseUrl();
    if (!host) throw new Error('COMFYUI_URL is not set');

    const graph = applyInputs(loadWorkflow(), input);

    let res;
    try {
      res = await requestJson(`${host}/prompt`, {
        method: 'POST',
        headers: authHeaders(),
        body: { prompt: graph, client_id: `aivideo-${Date.now()}` },
        timeoutMs: 30000
      });
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 400) {
        // ComfyUI returns per-node validation errors here, and they are the
        // single most useful thing for fixing a broken workflow.
        const detail = err.body && err.body.node_errors
          ? JSON.stringify(err.body.node_errors).slice(0, 400)
          : err.message;
        throw new Error(`ComfyUI rejected the workflow: ${detail}`);
      }
      throw new Error(`Could not reach ComfyUI at ${host}: ${err.message}`);
    }

    if (!res || !res.prompt_id) throw new Error('ComfyUI did not return a prompt_id');
    return { jobId: res.prompt_id, meta: { label: provider.capabilities().activeModelLabel } };
  },

  async poll(jobId, meta) {
    const host = baseUrl();
    let res;
    try {
      res = await requestJson(`${host}/history/${encodeURIComponent(jobId)}`, {
        headers: authHeaders(),
        timeoutMs: 20000
      });
    } catch (err) {
      // A restarted ComfyUI loses history; treat an unreachable box as a
      // failed job rather than polling forever.
      return { status: 'failed', error: `ComfyUI history unavailable: ${err.message}` };
    }

    const entry = res && res[jobId];
    if (!entry) {
      // Not in history yet means still queued or running — ComfyUI only files
      // an entry once execution starts.
      return { status: 'running', progress: 0.4, detail: 'Rendering on your GPU' };
    }

    const statusStr = entry.status && entry.status.status_str;
    if (statusStr === 'error') {
      const messages = entry.status && Array.isArray(entry.status.messages)
        ? JSON.stringify(entry.status.messages).slice(0, 300)
        : 'unknown error';
      return { status: 'failed', error: `ComfyUI execution failed: ${messages}` };
    }

    if (entry.status && entry.status.completed === false) {
      return { status: 'running', progress: 0.6, detail: 'Rendering on your GPU' };
    }

    const file = extractOutput(entry.outputs);
    if (!file) {
      return { status: 'failed', error: 'ComfyUI finished without producing a video output node' };
    }

    return {
      status: 'succeeded',
      progress: 1,
      videoUrl: viewUrl(file),
      // The box may be on a private network or behind a token, so the browser
      // cannot be expected to fetch it directly.
      needsProxy: true,
      modelLabel: meta && meta.label
    };
  },

  downloadHeaders() {
    const token = (process.env.COMFYUI_TOKEN || '').trim();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  ownsUrl(url) {
    const host = baseUrl();
    if (!host) return false;
    try {
      return new URL(url).origin === new URL(host).origin;
    } catch (err) {
      return false;
    }
  }
};

module.exports = provider;
